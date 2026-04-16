import "server-only";

import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import { readRuntimeSettings } from "@/lib/runtime/settings";

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
    allowedRoots: string[];
  };
  discovery: {
    projectsRootCandidates: string[];
  };
}

export function getRuntimeConfig(): DashboardLabRuntimeConfig {
  const settings = readRuntimeSettings();
  const workspaceRoot = process.cwd();
  const homeDir = os.homedir();
  const desktopDir = path.join(homeDir, "Desktop");
  const downloadsDir = path.join(homeDir, "Downloads");
  const documentsDir = path.join(homeDir, "Documents");
  const settingsDataRoot = settings.paths.dataRoot;
  const dataDir =
    readEnvPath("DASHBOARD_LAB_DATA_ROOT") ??
    (settingsDataRoot ? path.join(settingsDataRoot, "dashboard-lab-docs") : null) ??
    path.join(documentsDir, "dashboard-lab-docs");
  const stateDir = path.join(dataDir, "state");
  const electronResourcesModelsDir = getElectronResourcesModelsDir();
  const applicationSupportModelsDir = getApplicationSupportModelsDir(homeDir);
  const modelDirCandidates = uniquePaths(
    electronResourcesModelsDir
      ? [electronResourcesModelsDir, applicationSupportModelsDir, path.join(workspaceRoot, "models")]
      : [path.join(workspaceRoot, "models"), applicationSupportModelsDir],
  );
  const defaultModelsDir =
    pickFirstExistingDirectory(modelDirCandidates) ??
    (electronResourcesModelsDir ?? path.join(workspaceRoot, "models"));
  const modelsDir =
    readEnvPath("DASHBOARD_LAB_MODELS_DIR") ??
    (process.env.DASHBOARD_LAB_DATA_ROOT
      ? path.join(dataDir, "models")
      : defaultModelsDir);
  const configuredProjectsRoot =
    readEnvPath("DASHBOARD_LAB_PROJECTS_ROOT") ??
    settings.paths.projectsRoot;
  const prdSaveDir =
    readEnvPath("DASHBOARD_LAB_PRD_SAVE_DIR") ??
    settings.paths.prdSaveDir ??
    path.join(dataDir, "prd");
  const csContextsDir =
    readEnvPath("DASHBOARD_LAB_CS_CONTEXTS_DIR") ??
    settings.paths.csContextsDir ??
    path.join(dataDir, "cs-contexts");

  const projectsRootCandidates = uniquePaths([
    configuredProjectsRoot,
    desktopDir,
    workspaceRoot,
  ]);
  const projectsRoot =
    configuredProjectsRoot ??
    pickFirstExistingDirectory(projectsRootCandidates) ??
    workspaceRoot;

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
      allowedRoots: uniquePaths([
        ...settings.paths.allowedRoots,
        workspaceRoot,
        projectsRoot,
        csContextsDir,
      ]),
    },
    discovery: {
      projectsRootCandidates,
    },
  };
}

function pickFirstExistingDirectory(candidates: string[]) {
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function uniquePaths(candidates: Array<string | null | undefined>) {
  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

function getElectronResourcesModelsDir() {
  const envResourcesPath = readEnvPath("ELECTRON_RESOURCES_PATH");
  if (envResourcesPath) {
    return path.join(envResourcesPath, "models");
  }

  const runtimeResourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath?.trim();
  return runtimeResourcesPath ? path.join(path.resolve(runtimeResourcesPath), "models") : null;
}

function getApplicationSupportModelsDir(homeDir: string) {
  if (process.platform !== "darwin") {
    return null;
  }

  return path.join(homeDir, "Library", "Application Support", "dashboard-lab", "models");
}

function readEnvPath(name: string) {
  const value = process.env[name]?.trim();
  return value ? path.resolve(value) : null;
}
