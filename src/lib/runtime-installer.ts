import "server-only";

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getRuntimeConfig } from "@/lib/runtime-config";
import type {
  DashboardLabRuntimeCheckRemedy,
  DashboardLabRuntimeInstallResult,
} from "@/lib/types";

const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
const PNPM_VERSION = "10.17.1";

const TASK_LABELS: Record<string, string> = {
  "install-node": "Node.js 설치",
  "install-pnpm": "pnpm 준비",
  "install-ffmpeg": "ffmpeg 설치",
  "install-whisper-backend": "Whisper backend 설치",
  "download-whisper-model": "Whisper 모델 다운로드",
};

export function isDesktopRuntime() {
  return process.env.DASHBOARD_LAB_DESKTOP === "1";
}

export function hasCommandSync(command: string) {
  if (process.platform === "win32") {
    const result = spawnSyncCompat("where", [command]);
    return result.status === 0;
  }

  const result = spawnSyncCompat("sh", ["-lc", `command -v '${command}'`]);
  return result.status === 0;
}

export function detectWhisperModelSync() {
  const runtimeConfig = getRuntimeConfig();
  const candidate = getWhisperModelCandidates().find((item) => existsSync(item));

  return {
    exists: Boolean(candidate),
    path:
      candidate ??
      path.join(runtimeConfig.paths.modelsDir, "ggml-base.bin"),
  };
}

export function getRuntimeCheckFixHint(checkId: string) {
  switch (checkId) {
    case "node":
      if (isDesktopRuntime()) {
        return "패키지된 데스크톱 앱에서는 별도 Node.js 설치가 필요하지 않습니다.";
      }

      return "Node.js 22+가 필요합니다.";
    case "pnpm":
      if (isDesktopRuntime()) {
        return "패키지된 데스크톱 앱에서는 별도 pnpm 설치가 필요하지 않습니다.";
      }

      return hasCommandSync("corepack")
        ? `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate`
        : "pnpm이 필요합니다.";
    case "ffmpeg":
      if (process.platform === "darwin") {
        return hasCommandSync("brew")
          ? "오디오 변환을 위해 ffmpeg가 필요합니다. 앱에서 바로 설치할 수 있습니다."
          : "ffmpeg 설치 전 Homebrew가 필요합니다.";
      }

      if (process.platform === "win32") {
        return hasCommandSync("winget")
          ? "오디오 변환을 위해 ffmpeg가 필요합니다. 앱에서 바로 설치할 수 있습니다."
          : "winget 또는 choco로 ffmpeg를 설치해야 합니다.";
      }

      return "ffmpeg가 있어야 m4a/webm 파일을 전사할 수 있습니다.";
    case "whisper":
      if (process.platform === "darwin") {
        return hasCommandSync("brew")
          ? "Whisper backend가 있어야 오디오 전사를 실행할 수 있습니다. 앱에서 바로 설치할 수 있습니다."
          : "Whisper backend 설치 전 Homebrew가 필요합니다.";
      }

      if (process.platform === "win32") {
        return hasCommandSync("python") || hasCommandSync("py")
          ? "Python 환경이 있으면 앱에서 Whisper backend 설치를 시도할 수 있습니다."
          : "Python이 있어야 openai-whisper 자동 설치를 도울 수 있습니다.";
      }

      return hasCommandSync("python3")
        ? "Python3가 있으면 앱에서 Whisper backend 설치를 시도할 수 있습니다."
        : "Python3 또는 whisper-cpp 패키지가 필요합니다.";
    case "whisper-model":
      return "Whisper 모델이 있어야 whisper-cpp 전사를 실행할 수 있습니다. 앱에서 바로 내려받을 수 있습니다.";
    case "claude":
      return "문서 생성에는 로그인된 Claude CLI가 필요합니다.";
    case "codex":
      return "문서 생성 또는 스킬 실행에는 로그인된 Codex CLI가 필요합니다.";
    case "gemini":
      return "Gemini 기반 응답을 쓰려면 Gemini CLI가 필요합니다.";
    case "projects-root":
      return "프로젝트 루트를 저장하면 Projects, Doc Hub, CS Helper가 같은 기준으로 동작합니다.";
    default:
      return null;
  }
}

export function getRuntimeCheckRemedy(
  checkId: string,
): DashboardLabRuntimeCheckRemedy | null {
  switch (checkId) {
    case "node":
      if (isDesktopRuntime()) {
        return null;
      }

      return getNodeRemedy();
    case "pnpm":
      if (isDesktopRuntime()) {
        return null;
      }

      return getPnpmRemedy();
    case "ffmpeg":
      return getFfmpegRemedy();
    case "whisper":
      return getWhisperRemedy();
    case "whisper-model":
      return {
        action: "run",
        label: "모델 다운로드",
        detail: "Whisper 기본 모델을 내려받습니다.",
        taskId: "download-whisper-model",
      };
    default:
      return null;
  }
}

