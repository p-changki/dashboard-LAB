import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { normalizeWhitespace, pathExists, toPosixPath } from "./shared";

export async function readFileSafe(absPath: string): Promise<SafeFileReadResult> {
  if (await pathExists(absPath)) {
    return { content: await readFile(absPath, "utf8"), isDownloaded: true };
  }

  const stubPath = buildICloudStubPath(absPath);

  if (await pathExists(stubPath)) {
    return { content: null, isDownloaded: false };
  }

  return { content: null, isDownloaded: false };
}

export function resolveSafePath(rootPath: string, relativePath: string) {
  const normalized = relativePath.replace(/^\/+/, "");

  if (!normalized || normalized.includes("..")) {
    return null;
  }

  const resolvedPath = path.resolve(rootPath, normalized);
  const rootWithSlash = `${path.resolve(rootPath)}${path.sep}`;

  return resolvedPath.startsWith(rootWithSlash) || resolvedPath === path.resolve(rootPath)
    ? resolvedPath
    : null;
}

export function stripMarkdownNoise(source: string) {
  return normalizeWhitespace(
    source
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
      .replace(/\[[^\]]+]\([^)]+\)/g, " ")
      .replace(/[#>*_\-]/g, " "),
  );
}

export function createPreview(source: string, maxLength: number) {
  return stripMarkdownNoise(stripFrontmatter(source)).slice(0, maxLength).trim();
}

export function extractMarkdownTags(
  body: string,
  frontmatter: Record<string, unknown>,
) {
  const tagSet = new Set<string>();
  const frontmatterTags = normalizeTags(frontmatter.tags);

  frontmatterTags.forEach((tag) => tagSet.add(tag));
  (body.match(/#[^\s#]+/g) ?? []).forEach((tag) => tagSet.add(tag));
  return [...tagSet];
}

export function extractWikiLinks(body: string) {
  return [...body.matchAll(/\[\[([^[\]]+)]]/g)].map((match) => match[1].trim());
}

export async function getFileMeta(absPath: string) {
  const fileStat = await stat(absPath);

  return {
    lastModified: fileStat.mtime.toISOString(),
    lastModifiedTimestamp: fileStat.mtimeMs,
    sizeBytes: fileStat.size,
  };
}

export function removeFrontmatter(source: string) {
  return matter(source).content;
}

function stripFrontmatter(source: string) {
  return matter(source).content;
}

function buildICloudStubPath(absPath: string) {
  const directoryPath = path.dirname(absPath);
  const fileName = path.basename(absPath);
  return path.join(directoryPath, `.${fileName}.icloud`);
}

function normalizeTags(tags: unknown) {
  if (Array.isArray(tags)) {
    return tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  }

  if (typeof tags === "string" && tags.trim()) {
    return tags
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
  }

  return [];
}

type SafeFileReadResult = {
  content: string | null;
  isDownloaded: boolean;
};

export function toRelativePosix(rootPath: string, absPath: string) {
  return toPosixPath(path.relative(rootPath, absPath));
}
