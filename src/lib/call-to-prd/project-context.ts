import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { ProjectContextSnapshot } from "@/lib/types/call-to-prd";
import { getRuntimeConfig } from "@/lib/runtime/config";
import { normalizeWhitespace, pathExists, readUtf8 } from "@/lib/parsers/shared";

interface ProjectDocSummary {
  path: string;
  excerpt: string;
}

interface ProjectContextInspectionResult {
  context: ProjectContextSnapshot | null;
  error: string | null;
}

interface CachedProjectContextEntry {
  discoverySignature: string;
  sourceSignature: string;
  expiresAt: number;
  result: ProjectContextInspectionResult;
}

const ROOT_MARKDOWN_CANDIDATES = ["README.md", "README.mdx", "readme.md", "CLAUDE.md"];
const DOC_DIR_CANDIDATES = ["docs", "planning", ".claude/rules"];
const CONFIG_FILE_CANDIDATES = [
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "prisma/schema.prisma",
  "drizzle.config.ts",
  "drizzle.config.js",
  "drizzle.config.mjs",
];
const SOURCE_DIR_CANDIDATES = ["src/app", "app", "src/pages", "pages", "src/features", "src/lib"];
const SOURCE_ENTRY_FILE_RE = /^(page|layout|route|server|client|store|schema|types|index)\.(tsx?|jsx?|mjs|cjs)$/i;
const WALK_EXCLUDED_DIRS = new Set(["node_modules", ".git", ".next", ".turbo", "dist", "build", "coverage"]);
const IMPORTANT_DEPENDENCIES = [
  "next",
  "react",
  "typescript",
  "tailwindcss",
  "turbo",
  "prisma",
  "drizzle-orm",
  "openai",
  "anthropic",
  "zod",
  "zustand",
  "firebase",
  "express",
  "fastify",
  "hono",
];
const MAX_DOC_FILES = 12;
const MAX_CONFIG_FILES = 8;
const MAX_SOURCE_FILES = 8;
const MAX_DOC_EXCERPT_LENGTH = 400;
const MAX_CONFIG_EXCERPT_LENGTH = 320;
const MAX_SOURCE_EXCERPT_LENGTH = 280;
const PROJECT_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000;
const PROJECT_CONTEXT_CACHE_KEY_PREFIX = "call-to-prd:project-context:";

export async function inspectLocalProjectContext(projectPath: string): Promise<ProjectContextInspectionResult> {
  const normalizedPath = path.resolve(projectPath);

  if (!isAllowedProjectPath(normalizedPath)) {
    return {
      context: null,
      error: "허용된 프로젝트 경로가 아닙니다. 설정된 projects root 또는 현재 workspace 안의 프로젝트만 선택해 주세요.",
    };
  }

  const target = await stat(normalizedPath).catch(() => null);
  if (!target) {
    return {
      context: null,
      error: "선택한 프로젝트 경로를 찾을 수 없습니다.",
    };
  }

  if (!target.isDirectory()) {
    return {
      context: null,
      error: "선택한 프로젝트 경로가 폴더가 아닙니다.",
    };
  }

  const projectName = path.basename(normalizedPath);
  const discoverySignature = await buildProjectDiscoverySignature(normalizedPath, target.mtimeMs);
  const cached = await readCachedProjectContext(normalizedPath, discoverySignature);
  if (cached) {
    return cached;
  }

  const [projectType, packageInfo, hasGit, rootMarkdownFiles, docFiles, configFiles, sourceFiles] = await Promise.all([
    detectProjectType(normalizedPath),
    readPackageInfo(normalizedPath),
    pathExists(path.join(normalizedPath, ".git")),
    collectRootMarkdownFiles(normalizedPath),
    collectDocFiles(normalizedPath),
    collectConfigFiles(normalizedPath),
    collectSourceEntrypoints(normalizedPath),
  ]);

  const allSources = uniquePaths([
    ...rootMarkdownFiles.map((item) => item.path),
    ...docFiles.map((item) => item.path),
    ...configFiles.map((item) => item.path),
    ...sourceFiles.map((item) => item.path),
  ]);

  if (allSources.length === 0) {
    const result = {
      context: null,
      error: "프로젝트 기준 파일을 찾지 못했습니다. README, docs/planning 문서, package.json, 핵심 src 엔트리포인트 중 하나 이상이 필요합니다.",
    };
    writeCachedProjectContext(normalizedPath, {
      discoverySignature,
      sourceSignature: "",
      expiresAt: Date.now() + PROJECT_CONTEXT_CACHE_TTL_MS,
      result,
    });
    return result;
  }

  const result = {
    context: {
      projectName,
      projectPath: normalizedPath,
      summary: buildProjectSummary({
        projectName,
        projectPath: normalizedPath,
        projectType,
        packageInfo,
        hasGit,
        rootMarkdownFiles,
        docFiles,
        configFiles,
        sourceFiles,
      }),
      sources: allSources,
    },
    error: null,
  };

  const sourceSignature = await buildProjectSourceSignature(normalizedPath, allSources);
  writeCachedProjectContext(normalizedPath, {
    discoverySignature,
    sourceSignature,
    expiresAt: Date.now() + PROJECT_CONTEXT_CACHE_TTL_MS,
    result,
  });

  return result;
}

