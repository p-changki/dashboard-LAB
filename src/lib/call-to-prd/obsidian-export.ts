import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const OBSIDIAN_SETTINGS_FILE = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "dashboard-lab",
  "settings.json",
);

interface ObsidianExportInput {
  title?: string | null;
  bundleId?: string | null;
  projectName?: string | null;
  customerName?: string | null;
  createdAt?: string | null;
  markdown: string;
}

export interface CallToPrdObsidianStatus {
  configured: boolean;
  vaultPath: string | null;
  targetDirectory: string | null;
  sourceSettingsFile: string | null;
}

export interface CallToPrdObsidianExportResult extends CallToPrdObsidianStatus {
  fileName: string;
  filePath: string;
}

export function getCallToPrdObsidianStatus(): CallToPrdObsidianStatus {
  const homeDir = os.homedir();
  const configuredVault = resolveConfiguredVaultPath();

  if (!configuredVault || !existsSync(configuredVault.vaultPath) || !isPathWithinRoot(configuredVault.vaultPath, homeDir)) {
    return {
      configured: false,
      vaultPath: null,
      targetDirectory: null,
      sourceSettingsFile: configuredVault?.sourceSettingsFile ?? null,
    };
  }

  const targetDirectory = resolveTargetDirectory(configuredVault.vaultPath);

  return {
    configured: true,
    vaultPath: configuredVault.vaultPath,
    targetDirectory,
    sourceSettingsFile: configuredVault.sourceSettingsFile,
  };
}

export function exportCallToPrdToObsidian(
  input: ObsidianExportInput,
): CallToPrdObsidianExportResult {
  const status = getCallToPrdObsidianStatus();

  if (!status.configured || !status.targetDirectory) {
    throw new Error("Obsidian vault path is not configured.");
  }

  mkdirSync(status.targetDirectory, { recursive: true });

  const createdAt = normalizeDate(input.createdAt);
  const fileName = buildUniqueFileName(
    status.targetDirectory,
    `${createdAt.slice(0, 10)}-${slugify(input.title ?? input.projectName ?? "call-to-prd") || "call-to-prd"}.md`,
  );
  const filePath = path.join(status.targetDirectory, fileName);

  writeFileSync(filePath, buildObsidianNote(input, createdAt), "utf8");

  return {
    ...status,
    fileName,
    filePath,
  };
}

function buildObsidianNote(input: ObsidianExportInput, createdAt: string) {
  const title = input.title?.trim() || input.projectName?.trim() || "Call-to-PRD";
  const frontmatter = [
    "---",
    `title: "${escapeYaml(title)}"`,
    `created: "${createdAt}"`,
    `source: "call-to-prd"`,
    input.projectName?.trim() ? `project: "${escapeYaml(input.projectName.trim())}"` : null,
    input.customerName?.trim() ? `customer: "${escapeYaml(input.customerName.trim())}"` : null,
    input.bundleId?.trim() ? `bundle: "${escapeYaml(input.bundleId.trim())}"` : null,
    "tags:",
    "  - call-to-prd",
    "  - prd",
    "---",
  ].filter((line): line is string => Boolean(line));

  return `${frontmatter.join("\n")}\n\n${input.markdown.trim()}\n`;
}

function resolveConfiguredVaultPath() {
  for (const candidate of getSettingsFileCandidates()) {
    if (!existsSync(candidate)) {
      continue;
    }

    try {
      const raw = readFileSync(candidate, "utf8");
      const parsed = JSON.parse(raw) as { paths?: { obsidianVault?: unknown } };
      const value = typeof parsed.paths?.obsidianVault === "string"
        ? parsed.paths.obsidianVault.trim()
        : "";

      if (value) {
        return {
          vaultPath: path.resolve(value),
          sourceSettingsFile: candidate,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getSettingsFileCandidates() {
  const envDataRoot = process.env.DASHBOARD_LAB_DATA_ROOT?.trim();
  const runtimeSettingsFile = path.join(
    envDataRoot ? path.resolve(envDataRoot) : path.join(process.cwd(), "data"),
    "state",
    "runtime-settings.json",
  );

  return [OBSIDIAN_SETTINGS_FILE, runtimeSettingsFile];
}

function resolveTargetDirectory(vaultPath: string) {
  const inboxPath = path.join(vaultPath, "Inbox");
  return existsSync(inboxPath) ? inboxPath : vaultPath;
}

function normalizeDate(value: string | null | undefined) {
  const candidate = value ? new Date(value) : new Date();
  if (Number.isNaN(candidate.getTime())) {
    return new Date().toISOString();
  }

  return candidate.toISOString();
}

function buildUniqueFileName(targetDirectory: string, preferredName: string) {
  const extension = path.extname(preferredName) || ".md";
  const stem = preferredName.slice(0, -extension.length);
  let attempt = 0;

  while (attempt < 50) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const fileName = `${stem}${suffix}${extension}`;
    if (!existsSync(path.join(targetDirectory, fileName))) {
      return fileName;
    }
    attempt += 1;
  }

  return `${stem}-${Date.now()}${extension}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeYaml(value: string) {
  return value.replace(/"/g, '\\"');
}

function isPathWithinRoot(targetPath: string, rootPath: string) {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
