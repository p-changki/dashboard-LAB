import { exec } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { APP_META } from "@/lib/app-meta";
import { getRuntimeConfig } from "@/lib/runtime-config";
import type {
  CleanupAction,
  ProjectInfo,
  ProjectSummary,
  ProjectsLiteResponse,
  ProjectsResponse,
} from "@/lib/types";

import { readThroughCache } from "./cache";
import { isRecord, pathExists, toPosixPath } from "./shared";

const execAsync = promisify(exec);
const PROJECTS_ROOT = getRuntimeConfig().paths.projectsRoot;
const PROJECTS_CACHE_TTL_MS = 30_000;
const EXCLUDE_DIRS = new Set([
  ".Trash",
  ".localized",
  APP_META.slug,
  path.basename(process.cwd()),
  "node_modules",
  "$RECYCLE.BIN",
]);

export async function parseProjects(): Promise<ProjectsResponse> {
  return readThroughCache("projects-heavy", PROJECTS_CACHE_TTL_MS, loadProjects);
}

export async function parseProjectsLite(): Promise<ProjectsLiteResponse> {
  return readThroughCache("projects-light", PROJECTS_CACHE_TTL_MS, loadProjectsLite);
}

export async function inspectProject(projectPath: string): Promise<ProjectInfo | null> {
  const target = await validateProjectDirectory(projectPath);

  if (!target) {
    return null;
  }

  return scanProject(target);
}

export async function inspectProjectSummary(projectPath: string): Promise<ProjectSummary | null> {
  const target = await validateProjectDirectory(projectPath);

  if (!target) {
    return null;
  }

  return scanProjectSummary(target);
}

async function loadProjects(): Promise<ProjectsResponse> {
  const directories = await listDesktopDirectories();
  const projects = (
    await Promise.all(directories.map((directoryPath) => inspectProject(directoryPath)))
  )
    .filter((project): project is ProjectInfo => project !== null)
    .sort((left, right) => left.name.localeCompare(right.name));

  const totalDiskUsageBytes = projects.reduce(
    (sum, project) => sum + project.diskUsage.totalBytes,
    0,
  );
  const cleanableSizeBytes = projects.reduce(
    (sum, project) =>
      sum +
      project.cleanupActions.reduce(
        (projectSum, action) => projectSum + action.sizeBytes,
        0,
      ),
    0,
  );

  return {
    scanPath: toPosixPath(PROJECTS_ROOT),
    totalProjects: projects.length,
    totalDiskUsage: formatBytes(totalDiskUsageBytes),
    totalDiskUsageBytes,
    cleanableSize: formatBytes(cleanableSizeBytes),
    cleanableSizeBytes,
    projects,
  };
}

async function loadProjectsLite(): Promise<ProjectsLiteResponse> {
  const directories = await listDesktopDirectories();
  const projects = (
    await Promise.all(directories.map((directoryPath) => inspectProjectSummary(directoryPath)))
  )
    .filter((project): project is ProjectSummary => project !== null)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    scanPath: toPosixPath(PROJECTS_ROOT),
    totalProjects: projects.length,
    projects,
  };
}

async function validateProjectDirectory(projectPath: string): Promise<string | null> {
  if (!(await pathExists(projectPath))) {
    return null;
  }

  const target = await stat(projectPath).catch(() => null);
  if (!target?.isDirectory()) {
    return null;
  }

  return projectPath;
}

async function scanProjectSummary(projectPath: string): Promise<ProjectSummary> {
  const [projectType, techStack, hasGit] = await Promise.all([
    detectProjectType(projectPath),
    detectTechStack(projectPath),
    pathExists(path.join(projectPath, ".git")),
  ]);

  return {
    name: path.basename(projectPath),
    path: toPosixPath(projectPath),
    type: projectType,
    techStack,
    hasGit,
  };
}

