import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import { summarizeLocalProject } from "@/lib/call-to-prd/project-context";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/locale";
import { getRuntimeConfig } from "@/lib/runtime/config";
import type { CsProject } from "@/lib/types";
import { getFirstParagraph, pathExists, toPosixPath } from "@/lib/parsers/shared";

import {
  createCsContextTemplate,
  getCsContextBaselineHeading,
  getCsContextMissing,
  getCsContextSummaryFallback,
  getCsContextWarning,
  getCsValidationMessage,
} from "./messages";

const MAX_CONTEXT_BYTES = 50 * 1024;

export async function scanCsProjects(locale: AppLocale = DEFAULT_LOCALE) {
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
        locale,
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
    .map((contextPath) => buildExternalProject(contextPath, centralContextsDir, locale));

  return [...projects, ...(await Promise.all(missingDesktopProjects))]
    .sort((left, right) => left.name.localeCompare(right.name, locale === "en" ? "en-US" : "ko-KR"));
}

export async function loadContext(projectName: string, locale: AppLocale = DEFAULT_LOCALE) {
  const { projectsRoot, centralContextsDir } = getRuntimePaths();
  validateProjectName(projectName, locale);
  const projectPath = path.join(projectsRoot, projectName);
  const projectContextPath = path.join(projectPath, "cs-context.md");
  const centralContextPath = path.join(centralContextsDir, `${normalizeKey(projectName)}.md`);
  const contextPath = (await pathExists(projectContextPath)) ? projectContextPath : centralContextPath;
  const baselineSummary = await summarizeLocalProject(projectPath).catch(() => null);

  if (!(await pathExists(contextPath))) {
    return {
      content: baselineSummary ? `${getCsContextBaselineHeading(locale)}\n${baselineSummary.summary}` : "",
      contextPath: null,
      hasContext: false,
    };
  }

  const content = await readContextFile(contextPath, locale);
  return {
    content: baselineSummary
      ? `${content}\n\n${getCsContextBaselineHeading(locale)}\n${baselineSummary.summary}`
      : content,
    contextPath: toPosixPath(contextPath),
    hasContext: true,
  };
}

export async function initProjectContext(projectName: string, locale: AppLocale = DEFAULT_LOCALE) {
  const { projectsRoot, centralContextsDir } = getRuntimePaths();
  validateProjectName(projectName, locale);
  const projectPath = path.join(projectsRoot, projectName);
  const targetPath = (await pathExists(projectPath))
    ? path.join(projectPath, "cs-context.md")
    : path.join(centralContextsDir, `${normalizeKey(projectName)}.md`);

  await mkdir(path.dirname(targetPath), { recursive: true });

  if (!(await pathExists(targetPath))) {
    await writeFile(targetPath, createCsContextTemplate(projectName, locale), "utf8");
  }

  return {
    created: true,
    path: toPosixPath(targetPath),
  };
}

function validateProjectName(name: string, locale: AppLocale) {
  const { projectsRoot } = getRuntimePaths();
  if (!name || !name.trim()) {
    throw new Error(getCsValidationMessage(locale, "contextNameRequired"));
  }
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    throw new Error(getCsValidationMessage(locale, "contextNameInvalid"));
  }
  const resolved = path.resolve(projectsRoot, name);
  if (!(resolved === projectsRoot || resolved.startsWith(`${projectsRoot}${path.sep}`))) {
    throw new Error(getCsValidationMessage(locale, "pathNotAllowed"));
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

async function buildCsProject(
  projectName: string,
  fallbackContextPath: string | null,
  projectsRoot: string,
  locale: AppLocale,
) {
  const projectPath = path.join(projectsRoot, projectName);
  const localContextPath = path.join(projectPath, "cs-context.md");
  const hasLocal = await pathExists(localContextPath);
  const contextPath = hasLocal ? localContextPath : fallbackContextPath;
  const summary = contextPath
    ? await summarizeContext(contextPath, locale)
    : await summarizeProjectBaseline(projectPath, locale);

  return {
    id: projectName,
    name: projectName,
    path: toPosixPath(projectPath),
    hasContext: Boolean(contextPath),
    contextPath: contextPath ? toPosixPath(contextPath) : null,
    contextSummary: summary,
    warning: contextPath ? null : getCsContextWarning(locale),
  } satisfies CsProject;
}

async function buildExternalProject(contextPath: string, centralContextsDir: string, locale: AppLocale) {
  const name = path.basename(contextPath, ".md");
  const summary = await summarizeContext(contextPath, locale);

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

async function summarizeContext(contextPath: string, locale: AppLocale) {
  const content = await readContextFile(contextPath, locale);
  return getFirstParagraph(content).slice(0, 140) || getCsContextSummaryFallback(locale);
}

async function summarizeProjectBaseline(projectPath: string, locale: AppLocale) {
  const baseline = await summarizeLocalProject(projectPath).catch(() => null);
  if (!baseline?.summary) {
    return getCsContextMissing(locale);
  }

  return getFirstParagraph(baseline.summary).slice(0, 140) || getCsContextMissing(locale);
}

async function readContextFile(contextPath: string, locale: AppLocale) {
  const file = await readFile(contextPath, "utf8");

  if (Buffer.byteLength(file, "utf8") > MAX_CONTEXT_BYTES) {
    throw new Error(getCsValidationMessage(locale, "contextTooLarge"));
  }

  return file;
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
