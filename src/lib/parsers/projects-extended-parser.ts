import { readdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  EnvFileInfo,
  EnvMapResponse,
  GitCommit,
  GitTimelineResponse,
  ICloudBrowseResponse,
  ICloudEntry,
  PortEntry,
  PortUsageResponse,
} from "@/lib/types";
import { getRuntimeConfig } from "@/lib/runtime-config";

import { readThroughCache } from "./cache";
import { resolveSafePath } from "./file-safety";
import { pathExists, runShellCommand, shellQuote, toPosixPath } from "./shared";

const HOME_DIR = os.homedir();
const ICLOUD_ROOT = path.join(HOME_DIR, "Library", "Mobile Documents", "com~apple~CloudDocs");
const CACHE_TTL_MS = 5 * 60 * 1000;
const PORT_USAGE_CACHE_TTL_MS = 10_000;
const ENV_FILES = [".env", ".env.local", ".env.development", ".env.production"];

export async function getGitTimeline(): Promise<GitTimelineResponse> {
  const commits = await readThroughCache(
    buildProjectsCacheKey("projects-git-timeline"),
    CACHE_TTL_MS,
    scanGitTimeline,
  );
  return { commits, totalCommits: commits.length };
}

export async function getPortUsage(): Promise<PortUsageResponse> {
  const ports = await readThroughCache(
    buildProjectsCacheKey("projects-port-usage"),
    PORT_USAGE_CACHE_TTL_MS,
    scanPortUsage,
  );
  return { ports, totalPorts: ports.length };
}

export async function getEnvMap(): Promise<EnvMapResponse> {
  const files = await readThroughCache(
    buildProjectsCacheKey("projects-env-map"),
    CACHE_TTL_MS,
    scanEnvMap,
  );
  const counts = files.flatMap((file) => file.keys).reduce<Record<string, number>>(
    (acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }),
    {},
  );

  return {
    files,
    sharedKeys: Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
      .sort(),
  };
}

export async function browseICloud(relativePath = ""): Promise<ICloudBrowseResponse> {
  validateICloudPath(relativePath);
  const targetPath = resolveSafePath(ICLOUD_ROOT, relativePath) ?? ICLOUD_ROOT;
  const entries = await readICloudEntries(targetPath);

  return {
    rootPath: toPosixPath(ICLOUD_ROOT),
    currentPath: toPosixPath(targetPath),
    entries,
  };
}

async function scanGitTimeline(): Promise<GitCommit[]> {
  const directories = await listProjectDirectories();
  const commits = await Promise.all(directories.map((directory) => readProjectCommits(directory)));

  return commits
    .flat()
    .sort((left, right) => right.authoredAtTimestamp - left.authoredAtTimestamp);
}

async function readProjectCommits(projectPath: string): Promise<GitCommit[]> {
  if (!(await pathExists(path.join(projectPath, ".git")))) {
    return [];
  }

  const output = await runShellCommand(
    'git log --format="%H|%h|%s|%an|%aI" -n 20',
    projectPath,
  );

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseCommitLine(path.basename(projectPath), line))
    .filter((commit): commit is GitCommit => commit !== null);
}

function parseCommitLine(projectName: string, line: string): GitCommit | null {
  const [hash, shortHash, message, author, authoredAt] = line.split("|");

  if (!hash || !shortHash || !message || !author || !authoredAt) {
    return null;
  }

  return {
    projectName,
    hash,
    shortHash,
    message,
    author,
    authoredAt,
    authoredAtTimestamp: new Date(authoredAt).getTime(),
  };
}

async function scanPortUsage(): Promise<PortEntry[]> {
  const output = await runShellCommand("lsof -i -n -P | grep LISTEN");
  const lines = output.split(/\r?\n/).filter(Boolean);
  const portMap = new Map<number, PortEntry>();

  for (const line of lines) {
    const entry = await parsePortLine(line);

    if (entry && !portMap.has(entry.port)) {
      portMap.set(entry.port, entry);
    }
  }

  return [...portMap.values()].sort((left, right) => left.port - right.port);
}

