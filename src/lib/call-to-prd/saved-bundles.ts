import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildGeneratedDocTitle,
  CALL_DOC_DEFINITIONS,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import {
  DEFAULT_CALL_INTAKE_METADATA,
  normalizeCallIntakeMetadata,
  type CallIntakeMetadata,
} from "@/lib/call-to-prd/intake-config";
import type {
  CallGenerationMode,
  CallNextActionType,
  GeneratedDoc,
  SavedCallBundleDetail,
  SavedCallBundleIndexItem,
  SavedCallBundleListResponse,
  SavedNextActionDraft,
} from "@/lib/types/call-to-prd";
import { getRuntimeConfig } from "@/lib/runtime-config";

interface SavedBundleManifest {
  version: 1 | 2 | 3 | 4 | 5;
  id: string;
  title: string;
  createdAt: string;
  callDate: string;
  projectName: string | null;
  customerName: string | null;
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

interface SaveBundleOptions {
  id: string;
  projectName: string | null;
  customerName: string | null;
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

interface ListSavedBundlesOptions {
  page?: number;
  pageSize?: number;
  query?: string;
}

export async function saveGeneratedDocsBundle(options: SaveBundleOptions): Promise<string> {
  const {
    id,
    projectName,
    customerName,
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
  const bundlePath = path.join(getPrdSaveDir(), bundleName);
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
    version: 5,
    id,
    title: buildBundleTitle(projectName, customerName),
    createdAt: new Date().toISOString(),
    callDate,
    projectName,
    customerName,
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

  return bundleName;
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
    version: 4,
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

export async function listSavedBundles(options: ListSavedBundlesOptions = {}): Promise<SavedCallBundleListResponse> {
  const pageSize = clampPageSize(options.pageSize ?? 6);
  const requestedPage = Number.isFinite(options.page) ? Math.max(1, Math.floor(options.page as number)) : 1;
  const query = (options.query ?? "").trim();
  const entries = await readdir(getPrdSaveDir(), { withFileTypes: true }).catch(() => []);
  const items = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        return loadBundleSummary(entry.name);
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return loadLegacySummary(entry.name);
      }

      return null;
    }),
  );

  const normalizedItems = items
    .filter((item): item is SavedCallBundleIndexItem => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filteredItems = query
    ? normalizedItems.filter((item) => matchesSavedBundleQuery(item, query))
    : normalizedItems;

  const totalCount = filteredItems.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);
  const startIndex = (page - 1) * pageSize;

  return {
    items: filteredItems.slice(startIndex, startIndex + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
    query,
  };
}

export async function loadSavedBundle(entryName: string): Promise<SavedCallBundleDetail | null> {
  if (!isSafeEntryName(entryName)) {
    return null;
  }

  const targetPath = path.join(getPrdSaveDir(), entryName);
  const targetStat = await stat(targetPath).catch(() => null);
  if (!targetStat) {
    return null;
  }

  if (targetStat.isDirectory()) {
    return loadBundleDetail(entryName);
  }

  if (targetStat.isFile() && entryName.endsWith(".md")) {
    return loadLegacyDetail(entryName);
  }

  return null;
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

export async function resolveChangeRequestBaseline(options: {
  entryName?: string | null;
  projectName?: string | null;
}): Promise<SavedCallBundleDetail | null> {
  if (options.entryName) {
    return loadSavedBundle(options.entryName);
  }

  const projectName = options.projectName?.trim();
  if (!projectName) {
    return null;
  }

  const entries = await readdir(getPrdSaveDir(), { withFileTypes: true }).catch(() => []);
  const summaries = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        return loadBundleSummary(entry.name);
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return loadLegacySummary(entry.name);
      }

      return null;
    }),
  );

  const matched = summaries
    .filter((item): item is SavedCallBundleIndexItem => Boolean(item))
    .filter((item) => normalizeSearchText(item.projectName ?? "") === normalizeSearchText(projectName))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (matched.length === 0) {
    return null;
  }

  return loadSavedBundle(matched[0].entryName);
}

export function buildSavedBundleEntryName(
  id: string,
  projectName: string | null,
  customerName: string | null,
  callDate: string,
): string {
  const date = callDate || new Date().toISOString().slice(0, 10);
  const project = sanitizeFileName(projectName ?? "general");
  const customer = customerName ? `_${sanitizeFileName(customerName)}` : "";
  return `${date}_${project}${customer}_${id.slice(0, 8)}`;
}

