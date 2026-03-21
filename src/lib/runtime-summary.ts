import "server-only";

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { APP_META } from "@/lib/app-meta";
import {
  CLAUDE_SETTINGS_FILE,
  CODEX_SKILLS_DIR,
  GEMINI_SETTINGS_FILE,
} from "@/lib/parsers/shared";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { readRuntimeSettings } from "@/lib/runtime-settings";
import type {
  DashboardLabRuntimeCheck,
  DashboardLabRuntimePathCandidate,
  DashboardLabRuntimePathStatus,
  DashboardLabRuntimeSummaryResponse,
  RuntimeCheckStatus,
} from "@/lib/types";

export function getRuntimeSummary(): DashboardLabRuntimeSummaryResponse {
  const settings = readRuntimeSettings();
  const runtimeConfig = getRuntimeConfig();

  return {
    app: {
      slug: APP_META.slug,
      displayName: APP_META.displayName,
      launcherFileName: APP_META.launcherFileName,
    },
    settings,
    resolvedPaths: {
      projectsRoot: buildPathStatus(
        "projectsRoot",
        "프로젝트 루트",
        runtimeConfig.paths.projectsRoot,
        true,
      ),
      obsidianVault: buildPathStatus(
        "obsidianVault",
        "Obsidian Vault",
        runtimeConfig.paths.obsidianVault,
        false,
      ),
      prdSaveDir: buildPathStatus(
        "prdSaveDir",
        "PRD 저장 경로",
        runtimeConfig.paths.prdSaveDir,
        true,
      ),
      csContextsDir: buildPathStatus(
        "csContextsDir",
        "CS 컨텍스트 경로",
        runtimeConfig.paths.csContextsDir,
        true,
      ),
      allowedRoots: runtimeConfig.paths.allowedRoots,
    },
    discovery: {
      projectsRootCandidates: buildCandidates(
        runtimeConfig.discovery.projectsRootCandidates,
        runtimeConfig.paths.projectsRoot,
      ),
      obsidianVaultCandidates: buildCandidates(
        runtimeConfig.discovery.obsidianVaultCandidates,
        runtimeConfig.paths.obsidianVault,
      ),
    },
    checks: buildDoctorChecks(runtimeConfig.paths.projectsRoot),
  };
}

function buildPathStatus(
  id: DashboardLabRuntimePathStatus["id"],
  label: string,
  targetPath: string | null,
  required: boolean,
): DashboardLabRuntimePathStatus {
  return {
    id,
    label,
    path: targetPath,
    exists: targetPath ? existsSync(targetPath) : false,
    required,
  };
}

function buildCandidates(
  candidates: string[],
  selected: string | null,
): DashboardLabRuntimePathCandidate[] {
  return candidates.map((candidate) => ({
    path: candidate,
    exists: existsSync(candidate),
    selected: candidate === selected,
  }));
}

function buildDoctorChecks(
  projectsRoot: string,
): DashboardLabRuntimeCheck[] {
  const whisperResult = detectAnyCommand(["whisper", "whisper-cli"]);

  return [
    buildPlatformCheck(),
    buildCommandCheck("node", "Node.js", true),
    buildCommandCheck("pnpm", "pnpm", true),
    buildCommandCheck("ffmpeg", "ffmpeg", true),
    buildCommandCheckFromResult(
      "whisper",
      "Whisper backend",
      whisperResult,
      true,
    ),
    buildCommandCheck("claude", "Claude CLI", false),
    buildCommandCheck("codex", "Codex CLI", false),
    buildCommandCheck("gemini", "Gemini CLI", false),
    buildPathCheck(
      "claude-config",
      "Claude 설정",
      CLAUDE_SETTINGS_FILE,
      false,
    ),
    buildPathCheck(
      "codex-skills",
      "Codex 스킬 경로",
      CODEX_SKILLS_DIR,
      false,
    ),
    buildPathCheck(
      "gemini-config",
      "Gemini 설정",
      GEMINI_SETTINGS_FILE,
      false,
    ),
    buildPathCheck(
      "projects-root",
      "프로젝트 루트 존재",
      projectsRoot,
      true,
    ),
  ];
}

function buildPlatformCheck(): DashboardLabRuntimeCheck {
  const isMac = process.platform === "darwin";

  return {
    id: "platform",
    label: "macOS 권장 환경",
    status: isMac ? "pass" : "warn",
    detail: `${process.platform} ${process.arch}`,
    required: true,
  };
}

function buildCommandCheck(
  id: string,
  label: string,
  required: boolean,
): DashboardLabRuntimeCheck {
  return buildCommandCheckFromResult(id, label, detectCommand(id), required);
}

function buildCommandCheckFromResult(
  id: string,
  label: string,
  result: CommandDetectionResult,
  required: boolean,
): DashboardLabRuntimeCheck {
  const status: RuntimeCheckStatus = result.exists
    ? "pass"
    : required
      ? "warn"
      : "warn";

  return {
    id,
    label,
    status,
    detail: result.exists
      ? [result.path, result.version].filter(Boolean).join(" · ")
      : "설치되지 않음",
    required,
  };
}

function buildPathCheck(
  id: string,
  label: string,
  targetPath: string,
  required: boolean,
): DashboardLabRuntimeCheck {
  const exists = existsSync(targetPath);

  return {
    id,
    label,
    status: exists ? "pass" : required ? "warn" : "warn",
    detail: exists ? targetPath : `${targetPath} 없음`,
    required,
  };
}

type CommandDetectionResult = {
  exists: boolean;
  path: string | null;
  version: string | null;
};

function detectAnyCommand(commands: string[]): CommandDetectionResult {
  for (const command of commands) {
    const result = detectCommand(command);
    if (result.exists) {
      return result;
    }
  }

  return {
    exists: false,
    path: null,
    version: null,
  };
}

function detectCommand(command: string): CommandDetectionResult {
  const pathResult = spawnSync("bash", ["-lc", `command -v '${command}'`], {
    encoding: "utf8",
  });
  const commandPath = pathResult.status === 0 ? pathResult.stdout.trim() : "";

  if (!commandPath) {
    return {
      exists: false,
      path: null,
      version: null,
    };
  }

  const versionResult = spawnSync(commandPath, ["--version"], {
    encoding: "utf8",
    timeout: 5000,
  });
  const versionOutput = `${versionResult.stdout ?? ""}\n${versionResult.stderr ?? ""}`
    .trim()
    .split(/\r?\n/)[0] ?? null;

  return {
    exists: true,
    path: commandPath,
    version: versionOutput || null,
  };
}
