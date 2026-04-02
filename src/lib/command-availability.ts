import { execFile, spawnSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { readRuntimeSettings } from "@/lib/runtime/settings";
import type { DashboardLabDisconnectableCommand } from "@/lib/types";

const execFileAsync = promisify(execFile);
const ACCESS_MODE = process.platform === "win32" ? constants.F_OK : constants.X_OK;
const HOME_DIR = os.homedir();
const DEFAULT_LOGIN_SHELL = process.env.SHELL?.trim() || "/bin/zsh";
const EXTRA_PATH_SEGMENTS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  "/Applications/cmux.app/Contents/Resources/bin",
  path.join(HOME_DIR, ".local", "bin"),
];

const COMMAND_CANDIDATE_PATHS: Record<string, string[]> = {
  claude: [
    "/Applications/cmux.app/Contents/Resources/bin/claude",
    path.join(HOME_DIR, ".local", "bin", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ],
  codex: [
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ],
  gemini: [
    "/opt/homebrew/bin/gemini",
    "/usr/local/bin/gemini",
  ],
};

const DISCONNECTABLE_COMMANDS = new Set<DashboardLabDisconnectableCommand>([
  "claude",
  "codex",
  "gemini",
  "gh",
]);
let cachedLoginShellPathEntries: string[] | null = null;

export function getCommandEnvironment(
  extraEnv: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  const env = { ...process.env, ...extraEnv } as NodeJS.ProcessEnv;
  const pathEntries = getAugmentedPathEntries(env.PATH);

  return {
    ...env,
    PATH: [...new Set(pathEntries)].join(path.delimiter),
  };
}

export function getDisconnectedCommands() {
  return readRuntimeSettings().disabledCommands;
}

export function isCommandDisconnected(command: string) {
  const normalized = command.trim().toLowerCase();

  if (!normalized || !DISCONNECTABLE_COMMANDS.has(normalized as DashboardLabDisconnectableCommand)) {
    return false;
  }

  return getDisconnectedCommands().includes(
    normalized as DashboardLabDisconnectableCommand,
  );
}

export async function checkCommandAvailable(command: string): Promise<boolean> {
  return Boolean(await resolveCommandPath(command));
}

export async function resolveCommandPath(command: string): Promise<string | null> {
  const normalized = command.trim();

  if (!normalized) {
    return null;
  }

  if (!isPathLike(normalized) && isCommandDisconnected(normalized)) {
    return null;
  }

  const executableCandidates = await getExecutableCandidates(normalized);
  return executableCandidates[0] ?? null;
}

export function resolveCommandPathSync(command: string): string | null {
  const normalized = command.trim();

  if (!normalized) {
    return null;
  }

  if (!isPathLike(normalized) && isCommandDisconnected(normalized)) {
    return null;
  }

  const executableCandidates = getExecutableCandidatesSync(normalized);
  return executableCandidates[0] ?? null;
}

export async function readCommandVersion(
  command: string,
  args: string[] = ["--version"],
): Promise<string | null> {
  const executableCandidates = await getExecutableCandidates(command);

  for (const commandPath of executableCandidates) {
    const version = await readCommandVersionFromPath(commandPath, args);
    if (version) {
      return version;
    }
  }

  return null;
}

export function readCommandVersionSync(
  command: string,
  args: string[] = ["--version"],
): string | null {
  const executableCandidates = getExecutableCandidatesSync(command);

  for (const commandPath of executableCandidates) {
    const version = readCommandVersionFromPathSync(commandPath, args);
    if (version) {
      return version;
    }
  }

  return null;
}

export function extractCommandVersion(output: string): string | null {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const versionLine = lines.find((line) =>
    /\b\d+\.\d+\.\d+\b/.test(line) && !isNonVersionNoise(line),
  );

  if (versionLine) {
    return versionLine;
  }

  return lines.find((line) => !isNonVersionNoise(line)) ?? null;
}

function isNonVersionNoise(line: string) {
  return /^warning:/i.test(line)
    || /^\(node:\d+\)/i.test(line)
    || /^\(use /i.test(line)
    || /deprecationwarning/i.test(line);
}

function isPathLike(command: string) {
  return command.includes("/") || command.includes("\\");
}

function getAugmentedPathEntries(pathValue: string | undefined) {
  return [
    ...(pathValue ?? "").split(path.delimiter).filter(Boolean),
    ...getLoginShellPathEntriesSync(),
    ...EXTRA_PATH_SEGMENTS,
    ...Object.values(COMMAND_CANDIDATE_PATHS).flat().map((entry) => path.dirname(entry)),
  ].filter(Boolean);
}

function getLoginShellPathEntriesSync() {
  if (cachedLoginShellPathEntries) {
    return cachedLoginShellPathEntries;
  }

  if (process.platform === "win32") {
    cachedLoginShellPathEntries = [];
    return cachedLoginShellPathEntries;
  }

  const shellPath = DEFAULT_LOGIN_SHELL || "/bin/zsh";
  const shellProbe = spawnSync(shellPath, ["-lc", 'printf %s "$PATH"'], {
    encoding: "utf8",
    timeout: 1500,
    env: process.env,
  });
  const loginShellPath =
    shellProbe.status === 0 && !shellProbe.error ? shellProbe.stdout.trim() : "";

  cachedLoginShellPathEntries = loginShellPath
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return cachedLoginShellPathEntries;
}

function getCommandCandidates(command: string) {
  const normalized = command.trim();

  if (!normalized) {
    return [];
  }

  if (isPathLike(normalized)) {
    return [normalized];
  }

  return [...new Set([
    ...(COMMAND_CANDIDATE_PATHS[normalized] ?? []),
    ...getPathCandidates(normalized, getCommandEnvironment().PATH),
  ])];
}

function getPathCandidates(command: string, pathValue: string | undefined) {
  const entries = (pathValue ?? "").split(path.delimiter).filter(Boolean);

  if (process.platform !== "win32") {
    return entries.map((entry) => path.join(entry, command));
  }

  const extensions = (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
    .split(";")
    .filter(Boolean);

  return entries.flatMap((entry) => [
    path.join(entry, command),
    ...extensions.map((extension) => path.join(entry, `${command}${extension.toLowerCase()}`)),
  ]);
}

async function isExecutable(targetPath: string) {
  try {
    await access(targetPath, ACCESS_MODE);
    return true;
  } catch {
    return false;
  }
}

function isExecutableSync(targetPath: string) {
  try {
    accessSync(targetPath, ACCESS_MODE);
    return true;
  } catch {
    return false;
  }
}

async function getExecutableCandidates(command: string) {
  const candidates = getCommandCandidates(command);
  const resolved = await Promise.all(
    candidates.map(async (candidate) => ((await isExecutable(candidate)) ? candidate : null)),
  );
  return resolved.filter((candidate): candidate is string => Boolean(candidate));
}

function getExecutableCandidatesSync(command: string) {
  return getCommandCandidates(command).filter((candidate) => isExecutableSync(candidate));
}

async function readCommandVersionFromPath(
  commandPath: string,
  args: string[],
) {
  try {
    const { stdout, stderr } = await execFileAsync(commandPath, args, {
      timeout: 5000,
      env: getCommandEnvironment(),
    });

    return extractCommandVersion(`${stdout ?? ""}\n${stderr ?? ""}`);
  } catch {
    return null;
  }
}

function readCommandVersionFromPathSync(
  commandPath: string,
  args: string[],
) {
  const result = spawnSync(commandPath, args, {
    encoding: "utf8",
    timeout: 5000,
    env: getCommandEnvironment(),
  });

  return extractCommandVersion(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
}