function buildBundleTitle(projectName: string | null, customerName: string | null): string {
  if (projectName && customerName) {
    return `${projectName} · ${customerName}`;
  }
  return projectName ?? customerName ?? "Call To PRD";
}

async function loadBundleSummary(entryName: string): Promise<SavedCallBundleIndexItem | null> {
  const manifest = await readBundleManifest(entryName);
  if (!manifest) {
    return null;
  }

  if (!manifest.summary) {
    const detail = await loadBundleDetail(entryName);
    if (!detail) {
      return null;
    }

    const bundleSize = await getDirectorySize(path.join(getPrdSaveDir(), entryName));
    const previewDoc = detail.generatedDocs.find((doc) => doc.type === "prd") ?? detail.generatedDocs[0];

    return {
      entryName,
      title: detail.title,
      kind: "bundle",
      size: formatSize(bundleSize),
      createdAt: detail.createdAt,
      preview: getPreview(previewDoc?.markdown ?? ""),
      docCount: detail.generatedDocs.length,
      docTypes: detail.generatedDocs.map((doc) => doc.type),
      projectName: detail.projectName,
      customerName: detail.customerName,
      generationMode: detail.generationMode,
      baselineEntryName: detail.baselineEntryName,
      baselineTitle: detail.baselineTitle,
    };
  }

  return {
    entryName,
    title: manifest.title,
    kind: "bundle",
    size: formatSize(manifest.summary.sizeBytes),
    createdAt: manifest.createdAt,
    preview: manifest.summary.preview,
    docCount: manifest.summary.docCount,
    docTypes: manifest.summary.docTypes,
    projectName: manifest.projectName,
    customerName: manifest.customerName,
    generationMode: manifest.generationMode ?? "dual",
    baselineEntryName: manifest.baselineEntryName ?? null,
    baselineTitle: manifest.baselineTitle ?? null,
  };
}

async function loadBundleDetail(entryName: string): Promise<SavedCallBundleDetail | null> {
  const manifest = await readBundleManifest(entryName);
  if (!manifest) {
    return null;
  }

  const bundlePath = path.join(getPrdSaveDir(), entryName);
  const intake = normalizeCallIntakeMetadata(manifest.intake ?? null);
  const generatedDocs = await Promise.all(
    manifest.generatedDocs.map(async (doc) => {
      const markdown = await readFile(path.join(bundlePath, doc.fileName), "utf-8").catch(() => "");
      return {
        type: doc.type,
        title: doc.title,
        markdown,
      };
    }),
  );

  const prdMarkdown = generatedDocs.find((doc) => doc.type === "prd")?.markdown ?? null;
  const claudePrd = manifest.artifacts.claudePrdFileName
    ? await readFile(path.join(bundlePath, manifest.artifacts.claudePrdFileName), "utf-8").catch(() => null)
    : null;
  const codexPrd = manifest.artifacts.codexPrdFileName
    ? await readFile(path.join(bundlePath, manifest.artifacts.codexPrdFileName), "utf-8").catch(() => null)
    : null;
  const diffReport = manifest.artifacts.diffReportFileName
    ? await readFile(path.join(bundlePath, manifest.artifacts.diffReportFileName), "utf-8").catch(() => null)
    : null;
  const nextActions: Array<SavedNextActionDraft | null> = await Promise.all(
    (manifest.nextActions ?? []).map(async (nextAction) => {
      const markdown = await readFile(path.join(bundlePath, nextAction.fileName), "utf-8").catch(() => null);

      if (!markdown) {
        return null;
      }

      return {
        actionType: nextAction.actionType,
        title: nextAction.title,
        markdown,
        fileName: nextAction.fileName,
        createdAt: nextAction.createdAt,
      };
    }),
  );

  return {
    entryName,
    savedEntryName: entryName,
    title: manifest.title,
    kind: "bundle",
    createdAt: manifest.createdAt,
    callDate: manifest.callDate,
    projectName: manifest.projectName,
    customerName: manifest.customerName,
    generationMode: manifest.generationMode ?? "dual",
    baselineEntryName: manifest.baselineEntryName ?? null,
    baselineTitle: manifest.baselineTitle ?? null,
    inputKind: intake.inputKind,
    severity: intake.severity,
    customerImpact: intake.customerImpact,
    urgency: intake.urgency,
    reproducibility: intake.reproducibility,
    currentWorkaround: intake.currentWorkaround,
    separateExternalDocs: intake.separateExternalDocs,
    generationPreset: manifest.generationPreset,
    selectedDocTypes: manifest.selectedDocTypes,
    generatedDocs,
    nextActions: nextActions.filter((item): item is SavedNextActionDraft => item !== null),
    prdMarkdown,
    claudePrd,
    codexPrd,
    diffReport,
    generationWarnings: manifest.generationWarnings,
  };
}

