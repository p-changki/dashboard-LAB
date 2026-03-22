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
    dataRoot: null,
    prdSaveDir: null,
    csContextsDir: null,
    allowedRoots: [],
  },
};

export interface DashboardLabRuntimeSecrets {
  openaiApiKey: string | null;
}

const DEFAULT_SECRETS: DashboardLabRuntimeSecrets = {
  openaiApiKey: null,
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

export function readRuntimeSecrets(): DashboardLabRuntimeSecrets {
  const secretsFile = getSecretsFilePath();

  if (!existsSync(secretsFile)) {
    return DEFAULT_SECRETS;
  }

  try {
    const raw = readFileSync(secretsFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<DashboardLabRuntimeSecrets>;
    return normalizeRuntimeSecrets(parsed);
  } catch {
    return DEFAULT_SECRETS;
  }
}

export function saveRuntimeSecrets(
  next: Partial<DashboardLabRuntimeSecrets>,
): DashboardLabRuntimeSecrets {
  const normalized = normalizeRuntimeSecrets(next);
  const secretsFile = getSecretsFilePath();
  mkdirSync(path.dirname(secretsFile), { recursive: true });
  writeFileSync(secretsFile, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export function updateRuntimeSecrets(
  nextSecrets: Partial<DashboardLabRuntimeSecrets>,
): DashboardLabRuntimeSecrets {
  const current = readRuntimeSecrets();
  return saveRuntimeSecrets({
    ...current,
    ...nextSecrets,
  });
}

export function getOpenAiApiKey() {
  const envValue = process.env.OPENAI_API_KEY?.trim();
  if (envValue) {
    return envValue;
  }

  return readRuntimeSecrets().openaiApiKey;
}

export function hasOpenAiApiKey() {
  return Boolean(getOpenAiApiKey());
}

function normalizeRuntimeSettings(
  value: Partial<DashboardLabRuntimeSettings>,
): DashboardLabRuntimeSettings {
  const paths: Partial<DashboardLabRuntimeSettingsPaths> = value.paths ?? {};

  return {
    version: 1,
    paths: {
      projectsRoot: normalizePath(paths.projectsRoot),
      dataRoot: normalizePath(paths.dataRoot),
      prdSaveDir: normalizePath(paths.prdSaveDir),
      csContextsDir: normalizePath(paths.csContextsDir),
      allowedRoots: normalizePaths(paths.allowedRoots),
    },
  };
}

function normalizeRuntimeSecrets(
  value: Partial<DashboardLabRuntimeSecrets>,
): DashboardLabRuntimeSecrets {
  return {
    openaiApiKey: normalizeSecret(value.openaiApiKey),
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

function normalizeSecret(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getSettingsFilePath() {
  return path.join(getRuntimeDataRoot(), "state", "runtime-settings.json");
}

function getSecretsFilePath() {
  return path.join(getRuntimeDataRoot(), "state", "runtime-secrets.json");
}

function getRuntimeDataRoot() {
  return readEnvPath("DASHBOARD_LAB_DATA_ROOT") ?? path.join(process.cwd(), "data");
}

function readEnvPath(name: string) {
  const value = process.env[name]?.trim();
  return value ? path.resolve(value) : null;
}
