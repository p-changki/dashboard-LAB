import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { checkCommandAvailable, getCommandEnvironment } from "@/lib/command-availability";
import { getRuntimeConfig } from "@/lib/runtime/config";

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 10 * 60 * 1000; // 10분
const WHISPER_CPP_MODEL_ENV_KEYS = ["WHISPER_MODEL_PATH", "WHISPER_CPP_MODEL_PATH", "WHISPER_CPP_MODEL"] as const;
const WHISPER_CPP_SUPPORTED_EXTENSIONS = new Set([".flac", ".mp3", ".ogg", ".wav"]);
const WHISPER_CPP_MODEL_FILE_NAMES = ["ggml-medium.bin", "ggml-small.bin", "ggml-base.bin"] as const;
const WHISPER_INSTALL_MESSAGE =
  "whisper CLI가 설치되어 있지 않습니다. python3 -m pip install openai-whisper 또는 brew install whisper-cpp";
const WHISPER_CPP_MODEL_MESSAGE =
  "whisper-cpp는 설치되어 있지만 사용할 모델이 없습니다. WHISPER_MODEL_PATH=/path/to/ggml-medium.bin 을 설정하거나 python3 -m pip install openai-whisper 를 설치해 주세요.";

type WhisperBackend =
  | { command: "whisper" }
  | { command: "whisper-cli"; modelPath: string };

export async function checkWhisperInstalled(): Promise<boolean> {
  return (await getWhisperSetupError()) === null;
}

export async function getWhisperSetupError(): Promise<string | null> {
  if (await hasCommand("whisper")) {
    return null;
  }

  if (await hasCommand("whisper-cli")) {
    const modelPath = await resolveWhisperCliModelPath();
    return modelPath ? null : WHISPER_CPP_MODEL_MESSAGE;
  }

  return WHISPER_INSTALL_MESSAGE;
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const backend = await resolveWhisperBackend();
  const outputBase = filePath.replace(/\.[^.]+$/, "");
  const outputPath = filePath.replace(/\.[^.]+$/, ".txt");

  if (backend.command === "whisper") {
    await execFileAsync("whisper", [
      filePath,
      "--model",
      "medium",
      "--language",
      "ko",
      "--output_format",
      "txt",
    ], { timeout: TIMEOUT_MS, env: getCommandEnvironment() });
  } else {
    const inputPath = await ensureWhisperCliInput(filePath);
    await execFileAsync("whisper-cli", [
      "-m",
      backend.modelPath,
      "-ng",
      "-l",
      "ko",
      "-otxt",
      "-of",
      outputBase,
      inputPath,
    ], { timeout: TIMEOUT_MS, env: getCommandEnvironment() });
  }

  const transcript = await readFile(outputPath, "utf-8");
  return transcript.trim();
}

async function resolveWhisperBackend(): Promise<WhisperBackend> {
  if (await hasCommand("whisper")) {
    return { command: "whisper" };
  }

  if (await hasCommand("whisper-cli")) {
    const modelPath = await resolveWhisperCliModelPath();
    if (!modelPath) {
      throw new Error(WHISPER_CPP_MODEL_MESSAGE);
    }

    return {
      command: "whisper-cli",
      modelPath,
    };
  }

  throw new Error(WHISPER_INSTALL_MESSAGE);
}

async function resolveWhisperCliModelPath(): Promise<string | null> {
  for (const key of WHISPER_CPP_MODEL_ENV_KEYS) {
    const configuredPath = process.env[key];
    if (configuredPath && await fileExists(configuredPath)) {
      return configuredPath;
    }
  }

  for (const candidate of getCommonModelPaths()) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function ensureWhisperCliInput(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (WHISPER_CPP_SUPPORTED_EXTENSIONS.has(ext)) {
    return filePath;
  }

  if (!await hasCommand("ffmpeg")) {
    throw new Error("whisper-cli로 m4a/webm을 처리하려면 ffmpeg가 필요합니다. brew install ffmpeg");
  }

  const convertedPath = filePath.replace(/\.[^.]+$/, ".whisper.wav");
  await execFileAsync("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    filePath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    convertedPath,
  ], { timeout: TIMEOUT_MS, env: getCommandEnvironment() });

  return convertedPath;
}

async function hasCommand(command: string): Promise<boolean> {
  return checkCommandAvailable(command);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function getCommonModelPaths(): string[] {
  const runtimeConfig = getRuntimeConfig();
  const homeDir = process.env.HOME || runtimeConfig.paths.homeDir;
  const resourcesModelsDir = getElectronResourcesModelsDir();
  const applicationSupportModelsDir = getApplicationSupportModelsDir(homeDir);
  const workspaceModelsDir = path.join(runtimeConfig.paths.workspaceRoot, "models");
  const modelDirs = [
    runtimeConfig.paths.modelsDir,
    resourcesModelsDir,
    applicationSupportModelsDir,
    workspaceModelsDir,
  ];
  const candidates: string[] = [];

  for (const dir of [...new Set(modelDirs.filter((value): value is string => Boolean(value)))]) {
    for (const name of WHISPER_CPP_MODEL_FILE_NAMES) {
      candidates.push(path.join(dir, name));
    }
  }

  if (homeDir) {
    candidates.push(
      path.join(homeDir, ".cache", "whisper.cpp", "ggml-medium.bin"),
      path.join(homeDir, ".cache", "whisper.cpp", "ggml-small.bin"),
      path.join(homeDir, ".cache", "whisper.cpp", "ggml-base.bin"),
    );
  }

  return candidates;
}

function getElectronResourcesModelsDir() {
  const envResourcesPath = process.env.ELECTRON_RESOURCES_PATH?.trim();
  if (envResourcesPath) {
    return path.join(path.resolve(envResourcesPath), "models");
  }

  const runtimeResourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath?.trim();
  return runtimeResourcesPath ? path.join(path.resolve(runtimeResourcesPath), "models") : null;
}

function getApplicationSupportModelsDir(homeDir: string) {
  if (process.platform !== "darwin") {
    return null;
  }

  return path.join(homeDir, "Library", "Application Support", "dashboard-lab", "models");
}
