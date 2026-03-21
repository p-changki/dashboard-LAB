import path from "node:path";

import { executeActions } from "@/lib/parsers/file-action-engine";
import type {
  AutoOrganizeRequest,
  AutoOrganizeResponse,
  CleanupSuggestion,
  FileAction,
  FileManagerSection,
  ScannedFile,
} from "@/lib/types";

import { scanFileManager } from "./file-manager-parser";
import { formatBytes, pathExists, shellQuote } from "./shared";

const AUTO_LIMIT = 500;
const HOME = process.env.HOME || "";

export interface FilePattern {
  name: string;
  match: RegExp;
  project: string;
  subfolder: string;
  destination: string;
}

export const FILE_PATTERNS: FilePattern[] = [
  { name: "gyoan-poketvoca", match: /^about-(poket-voca|voca-test)/i, project: "교안메이커", subfolder: "포켓보카-스크린샷", destination: "~/Documents/프로젝트별/교안메이커/포켓보카-스크린샷/" },
  { name: "gyoan-steps", match: /^about-step/i, project: "교안메이커", subfolder: "스텝-스크린샷", destination: "~/Documents/프로젝트별/교안메이커/스텝-스크린샷/" },
  { name: "eduops-docs", match: /eduops|D4-|backend-request/i, project: "eduops", subfolder: "auto", destination: "~/Documents/프로젝트별/eduops/" },
  { name: "codeit-sprint", match: /\[스프린터용\]|판다마켓|sprint-mission/i, project: "코드잇", subfolder: "스프린트-과제", destination: "~/Documents/프로젝트별/코드잇/스프린트-과제/" },
  { name: "lecture-slides", match: /강의슬라이드|강의자료/i, project: "강의자료", subfolder: "슬라이드", destination: "~/Documents/강의자료/슬라이드/" },
  { name: "submission", match: /\[붙임|경력.*증명|학력.*증명|이력서|자기소개/i, project: "제출서류", subfolder: "", destination: "~/Documents/제출서류/" },
  { name: "exam-papers", match: /고\d|중\d|학기.*중간|학기.*기말|영어.*YBM|시험/i, project: "교안메이커", subfolder: "시험지", destination: "~/Documents/프로젝트별/교안메이커/시험지/" },
  { name: "dated-docs", match: /^\d{4}-\d{2}-\d{2}[_-]/, project: "auto", subfolder: "auto", destination: "~/Documents/작업일지/" },
  { name: "screenshots", match: /^Screenshot|^스크린샷|^Screen Shot|^Simulator Screen/i, project: "스크린샷", subfolder: "auto", destination: "~/Pictures/스크린샷/" },
  { name: "legal", match: /소송|법률|계약서|ssambee-legal/i, project: "법률문서", subfolder: "", destination: "~/Documents/법률문서/" },
  { name: "solapi", match: /solapi|alimtalk|알림톡/i, project: "solapi", subfolder: "", destination: "~/Documents/프로젝트별/solapi/" },
  { name: "web-to-markdown", match: /chatgpt|claude|gemini|cursor|codex/i, project: "AI자료", subfolder: "", destination: "~/Documents/AI자료/" },
];

export async function autoOrganize(request: AutoOrganizeRequest): Promise<AutoOrganizeResponse> {
  const snapshot = await scanFileManager();
  const reservedPaths = new Set<string>();
  const sections = getTargetSections(snapshot, request.target);
  const plan = await buildPlan(sections, reservedPaths);
  const limitedActions = plan.actions.slice(0, AUTO_LIMIT);
  const execution = await executeActions(limitedActions, request.dryRun);
  const moved = execution.results
    .filter((item) => item.success && item.action.destinationPath)
    .map((item) => ({ from: item.action.sourcePath, to: item.action.destinationPath!, size: formatBytes(findSize(plan.files, item.action.sourcePath)) }));

  return {
    dryRun: request.dryRun,
    moved,
    skipped: plan.skipped,
    summary: {
      totalMoved: moved.length,
      totalSkipped: plan.skipped.length + Math.max(plan.actions.length - AUTO_LIMIT, 0),
      totalSize: formatBytes(moved.reduce((sum, item) => sum + findSize(plan.files, item.from), 0)),
      createdDirs: [...new Set(moved.map((item) => path.dirname(item.to)))],
    },
    undoScript: execution.undoScript,
  };
}

export function resolveAutoSubfolder(fileName: string) {
  const match = fileName.match(/(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}

async function buildPlan(sections: FileManagerSection[], reservedPaths: Set<string>) {
  const files = sections.flatMap((section) => section.files);
  const suggestions = sections.flatMap((section) => section.suggestions);
  const actions: FileAction[] = [];
  const skipped: AutoOrganizeResponse["skipped"] = [];

  for (const file of files) {
    const resolution = await resolveAction(file, suggestions, reservedPaths);
    if (resolution.kind === "move") {
      actions.push(resolution.action);
    } else {
      skipped.push({ path: file.path, reason: resolution.reason });
    }
  }

  return { actions, skipped, files };
}

async function resolveAction(
  file: ScannedFile,
  suggestions: CleanupSuggestion[],
  reservedPaths: Set<string>,
) {
  if (isProtected(file)) {
    return { kind: "skip" as const, reason: "보호 경로" };
  }

  const patternMatch = FILE_PATTERNS.find((item) => item.match.test(file.name));
  if (patternMatch) {
    return buildMoveResolution(file, patternMatch.destination, patternMatch.subfolder, reservedPaths);
  }

  const fallback = suggestions.find((item) => item.file.path === file.path);
  if (!fallback || fallback.action !== "move" || !fallback.destination) {
    return { kind: "skip" as const, reason: getSkipReason(fallback?.action) };
  }

  return buildMoveResolution(file, fallback.destination, "", reservedPaths);
}

async function buildMoveResolution(
  file: ScannedFile,
  destination: string,
  subfolder: string,
  reservedPaths: Set<string>,
) {
  const baseDir = resolveHomePath(destination);
  const autoDir = subfolder === "auto" ? resolveAutoSubfolder(file.name) : subfolder;
  const targetDir = autoDir ? path.join(baseDir, autoDir) : baseDir;
  const destinationPath = await resolveUniquePath(path.join(targetDir, file.name), reservedPaths);
  reservedPaths.add(destinationPath);

  return {
    kind: "move" as const,
    action: {
      type: "move" as const,
      sourcePath: file.path,
      destinationPath,
      command: `mkdir -p ${shellQuote(path.dirname(destinationPath))} && mv ${shellQuote(file.path)} ${shellQuote(destinationPath)}`,
    },
  };
}

async function resolveUniquePath(initialPath: string, reservedPaths: Set<string>) {
  let candidate = initialPath;
  let index = 1;
  const parsed = path.parse(initialPath);

  while (reservedPaths.has(candidate) || (await pathExists(candidate))) {
    candidate = path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`);
    index += 1;
  }

  return candidate;
}

function getTargetSections(
  snapshot: Awaited<ReturnType<typeof scanFileManager>>,
  target: AutoOrganizeRequest["target"],
) {
  if (target === "both") {
    return [snapshot.desktop, snapshot.downloads];
  }

  return [snapshot[target]];
}

function getSkipReason(action?: CleanupSuggestion["action"]) {
  if (action === "delete") {
    return "삭제 대상 (수동 확인 필요)";
  }

  if (action === "review") {
    return "수동 확인 필요";
  }

  return "미분류";
}

function resolveHomePath(targetPath: string) {
  return targetPath.startsWith("~/") ? path.join(HOME, targetPath.slice(2)) : targetPath;
}

function isProtected(file: ScannedFile) {
  const name = path.basename(file.path);
  const aiConfigNames = [".claude", ".codex", ".gemini"];
  const looksLikeDirectory = !file.extension && file.category === "other";

  return (
    file.category === "code-project" ||
    looksLikeDirectory ||
    name.startsWith(".") ||
    aiConfigNames.includes(name) ||
    ["/.claude", "/.codex", "/.gemini", "/Obsidian Vault/"].some((segment) => file.path.includes(segment))
  );
}

function findSize(files: ScannedFile[], targetPath: string) {
  return files.find((file) => file.path === targetPath)?.sizeBytes ?? 0;
}
