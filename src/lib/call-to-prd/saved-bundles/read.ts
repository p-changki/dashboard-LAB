import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  buildGeneratedDocTitle,
  normalizeCallDocPreset,
  normalizeSelectedDocTypes,
} from "@/lib/call-to-prd/document-config";
import {
  DEFAULT_CALL_INTAKE_METADATA,
  normalizeCallIntakeMetadata,
} from "@/lib/call-to-prd/intake-config";
import type {
  GeneratedDoc,
  SavedCallBundleDetail,
  SavedCallBundleIndexItem,
  SavedCallBundleListResponse,
  SavedNextActionDraft,
} from "@/lib/types/call-to-prd";
import {
  getDirectorySize,
  getPreview,
  getPrdSaveDir,
  isSafeEntryName,
  readBundleManifest,
} from "@/lib/call-to-prd/saved-bundles/shared";

interface ListSavedBundlesOptions {
  page?: number;
  pageSize?: number;
  query?: string;
}

export async function listSavedBundles(options: ListSavedBundlesOptions = {}): Promise<SavedCallBundleListResponse> {
  const pageSize = clampPageSize(options.pageSize ?? 6);
  const requestedPage = Number.isFinite(options.page) ? Math.max(1, Math.floor(options.page as number)) : 1;
  const query = (options.query ?? "").trim();
  const entries = await readdir(getPrdSaveDir(), { withFileTypes: true }).catch(() => []);

  // Collect items from root level (old flat structure) and project subfolders (new structure)
  const itemPromises: Array<Promise<SavedCallBundleIndexItem | null>> = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      itemPromises.push(loadLegacySummary(entry.name));
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    // Try loading as a bundle directory first (old flat structure)
    const manifestExists = await stat(
      path.join(getPrdSaveDir(), entry.name, "manifest.json"),
    ).catch(() => null);

    if (manifestExists?.isFile()) {
      itemPromises.push(loadBundleSummary(entry.name));
      continue;
    }

    // Otherwise treat as a project subfolder and scan its children
    const subEntries = await readdir(
      path.join(getPrdSaveDir(), entry.name),
      { withFileTypes: true },
    ).catch(() => []);

    for (const subEntry of subEntries) {
      if (subEntry.isDirectory()) {
        itemPromises.push(loadBundleSummary(`${entry.name}/${subEntry.name}`));
      }
    }
  }

  const items = await Promise.all(itemPromises);

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

  const summaryPromises: Array<Promise<SavedCallBundleIndexItem | null>> = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      summaryPromises.push(loadLegacySummary(entry.name));
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const manifestExists = await stat(
      path.join(getPrdSaveDir(), entry.name, "manifest.json"),
    ).catch(() => null);

    if (manifestExists?.isFile()) {
      summaryPromises.push(loadBundleSummary(entry.name));
      continue;
    }

    const subEntries = await readdir(
      path.join(getPrdSaveDir(), entry.name),
      { withFileTypes: true },
    ).catch(() => []);

    for (const subEntry of subEntries) {
      if (subEntry.isDirectory()) {
        summaryPromises.push(loadBundleSummary(`${entry.name}/${subEntry.name}`));
      }
    }
  }

  const summaries = await Promise.all(summaryPromises);

  const matched = summaries
    .filter((item): item is SavedCallBundleIndexItem => Boolean(item))
    .filter((item) => normalizeSearchText(item.projectName ?? "") === normalizeSearchText(projectName))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (matched.length === 0) {
    return null;
  }

  return loadSavedBundle(matched[0].entryName);
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
    generationPreset: normalizeCallDocPreset(manifest.generationPreset),
    selectedDocTypes: normalizeSelectedDocTypes(manifest.selectedDocTypes ?? [], manifest.generationPreset),
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
    projectPath: manifest.projectPath ?? null,
    customerName: manifest.customerName,
    projectContext: manifest.projectContext ?? null,
    projectContextSources: manifest.projectContextSources ?? [],
    projectContextError: manifest.projectContextError ?? null,
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
    generationPreset: normalizeCallDocPreset(manifest.generationPreset),
    selectedDocTypes: normalizeSelectedDocTypes(manifest.selectedDocTypes ?? [], manifest.generationPreset),
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
    projectPath: null,
    customerName: null,
    projectContext: null,
    projectContextSources: [],
    projectContextError: "legacy bundle / no project context",
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
