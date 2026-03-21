import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import type {
  ObsidianNote,
  ObsidianNoteContent,
  ObsidianSearchResult,
  ObsidianTreeResponse,
  TagInfo,
} from "@/lib/types";
import { getRuntimeConfig } from "@/lib/runtime-config";

import { readThroughCache } from "./cache";
import {
  createPreview,
  extractMarkdownTags,
  extractWikiLinks,
  getFileMeta,
  readFileSafe,
  resolveSafePath,
  toRelativePosix,
} from "./file-safety";

export const EXCLUDED_FOLDERS = ["비밀", "소송"];
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedVaultData = {
  response: ObsidianTreeResponse;
  fileNotes: ObsidianNote[];
};

export async function buildTree(): Promise<ObsidianTreeResponse> {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return buildEmptyTreeResponse();
  }

  const cached = await readThroughCache(buildObsidianCacheKey(vaultPath), CACHE_TTL_MS, scanVault);
  return cached.response;
}

export async function searchNotes(query: string): Promise<ObsidianSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();

  const vaultPath = getVaultPath();
  if (!normalizedQuery || !vaultPath) {
    return [];
  }

  const cached = await readThroughCache(buildObsidianCacheKey(vaultPath), CACHE_TTL_MS, scanVault);
  return cached.fileNotes
    .map((note) => buildSearchResult(note, normalizedQuery))
    .filter((result): result is ObsidianSearchResult => result !== null)
    .slice(0, 50);
}

export async function getNoteContent(
  relativePath: string,
): Promise<ObsidianNoteContent> {
  validateObsidianPath(relativePath);
  const absPath = resolveObsidianPath(relativePath);
  const safeRead = await readFileSafe(absPath);

  if (!safeRead.content) {
    return buildUndownloadedContent(relativePath);
  }

  const parsed = matter(safeRead.content);
  const meta = await getFileMeta(absPath);
  const body = parsed.content;

  return {
    path: relativePath,
    name: path.basename(relativePath, path.extname(relativePath)),
    content: body,
    frontmatter: parsed.data,
    tags: extractMarkdownTags(body, parsed.data),
    wikiLinks: extractWikiLinks(body),
    lastModified: meta.lastModified,
    isDownloaded: safeRead.isDownloaded,
  };
}

export async function getTagCloud(): Promise<TagInfo[]> {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return [];
  }

  const cached = await readThroughCache(buildObsidianCacheKey(vaultPath), CACHE_TTL_MS, scanVault);
  return cached.response.tags;
}

function validateObsidianPath(relativePath: string) {
  if (relativePath.includes("..")) {
    throw new Error("INVALID_PATH");
  }

  if (isExcluded(relativePath)) {
    throw new Error("FORBIDDEN_PATH");
  }
}

function resolveObsidianPath(relativePath: string) {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    throw new Error("OBSIDIAN_NOT_CONFIGURED");
  }

  const resolvedPath = resolveSafePath(vaultPath, relativePath);

  if (!resolvedPath) {
    throw new Error("INVALID_PATH");
  }

  return resolvedPath;
}

function isExcluded(relativePath: string) {
  const topFolder = relativePath.split("/")[0];
  return EXCLUDED_FOLDERS.includes(topFolder);
}

async function scanVault(): Promise<CachedVaultData> {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return {
      response: buildEmptyTreeResponse(),
      fileNotes: [],
    };
  }

  const rootNodes = await readDirectoryNodes(vaultPath);
  const fileNotes = collectFileNotes(rootNodes);

  return {
      response: {
      vaultPath,
      tree: rootNodes,
      totalFiles: fileNotes.length,
      totalFolders: countFolders(rootNodes),
      tags: buildTagCloud(fileNotes),
      recentNotes: [...fileNotes]
        .sort((left, right) => right.lastModifiedTimestamp - left.lastModifiedTimestamp)
        .slice(0, 10),
    },
    fileNotes,
  };
}

async function readDirectoryNodes(
  directoryPath: string,
  rootPath?: string,
): Promise<ObsidianNote[]> {
  const effectiveRootPath = rootPath ?? getVaultPath() ?? directoryPath;
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const visibleEntries = entries.filter((entry) => !entry.name.startsWith("."));
  const allowedEntries = visibleEntries.filter((entry) => !isExcluded(entry.name));
  const nodes = await Promise.all(
    allowedEntries.map((entry) => readEntryNode(entry, directoryPath, effectiveRootPath)),
  );

  return nodes.filter((node): node is ObsidianNote => node !== null);
}