async function loadLegacySummary(entryName: string): Promise<SavedCallBundleIndexItem | null> {
  const detail = await loadLegacyDetail(entryName);
  if (!detail) {
    return null;
  }

  const fileStat = await stat(path.join(getPrdSaveDir(), entryName)).catch(() => null);

  return {
    entryName,
    title: detail.title,
    kind: "legacy",
    size: formatSize(fileStat?.size ?? 0),
    createdAt: detail.createdAt,
    preview: getPreview(detail.prdMarkdown ?? ""),
    docCount: 1,
    docTypes: ["prd"],
    projectName: detail.projectName,
    customerName: detail.customerName,
    generationMode: detail.generationMode,
    baselineEntryName: detail.baselineEntryName,
    baselineTitle: detail.baselineTitle,
  };
}

async function loadLegacyDetail(entryName: string): Promise<SavedCallBundleDetail | null> {
  if (!isSafeEntryName(entryName)) {
    return null;
  }

  const filePath = path.join(getPrdSaveDir(), entryName);
  const [fileStat, markdown] = await Promise.all([
    stat(filePath).catch(() => null),
    readFile(filePath, "utf-8").catch(() => null),
  ]);

  if (!fileStat || !markdown) {
    return null;
  }

  const title = entryName.replace(/\.md$/, "");
  const generatedDocs: GeneratedDoc[] = [
    {
      type: "prd",
      title: buildGeneratedDocTitle("prd"),
      markdown,
    },
  ];

  return {
    entryName,
    savedEntryName: null,
    title,
    kind: "legacy",
    createdAt: fileStat.birthtime.toISOString(),
    callDate: fileStat.birthtime.toISOString().slice(0, 10),
    projectName: null,
    customerName: null,
    generationMode: "dual",
    baselineEntryName: null,
    baselineTitle: null,
    inputKind: DEFAULT_CALL_INTAKE_METADATA.inputKind,
    severity: DEFAULT_CALL_INTAKE_METADATA.severity,
    customerImpact: DEFAULT_CALL_INTAKE_METADATA.customerImpact,
    urgency: DEFAULT_CALL_INTAKE_METADATA.urgency,
    reproducibility: DEFAULT_CALL_INTAKE_METADATA.reproducibility,
    currentWorkaround: DEFAULT_CALL_INTAKE_METADATA.currentWorkaround,
    separateExternalDocs: DEFAULT_CALL_INTAKE_METADATA.separateExternalDocs,
    generationPreset: "core",
    selectedDocTypes: ["prd"],
    generatedDocs,
    nextActions: [],
    prdMarkdown: markdown,
    claudePrd: null,
    codexPrd: null,
    diffReport: null,
    generationWarnings: [],
  };
}

async function readBundleManifest(entryName: string): Promise<SavedBundleManifest | null> {
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

async function getDirectorySize(directoryPath: string): Promise<number> {
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

function isSafeEntryName(entryName: string): boolean {
  return !entryName.includes("..") && !entryName.includes("/") && !entryName.includes("\\");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-").slice(0, 50);
}

function getPreview(markdown: string): string {
  return markdown.replace(/\n+/g, " ").slice(0, 120);
}

function getBundlePayloadSize(
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

function buildNextActionFileName(actionType: CallNextActionType): string {
  return {
    "pm-handoff": "01-pm-handoff.md",
    "frontend-plan": "02-frontend-plan.md",
    "backend-plan": "03-backend-plan.md",
    "qa-plan": "04-qa-plan.md",
    "cs-brief": "05-cs-brief.md",
    "github-issues": "06-github-issues.md",
  }[actionType];
}

function matchesSavedBundleQuery(item: SavedCallBundleIndexItem, query: string): boolean {
  const needle = normalizeSearchText(query);
  const haystack = normalizeSearchText([
    item.title,
    item.entryName,
    item.projectName,
    item.customerName,
    item.preview,
  ].filter(Boolean).join(" "));

  return haystack.includes(needle);
}

function getPrdSaveDir() {
  return getRuntimeConfig().paths.prdSaveDir;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function clampPageSize(pageSize: number): number {
  return Math.min(Math.max(Math.floor(pageSize), 1), 24);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