export async function executeRuntimeInstallTasks(taskIds: string[]) {
  const uniqueTaskIds = [...new Set(taskIds.filter(Boolean))];
  const results: DashboardLabRuntimeInstallResult[] = [];

  for (const taskId of uniqueTaskIds) {
    const label = TASK_LABELS[taskId] ?? taskId;

    try {
      const detail = await executeRuntimeInstallTask(taskId);
      results.push({
        taskId,
        label,
        status: "success",
        detail: detail.summary,
        output: detail.output,
      });
    } catch (error) {
      results.push({
        taskId,
        label,
        status: "failed",
        detail:
          error instanceof Error
            ? error.message
            : "설치를 완료하지 못했습니다.",
        output: null,
      });
    }
  }

  return results;
}

async function executeRuntimeInstallTask(taskId: string) {
  switch (taskId) {
    case "install-node": {
      const command = getNodeInstallCommand();
      if (!command) {
        throw new Error("현재 환경에서는 Node.js 자동 설치를 지원하지 않습니다.");
      }

      const output = await runShellCommand(command);
      return { summary: "Node.js 설치를 완료했습니다.", output };
    }
    case "install-pnpm": {
      const command = getPnpmInstallCommand();
      if (!command) {
        throw new Error("현재 환경에서는 pnpm 자동 준비를 지원하지 않습니다.");
      }

      const output = await runShellCommand(command);
      return { summary: "pnpm 준비를 완료했습니다.", output };
    }
    case "install-ffmpeg": {
      const command = getFfmpegInstallCommand();
      if (!command) {
        throw new Error("현재 환경에서는 ffmpeg 자동 설치를 지원하지 않습니다.");
      }

      const output = await runShellCommand(command);
      return { summary: "ffmpeg 설치를 완료했습니다.", output };
    }
    case "install-whisper-backend": {
      const command = getWhisperInstallCommand();
      if (!command) {
        throw new Error("현재 환경에서는 Whisper backend 자동 설치를 지원하지 않습니다.");
      }

      const output = await runShellCommand(command);
      return { summary: "Whisper backend 설치를 완료했습니다.", output };
    }
    case "download-whisper-model": {
      const destination = await downloadWhisperModel();
      return {
        summary: `Whisper 모델을 내려받았습니다: ${destination}`,
        output: destination,
      };
    }
    default:
      throw new Error(`알 수 없는 설치 작업입니다: ${taskId}`);
  }
}

function getNodeRemedy(): DashboardLabRuntimeCheckRemedy | null {
  const command = getNodeInstallCommand();

  if (command) {
    return {
      action: "run",
      label: "Node.js 설치",
      detail: "앱에서 Node.js 설치를 실행합니다.",
      taskId: "install-node",
      command,
    };
  }

  return {
    action: "open_url",
    label: "설치 페이지 열기",
    detail: "Node.js 22+ 설치 페이지를 엽니다.",
    url: "https://nodejs.org",
  };
}

function getPnpmRemedy(): DashboardLabRuntimeCheckRemedy | null {
  const command = getPnpmInstallCommand();

  if (command) {
    return {
      action: "run",
      label: "pnpm 준비",
      detail: "앱에서 pnpm 준비를 실행합니다.",
      taskId: "install-pnpm",
      command,
    };
  }

  return {
    action: "manual",
    label: "수동 준비 필요",
    detail: `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate`,
    command: `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate`,
  };
}

function getFfmpegRemedy(): DashboardLabRuntimeCheckRemedy | null {
  const command = getFfmpegInstallCommand();

  if (command) {
    return {
      action: "run",
      label: "ffmpeg 설치",
      detail: "앱에서 ffmpeg 설치를 실행합니다.",
      taskId: "install-ffmpeg",
      command,
    };
  }

  if (process.platform === "darwin") {
    return {
      action: "open_url",
      label: "Homebrew 설치 안내",
      detail: "ffmpeg 자동 설치 전에 Homebrew가 필요합니다.",
      url: "https://brew.sh",
    };
  }

  return {
    action: "manual",
    label: "수동 설치 안내",
    detail: getFfmpegManualHelp(),
    command: getFfmpegManualHelp(),
  };
}

