import { getAllRecords } from "@/lib/call-to-prd/call-store";
import { getCsHistory } from "@/lib/cs-helper/cs-runner";
import { isCommandDisconnected } from "@/lib/command-availability";
import { parseAgents, parseCommands, parseMcpServers, parseSkills, parseTeams } from "@/lib/parsers/claude-parser";
import { readThroughCache } from "@/lib/parsers/cache";
import { parseCodexInfo } from "@/lib/parsers/codex-parser";
import { parseGeminiInfo } from "@/lib/parsers/gemini-parser";
import {
  CLAUDE_SETTINGS_FILE,
  CODEX_SKILLS_DIR,
  detectCliVersion,
  GEMINI_SETTINGS_FILE,
  pathExists,
} from "@/lib/parsers/shared";
import { getSkillHistory } from "@/lib/ai-skills/runner";
import type { OverviewResponse } from "@/lib/types";

const OVERVIEW_CACHE_TTL_MS = 60_000;

export async function getOverviewData(): Promise<OverviewResponse> {
  return readThroughCache("overview-data", OVERVIEW_CACHE_TTL_MS, loadOverviewData);
}

async function loadOverviewData(): Promise<OverviewResponse> {
  const claudeDisconnected = isCommandDisconnected("claude");
  const codexDisconnected = isCommandDisconnected("codex");
  const geminiDisconnected = isCommandDisconnected("gemini");
  const [claudeVersion, agents, teams, skills, commands, mcpServers, codex, gemini] =
    await Promise.all([
      claudeDisconnected ? Promise.resolve("disconnected") : detectCliVersion("claude"),
      claudeDisconnected ? Promise.resolve([]) : parseAgents(),
      claudeDisconnected ? Promise.resolve([]) : parseTeams(),
      claudeDisconnected ? Promise.resolve([]) : parseSkills(),
      claudeDisconnected ? Promise.resolve([]) : parseCommands(),
      claudeDisconnected ? Promise.resolve([]) : parseMcpServers(),
      codexDisconnected ? Promise.resolve(createDisconnectedCodexInfo()) : parseCodexInfo(),
      geminiDisconnected ? Promise.resolve(createDisconnectedGeminiInfo()) : parseGeminiInfo(),
    ]);

  const [claudeExists, codexExists, geminiExists] = await Promise.all([
    claudeDisconnected ? Promise.resolve(false) : pathExists(CLAUDE_SETTINGS_FILE),
    codexDisconnected ? Promise.resolve(false) : pathExists(CODEX_SKILLS_DIR),
    geminiDisconnected ? Promise.resolve(false) : pathExists(GEMINI_SETTINGS_FILE),
  ]);
  const todayWork = loadTodayWork();

  return {
    timestamp: new Date().toISOString(),
    tools: {
      claude: {
        name: "Claude Code",
        version: claudeVersion,
        configPath: CLAUDE_SETTINGS_FILE,
        exists: claudeExists,
      },
      codex: {
        name: "Codex CLI",
        version: codexDisconnected ? "disconnected" : codex.version,
        configPath: CODEX_SKILLS_DIR,
        exists: codexExists,
      },
      gemini: {
        name: "Gemini CLI",
        version: geminiDisconnected ? "disconnected" : gemini.version,
        configPath: GEMINI_SETTINGS_FILE,
        exists: geminiExists,
      },
    },
    agents,
    teams,
    skills,
    commands,
    mcpServers,
    codex,
    gemini,
    stats: {
      totalAgents: agents.length,
      totalTeams: teams.length,
      totalSkills: skills.length,
      totalCommands: commands.length,
      totalMcpServers: mcpServers.length,
      totalCodexSkills: codex.skills.length + codex.promptSkills.length,
    },
    todayWork,
  };
}

function createDisconnectedCodexInfo(): OverviewResponse["codex"] {
  return {
    version: "disconnected",
    skills: [],
    promptSkills: [],
    hasRoleFile: false,
    roleSummary: "",
    roleFilePath: "",
  };
}

function createDisconnectedGeminiInfo(): OverviewResponse["gemini"] {
  return {
    version: "disconnected",
    authType: "disconnected",
    policySummary: "",
    settings: {},
    settingsPath: "",
    policyPath: "",
  };
}

function loadTodayWork(): OverviewResponse["todayWork"] {
  const todayKey = getKstDateKey(new Date());
  const callRecords = getAllRecords()
    .filter((record) => getKstDateKey(record.createdAt) === todayKey)
    .map((record) => ({
      id: `call:${record.id}`,
      source: "call-to-prd" as const,
      title: record.projectName?.trim() || record.fileName,
      summary: `${record.customerName ? `${record.customerName} · ` : ""}${record.generatedDocs.length || record.selectedDocTypes.length}개 문서`,
      status: record.status,
      createdAt: record.createdAt,
      badge: "Call → PRD",
    }));

  const csHistory = getCsHistory().items
    .filter((item) => getKstDateKey(item.createdAt) === todayKey)
    .map((item) => ({
      id: `cs:${item.id}`,
      source: "cs-helper" as const,
      title: item.projectId,
      summary: `${item.channel} · ${item.runner} · ${item.customerMessagePreview}`,
      status: "completed",
      createdAt: item.createdAt,
      badge: "CS Helper",
    }));

  const skillRuns = getSkillHistory().runs
    .filter((run) => getKstDateKey(run.startedAt) === todayKey)
    .map((run) => ({
      id: `skill:${run.id}`,
      source: "ai-skill" as const,
      title: run.skillName,
      summary: `${run.runner} · ${run.cwd}`,
      status: run.status,
      createdAt: run.completedAt ?? run.startedAt,
      badge: "AI Skills",
    }));

  return [...callRecords, ...csHistory, ...skillRuns]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 10);
}

function getKstDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
