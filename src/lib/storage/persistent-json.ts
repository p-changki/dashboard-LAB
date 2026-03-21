import { mkdirSync, readFileSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";

const writeQueue = new Map<string, Promise<void>>();

export function readPersistentJson<T>(fileName: string, fallback: T): T {
  const filePath = getStateFilePath(fileName);
  const stateDir = getStateDir();

  try {
    mkdirSync(stateDir, { recursive: true });
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
  mkdirSync(getStateDir(), { recursive: true });
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
  return path.join(getStateDir(), fileName);
}

function getStateDir() {
  return path.join(getRuntimeDataRoot(), "state");
}

function getRuntimeDataRoot() {
  return readEnvPath("DASHBOARD_LAB_DATA_ROOT") ?? path.join(process.cwd(), "data");
}

function readEnvPath(name: string) {
  const value = process.env[name]?.trim();
  return value ? path.resolve(value) : null;
}
