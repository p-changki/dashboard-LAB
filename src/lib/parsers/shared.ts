import { exec } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { readCommandVersion } from "@/lib/command-availability";

const execAsync = promisify(exec);

const SENSITIVE_KEY_RE =
  /(token|secret|password|authorization|cookie|api[_-]?key|private[_-]?key|client[_-]?secret)/i;
const SENSITIVE_VALUE_RE =
  /(ctx7sk-|sk-[a-z0-9]|bearer\s+[a-z0-9._-]+|AIza[0-9A-Za-z_-]+)/i;

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export const HOME_DIR = os.homedir();

export const CLAUDE_AGENTS_DIR = path.join(HOME_DIR, ".claude", "agents");
export const CLAUDE_COMMANDS_DIR = path.join(HOME_DIR, ".claude", "commands");
export const CLAUDE_SKILLS_DIR = path.join(HOME_DIR, ".claude", "skills");
export const CLAUDE_SETTINGS_FILE = path.join(
  HOME_DIR,
  ".claude",
  "settings.json",
);

export const CODEX_SKILLS_DIR = path.join(HOME_DIR, ".codex", "skills");
export const GEMINI_DIR = path.join(HOME_DIR, ".gemini");
export const GEMINI_SETTINGS_FILE = path.join(GEMINI_DIR, "settings.json");
export const GEMINI_POLICY_FILE = path.join(GEMINI_DIR, "GEMINI.md");

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep);
}

export function toHomePath(filePath: string): string {
  return toPosixPath(filePath).replace(toPosixPath(HOME_DIR), "~");
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readUtf8(targetPath: string): Promise<string | null> {
  try {
    return await readFile(targetPath, "utf8");
  } catch {
    return null;
  }
}

export async function readJsonObject(
  targetPath: string,
): Promise<Record<string, unknown>> {
  const raw = await readUtf8(targetPath);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function listDirectories(
  targetPath: string,
  options: { includeHidden?: boolean } = {},
): Promise<string[]> {
  try {
    const entries = await readdir(targetPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => options.includeHidden || !entry.name.startsWith("."))
      .map((entry) => path.join(targetPath, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export async function listFiles(
  targetPath: string,
  predicate?: (fileName: string) => boolean,
): Promise<string[]> {
  try {
    const entries = await readdir(targetPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => (predicate ? predicate(fileName) : true))
      .map((fileName) => path.join(targetPath, fileName))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export async function resolveMarkdownFile(
  directoryPath: string,
  preferredNames: string[],
): Promise<string | null> {
  for (const preferredName of preferredNames) {
    const candidate = path.join(directoryPath, preferredName);

    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  const markdownFiles = await listFiles(directoryPath, (fileName) =>
    /\.md$/i.test(fileName),
  );

  return markdownFiles[0] ?? null;
}

export function parseMarkdown(source: string): ParsedMarkdown {
  if (!source.startsWith("---")) {
    return { frontmatter: {}, body: source };
  }

  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);

  if (!match) {
    return { frontmatter: {}, body: source };
  }

  return {
    frontmatter: parseLooseFrontmatter(match[1]),
    body: source.slice(match[0].length),
  };
}

export function getFirstMeaningfulLine(source: string): string {
  return getMeaningfulLines(source)[0] ?? "";
}

export function getFirstParagraph(source: string): string {
  const paragraphs = source
    .split(/\r?\n\s*\r?\n/)
    .map((chunk) =>
      getMeaningfulLines(chunk)
        .filter((line) => !line.startsWith("```"))
        .join(" "),
    )
    .map(normalizeWhitespace)
    .filter(Boolean);

  return paragraphs[0] ?? "";
}

export function summarizeText(source: string, maxLines = 5): string {
  return getMeaningfulLines(source).slice(0, maxLines).join(" ");
}

export function maskSensitiveData<T>(value: T, parentKey = ""): T {
  if (Array.isArray(value)) {
    return value.map((entry) => maskSensitiveData(entry, parentKey)) as T;
  }

  if (isRecord(value)) {
    const masked = Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (SENSITIVE_KEY_RE.test(key)) {
          return [key, "***"];
        }

        return [key, maskSensitiveData(nestedValue, key)];
      }),
    );

    return masked as T;
  }

  if (typeof value === "string") {
    if (SENSITIVE_KEY_RE.test(parentKey) || SENSITIVE_VALUE_RE.test(value)) {
      return "***" as T;
    }
  }

  return value;
}

export async function detectCliVersion(
  command: string,
  args: string[] = ["--version"],
): Promise<string> {
  return (await readCommandVersion(command, args)) ?? "unknown";
}

export async function runShellCommand(command: string, cwd?: string) {
  try {
    const { stdout } = await execAsync(command, {
      cwd,
      env: process.env,
      timeout: 5000,
      maxBuffer: 1024 * 1024 * 8,
    });

    return stdout.trim();
  } catch {
    return "";
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}${units[unitIndex]}`;
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function basenameWithoutExtension(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMeaningfulLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== "---")
    .filter((line) => !line.startsWith("```"))
    .map((line) => line.replace(/^#+\s*/, ""))
    .filter(Boolean);
}

function parseLooseFrontmatter(source: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = source.split(/\r?\n/);
  let listKey: string | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (keyValueMatch) {
      const [, key, rawValue] = keyValueMatch;

      if (!rawValue) {
        listKey = key;
        result[key] = [];
        continue;
      }

      listKey = null;
      result[key] = parseFrontmatterValue(rawValue);
      continue;
    }

    if (listKey && /^\s*-\s+/.test(line)) {
      const listValue = line.replace(/^\s*-\s+/, "");
      const current = Array.isArray(result[listKey])
        ? (result[listKey] as string[])
        : [];

      result[listKey] = [...current, stripWrappingQuotes(listValue)];
      continue;
    }

    listKey = null;
  }

  return result;
}

function parseFrontmatterValue(rawValue: string): unknown {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => stripWrappingQuotes(item.trim()))
      .filter(Boolean);
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  return stripWrappingQuotes(trimmed);
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}