async function readEntryNode(
  entry: Dirent,
  parentPath: string,
  rootPath: string,
): Promise<ObsidianNote | null> {
  const entryName = entry.name;
  const absPath = path.join(parentPath, entryName);
  const meta = await getFileMeta(absPath).catch(() => null);

  if (!meta) {
    return null;
  }

  if (entry.isDirectory()) {
    const children = await readDirectoryNodes(absPath, rootPath);
    return buildFolderNode(entryName, absPath, rootPath, meta, children);
  }

  return /\.md$/i.test(entryName)
    ? await buildFileNode(entryName, absPath, rootPath, meta)
    : null;
}

async function buildFileNode(
  entryName: string,
  absPath: string,
  rootPath: string,
  meta: Awaited<ReturnType<typeof getFileMeta>>,
): Promise<ObsidianNote> {
  const safeRead = await readFileSafe(absPath);

  if (!safeRead.content) {
    return {
      name: entryName,
      path: toRelativePosix(rootPath, absPath),
      absPath,
      type: "file",
      tags: [],
      frontmatter: {},
      lastModified: meta.lastModified,
      lastModifiedTimestamp: meta.lastModifiedTimestamp,
      sizeBytes: meta.sizeBytes,
      preview: "iCloud 다운로드 필요",
      isDownloaded: false,
    };
  }

  const parsed = matter(safeRead.content);
  const body = parsed.content;

  return {
    name: entryName,
    path: toRelativePosix(rootPath, absPath),
    absPath,
    type: "file",
    tags: extractMarkdownTags(body, parsed.data),
    frontmatter: parsed.data,
    lastModified: meta.lastModified,
    lastModifiedTimestamp: meta.lastModifiedTimestamp,
    sizeBytes: meta.sizeBytes,
    preview: createPreview(safeRead.content, 200),
    isDownloaded: true,
  };
}

function buildFolderNode(
  entryName: string,
  absPath: string,
  rootPath: string,
  meta: Awaited<ReturnType<typeof getFileMeta>>,
  children: ObsidianNote[],
): ObsidianNote {
  return {
    name: entryName,
    path: toRelativePosix(rootPath, absPath),
    absPath,
    type: "folder",
    children,
    tags: [],
    frontmatter: {},
    lastModified: meta.lastModified,
    lastModifiedTimestamp: meta.lastModifiedTimestamp,
    sizeBytes: meta.sizeBytes,
    preview: "",
  };
}

function collectFileNotes(nodes: ObsidianNote[]): ObsidianNote[] {
  return nodes.flatMap((node) =>
    node.type === "folder" ? collectFileNotes(node.children ?? []) : [node],
  );
}

function countFolders(nodes: ObsidianNote[]): number {
  return nodes.reduce((count, node) => {
    if (node.type !== "folder") {
      return count;
    }

    return count + 1 + countFolders(node.children ?? []);
  }, 0);
}

function buildTagCloud(notes: ObsidianNote[]): TagInfo[] {
  const counts = notes.reduce<Record<string, number>>((acc, note) => {
    note.tags.forEach((tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
    });
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count);
}

function buildSearchResult(
  note: ObsidianNote,
  normalizedQuery: string,
): ObsidianSearchResult | null {
  const noteName = note.name.toLowerCase();
  const preview = note.preview.toLowerCase();
  const hasTagMatch = note.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

  if (noteName.includes(normalizedQuery)) {
    return { note, matchType: "title", snippet: note.preview };
  }

  if (hasTagMatch) {
    return { note, matchType: "tag", snippet: note.tags.join(" ") };
  }

  if (preview.includes(normalizedQuery)) {
    return { note, matchType: "content", snippet: note.preview };
  }

  return null;
}

function buildUndownloadedContent(relativePath: string): ObsidianNoteContent {
  return {
    path: relativePath,
    name: path.basename(relativePath, path.extname(relativePath)),
    content: "iCloud에서 아직 다운로드되지 않은 노트입니다.",
    frontmatter: {},
    tags: [],
    wikiLinks: [],
    lastModified: "",
    isDownloaded: false,
  };
}

function buildEmptyTreeResponse(): ObsidianTreeResponse {
  return {
    vaultPath: getVaultPath() ?? "",
    tree: [],
    totalFiles: 0,
    totalFolders: 0,
    tags: [],
    recentNotes: [],
  };
}

function getVaultPath() {
  return getRuntimeConfig().paths.obsidianVault;
}

function buildObsidianCacheKey(vaultPath: string) {
  return `obsidian-tree:${vaultPath}`;
}
