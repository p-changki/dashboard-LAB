import path from "node:path";

import type { Agent, Command, McpServer, Skill, Team, TeamMember, TeamModel } from "@/lib/types";

import {
  basenameWithoutExtension,
  CLAUDE_AGENTS_DIR,
  CLAUDE_COMMANDS_DIR,
  CLAUDE_SETTINGS_FILE,
  CLAUDE_SKILLS_DIR,
  getFirstMeaningfulLine,
  getFirstParagraph,
  isRecord,
  listDirectories,
  listFiles,
  parseMarkdown,
  readJsonObject,
  readUtf8,
  resolveMarkdownFile,
  toPosixPath,
} from "./shared";

export async function parseAgents(): Promise<Agent[]> {
  const files = await listFiles(CLAUDE_AGENTS_DIR, (fileName) =>
    /\.md$/i.test(fileName),
  );

  const agents = await Promise.all(
    files.map(async (filePath) => {
      const raw = await readUtf8(filePath);

      if (!raw) {
        return null;
      }

      const { frontmatter, body } = parseMarkdown(raw);
      const fileName = basenameWithoutExtension(filePath);
      const name =
        typeof frontmatter.name === "string" ? frontmatter.name : fileName;
      const description =
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : getFirstParagraph(body) || name;

      const agent: Agent = {
        name,
        description,
        filePath: toPosixPath(filePath),
        source: "claude" as const,
        model:
          typeof frontmatter.model === "string" ? frontmatter.model : undefined,
      };

      return agent;
    }),
  );

  return agents.filter((agent): agent is Agent => agent !== null);
}

export async function parseTeams(): Promise<Team[]> {
  const files = await listFiles(
    CLAUDE_COMMANDS_DIR,
    (fileName) => /^team-.*\.md$/i.test(fileName),
  );

  const teams = await Promise.all(
    files.map(async (filePath) => {
      const raw = await readUtf8(filePath);

      if (!raw) {
        return null;
      }

      const teamFileName = basenameWithoutExtension(filePath);
      const purpose = getFirstParagraph(raw) || teamFileName;
      const members = parseTeamMembers(raw);

      const team: Team = {
        name: teamFileName,
        purpose,
        members,
        memberCount: members.length,
        command: `/${teamFileName}`,
        filePath: toPosixPath(filePath),
      };

      return team;
    }),
  );

  return teams.filter((team): team is Team => team !== null);
}

export async function parseSkills(): Promise<Skill[]> {
  const skillDirectories = await listDirectories(CLAUDE_SKILLS_DIR);

  const skills = await Promise.all(
    skillDirectories.map(async (directoryPath) => {
      const markdownFile = await resolveMarkdownFile(directoryPath, [
        "SKILL.md",
        "skill.md",
        "prompt.md",
      ]);

      if (!markdownFile) {
        return null;
      }

      const raw = await readUtf8(markdownFile);

      if (!raw) {
        return null;
      }

      const { frontmatter, body } = parseMarkdown(raw);
      const name = path.basename(directoryPath);
      const description =
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : getFirstMeaningfulLine(body) || name;

      const skill: Skill = {
        name,
        description,
        command: `/${name}`,
        source: "claude-skill" as const,
        filePath: toPosixPath(markdownFile),
      };

      return skill;
    }),
  );

  return skills.filter((skill): skill is Skill => skill !== null);
}

export async function parseCommands(): Promise<Command[]> {
  const files = await listFiles(
    CLAUDE_COMMANDS_DIR,
    (fileName) => /\.md$/i.test(fileName) && !/^team-.*\.md$/i.test(fileName),
  );

  const commands = await Promise.all(
    files.map(async (filePath) => {
      const raw = await readUtf8(filePath);

      if (!raw) {
        return null;
      }

      const { frontmatter, body } = parseMarkdown(raw);
      const name = basenameWithoutExtension(filePath);
      const description =
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : getFirstMeaningfulLine(body) || name;

      const command: Command = {
        name,
        description,
        command: `/${name}`,
        source: "claude-command" as const,
        filePath: toPosixPath(filePath),
      };

      return command;
    }),
  );

  return commands.filter((command): command is Command => command !== null);
}

export async function parseMcpServers(): Promise<McpServer[]> {
  const settings = await readJsonObject(CLAUDE_SETTINGS_FILE);
  const mcpServers = isRecord(settings.mcpServers) ? settings.mcpServers : {};

  return Object.entries(mcpServers)
    .map<McpServer>(([name, config]) => {
      const normalizedConfig = isRecord(config) ? config : {};
      const headers = isRecord(normalizedConfig.headers)
        ? Object.keys(normalizedConfig.headers)
        : [];
      const env = isRecord(normalizedConfig.env)
        ? Object.keys(normalizedConfig.env)
        : [];
      const transport: McpServer["transport"] =
        normalizedConfig.type === "http"
          ? "http"
          : typeof normalizedConfig.command === "string"
            ? "stdio"
            : "unknown";

      return {
        name,
        command:
          typeof normalizedConfig.command === "string"
            ? normalizedConfig.command
            : typeof normalizedConfig.type === "string"
              ? normalizedConfig.type
              : "unknown",
        args: Array.isArray(normalizedConfig.args)
          ? normalizedConfig.args.filter(
              (value): value is string => typeof value === "string",
            )
          : [],
        envKeys: [...new Set([...headers, ...env])].sort(),
        transport,
        url:
          typeof normalizedConfig.url === "string"
            ? normalizedConfig.url
            : undefined,
        filePath: toPosixPath(CLAUDE_SETTINGS_FILE),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function parseTeamMembers(source: string): TeamMember[] {
  const firstParagraph = getFirstParagraph(source);
  const matches = [
    ...firstParagraph.matchAll(
      /([A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z][A-Za-z0-9-]*)*)\s+(Opus|Sonnet|Haiku)\b/g,
    ),
  ];

  const members = matches.map((match) => ({
    role: match[1].trim(),
    model: match[2].toLowerCase() as TeamModel,
  }));

  if (members.length > 0) {
    return members;
  }

  const fallbackMatch = source.match(/구성원[:\s]+(.+)/);

  if (!fallbackMatch) {
    return [];
  }

  return fallbackMatch[1]
    .split(/[+,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const modelMatch = entry.match(/\b(Opus|Sonnet|Haiku)\b/i);

      return {
        role: entry.replace(/\b(Opus|Sonnet|Haiku)\b/i, "").trim() || "member",
        model: (modelMatch?.[1]?.toLowerCase() ?? "unknown") as TeamModel,
      };
    });
}
