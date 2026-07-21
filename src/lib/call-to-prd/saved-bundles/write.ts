import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CALL_DOC_DEFINITIONS,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import type { CallIntakeMetadata } from "@/lib/call-to-prd/intake-config";
import type {
  CallGenerationMode,
  CallNextActionType,
  GeneratedDoc,
  SavedNextActionDraft,
} from "@/lib/types/call-to-prd";
import {
  buildBundleTitle,
  buildNextActionFileName,
  buildSavedBundleEntryName,
  getBundlePayloadSize,
  getDirectorySize,
  getPreview,
  getPrdSaveDir,
  isSafeEntryName,
  readBundleManifest,
  sanitizeFileName,
  type SavedBundleManifest,
} from "@/lib/call-to-prd/saved-bundles/shared";

interface SaveBundleOptions {
  id: string;
  projectName: string | null;
  projectPath: string | null;
  customerName: string | null;
  projectContext: string | null;
  projectContextSources: string[];
  projectContextError: string | null;
  generationMode: CallGenerationMode;
  baselineEntryName?: string | null;
  baselineTitle?: string | null;
  callDate: string;
  generationPreset: CallDocPreset;
  generatedDocs: GeneratedDoc[];
  selectedDocTypes: CallDocType[];
  intake: CallIntakeMetadata;
  generationWarnings: string[];
  claudePrd: string | null;
  codexPrd: string | null;
  diffReport: string | null;
}