export async function summarizeLocalProject(projectPath: string): Promise<ProjectContextSnapshot | null> {
  const inspected = await inspectLocalProjectContext(projectPath);
  return inspected.context;
}

function buildProjectSummary(input: {
  projectName: string;
  projectPath: string;
  projectType: string;
  packageInfo: {
    name: string | null;
    scripts: string[];
    dependencies: string[];
  };
  hasGit: boolean;
  rootMarkdownFiles: ProjectDocSummary[];
  docFiles: ProjectDocSummary[];
  configFiles: ProjectDocSummary[];
  sourceFiles: ProjectDocSummary[];
}) {
  const { projectName, projectPath, projectType, packageInfo, hasGit, rootMarkdownFiles, docFiles, configFiles, sourceFiles } = input;

  const lines = [
    "## 프로젝트 개요",
    `- 프로젝트명: ${projectName}`,
    `- 경로: ${projectPath}`,
    `- 추정 타입: ${projectType}`,
    packageInfo.name ? `- package.json 이름: ${packageInfo.name}` : null,
    packageInfo.scripts.length > 0 ? `- 주요 스크립트: ${packageInfo.scripts.join(", ")}` : null,
    packageInfo.dependencies.length > 0 ? `- 주요 의존성: ${packageInfo.dependencies.join(", ")}` : null,
    hasGit ? "- Git 저장소: 있음" : "- Git 저장소: 없음",
    "",
    rootMarkdownFiles.length > 0
      ? `## 루트 기준 문서\n${rootMarkdownFiles.map((doc) => `- ${doc.path}: ${doc.excerpt}`).join("\n")}`
      : null,
    docFiles.length > 0
      ? `## 주요 문서 근거\n${docFiles.map((doc) => `- ${doc.path}: ${doc.excerpt}`).join("\n")}`
      : null,
    configFiles.length > 0
      ? `## 설정 및 구조 힌트\n${configFiles.map((doc) => `- ${doc.path}: ${doc.excerpt}`).join("\n")}`
      : null,
    sourceFiles.length > 0
      ? `## 핵심 엔트리포인트 힌트\n${sourceFiles.map((doc) => `- ${doc.path}: ${doc.excerpt}`).join("\n")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

function isAllowedProjectPath(projectPath: string): boolean {
  const normalizedPath = path.resolve(projectPath);
  return getAllowedRoots().some((rootPath) => isInsidePath(normalizedPath, rootPath));
}

function getAllowedRoots() {
  const runtimeConfig = getRuntimeConfig();
  const roots = [
    runtimeConfig.paths.projectsRoot,
    ...runtimeConfig.paths.allowedRoots,
    process.env.DASHBOARD_LAB_DESKTOP === "1" ? null : runtimeConfig.paths.workspaceRoot,
  ];

  return [...new Set(roots.filter((value): value is string => Boolean(value)))];
}

function isInsidePath(targetPath: string, rootPath: string) {
  const normalizedRoot = path.resolve(rootPath);
  return targetPath === normalizedRoot || targetPath.startsWith(`${normalizedRoot}${path.sep}`);
}

async function buildProjectDiscoverySignature(projectPath: string, rootMtimeMs: number) {
  const discoveryTargets = [
    ...ROOT_MARKDOWN_CANDIDATES,
    ...DOC_DIR_CANDIDATES,
    ...CONFIG_FILE_CANDIDATES,
    ...SOURCE_DIR_CANDIDATES,
    ".git",
  ];

  const parts = await Promise.all(
    discoveryTargets.map(async (relativePath) => {
      const signature = await readPathSignature(path.join(projectPath, relativePath));
      return `${relativePath}:${signature}`;
    }),
  );

  return [`root:${rootMtimeMs}`, ...parts].join("|");
}

async function buildProjectSourceSignature(projectPath: string, sourcePaths: string[]) {
  if (sourcePaths.length === 0) {
    return "";
  }

  const sourceParts = await Promise.all(
    sourcePaths.map(async (relativePath) => {
      const signature = await readPathSignature(path.join(projectPath, relativePath));
      return `${relativePath}:${signature}`;
    }),
  );

  return sourceParts.join("|");
}

async function readPathSignature(targetPath: string) {
  const target = await stat(targetPath).catch(() => null);
  if (!target) {
    return "missing";
  }

  return `${target.isDirectory() ? "dir" : "file"}:${Math.trunc(target.mtimeMs)}`;
}

async function detectProjectType(projectPath: string): Promise<string> {
  const [hasTurbo, hasNextTs, hasNextJs, hasPackageJson, hasDocs] = await Promise.all([
    pathExists(path.join(projectPath, "turbo.json")),
    pathExists(path.join(projectPath, "next.config.ts")),
    pathExists(path.join(projectPath, "next.config.js")),
    pathExists(path.join(projectPath, "package.json")),
    pathExists(path.join(projectPath, "docs")),
  ]);

  if (hasTurbo) return "turbo";
  if (hasNextTs || hasNextJs) return "nextjs";
  if (hasPackageJson) return "node-backend";
  if (hasDocs) return "document";
  return "other";
}

async function readPackageInfo(projectPath: string): Promise<{
  name: string | null;
  scripts: string[];
  dependencies: string[];
}> {
  const raw = await readUtf8(path.join(projectPath, "package.json"));
  if (!raw) {
    return { name: null, scripts: [], dependencies: [] };
  }

  try {
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      scripts?: Record<string, unknown>;
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };

    const dependencyNames = [
      ...Object.keys(parsed.dependencies ?? {}),
      ...Object.keys(parsed.devDependencies ?? {}),
    ];

    return {
      name: typeof parsed.name === "string" ? parsed.name : null,
      scripts: Object.keys(parsed.scripts ?? {}).slice(0, 8),
      dependencies: IMPORTANT_DEPENDENCIES.filter((dependency) => dependencyNames.includes(dependency)),
    };
  } catch {
    return { name: null, scripts: [], dependencies: [] };
  }
}

async function collectRootMarkdownFiles(projectPath: string) {
  const items: ProjectDocSummary[] = [];

  for (const relativePath of ROOT_MARKDOWN_CANDIDATES) {
    const absolutePath = path.join(projectPath, relativePath);
    if (!(await pathExists(absolutePath))) {
      continue;
    }

    const excerpt = await readProjectExcerpt(absolutePath, MAX_DOC_EXCERPT_LENGTH);
    if (!excerpt) {
      continue;
    }

    items.push({ path: relativePath, excerpt });
  }

  return items.slice(0, MAX_DOC_FILES);
}

async function collectDocFiles(projectPath: string) {
  const docPaths = (
    await Promise.all(
      DOC_DIR_CANDIDATES.map((directory) =>
        walkFiles(path.join(projectPath, directory), {
          predicate: (fileName) => /\.mdx?$/i.test(fileName),
          maxResults: MAX_DOC_FILES,
        }).then((items) => items.map((item) => path.join(directory, item))),
      ),
    )
  ).flat().slice(0, MAX_DOC_FILES);

  return readProjectDocSummaries(projectPath, docPaths, MAX_DOC_EXCERPT_LENGTH);
}

async function collectConfigFiles(projectPath: string) {
  const configPaths: string[] = [];

  for (const relativePath of CONFIG_FILE_CANDIDATES) {
    const absolutePath = path.join(projectPath, relativePath);
    if (await pathExists(absolutePath)) {
      configPaths.push(relativePath);
    }

    if (configPaths.length >= MAX_CONFIG_FILES) {
      break;
    }
  }

  return readProjectDocSummaries(projectPath, configPaths, MAX_CONFIG_EXCERPT_LENGTH);
}

async function collectSourceEntrypoints(projectPath: string) {
  const collected: string[] = [];

  for (const directory of SOURCE_DIR_CANDIDATES) {
    if (collected.length >= MAX_SOURCE_FILES) {
      break;
    }

    const results = await walkFiles(path.join(projectPath, directory), {
      predicate: (fileName) => SOURCE_ENTRY_FILE_RE.test(fileName),
      maxResults: MAX_SOURCE_FILES - collected.length,
    });

    collected.push(...results.map((result) => path.join(directory, result)));
  }

  return readProjectDocSummaries(projectPath, collected.slice(0, MAX_SOURCE_FILES), MAX_SOURCE_EXCERPT_LENGTH);
}

async function readCachedProjectContext(projectPath: string, discoverySignature: string) {
  pruneExpiredProjectContextCache();

  const cacheKey = buildProjectContextCacheKey(projectPath);
  const cached = getProjectContextCacheStore().get(cacheKey);

  if (!cached || cached.discoverySignature !== discoverySignature || cached.expiresAt <= Date.now()) {
    return null;
  }

  if (cached.result.context?.sources.length) {
    const sourceSignature = await buildProjectSourceSignature(projectPath, cached.result.context.sources);
    if (sourceSignature !== cached.sourceSignature) {
      getProjectContextCacheStore().delete(cacheKey);
      return null;
    }
  }

  return cached.result;
}

function writeCachedProjectContext(projectPath: string, entry: CachedProjectContextEntry) {
  const cacheStore = getProjectContextCacheStore();
  cacheStore.set(buildProjectContextCacheKey(projectPath), entry);
}

function buildProjectContextCacheKey(projectPath: string) {
  return `${PROJECT_CONTEXT_CACHE_KEY_PREFIX}${projectPath}`;
}

function pruneExpiredProjectContextCache() {
  const now = Date.now();
  const cacheStore = getProjectContextCacheStore();

  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
}

function getProjectContextCacheStore() {
  const globalStore = globalThis as typeof globalThis & {
    __dashboardLabProjectContextCache?: Map<string, CachedProjectContextEntry>;
  };

  if (!globalStore.__dashboardLabProjectContextCache) {
    globalStore.__dashboardLabProjectContextCache = new Map<string, CachedProjectContextEntry>();
  }

  return globalStore.__dashboardLabProjectContextCache;
}

async function readProjectDocSummaries(projectPath: string, relativePaths: string[], maxExcerptLength: number) {
  const summaries = await Promise.all(
    relativePaths.map(async (relativePath) => ({
      path: toPosixRelative(relativePath),
      excerpt: await readProjectExcerpt(path.join(projectPath, relativePath), maxExcerptLength),
    })),
  );

  return summaries.filter((item) => item.excerpt);
}

async function readProjectExcerpt(filePath: string, maxLength: number) {
  const raw = await readUtf8(filePath);
  if (!raw) {
    return "";
  }

  return normalizeExcerpt(raw, maxLength);
}

function normalizeExcerpt(raw: string, maxLength: number) {
  const normalized = normalizeWhitespace(
    raw
      .replace(/^---[\s\S]*?---/m, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^#+\s*/gm, "")
      .replace(/^\s*import\s.+$/gm, " ")
      .replace(/^\s*export\s+\{.+$/gm, " ")
      .replace(/^\s*\/\/.*$/gm, " ")
      .replace(/\s+/g, " "),
  );

  if (!normalized) {
    return "";
  }

  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trim()}...`;
}

async function walkFiles(
  rootPath: string,
  options: {
    predicate: (fileName: string) => boolean;
    maxResults: number;
  },
): Promise<string[]> {
  const rootExists = await pathExists(rootPath);
  if (!rootExists || options.maxResults <= 0) {
    return [];
  }

  const results: string[] = [];
  const queue = [rootPath];

  while (queue.length > 0 && results.length < options.maxResults) {
    const currentPath = queue.shift();
    if (!currentPath) {
      continue;
    }

    const entries = await readdir(currentPath, { withFileTypes: true }).catch(() => []);
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (results.length >= options.maxResults) {
        break;
      }

      if (entry.isDirectory()) {
        if (!WALK_EXCLUDED_DIRS.has(entry.name)) {
          queue.push(path.join(currentPath, entry.name));
        }
        continue;
      }

      if (!entry.isFile() || !options.predicate(entry.name)) {
        continue;
      }

      results.push(path.relative(rootPath, path.join(currentPath, entry.name)));
    }
  }

  return results.map(toPosixRelative);
}

function uniquePaths(paths: string[]) {
  return [...new Set(paths.map(toPosixRelative))];
}

function toPosixRelative(relativePath: string) {
  return relativePath.split(path.sep).join(path.posix.sep);
}