async function scanProject(projectPath: string): Promise<ProjectInfo> {
  const [summary, gitInfo, diskUsage, modified] = await Promise.all([
    scanProjectSummary(projectPath),
    detectGitInfo(projectPath),
    detectDiskUsage(projectPath),
    stat(projectPath),
  ]);

  return {
    ...summary,
    gitBranch: gitInfo.gitBranch,
    lastCommitDate: gitInfo.lastCommitDate,
    lastCommitMessage: gitInfo.lastCommitMessage,
    lastCommitTimestamp: gitInfo.lastCommitTimestamp,
    hasUncommitted: gitInfo.hasUncommitted,
    diskUsage,
    lastModified: modified.mtime.toISOString(),
    lastModifiedTimestamp: modified.mtimeMs,
    cleanupActions: buildCleanupActions(projectPath, diskUsage),
  };
}

async function listDesktopDirectories(): Promise<string[]> {
  try {
    const entries = await readdir(PROJECTS_ROOT, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !entry.name.startsWith("."))
      .filter((entry) => !EXCLUDE_DIRS.has(entry.name))
      .map((entry) => path.join(PROJECTS_ROOT, entry.name));
  } catch {
    return [];
  }
}

async function detectProjectType(
  projectPath: string,
): Promise<ProjectSummary["type"]> {
  const [hasTurbo, hasNextTs, hasNextJs, hasPackageJson, hasMarkdown] =
    await Promise.all([
      pathExists(path.join(projectPath, "turbo.json")),
      pathExists(path.join(projectPath, "next.config.ts")),
      pathExists(path.join(projectPath, "next.config.js")),
      pathExists(path.join(projectPath, "package.json")),
      hasRootMarkdown(projectPath),
    ]);

  if (hasTurbo) {
    return "turbo";
  }

  if (hasNextTs || hasNextJs) {
    return "nextjs";
  }

  if (hasPackageJson) {
    return "node-backend";
  }

  if (hasMarkdown) {
    return "document";
  }

  return "other";
}

async function hasRootMarkdown(projectPath: string): Promise<boolean> {
  try {
    const entries = await readdir(projectPath, { withFileTypes: true });

    return entries.some((entry) => entry.isFile() && /\.md$/i.test(entry.name));
  } catch {
    return false;
  }
}

async function detectTechStack(projectPath: string): Promise<string[]> {
  const packageJsonPath = path.join(projectPath, "package.json");
  const raw = await readFileOrNull(packageJsonPath);

  if (!raw) {
    return [];
  }

  const manifest = parsePackageManifest(raw);
  const dependencyNames = [
    ...Object.keys(manifest.dependencies),
    ...Object.keys(manifest.devDependencies),
  ];

  return [
    hasDependency(dependencyNames, "next") ? "Next.js" : null,
    hasDependency(dependencyNames, "react") ? "React" : null,
    hasAnyDependency(dependencyNames, ["express", "fastify", "hono"])
      ? "Backend"
      : null,
    hasDependency(dependencyNames, "prisma") ? "Prisma" : null,
    hasDependency(dependencyNames, "drizzle-orm") ? "Drizzle" : null,
    hasDependency(dependencyNames, "tailwindcss") ? "Tailwind CSS" : null,
    hasDependency(dependencyNames, "typescript") ? "TypeScript" : null,
    hasDependency(dependencyNames, "turbo") ? "Turborepo" : null,
  ].filter((item): item is string => item !== null);
}

async function detectGitInfo(projectPath: string) {
  const hasGit = await pathExists(path.join(projectPath, ".git"));

  if (!hasGit) {
    return {
      hasGit: false,
      gitBranch: null,
      lastCommitDate: null,
      lastCommitMessage: null,
      lastCommitTimestamp: null,
      hasUncommitted: false,
    };
  }

  const [branch, logOutput, statusOutput] = await Promise.all([
    runCommand('git branch --show-current', projectPath),
    runCommand('git log -1 --format="%ai|%s"', projectPath),
    runCommand("git status --porcelain", projectPath),
  ]);
  const [lastCommitDate, lastCommitMessage] = logOutput
    ? logOutput.split("|")
    : [null, null];

  return {
    hasGit: true,
    gitBranch: branch || null,
    lastCommitDate: lastCommitDate || null,
    lastCommitMessage: lastCommitMessage || null,
    lastCommitTimestamp: lastCommitDate
      ? new Date(lastCommitDate).getTime()
      : null,
    hasUncommitted: Boolean(statusOutput),
  };
}

