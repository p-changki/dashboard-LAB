import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  CleanupSuggestion,
  ExecutePreviewResponse,
  FileCategory,
  FileCleanupAction,
  FileManagerResponse,
  FileManagerSection,
  ScannedFile,
} from "@/lib/types";
import { getRuntimeConfig } from "@/lib/runtime-config";

import { readThroughCache } from "./cache";
import { resolveSafePath } from "./file-safety";
import { pathExists, formatBytes, shellQuote, toPosixPath } from "./shared";

const HOME_DIR = os.homedir();
const TRASH_PATH = path.join(HOME_DIR, ".Trash");
const CACHE_TTL_MS = 5 * 60 * 1000;

const EXTENSION_MAP: Record<string, FileCategory> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  svg: "image",
  heic: "image",
  webp: "image",
  mov: "video",
  mp4: "video",
  avi: "video",
  mkv: "video",
  pdf: "document",
  doc: "document",
  docx: "document",
  txt: "document",
  md: "document",
  rtf: "document",
  xlsx: "spreadsheet",
  xls: "spreadsheet",
  csv: "spreadsheet",
  pptx: "presentation",
  ppt: "presentation",
  key: "presentation",
  hwp: "hwp",
  hwpx: "hwp",
  zip: "archive",
  tar: "archive",
  gz: "archive",
  rar: "archive",
  "7z": "archive",
  dmg: "installer",
  pkg: "installer",
  exe: "installer",
  msi: "installer",
  mp3: "audio",
  wav: "audio",
  aac: "audio",
  flac: "audio",
  html: "web-save",
  ds_store: "system",
  ini: "system",
  localized: "system",
};

export async function scanFileManager(): Promise<FileManagerResponse> {
  return readThroughCache(buildFileManagerCacheKey(), CACHE_TTL_MS, scanAllDirectories);
}

export async function getExecutePreview(
  action: FileCleanupAction,
  files: string[],
): Promise<ExecutePreviewResponse> {
  const scanned = await scanFileManager();
  const allSuggestions = [...scanned.desktop.suggestions, ...scanned.downloads.suggestions];
  const selected = allSuggestions.filter(
    (suggestion) => suggestion.action === action && files.includes(suggestion.file.path),
  );

  return {
    commands: selected.map((suggestion) => suggestion.command),
    totalFiles: selected.length,
    totalSize: formatBytes(selected.reduce((sum, item) => sum + item.file.sizeBytes, 0)),
    copyAllCommand: selected.map((suggestion) => suggestion.command).join(" && "),
  };
}

async function scanAllDirectories(): Promise<FileManagerResponse> {
  const { desktopDir, downloadsDir } = getRuntimeConfig().paths;
  const [desktop, downloads] = await Promise.all([
    scanDirectory(desktopDir, "desktop"),
    scanDirectory(downloadsDir, "downloads"),
  ]);
  const suggestions = [...desktop.suggestions, ...downloads.suggestions];

  return {
    desktop,
    downloads,
    stats: {
      totalCleanable: suggestions.length,
      totalCleanableSize: formatBytes(suggestions.reduce((sum, item) => sum + item.file.sizeBytes, 0)),
      duplicateCount: [...desktop.files, ...downloads.files].filter((file) => file.isDuplicate).length,
      installerCount: [...desktop.files, ...downloads.files].filter((file) => file.category === "installer").length,
      oldFileCount: [...desktop.files, ...downloads.files].filter((file) => file.daysSinceAccess > 90).length,
    },
  };
}

async function scanDirectory(targetPath: string, source: "desktop" | "downloads") {
  const entries = await readdir(targetPath, { withFileTypes: true }).catch(() => []);
  const scanned = await Promise.all(entries.map((entry) => scanEntry(targetPath, entry.name, entry.isDirectory())));
  const files = detectDuplicates(
    scanned.filter((item): item is ScannedFile => item !== null),
  );
  const suggestions = files
    .map((file) => applyRules(file, source))
    .filter((item): item is CleanupSuggestion => item !== null);

  return {
    totalFiles: entries.filter((entry) => entry.isFile()).length,
    totalFolders: entries.filter((entry) => entry.isDirectory()).length,
    totalSize: formatBytes(files.reduce((sum, file) => sum + file.sizeBytes, 0)),
    byCategory: countByCategory(files),
    files,
    suggestions,
  } satisfies FileManagerSection;
}