export async function saveGeneratedDocsBundle(options: SaveBundleOptions): Promise<string> {
  const {
    id,
    projectName,
    projectPath,
    customerName,
    projectContext,
    projectContextSources,
    projectContextError,
    baselineEntryName,
    baselineTitle,
    callDate,
    generationPreset,
    generatedDocs,
    selectedDocTypes,
    intake,
    generationWarnings,
    claudePrd,
    codexPrd,
    diffReport,
  } = options;

  await mkdir(getPrdSaveDir(), { recursive: true });

  const bundleName = buildSavedBundleEntryName(id, projectName, customerName, callDate);
  const projectFolder = sanitizeFileName(projectName ?? "general");
  const bundlePath = path.join(getPrdSaveDir(), projectFolder, bundleName);
  await mkdir(bundlePath, { recursive: true });

  const manifestDocs: SavedBundleManifest["generatedDocs"] = [];
  for (const doc of generatedDocs) {
    const fileName = CALL_DOC_DEFINITIONS[doc.type].fileName;
    manifestDocs.push({ type: doc.type, title: doc.title, fileName });
    await writeFile(path.join(bundlePath, fileName), doc.markdown, "utf-8");
  }

  const artifacts = {
    claudePrdFileName: claudePrd ? "90-claude-prd.md" : null,
    codexPrdFileName: codexPrd ? "91-codex-prd.md" : null,
    diffReportFileName: diffReport ? "92-diff-report.md" : null,
  };

  if (claudePrd) {
    await writeFile(path.join(bundlePath, artifacts.claudePrdFileName as string), claudePrd, "utf-8");
  }
  if (codexPrd) {
    await writeFile(path.join(bundlePath, artifacts.codexPrdFileName as string), codexPrd, "utf-8");
  }
  if (diffReport) {
    await writeFile(path.join(bundlePath, artifacts.diffReportFileName as string), diffReport, "utf-8");
  }

  const manifest: SavedBundleManifest = {
    version: 6,
    id,
    title: buildBundleTitle(projectName, customerName),
    createdAt: new Date().toISOString(),
    callDate,
    projectName,
    projectPath,
    customerName,
    projectContext,
    projectContextSources,
    projectContextError,
    generationMode: options.generationMode,
    baselineEntryName: baselineEntryName ?? null,
    baselineTitle: baselineTitle ?? null,
    generationPreset,
    selectedDocTypes,
    intake,
    generationWarnings,
    generatedDocs: manifestDocs,
    nextActions: [],
    artifacts,
    summary: {
      preview: getPreview((generatedDocs.find((doc) => doc.type === "prd") ?? generatedDocs[0])?.markdown ?? ""),
      sizeBytes: getBundlePayloadSize(generatedDocs, claudePrd, codexPrd, diffReport),
      docCount: generatedDocs.length,
      docTypes: generatedDocs.map((doc) => doc.type),
    },
  };

  await writeFile(path.join(bundlePath, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");

  return `${projectFolder}/${bundleName}`;
}

export async function saveNextActionDraft(
  entryName: string,
  draft: {
    actionType: CallNextActionType;
    title: string;
    markdown: string;
    createdAt: string;
  },
): Promise<SavedNextActionDraft | null> {
  if (!isSafeEntryName(entryName)) {
    return null;
  }

  const bundlePath = path.join(getPrdSaveDir(), entryName);
  const bundleStat = await stat(bundlePath).catch(() => null);

  if (!bundleStat?.isDirectory()) {
    return null;
  }

  const manifest = await readBundleManifest(entryName);
  if (!manifest) {
    return null;
  }

  const nextActionsDir = path.join(bundlePath, "next-actions");
  await mkdir(nextActionsDir, { recursive: true });

  const fileName = path.posix.join("next-actions", buildNextActionFileName(draft.actionType));
  await writeFile(path.join(bundlePath, fileName), draft.markdown, "utf-8");

  const nextActions = [
    ...(manifest.nextActions ?? []).filter((item) => item.actionType !== draft.actionType),
    {
      actionType: draft.actionType,
      title: draft.title,
      fileName,
      createdAt: draft.createdAt,
    },
  ].sort((left, right) => left.fileName.localeCompare(right.fileName));

  const bundleSize = await getDirectorySize(bundlePath);

  const updatedManifest: SavedBundleManifest = {
    ...manifest,
    version: 6,
    nextActions,
    summary: manifest.summary
      ? {
          ...manifest.summary,
          sizeBytes: bundleSize,
        }
      : undefined,
  };

  await writeFile(path.join(bundlePath, "manifest.json"), JSON.stringify(updatedManifest, null, 2), "utf-8");

  return {
    actionType: draft.actionType,
    title: draft.title,
    markdown: draft.markdown,
    fileName,
    createdAt: draft.createdAt,
  };
}

/**
 * Overwrite a single document inside a saved bundle and refresh the manifest.
 *
 * Owns the manifest read/merge/write that previously lived inline in the
 * section-regenerate route. Only the document body and the derived summary
 * change; generatedDocs entries are left as-is (section lists are recomputed
 * from markdown on read, so they are not persisted here).
 *
 * Returns the updated manifest, or null when the bundle or document is missing.
 */
export async function updateBundleDocMarkdown(
  entryName: string,
  docType: CallDocType,
  markdown: string,
): Promise<SavedBundleManifest | null> {
  const manifest = await readBundleManifest(entryName);
  if (!manifest) {
    return null;
  }

  const targetDoc = manifest.generatedDocs.find((doc) => doc.type === docType);
  if (!targetDoc) {
    return null;
  }

  const bundlePath = path.join(getPrdSaveDir(), entryName);
  await writeFile(path.join(bundlePath, targetDoc.fileName), markdown, "utf-8");

  const previewDoc = manifest.generatedDocs.find((doc) => doc.type === "prd") ?? targetDoc;
  const previewSource = await readFile(path.join(bundlePath, previewDoc.fileName), "utf-8").catch(() => markdown);

  const nextManifest: SavedBundleManifest = {
    ...manifest,
    version: Math.max(manifest.version, 6) as SavedBundleManifest["version"],
    summary: {
      preview: getPreview(previewSource),
      sizeBytes: await getDirectorySize(bundlePath),
      docCount: manifest.generatedDocs.length,
      docTypes: manifest.generatedDocs.map((doc) => doc.type),
    },
  };

  await writeFile(path.join(bundlePath, "manifest.json"), JSON.stringify(nextManifest, null, 2), "utf-8");
  return nextManifest;
}

export async function deleteSavedBundle(entryName: string): Promise<boolean> {
  if (!isSafeEntryName(entryName)) {
    return false;
  }

  const targetPath = path.join(getPrdSaveDir(), entryName);
  const targetStat = await stat(targetPath).catch(() => null);

  if (!targetStat) {
    return false;
  }

  await rm(targetPath, { recursive: true, force: true });
  return true;
}

