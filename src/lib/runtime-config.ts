import "server-only";

import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import { readRuntimeSettings } from "@/lib/runtime-settings";

export interface DashboardLabRuntimeConfig {
  app: typeof APP_META;
  paths: {
    workspaceRoot: string;
    homeDir: string;
    desktopDir: string;
    downloadsDir: string;
    documentsDir: string;
    dataDir: string;
    stateDir: string;
    modelsDir: string;
    prdSaveDir: string;
    csContextsDir: string;
    projectsRoot: string;
    obsidianVault: string | null;
    allowedRoots: string[];
  };
  discovery: {
    projectsRootCandidates: string[];
    obsidianVaultCandidates: string[];
  };
}

export function getRuntimeConfig(): DashboardLabRuntimeConfig {
  const settings = readRuntimeSettings();
  const workspaceRoot = process.cwd();
  const homeDir = os.homedir();
  const desktopDir = path.join(homeDir, "Desktop");
  const downloadsDir = path.join(homeDir, "Downloads");
  const documentsDir = path.join(homeDir, "Documents");
  const dataDir = readEnvPath("DASHBOARD_LAB_DATA_ROOT") ?? path.join(workspaceRoot, "data");
  const stateDir = path.join(dataDir, "state");
  const modelsDir =
    readEnvPath("DASHBOARD_LAB_MODELS_DIR") ??
    (process.env.DASHBOARD_LAB_DATA_ROOT
      ? path.join(dataDir, "models")
      : path.join(workspaceRoot, "models"));
  const configuredProjectsRoot =
    readEnvPath("DASHBOARD_LAB_PROJECTS_ROOT") ??
    settings.paths.projectsRoot;
  const configuredObsidianVault =
    readEnvPath("DASHBOARD_LAB_OBSIDIAN_VAULT") ??
    settings.paths.obsidianVault;
  const prdSaveDir =
    readEnvPath("DASHBOARD_LAB_PRD_SAVE_DIR") ??
    settings.paths.prdSaveDir ??
    path.join(dataDir, "prd");
  const csContextsDir =
    readEnvPath("DASHBOARD_LAB_CS_CONTEXTS_DIR") ??
    settings.paths.csContextsDir ??
    path.join(workspaceRoot, "cs-contexts");

  const projectsRootCandidates = uniquePaths([
    configuredProjectsRoot,
    desktopDir,
    workspaceRoot,
  ]);
  const projectsRoot =
    configuredProjectsRoot ??
    pickFirstExistingDirectory(projectsRootCandidates) ??
    workspaceRoot;

  const obsidianVaultCandidates = discoverObsidianVaultCandidates(homeDir);
  const obsidianVault =
    configuredObsidianVault ??
    pickFirstExistingDirectory(obsidianVaultCandidates);

  return {
    app: APP_META,
    paths: {
      workspaceRoot,
      homeDir,
      desktopDir,
      downloadsDir,
      documentsDir,
      dataDir,
      stateDir,
      modelsDir,
      prdSaveDir,
      csContextsDir,
      projectsRoot,
      obsidianVault,
      allowedRoots: uniquePaths([
        ...settings.paths.allowedRoots,
        workspaceRoot,
        projectsRoot,
        csContextsDir,
        obsidianVault,
      ]),
    },
    discovery: {
      projectsRootCandidates,
      obsidianVaultCandidates,
    },
  };
}

function discoverObsidianVaultCandidates(homeDir: string) {
  const directCandidates = uniquePaths([
    path.join(homeDir, "Documents", "Obsidian"),
    path.join(homeDir, "Desktop", "Obsidian"),
    path.join(homeDir, "Obsidian"),
  ]);
  const icloudRoot = path.join(
    homeDir,
    "Library",
    "Mobile Documents",
    "com~apple~CloudDocs",
    "Obsidian Vault",
  );

  return uniquePaths([...directCandidates, ...discoverVaultChildren(icloudRoot)]);
}

function discoverVaultChildren(rootPath: string) {
  if (!existsSync(rootPath)) {
    return [] as string[];
  }

  try {
    return readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => path.join(rootPath, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function pickFirstExistingDirectory(candidates: string[]) {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function uniquePaths(candidates: Array<string | null | undefined>) {
  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

function readEnvPath(name: string) {
  const value = process.env[name]?.trim();
  return value ? path.resolve(value) : null;
}
