import { rm } from "node:fs/promises";
import path from "node:path";

import type { GitBatchStatus, NodeModulesCleanupResponse } from "@/lib/types";

import { clearCache, readThroughCache } from "./cache";
import { parseProjects } from "./projects-parser";
import { formatBytes, runShellCommand } from "./shared";

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getGitBatchStatus(): Promise<GitBatchStatus> {
  return readThroughCache("projects-git-batch", CACHE_TTL_MS, scanGitBatchStatus);
}

export async function cleanNodeModules(dryRun = true, projectPaths: string[] = []): Promise<NodeModulesCleanupResponse> {
  const projects = await parseProjects();
  const items = projects.projects
    .filter((project) => projectPaths.length === 0 || projectPaths.includes(project.path))
    .filter((project) => project.diskUsage.nodeModulesBytes > 0)
    .map((project) => ({
      project: project.name,
      projectPath: project.path,
      targetPath: path.join(project.path, "node_modules"),
      sizeBytes: project.diskUsage.nodeModulesBytes,
      sizeHuman: project.diskUsage.nodeModules ?? formatBytes(project.diskUsage.nodeModulesBytes),
    }));

  if (!dryRun) {
    await Promise.all(items.map((item) => rm(item.targetPath, { recursive: true, force: true })));
    clearCache("projects-heavy");
    clearCache("projects-light");
    clearCache("search-projects");
    clearCache("projects-git-batch");
  }

  const totalBytes = items.reduce((sum, item) => sum + item.sizeBytes, 0);
  return {
    dryRun,
    items,
    totalTargets: items.length,
    totalSize: formatBytes(totalBytes),
    commandPreview: items.map((item) => `rm -rf "${item.targetPath}"`),
    selectedPaths: items.map((item) => item.projectPath),
  };
}

async function scanGitBatchStatus(): Promise<GitBatchStatus> {
  const projects = await parseProjects();
  const statuses = await Promise.all(projects.projects.map((project) => inspectGitProject(project.path, project.name)));
  const uncommitted = statuses.filter((item) => item.kind === "uncommitted");
  const unpushed = statuses.filter((item) => item.kind === "unpushed");
  const clean = statuses.filter((item) => item.kind === "clean");
  const noGit = statuses.filter((item) => item.kind === "nogit").map((item) => item.project);

  return {
    uncommitted,
    unpushed,
    clean,
    noGit,
    summary: {
      totalProjects: projects.totalProjects,
      uncommittedCount: uncommitted.length,
      unpushedCount: unpushed.length,
      cleanCount: clean.length,
      noGitCount: noGit.length,
    },
  };
}

async function inspectGitProject(projectPath: string, project: string) {
  const branch = (await runShellCommand("git branch --show-current", projectPath)) || "unknown";
  const gitDir = await runShellCommand("git rev-parse --git-dir", projectPath);

  if (!gitDir) {
    return { kind: "nogit" as const, project, branch };
  }

  const [statusOutput, aheadOutput, lastCommitDate] = await Promise.all([
    runShellCommand("git status --porcelain", projectPath),
    runShellCommand("git rev-list --count @{u}..HEAD 2>/dev/null || echo 0", projectPath),
    runShellCommand('git log -1 --format="%ai"', projectPath),
  ]);
  const statusLines = statusOutput.split(/\r?\n/).filter(Boolean);
  const changedFiles = statusLines.filter((line) => !line.startsWith("??")).length;
  const untrackedFiles = statusLines.filter((line) => line.startsWith("??")).length;
  const aheadCount = Number.parseInt(aheadOutput || "0", 10) || 0;

  if (changedFiles > 0 || untrackedFiles > 0) {
    return { kind: "uncommitted" as const, project, branch, changedFiles, untrackedFiles };
  }

  if (aheadCount > 0) {
    return { kind: "unpushed" as const, project, branch, aheadCount };
  }

  return { kind: "clean" as const, project, branch, lastCommitDate: lastCommitDate || null };
}