async function parsePortLine(line: string): Promise<PortEntry | null> {
  const columns = line.trim().split(/\s+/);
  const port = Number.parseInt((columns.at(-1) ?? "").split(":").at(-1) ?? "", 10);
  const pid = Number.parseInt(columns[1] ?? "", 10);

  if (!Number.isFinite(port) || !Number.isFinite(pid)) {
    return null;
  }

  return {
    port,
    pid,
    processName: columns[0] ?? "unknown",
    project: await inferProjectFromPid(pid),
  };
}

async function inferProjectFromPid(pid: number) {
  const command = await runShellCommand(`ps -p ${pid} -o command=`);
  const parts = command.split(/\s+/);
  const project = parts.find((part) => part.startsWith(getProjectsRoot()));

  return project ? path.basename(project) : null;
}

async function scanEnvMap(): Promise<EnvFileInfo[]> {
  const directories = await listProjectDirectories();
  const envFiles = await Promise.all(directories.map((directory) => readProjectEnvFiles(directory)));
  return envFiles.flat();
}

async function readProjectEnvFiles(projectPath: string) {
  const projectName = path.basename(projectPath);
  const files = await Promise.all(ENV_FILES.map((fileName) => readEnvFile(projectName, projectPath, fileName)));
  return files.filter((file): file is EnvFileInfo => file !== null);
}

async function readEnvFile(projectName: string, projectPath: string, fileName: string) {
  const filePath = path.join(projectPath, fileName);

  if (!(await pathExists(filePath))) {
    return null;
  }

  const content = await readFile(filePath, "utf8").catch(() => "");
  const keys = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0]?.trim() ?? "")
    .filter(Boolean);

  return {
    projectName,
    projectPath: toPosixPath(projectPath),
    fileName,
    filePath: toPosixPath(filePath),
    keys,
  } satisfies EnvFileInfo;
}

function validateICloudPath(relativePath: string) {
  if (relativePath.includes("..")) {
    throw new Error("INVALID_PATH");
  }
}

async function readICloudEntries(targetPath: string): Promise<ICloudEntry[]> {
  const entries = await readdir(targetPath, { withFileTypes: true }).catch(() => []);
  const mapped = await Promise.all(entries.map((entry) => buildICloudEntry(targetPath, entry.name, entry.isDirectory())));
  const deduped = new Map<string, ICloudEntry>();

  mapped.filter((entry): entry is ICloudEntry => entry !== null).forEach((entry) => {
    if (!deduped.has(entry.path) || entry.isDownloaded) {
      deduped.set(entry.path, entry);
    }
  });

  return [...deduped.values()].sort(sortICloudEntries);
}

async function buildICloudEntry(parentPath: string, entryName: string, isDirectory: boolean) {
  const stubMatch = entryName.match(/^\.(.+)\.icloud$/);
  const displayName = stubMatch ? stubMatch[1] : entryName;
  const absPath = path.join(parentPath, entryName);
  const actualPath = path.join(parentPath, displayName);
  const targetPath = stubMatch ? actualPath : absPath;
  const fileStat = await stat(absPath).catch(() => null);

  if (!fileStat) {
    return null;
  }

  return {
    name: displayName,
    path: toPosixPath(targetPath),
    type: isDirectory ? "folder" : "file",
    sizeBytes: fileStat.size,
    lastModified: fileStat.mtime.toISOString(),
    isDownloaded: !stubMatch,
  } satisfies ICloudEntry;
}

function sortICloudEntries(left: ICloudEntry, right: ICloudEntry) {
  if (left.type !== right.type) {
    return left.type === "folder" ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

async function listProjectDirectories() {
  const projectsRoot = getProjectsRoot();
  const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => path.join(projectsRoot, entry.name));
}

export function buildTrashCommand(targetPath: string) {
  return `mv ${shellQuote(targetPath)} ${shellQuote(path.join(HOME_DIR, ".Trash"))}`;
}

function getProjectsRoot() {
  return getRuntimeConfig().paths.projectsRoot;
}

function buildProjectsCacheKey(scope: string) {
  return `${scope}:${getProjectsRoot()}`;
}
