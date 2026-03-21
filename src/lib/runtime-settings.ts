import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  DashboardLabRuntimeSettings,
  DashboardLabRuntimeSettingsPaths,
} from "@/lib/types";

const DEFAULT_SETTINGS: DashboardLabRuntimeSettings = {
  version: 1,
  paths: {
    projectsRoot: null,
    obsidianVault: null,
    prdSaveDir: null,
    csContextsDir: null,
    allowedRoots: [],
  },
};

export function readRuntimeSettings(): DashboardLabRuntimeSettings {
  const settingsFile = getSettingsFilePath();

  if (!existsSync(settingsFile)) {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = readFileSync(settingsFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<DashboardLabRuntimeSettings>;
    return normalizeRuntimeSettings(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveRuntimeSettings(
  next: Partial<DashboardLabRuntimeSettings>,
): DashboardLabRuntimeSettings {
  const normalized = normalizeRuntimeSettings(next);
  const settingsFile = getSettingsFilePath();
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  writeFileSync(settingsFile, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export function updateRuntimeSettings(
  nextPaths: Partial<DashboardLabRuntimeSettingsPaths>,
): DashboardLabRuntimeSettings {
  const current = readRuntimeSettings();
  return saveRuntimeSettings({
    ...current,
    paths: {
      ...current.paths,
      ...nextPaths,
    },
  });
}

function normalizeRuntimeSettings(
  value: Partial<DashboardLabRuntimeSettings>,
): DashboardLabRuntimeSettings {
  const paths: Partial<DashboardLabRuntimeSettingsPaths> = value.paths ?? {};

  return {
    version: 1,
    paths: {
      projectsRoot: normalizePath(paths.projectsRoot),
      obsidianVault: normalizePath(paths.obsidianVault),
      prdSaveDir: normalizePath(paths.prdSaveDir),
      csContextsDir: normalizePath(paths.csContextsDir),
      allowedRoots: normalizePaths(paths.allowedRoots),
    },
  };
}

function normalizePath(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? path.resolve(trimmed) : null;
}

function normalizePaths(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return [...new Set(value.map(normalizePath).filter((item): item is string => Boolean(item)))];
}

function getSettingsFilePath() {
  return path.join(getRuntimeDataRoot(), "state", "runtime-settings.json");
}

function getRuntimeDataRoot() {
  return readEnvPath("DASHBOARD_LAB_DATA_ROOT") ?? path.join(process.cwd(), "data");
}

function readEnvPath(name: string) {
  const value = process.env[name]?.trim();
  return value ? path.resolve(value) : null;
}
