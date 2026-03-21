import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import { summarizeLocalProject } from "@/lib/call-to-prd/project-context";
import { getRuntimeConfig } from "@/lib/runtime-config";
import type { CsProject } from "@/lib/types";
import { getFirstParagraph, pathExists, toPosixPath } from "@/lib/parsers/shared";

const MAX_CONTEXT_BYTES = 50 * 1024;

export async function scanCsProjects() {
  const { projectsRoot, centralContextsDir, excludedDirs } = getRuntimePaths();
  const projectEntries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const projectNames = projectEntries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .filter((entry) => !excludedDirs.has(entry.name))
    .map((entry) => entry.name);
  const centralMap = await scanCentralContexts(centralContextsDir);
  const projects = await Promise.all(
    projectNames.map((projectName) =>
      buildCsProject(
        projectName,
        centralMap.get(normalizeKey(projectName)) ?? null,
        projectsRoot,
      ),
    ),
  );
  const missingDesktopProjects = [...centralMap.values()]
    .filter((contextPath) =>
      !projectNames.some(
        (projectName) =>
          normalizeKey(projectName) === normalizeKey(path.basename(contextPath, ".md")),
      ),
    )
    .map((contextPath) => buildExternalProject(contextPath, centralContextsDir));

  return [...projects, ...(await Promise.all(missingDesktopProjects))]
    .sort((left, right) => left.name.localeCompare(right.name, "ko-KR"));
}

export async function loadContext(projectName: string) {
  const { projectsRoot, centralContextsDir } = getRuntimePaths();
  validateProjectName(projectName);
  const projectPath = path.join(projectsRoot, projectName);
  const projectContextPath = path.join(projectPath, "cs-context.md");
  const centralContextPath = path.join(centralContextsDir, `${normalizeKey(projectName)}.md`);
  const contextPath = (await pathExists(projectContextPath)) ? projectContextPath : centralContextPath;
  const baselineSummary = await summarizeLocalProject(projectPath).catch(() => null);

  if (!(await pathExists(contextPath))) {
    return {
      content: baselineSummary ? `## 프로젝트 기준 정보\n${baselineSummary.summary}` : "",
      contextPath: null,
      hasContext: false,
    };
  }

  const content = await readContextFile(contextPath);
  return {
    content: baselineSummary
      ? `${content}\n\n## 프로젝트 기준 정보\n${baselineSummary.summary}`
      : content,
    contextPath: toPosixPath(contextPath),
    hasContext: true,
  };
}

export async function initProjectContext(projectName: string) {
  const { projectsRoot, centralContextsDir } = getRuntimePaths();
  validateProjectName(projectName);
  const projectPath = path.join(projectsRoot, projectName);
  const targetPath = (await pathExists(projectPath))
    ? path.join(projectPath, "cs-context.md")
    : path.join(centralContextsDir, `${normalizeKey(projectName)}.md`);

  await mkdir(path.dirname(targetPath), { recursive: true });

  if (!(await pathExists(targetPath))) {
    await writeFile(targetPath, createContextTemplate(projectName), "utf8");
  }

  return {
    created: true,
    path: toPosixPath(targetPath),
  };
}

function validateProjectName(name: string) {
  const { projectsRoot } = getRuntimePaths();
  if (!name || !name.trim()) {
    throw new Error("프로젝트 이름이 비어 있습니다.");
  }
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error("프로젝트 이름에 허용되지 않는 문자가 포함되어 있습니다.");
  }
  const resolved = path.resolve(projectsRoot, name);
  if (!(resolved === projectsRoot || resolved.startsWith(`${projectsRoot}${path.sep}`))) {
    throw new Error("허용되지 않는 경로입니다.");
  }
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9-]/g, "");
}

async function scanCentralContexts(centralContextsDir: string) {
  const files = await readdir(centralContextsDir, { withFileTypes: true }).catch(() => []);

  return new Map(
    files
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => [
        normalizeKey(path.basename(entry.name, ".md")),
        path.join(centralContextsDir, entry.name),
      ]),
  );
}

async function buildCsProject(projectName: string, fallbackContextPath: string | null, projectsRoot: string) {
  const projectPath = path.join(projectsRoot, projectName);
  const localContextPath = path.join(projectPath, "cs-context.md");
  const hasLocal = await pathExists(localContextPath);
  const contextPath = hasLocal ? localContextPath : fallbackContextPath;
  const summary = contextPath ? await summarizeContext(contextPath) : await summarizeProjectBaseline(projectPath);

  return {
    id: projectName,
    name: projectName,
    path: toPosixPath(projectPath),
    hasContext: Boolean(contextPath),
    contextPath: contextPath ? toPosixPath(contextPath) : null,
    contextSummary: summary,
    warning: contextPath ? null : "컨텍스트 파일이 없어 기본 프롬프트로 동작합니다.",
  } satisfies CsProject;
}

async function buildExternalProject(contextPath: string, centralContextsDir: string) {
  const name = path.basename(contextPath, ".md");
  const summary = await summarizeContext(contextPath);

  return {
    id: name,
    name,
    path: toPosixPath(centralContextsDir),
    hasContext: true,
    contextPath: toPosixPath(contextPath),
    contextSummary: summary,
    warning: null,
  } satisfies CsProject;
}

async function summarizeContext(contextPath: string) {
  const content = await readContextFile(contextPath);
  return getFirstParagraph(content).slice(0, 140) || "컨텍스트 요약 없음";
}

async function summarizeProjectBaseline(projectPath: string) {
  const baseline = await summarizeLocalProject(projectPath).catch(() => null);
  if (!baseline?.summary) {
    return "컨텍스트 없음";
  }

  return getFirstParagraph(baseline.summary).slice(0, 140) || "컨텍스트 없음";
}

async function readContextFile(contextPath: string) {
  const file = await readFile(contextPath, "utf8");

  if (Buffer.byteLength(file, "utf8") > MAX_CONTEXT_BYTES) {
    throw new Error("컨텍스트 파일은 50KB 이하여야 합니다.");
  }

  return file;
}

function createContextTemplate(projectName: string) {
  return `# ${projectName} CS 컨텍스트

## 서비스 개요
- 서비스 설명을 여기에 작성하세요.
- 주요 기능을 2~3개 정리하세요.
- 대상 고객을 적어 주세요.

## FAQ
### Q: 자주 받는 질문
A: 안내할 답변을 작성하세요.

## 응답 정책
- 톤앤매너:
- 환불 정책:
- 버그 대응:
- 에스컬레이션:

## 알려진 이슈
- 현재 알려진 이슈가 없으면 "없음"으로 기록하세요.
`;
}

function getRuntimePaths() {
  const runtimeConfig = getRuntimeConfig();
  return {
    projectsRoot: runtimeConfig.paths.projectsRoot,
    centralContextsDir: runtimeConfig.paths.csContextsDir,
    excludedDirs: new Set([
      ".Trash",
      ".localized",
      APP_META.slug,
      path.basename(runtimeConfig.paths.workspaceRoot),
      "node_modules",
      "$RECYCLE.BIN",
    ]),
  };
}

export function getCentralContextsDir() {
  return getRuntimeConfig().paths.csContextsDir;
}
