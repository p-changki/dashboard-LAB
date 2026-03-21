import { readdir } from "node:fs/promises";
import path from "node:path";

import { HOME_DIR, normalizeWhitespace, pathExists, readUtf8 } from "@/lib/parsers/shared";

interface ProjectContextSummary {
  projectName: string;
  projectPath: string;
  summary: string;
}

interface ProjectDocSummary {
  path: string;
  excerpt: string;
}

const DESKTOP_PATH = path.join(HOME_DIR, "Desktop");
const WORKSPACE_PATH = path.resolve(process.cwd());
const MAX_README_LENGTH = 2_500;
const MAX_DOC_FILES = 8;
const MAX_DOC_EXCERPT_LENGTH = 240;
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

export async function summarizeLocalProject(projectPath: string): Promise<ProjectContextSummary | null> {
  const normalizedPath = path.resolve(projectPath);

  if (!isAllowedProjectPath(normalizedPath)) {
    return null;
  }

  const exists = await pathExists(normalizedPath);
  if (!exists) {
    return null;
  }

  const projectName = path.basename(normalizedPath);
  const [projectType, packageInfo, readmeSummary, docFiles, hasGit] = await Promise.all([
    detectProjectType(normalizedPath),
    readPackageInfo(normalizedPath),
    readReadmeSummary(normalizedPath),
    listProjectDocs(normalizedPath),
    pathExists(path.join(normalizedPath, ".git")),
  ]);

  const lines = [
    `- 프로젝트명: ${projectName}`,
    `- 경로: ${normalizedPath}`,
    `- 추정 타입: ${projectType}`,
    packageInfo.name ? `- package.json 이름: ${packageInfo.name}` : null,
    packageInfo.scripts.length > 0 ? `- 주요 스크립트: ${packageInfo.scripts.join(", ")}` : null,
    packageInfo.dependencies.length > 0 ? `- 주요 의존성: ${packageInfo.dependencies.join(", ")}` : null,
    hasGit ? "- Git 저장소: 있음" : "- Git 저장소: 없음",
    docFiles.length > 0 ? `- 문서 파일: ${docFiles.map((doc) => doc.path).join(", ")}` : null,
    readmeSummary ? `- README 요약: ${readmeSummary}` : null,
    docFiles.length > 0
      ? `- 주요 문서 요약:\n${docFiles.map((doc) => `  - ${doc.path}: ${doc.excerpt}`).join("\n")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return {
    projectName,
    projectPath: normalizedPath,
    summary: lines.join("\n"),
  };
}

function isAllowedProjectPath(projectPath: string): boolean {
  return projectPath.startsWith(DESKTOP_PATH) || projectPath.startsWith(WORKSPACE_PATH);
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

async function readReadmeSummary(projectPath: string): Promise<string | null> {
  const candidates = ["README.md", "readme.md", "README.mdx"];

  for (const candidate of candidates) {
    const raw = await readUtf8(path.join(projectPath, candidate));
    if (!raw) {
      continue;
    }

    const summary = normalizeWhitespace(
      raw
        .replace(/^---[\s\S]*?---/m, " ")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/^#+\s*/gm, "")
        .slice(0, MAX_README_LENGTH),
    );

    if (summary) {
      return summary;
    }
  }

  return null;
}

async function listProjectDocs(projectPath: string): Promise<ProjectDocSummary[]> {
  const rootEntries = await readdir(projectPath, { withFileTypes: true }).catch(() => []);
  const rootDocs = rootEntries
    .filter((entry) => entry.isFile() && /\.mdx?$/i.test(entry.name))
    .map((entry) => entry.name);

  const docsEntries = await readdir(path.join(projectPath, "docs"), { withFileTypes: true }).catch(() => []);
  const nestedDocs = docsEntries
    .filter((entry) => entry.isFile() && /\.mdx?$/i.test(entry.name))
    .map((entry) => `docs/${entry.name}`);

  const docPaths = [...rootDocs, ...nestedDocs].slice(0, MAX_DOC_FILES);
  const summaries = await Promise.all(
    docPaths.map(async (docPath) => ({
      path: docPath,
      excerpt: await readDocExcerpt(projectPath, docPath),
    })),
  );

  return summaries.filter((doc) => doc.excerpt);
}

async function readDocExcerpt(projectPath: string, docPath: string): Promise<string> {
  const raw = await readUtf8(path.join(projectPath, docPath));

  if (!raw) {
    return "";
  }

  return normalizeWhitespace(
    raw
      .replace(/^---[\s\S]*?---/m, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^#+\s*/gm, "")
      .slice(0, MAX_DOC_EXCERPT_LENGTH),
  );
}
