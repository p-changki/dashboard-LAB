import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CODEX_CONFIG_PATH = path.join(os.homedir(), ".codex", "config.toml");
const DEFAULT_CODEX_CONFIG_OVERRIDES = [
  'model_reasoning_effort="low"',
  'web_search="disabled"',
];

let cachedConfigRaw: string | null = null;
let cachedMcpDisableOverrides: string[] | null = null;

type DashboardLabCodexExecOptions = {
  outputPath?: string | null;
  outputSchemaPath?: string | null;
  extraConfigOverrides?: string[];
  skipGitRepoCheck?: boolean;
  ephemeral?: boolean;
};

export function buildDashboardLabCodexExecArgs(
  prompt: string,
  options: DashboardLabCodexExecOptions = {},
) {
  const args = ["exec"];

  if (options.skipGitRepoCheck ?? true) {
    args.push("--skip-git-repo-check");
  }

  if (options.ephemeral ?? true) {
    args.push("--ephemeral");
  }

  for (const override of getDashboardLabCodexConfigOverrides(options.extraConfigOverrides)) {
    args.push("-c", override);
  }

  const outputSchemaPath = options.outputSchemaPath?.trim();
  if (outputSchemaPath) {
    args.push("--output-schema", outputSchemaPath);
  }

  const outputPath = options.outputPath?.trim();
  if (outputPath) {
    args.push("-o", outputPath);
  }

  args.push(prompt);
  return args;
}

export function getDashboardLabCodexConfigOverrides(extraOverrides: string[] = []) {
  return [...new Set([
    ...DEFAULT_CODEX_CONFIG_OVERRIDES,
    ...getConfiguredCodexMcpDisableOverrides(),
    ...extraOverrides.map((value) => value.trim()).filter(Boolean),
  ])];
}

function getConfiguredCodexMcpDisableOverrides() {
  const raw = readCodexConfig();

  if (!raw) {
    cachedConfigRaw = null;
    cachedMcpDisableOverrides = [];
    return cachedMcpDisableOverrides;
  }

  if (cachedConfigRaw === raw && cachedMcpDisableOverrides) {
    return cachedMcpDisableOverrides;
  }

  const ids = raw
    .split(/\r?\n/)
    .map((line) => parseCodexMcpServerId(line))
    .filter((value): value is string => Boolean(value));

  cachedConfigRaw = raw;
  cachedMcpDisableOverrides = [...new Set(ids)].map(
    (serverId) => `mcp_servers.${formatTomlPathSegment(serverId)}.enabled=false`,
  );

  return cachedMcpDisableOverrides;
}

function readCodexConfig() {
  try {
    return readFileSync(CODEX_CONFIG_PATH, "utf8");
  } catch {
    return "";
  }
}

function parseCodexMcpServerId(line: string) {
  const trimmed = line.trim();

  if (!trimmed.startsWith("[mcp_servers.") || !trimmed.endsWith("]")) {
    return null;
  }

  const section = trimmed.slice("[mcp_servers.".length, -1).trim();
  if (!section) {
    return null;
  }

  if (section.startsWith('"')) {
    return parseQuotedTomlPathSegment(section);
  }

  return section.split(".")[0]?.trim() || null;
}

function parseQuotedTomlPathSegment(section: string) {
  let escaped = false;
  let value = "";

  for (let index = 1; index < section.length; index += 1) {
    const char = section[index];

    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      return value.trim() || null;
    }

    value += char;
  }

  return null;
}

function formatTomlPathSegment(segment: string) {
  return /^[A-Za-z0-9_-]+$/.test(segment) ? segment : `"${segment.replace(/"/g, '\\"')}"`;
}
