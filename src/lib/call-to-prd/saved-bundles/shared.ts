import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type {
  CallDocPreset,
  CallDocType,
} from "@/lib/call-to-prd/document-config";
import type { CallIntakeMetadata } from "@/lib/call-to-prd/intake-config";
import type {
  CallGenerationMode,
  CallNextActionType,
  GeneratedDoc,
} from "@/lib/types/call-to-prd";
import { getRuntimeConfig } from "@/lib/runtime/config";

export interface SavedBundleManifest {
  version: 1 | 2 | 3 | 4 | 5 | 6;
  id: string;
  title: string;
  createdAt: string;
  callDate: string;
  projectName: string | null;
  projectPath?: string | null;
  customerName: string | null;
  projectContext?: string | null;
  projectContextSources?: string[];
  projectContextError?: string | null;
  generationMode?: CallGenerationMode;
  baselineEntryName?: string | null;
  baselineTitle?: string | null;
  generationPreset: CallDocPreset;
  selectedDocTypes: CallDocType[];
  intake?: CallIntakeMetadata;
  generationWarnings: string[];
  generatedDocs: Array<{
    type: CallDocType;
    title: string;
    fileName: string;
  }>;
  nextActions?: Array<{
    actionType: CallNextActionType;
    title: string;
    fileName: string;
    createdAt: string;
  }>;
  artifacts: {
    claudePrdFileName: string | null;
    codexPrdFileName: string | null;
    diffReportFileName: string | null;
  };
  summary?: {
    preview: string;
    sizeBytes: number;
    docCount: number;
    docTypes: CallDocType[];
  };
}

export function buildSavedBundleEntryName(
  id: string,
  _projectName: string | null,
  customerName: string | null,
  callDate: string,
): string {
  const date = callDate || new Date().toISOString().slice(0, 10);
  const customer = customerName ? `_${sanitizeFileName(customerName)}` : "";
  return `${date}${customer}_${id.slice(0, 8)}`;
}

/**
 * Build the full entry path including the project subfolder.
 * Use this when looking up a bundle by its constituent fields.
 */
export function buildSavedBundleEntryPath(
  id: string,
  projectName: string | null,
  customerName: string | null,
  callDate: string,
): string {
  const projectFolder = sanitizeFileName(projectName ?? "general");
  const bundleName = buildSavedBundleEntryName(id, projectName, customerName, callDate);
  return `${projectFolder}/${bundleName}`;
}

export function buildBundleTitle(projectName: string | null, customerName: string | null): string {
  if (projectName && customerName) {
    return `${projectName} · ${customerName}`;
  }
  return projectName ?? customerName ?? "Call To PRD";
}


export async function readBundleManifest(entryName: string): Promise<SavedBundleManifest | null> {
  if (!isSafeEntryName(entryName)) {
    return null;
  }

  const manifestPath = path.join(getPrdSaveDir(), entryName, "manifest.json");
  const raw = await readFile(manifestPath, "utf-8").catch(() => null);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SavedBundleManifest;
  } catch {
    return null;
  }
}

export async function getDirectorySize(directoryPath: string): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true }).catch(() => []);
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return getDirectorySize(fullPath);
      }

      if (entry.isFile()) {
        const fileStat = await stat(fullPath).catch(() => null);
        return fileStat?.size ?? 0;
      }

      return 0;
    }),
  );

  return sizes.reduce((sum, size) => sum + size, 0);
}

export function isSafeEntryName(entryName: string): boolean {
  if (entryName.includes("..") || entryName.includes("\\")) {
    return false;
  }

  // Allow at most one "/" for project subfolder paths (e.g., "general/2026-03-22_abc12345")
  const segments = entryName.split("/");
  return segments.length <= 2 && segments.every((segment) => segment.length > 0);
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-").slice(0, 50);
}

export function getPreview(markdown: string): string {
  return markdown.replace(/\n+/g, " ").slice(0, 120);
}

export function getBundlePayloadSize(
  generatedDocs: readonly GeneratedDoc[],
  claudePrd: string | null,
  codexPrd: string | null,
  diffReport: string | null,
): number {
  return [
    ...generatedDocs.map((doc) => doc.markdown),
    claudePrd,
    codexPrd,
    diffReport,
  ].reduce((sum, content) => sum + Buffer.byteLength(content ?? "", "utf8"), 0);
}

export function buildNextActionFileName(actionType: CallNextActionType): string {
  return {
    "pm-handoff": "01-pm-handoff.md",
    "frontend-plan": "02-frontend-plan.md",
    "backend-plan": "03-backend-plan.md",
    "qa-plan": "04-qa-plan.md",
    "cs-brief": "05-cs-brief.md",
    "github-issues": "06-github-issues.md",
  }[actionType];
}


export function getPrdSaveDir() {
  return getRuntimeConfig().paths.prdSaveDir;
}