async function detectDiskUsage(projectPath: string): Promise<ProjectInfo["diskUsage"]> {
  const [total, nodeModules, nextCache, turboCache] = await Promise.all([
    getDirectorySize(projectPath),
    getDirectorySize(path.join(projectPath, "node_modules")),
    getDirectorySize(path.join(projectPath, ".next")),
    getDirectorySize(path.join(projectPath, ".turbo")),
  ]);

  return {
    total: total?.label ?? "0B",
    totalBytes: total?.bytes ?? 0,
    nodeModules: nodeModules?.label ?? null,
    nodeModulesBytes: nodeModules?.bytes ?? 0,
    nextCache: nextCache?.label ?? null,
    nextCacheBytes: nextCache?.bytes ?? 0,
    turboCache: turboCache?.label ?? null,
    turboCacheBytes: turboCache?.bytes ?? 0,
  };
}

function buildCleanupActions(
  projectPath: string,
  diskUsage: ProjectInfo["diskUsage"],
): CleanupAction[] {
  return [
    buildCleanupAction(projectPath, "node_modules", "node_modules 삭제", diskUsage.nodeModulesBytes),
    buildCleanupAction(projectPath, ".next", ".next 삭제", diskUsage.nextCacheBytes),
    buildCleanupAction(projectPath, ".turbo", ".turbo 삭제", diskUsage.turboCacheBytes),
  ].filter((action): action is CleanupAction => action !== null);
}

function buildCleanupAction(
  projectPath: string,
  targetName: string,
  label: string,
  sizeBytes: number,
): CleanupAction | null {
  if (sizeBytes <= 0) {
    return null;
  }

  return {
    label: `${label} (${formatBytes(sizeBytes)})`,
    command: `rm -rf ${shellQuote(path.join(projectPath, targetName))}`,
    sizeFreeable: formatBytes(sizeBytes),
    sizeBytes,
  };
}

async function getDirectorySize(targetPath: string) {
  if (!(await pathExists(targetPath))) {
    return null;
  }

  const raw = await runCommand(`du -sk ${shellQuote(targetPath)}`);

  if (!raw) {
    return null;
  }

  const sizeKb = Number.parseInt(raw.split(/\s+/)[0] ?? "0", 10);
  const bytes = Number.isFinite(sizeKb) ? sizeKb * 1024 : 0;

  return {
    label: formatBytes(bytes),
    bytes,
  };
}

async function runCommand(command: string, cwd?: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command, {
      cwd,
      env: process.env,
      timeout: 5000,
    });

    return stdout.trim();
  } catch {
    return "";
  }
}

async function readFileOrNull(targetPath: string): Promise<string | null> {
  try {
    return await readFile(targetPath, "utf8");
  } catch {
    return null;
  }
}

function parsePackageManifest(source: string) {
  try {
    const parsed = JSON.parse(source) as unknown;
    const manifest = isRecord(parsed) ? parsed : {};

    return {
      dependencies: isRecord(manifest.dependencies) ? manifest.dependencies : {},
      devDependencies: isRecord(manifest.devDependencies)
        ? manifest.devDependencies
        : {},
    };
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}

function hasDependency(dependencies: string[], keyword: string): boolean {
  return dependencies.includes(keyword);
}

function hasAnyDependency(
  dependencies: string[],
  keywords: string[],
): boolean {
  return keywords.some((keyword) => dependencies.includes(keyword));
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}${units[unitIndex]}`;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
