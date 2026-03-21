import { mkdirSync, readFileSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";

const STATE_DIR = path.join(process.cwd(), "data", "state");
const writeQueue = new Map<string, Promise<void>>();

export function readPersistentJson<T>(fileName: string, fallback: T): T {
  const filePath = getStateFilePath(fileName);

  try {
    mkdirSync(STATE_DIR, { recursive: true });
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function persistJson(fileName: string, data: unknown): void {
  const filePath = getStateFilePath(fileName);
  const tempPath = `${filePath}.tmp`;
  const serialized = JSON.stringify(data, null, 2);
  mkdirSync(STATE_DIR, { recursive: true });
  const previous = writeQueue.get(filePath) ?? Promise.resolve();

  const next = previous
    .catch(() => undefined)
    .then(async () => {
      await writeFile(tempPath, serialized, "utf-8");
      await rename(tempPath, filePath);
    })
    .catch((error) => {
      console.error(`Failed to persist state: ${fileName}`, error);
    });

  writeQueue.set(filePath, next);
}

function getStateFilePath(fileName: string) {
  return path.join(STATE_DIR, fileName);
}