async function scanEntry(
  parentPath: string,
  entryName: string,
  isDirectory: boolean,
): Promise<ScannedFile | null> {
  const absPath = path.join(parentPath, entryName);
  const fileStat = await stat(absPath).catch(() => null);

  if (!fileStat) {
    return null;
  }

  const extension = path.extname(entryName).replace(".", "").toLowerCase();
  return {
    name: entryName,
    path: toPosixPath(absPath),
    extension,
    category: await categorizeFile(absPath, entryName, extension, isDirectory),
    sizeBytes: fileStat.size,
    sizeHuman: formatBytes(fileStat.size),
    lastAccessed: fileStat.atime.toISOString(),
    lastModified: fileStat.mtime.toISOString(),
    daysSinceAccess: Math.floor((Date.now() - fileStat.atimeMs) / (1000 * 60 * 60 * 24)),
    isDuplicate: false,
    duplicateGroup: null,
  } satisfies ScannedFile;
}

async function categorizeFile(
  absPath: string,
  fileName: string,
  extension: string,
  isDirectory: boolean,
): Promise<FileCategory> {
  if (isDirectory) {
    return (await pathExists(path.join(absPath, "package.json"))) ? "code-project" : "other";
  }

  if (fileName === "$RECYCLE.BIN") {
    return "system";
  }

  return EXTENSION_MAP[extension] ?? "other";
}

function detectDuplicates(files: ScannedFile[]) {
  return files.map((file) => {
    const duplicateGroup = file.name.replace(/\s*\(\d+\)(?=\.)/, "");
    const isDuplicate = duplicateGroup !== file.name;
    return { ...file, isDuplicate, duplicateGroup: isDuplicate ? duplicateGroup : null };
  });
}

function applyRules(file: ScannedFile, source: "desktop" | "downloads") {
  if (file.category === "code-project") {
    return null;
  }

  if (source === "desktop") {
    return applyDesktopRules(file);
  }

  return applyDownloadsRules(file);
}

function applyDesktopRules(file: ScannedFile) {
  if (file.category === "system" || file.name === "$RECYCLE.BIN") {
    return buildSuggestion(file, "delete", "high", "시스템/쓰레기 파일", null);
  }

  if (file.category === "image" && isScreenshotName(file.name)) {
    return buildSuggestion(file, "move", "medium", "스크린샷 보관", buildUserPath("Pictures", "Screenshots"));
  }

  if (file.category === "image") {
    return buildSuggestion(file, "move", "medium", "이미지 파일 정리", buildUserPath("Pictures", "Imported"));
  }

  if (file.category === "video") {
    return buildSuggestion(file, "move", "medium", "동영상 파일 정리", buildUserPath("Movies", "Imported"));
  }

  if (["md", "txt", "rtf"].includes(file.extension)) {
    return buildSuggestion(
      file,
      "move",
      "low",
      "노트/텍스트 문서",
      buildUserPath("Documents", "dashboard-LAB", "Notes"),
    );
  }

  if (file.category === "document" || file.category === "hwp") {
    return buildSuggestion(
      file,
      "move",
      "low",
      "문서 파일 정리",
      buildUserPath("Documents", "dashboard-LAB", "Documents"),
    );
  }

  return file.extension === "bak"
    ? buildSuggestion(file, "delete", "medium", "백업 파일", null)
    : null;
}