function getWhisperRemedy(): DashboardLabRuntimeCheckRemedy | null {
  const command = getWhisperInstallCommand();

  if (command) {
    return {
      action: "run",
      label: "Whisper 설치",
      detail: "앱에서 Whisper backend 설치를 실행합니다.",
      taskId: "install-whisper-backend",
      command,
    };
  }

  if (process.platform === "darwin") {
    return {
      action: "open_url",
      label: "Homebrew 설치 안내",
      detail: "whisper-cpp 자동 설치 전에 Homebrew가 필요합니다.",
      url: "https://brew.sh",
    };
  }

  return {
    action: "manual",
    label: "수동 설치 안내",
    detail: getWhisperManualHelp(),
    command: getWhisperManualHelp(),
  };
}

function getNodeInstallCommand() {
  if (process.platform === "darwin" && hasCommandSync("brew")) {
    return "brew install node";
  }

  if (process.platform === "win32" && hasCommandSync("winget")) {
    return "winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements";
  }

  return "";
}

function getPnpmInstallCommand() {
  if (hasCommandSync("corepack")) {
    return `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate`;
  }

  if (process.platform === "darwin" && hasCommandSync("brew")) {
    return "brew install pnpm";
  }

  if (hasCommandSync("npm")) {
    return "npm install -g pnpm";
  }

  return "";
}

function getFfmpegInstallCommand() {
  if (process.platform === "darwin" && hasCommandSync("brew")) {
    return "brew install ffmpeg";
  }

  if (process.platform === "win32" && hasCommandSync("winget")) {
    return "winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements";
  }

  return "";
}

function getWhisperInstallCommand() {
  if (process.platform === "darwin" && hasCommandSync("brew")) {
    return "brew install whisper-cpp";
  }

  if (process.platform === "win32") {
    if (hasCommandSync("python")) {
      return "python -m pip install openai-whisper";
    }

    if (hasCommandSync("py")) {
      return "py -m pip install openai-whisper";
    }
  }

  if (process.platform === "linux" && hasCommandSync("python3")) {
    return "python3 -m pip install openai-whisper";
  }

  return "";
}

function getFfmpegManualHelp() {
  if (process.platform === "win32") {
    return "winget install Gyan.FFmpeg 또는 choco install ffmpeg";
  }

  return "sudo apt install ffmpeg 또는 사용하는 패키지 매니저로 ffmpeg를 설치하세요.";
}

function getWhisperManualHelp() {
  if (process.platform === "win32") {
    return "python -m pip install openai-whisper 또는 whisper-cpp 바이너리를 PATH에 추가하세요.";
  }

  if (process.platform === "linux") {
    return "python3 -m pip install openai-whisper 또는 whisper-cpp 패키지를 설치하세요.";
  }

  return "brew install whisper-cpp 또는 python3 -m pip install openai-whisper";
}

async function downloadWhisperModel() {
  const runtimeConfig = getRuntimeConfig();
  const destination = path.join(runtimeConfig.paths.modelsDir, "ggml-base.bin");

  if (existsSync(destination)) {
    return destination;
  }

  mkdirSync(path.dirname(destination), { recursive: true });
  const response = await fetch(MODEL_URL);

  if (!response.ok || !response.body) {
    throw new Error("Whisper 모델을 내려받지 못했습니다.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destination, buffer);

  return destination;
}

async function runShellCommand(command: string) {
  return new Promise<string>((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", command], {
            env: process.env,
          })
        : spawn("/bin/bash", ["-lc", command], {
            env: process.env,
          });

    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(trimCommandOutput(output));
        return;
      }

      reject(new Error(trimCommandOutput(output) || `명령 실행에 실패했습니다. code=${code}`));
    });
  });
}

function trimCommandOutput(output: string) {
  const normalized = output.trim();
  if (normalized.length <= 6000) {
    return normalized;
  }

  return normalized.slice(-6000);
}

function getWhisperModelCandidates() {
  const runtimeConfig = getRuntimeConfig();
  const homeDir = runtimeConfig.paths.homeDir;

  return [
    path.join(runtimeConfig.paths.modelsDir, "ggml-medium.bin"),
    path.join(runtimeConfig.paths.modelsDir, "ggml-small.bin"),
    path.join(runtimeConfig.paths.modelsDir, "ggml-base.bin"),
    path.join(homeDir, ".cache", "whisper.cpp", "ggml-medium.bin"),
    path.join(homeDir, ".cache", "whisper.cpp", "ggml-small.bin"),
    path.join(homeDir, ".cache", "whisper.cpp", "ggml-base.bin"),
  ];
}

function spawnSyncCompat(command: string, args: string[]) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout: 5000,
  });
}
