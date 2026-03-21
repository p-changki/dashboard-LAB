import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import type {
  DocContent,
  DocHubResponse,
  DocSearchResult,
  DocType,
  ProjectDoc,
} from "@/lib/types";
import { getRuntimeConfig } from "@/lib/runtime-config";

import { readThroughCache } from "./cache";
import { createPreview, removeFrontmatter, resolveSafePath } from "./file-safety";
import {
  formatBytes,
  pathExists,
  readUtf8,
  toPosixPath,
} from "./shared";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DOC_TYPES: DocType[] = ["claude", "codex", "gemini", "general"];

export function getDocType(fileName: string, relativePath: string): DocType {
  if (fileName === "CLAUDE.md" || relativePath.includes(".claude/rules/")) {
    return "claude";
  }

  if (fileName === "AGENTS.md") {
    return "codex";
  }

  if (fileName === "GEMINI.md") {
    return "gemini";
  }

  return "general";
}

export async function collectDocs(): Promise<DocHubResponse> {
  const docs = await readThroughCache(buildDocHubCacheKey(), CACHE_TTL_MS, scanDocs);
  return buildDocHubResponse(docs);
}

export async function searchDocs(query: string): Promise<DocSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const docs = await readThroughCache(buildDocHubCacheKey(), CACHE_TTL_MS, scanDocs);
  return docs
    .map((doc) => buildSearchResult(doc, normalizedQuery))
    .filter((item): item is DocSearchResult => item !== null)
    .slice(0, 30);
}

export async function getDocContent(project: string, file: string): Promise<DocContent> {
  const projectsRoot = getProjectsRoot();
  const safePath = validateDocPath(project, file);
  const raw = await readUtf8(safePath);

  if (!raw) {
    throw new Error("DOC_NOT_FOUND");
  }

  const fileStat = await stat(safePath);
  return {
    filePath: toPosixPath(path.relative(path.join(projectsRoot, project), safePath)),
    projectName: project,
    fileName: path.basename(safePath),
    type: getDocType(path.basename(safePath), file),
    content: removeFrontmatter(raw),
    lastModified: fileStat.mtime.toISOString(),
  };
}

function validateDocPath(project: string, file: string) {
  if (project.includes("..") || file.includes("..")) {
    throw new Error("INVALID_PATH");
  }

  const rootPath = path.join(getProjectsRoot(), project);
  const safePath = resolveSafePath(rootPath, file);

  if (!safePath) {
    throw new Error("INVALID_PATH");
  }

  return safePath;
}

async function scanDocs(): Promise<ProjectDoc[]> {
  const projectsRoot = getProjectsRoot();
  const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const projectDirs = entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => entry.name);
  const docs = await Promise.all(projectDirs.map((project) => collectProjectDocs(project)));

  return docs.flat().sort((left, right) => right.lastModifiedTimestamp - left.lastModifiedTimestamp);
}

async function collectProjectDocs(projectName: string) {
  const projectPath = path.join(getProjectsRoot(), projectName);
  const coreDocs = await Promise.all(
    ["CLAUDE.md", "AGENTS.md", "GEMINI.md"].map((name) =>
      buildDoc(projectName, projectPath, name, name),
    ),
  );
  const ruleDocs = await collectRuleDocs(projectName, projectPath);
  const generalDocs = await collectGeneralDocs(projectName, projectPath);

  return [...coreDocs, ...ruleDocs, ...generalDocs].filter(
    (doc): doc is ProjectDoc => doc !== null,
  );
}

async function collectRuleDocs(projectName: string, projectPath: string) {
  const rulesPath = path.join(projectPath, ".claude", "rules");
  return collectNestedDocs(projectName, projectPath, rulesPath, ".claude/rules");
}

async function collectGeneralDocs(projectName: string, projectPath: string) {
  const docsPath = path.join(projectPath, "docs");
  const entries = await readdir(docsPath, { withFileTypes: true }).catch(() => []);
  const docs = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => /\.md$/i.test(entry.name))
      .map((entry) => buildDoc(projectName, projectPath, path.join("docs", entry.name), entry.name)),
  );

  return docs.filter((doc): doc is ProjectDoc => doc !== null);
}

async function collectNestedDocs(
  projectName: string,
  projectPath: string,
  targetPath: string,
  relativeBase: string,
): Promise<ProjectDoc[]> {
  const entries = await readdir(targetPath, { withFileTypes: true }).catch(() => []);
  const docs = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(targetPath, entry.name);
      const relativePath = path.join(relativeBase, entry.name);

      if (entry.isDirectory()) {
        return collectNestedDocs(projectName, projectPath, entryPath, relativePath);
      }

      if (!entry.isFile() || !/\.md$/i.test(entry.name)) {
        return [];
      }

      const doc = await buildDoc(projectName, projectPath, relativePath, entry.name);
      return doc ? [doc] : [];
    }),
  );

  return docs.flat();
}

async function buildDoc(
  projectName: string,
  projectPath: string,
  relativePath: string,
  fileName: string,
) {
  const absPath = path.join(projectPath, relativePath);

  if (!(await pathExists(absPath))) {
    return null;
  }

  const [raw, fileStat] = await Promise.all([readUtf8(absPath), stat(absPath)]);

  if (!raw) {
    return null;
  }

  return {
    projectName,
    projectPath: toPosixPath(projectPath),
    fileName,
    filePath: toPosixPath(relativePath),
    type: getDocType(fileName, toPosixPath(relativePath)),
    preview: createPreview(raw, 300),
    sizeBytes: fileStat.size,
    lastModified: fileStat.mtime.toISOString(),
    lastModifiedTimestamp: fileStat.mtimeMs,
  } satisfies ProjectDoc;
}

function buildDocHubResponse(docs: ProjectDoc[]): DocHubResponse {
  const byType = DOC_TYPES.reduce<Record<DocType, number>>(
    (acc, type) => ({ ...acc, [type]: 0 }),
    {} as Record<DocType, number>,
  );

  docs.forEach((doc) => {
    byType[doc.type] += 1;
  });

  return {
    docs,
    totalDocs: docs.length,
    projectNames: [...new Set(docs.map((doc) => doc.projectName))].sort(),
    byType,
  };
}

function buildSearchResult(doc: ProjectDoc, normalizedQuery: string) {
  const fileName = doc.fileName.toLowerCase();
  const preview = doc.preview.toLowerCase();

  if (fileName.includes(normalizedQuery)) {
    return { doc, matchType: "filename", snippet: doc.fileName };
  }

  if (preview.includes(normalizedQuery)) {
    return { doc, matchType: "content", snippet: doc.preview };
  }

  return null;
}

export function formatDocSize(sizeBytes: number) {
  return formatBytes(sizeBytes);
}

function getProjectsRoot() {
  return getRuntimeConfig().paths.projectsRoot;
}

function buildDocHubCacheKey() {
  return `doc-hub:${getProjectsRoot()}`;
}