function applyDownloadsRules(file: ScannedFile) {
  if (file.category === "installer") {
    return buildSuggestion(
      file,
      "delete",
      "high",
      file.extension === "exe" ? "Windows 실행파일 (Mac 불필요)" : "설치 완료된 설치파일",
      null,
    );
  }

  if (file.isDuplicate) {
    return buildSuggestion(file, "delete", "high", "중복 다운로드 (원본 존재)", null);
  }

  if (file.extension === "pdf") {
    return buildSuggestion(
      file,
      "move",
      "medium",
      "PDF 문서",
      buildUserPath("Documents", "dashboard-LAB", "PDF"),
    );
  }

  if (file.category === "presentation") {
    return buildSuggestion(
      file,
      "move",
      "medium",
      "프레젠테이션 자료",
      buildUserPath("Documents", "dashboard-LAB", "Presentations"),
    );
  }

  if (file.category === "hwp") {
    return buildSuggestion(
      file,
      "move",
      "medium",
      "문서 파일",
      buildUserPath("Documents", "dashboard-LAB", "Documents"),
    );
  }

  if (file.category === "spreadsheet") {
    return buildSuggestion(
      file,
      "move",
      "medium",
      "스프레드시트",
      buildUserPath("Documents", "dashboard-LAB", "Spreadsheets"),
    );
  }

  if (file.category === "image") {
    return buildSuggestion(file, "move", "low", "이미지 파일", buildUserPath("Pictures", "Imported"));
  }

  if (file.category === "archive") {
    return buildSuggestion(file, "review", "low", "압축 파일 (해제 여부 확인 필요)", null);
  }

  if (file.category === "web-save") {
    return buildSuggestion(file, "delete", "medium", "저장된 웹페이지", null);
  }

  if (file.category === "audio") {
    return buildSuggestion(file, "move", "low", "오디오 파일", buildUserPath("Music", "Imported"));
  }

  return ["txt", "md"].includes(file.extension)
    ? buildSuggestion(
        file,
        "move",
        "low",
        "텍스트 파일",
        buildUserPath("Documents", "dashboard-LAB", "Notes"),
      )
    : null;
}

function buildSuggestion(
  file: ScannedFile,
  action: FileCleanupAction,
  urgency: "high" | "medium" | "low",
  reason: string,
  destination: string | null,
) {
  return {
    file,
    action,
    urgency,
    reason,
    destination,
    command: generateCommand(file.path, action, destination),
  } satisfies CleanupSuggestion;
}

function generateCommand(filePath: string, action: FileCleanupAction, destination: string | null) {
  if (action === "move" && destination) {
    const targetDir = resolveDestination(destination);
    const targetPath = path.join(targetDir, path.basename(filePath));
    return `mkdir -p ${shellQuote(targetDir)} && mv ${shellQuote(filePath)} ${shellQuote(targetPath)}`;
  }

  if (action === "delete") {
    return `mv ${shellQuote(filePath)} ${shellQuote(path.join(TRASH_PATH, path.basename(filePath)))}`;
  }

  return `# 확인 필요: ${shellQuote(filePath)}`;
}

function resolveDestination(destination: string) {
  return destination.startsWith("~/")
    ? path.join(HOME_DIR, destination.slice(2))
    : destination;
}

function countByCategory(files: ScannedFile[]) {
  const initial = Object.keys(EXTENSION_MAP).reduce<Record<string, number>>(
    (acc) => acc,
    {},
  );
  const byCategory = {
    image: 0,
    video: 0,
    document: 0,
    spreadsheet: 0,
    presentation: 0,
    hwp: 0,
    archive: 0,
    installer: 0,
    audio: 0,
    "code-project": 0,
    "web-save": 0,
    system: 0,
    other: 0,
  } satisfies Record<FileCategory, number>;

  return files.reduce(
    (acc, file) => ({ ...acc, [file.category]: acc[file.category] + 1 }),
    { ...initial, ...byCategory } as Record<FileCategory, number>,
  );
}

export function validateManagedPath(relativePath: string) {
  const { desktopDir, downloadsDir } = getRuntimeConfig().paths;
  const roots = [desktopDir, downloadsDir];
  return roots.some((root) => Boolean(resolveSafePath(root, path.relative(root, relativePath))));
}

export { FILE_PATTERNS, resolveAutoSubfolder } from "./file-manager-auto-organize";

function buildUserPath(...segments: string[]) {
  return path.posix.join("~", ...segments);
}

function buildFileManagerCacheKey() {
  const { desktopDir, downloadsDir } = getRuntimeConfig().paths;
  return `file-manager:${desktopDir}:${downloadsDir}`;
}

function isScreenshotName(fileName: string) {
  return /^(screenshot|screen shot|스크린샷|simulator screen)/i.test(fileName);
}
