import "server-only";

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DEFAULT_LOCALE, pickLocale, type AppLocale } from "@/lib/locale";
import { getRuntimeConfig } from "@/lib/runtime/config";
import type {
  DashboardLabRuntimeCheckRemedy,
  DashboardLabRuntimeInstallResult,
} from "@/lib/types";

const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
const PNPM_VERSION = "10.17.1";

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

export function getRuntimeCheckFixHint(
  checkId: string,
  locale: AppLocale = DEFAULT_LOCALE,
) {
  switch (checkId) {
    case "node":
      if (isDesktopRuntime()) {
        return t(
          locale,
          "패키지된 데스크톱 앱에서는 별도 Node.js 설치가 필요하지 않습니다.",
          "The packaged desktop app does not need a separate Node.js install.",
        );
      }

      return t(locale, "Node.js 22+가 필요합니다.", "Node.js 22+ is required.");
    case "pnpm":
      if (isDesktopRuntime()) {
        return t(
          locale,
          "패키지된 데스크톱 앱에서는 별도 pnpm 설치가 필요하지 않습니다.",
          "The packaged desktop app does not need a separate pnpm install.",
        );
      }

      return hasCommandSync("corepack")
        ? `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate`
        : t(locale, "pnpm이 필요합니다.", "pnpm is required.");
    case "ffmpeg":
      if (process.platform === "darwin") {
        return hasCommandSync("brew")
          ? t(
              locale,
              "오디오 변환을 위해 ffmpeg가 필요합니다. 앱에서 바로 설치할 수 있습니다.",
              "ffmpeg is required for audio conversion. You can install it from the app.",
            )
          : t(
              locale,
              "ffmpeg 설치 전 Homebrew가 필요합니다.",
              "Homebrew is required before ffmpeg can be installed automatically.",
            );
      }

      if (process.platform === "win32") {
        return hasCommandSync("winget")
          ? t(
              locale,
              "오디오 변환을 위해 ffmpeg가 필요합니다. 앱에서 바로 설치할 수 있습니다.",
              "ffmpeg is required for audio conversion. You can install it from the app.",
            )
          : t(
              locale,
              "winget 또는 choco로 ffmpeg를 설치해야 합니다.",
              "Install ffmpeg with winget or choco.",
            );
      }

      return t(
        locale,
        "ffmpeg가 있어야 m4a/webm 파일을 전사할 수 있습니다.",
        "ffmpeg is required to transcribe m4a/webm files.",
      );
    case "whisper":
      if (process.platform === "darwin") {
        return hasCommandSync("brew")
          ? t(
              locale,
              "Whisper backend가 있어야 오디오 전사를 실행할 수 있습니다. 앱에서 바로 설치할 수 있습니다.",
              "A Whisper backend is required for audio transcription. You can install it from the app.",
            )
          : t(
              locale,
              "Whisper backend 설치 전 Homebrew가 필요합니다.",
              "Homebrew is required before the Whisper backend can be installed automatically.",
            );
      }

      if (process.platform === "win32") {
        return hasCommandSync("python") || hasCommandSync("py")
          ? t(
              locale,
              "Python 환경이 있으면 앱에서 Whisper backend 설치를 시도할 수 있습니다.",
              "If Python is available, the app can try to install a Whisper backend.",
            )
          : t(
              locale,
              "Python이 있어야 openai-whisper 자동 설치를 도울 수 있습니다.",
              "Python is required to help install openai-whisper automatically.",
            );
      }

      return hasCommandSync("python3")
        ? t(
            locale,
            "Python3가 있으면 앱에서 Whisper backend 설치를 시도할 수 있습니다.",
            "If Python3 is available, the app can try to install a Whisper backend.",
          )
        : t(
            locale,
            "Python3 또는 whisper-cpp 패키지가 필요합니다.",
            "Python3 or a whisper-cpp package is required.",
          );
    case "whisper-model":
      return t(
        locale,
        "Whisper 모델이 있어야 whisper-cpp 전사를 실행할 수 있습니다. 앱에서 바로 내려받을 수 있습니다.",
        "A Whisper model is required for whisper-cpp transcription. You can download it from the app.",
      );
    case "claude":
      return t(
        locale,
        "문서 생성에는 로그인된 Claude CLI가 필요합니다.",
        "Document generation needs a logged-in Claude CLI.",
      );
    case "codex":
      return t(
        locale,
        "문서 생성 또는 스킬 실행에는 로그인된 Codex CLI가 필요합니다.",
        "Document generation or skill execution needs a logged-in Codex CLI.",
      );
    case "gemini":
      return t(
        locale,
        "Gemini 기반 응답을 쓰려면 Gemini CLI가 필요합니다.",
        "Gemini-based responses need the Gemini CLI.",
      );
    case "openai-api":
      return t(
        locale,
        "OpenAI API key를 저장하면 CLI 없이도 CS Helper와 PRD 생성 fallback을 사용할 수 있습니다.",
        "Saving an OpenAI API key enables CS Helper and PRD fallback without a CLI.",
      );
    case "projects-root":
      return t(
        locale,
        "프로젝트 루트를 저장하면 Projects, Doc Hub, CS Helper가 같은 기준으로 동작합니다.",
        "Save a projects root so Projects, Doc Hub, and CS Helper can use the same baseline.",
      );
    default:
      return null;
  }
}

export function getRuntimeCheckRemedy(
  checkId: string,
  locale: AppLocale = DEFAULT_LOCALE,
): DashboardLabRuntimeCheckRemedy | null {
  switch (checkId) {
    case "node":
      if (isDesktopRuntime()) {
        return null;
      }

      return getNodeRemedy(locale);
    case "pnpm":
      if (isDesktopRuntime()) {
        return null;
      }

      return getPnpmRemedy(locale);
    case "ffmpeg":
      return getFfmpegRemedy(locale);
    case "whisper":
      return getWhisperRemedy(locale);
    case "whisper-model":
      return {
        action: "run",
        label: t(locale, "모델 다운로드", "Download Model"),
        detail: t(
          locale,
          "Whisper 기본 모델을 내려받습니다.",
          "Download the default Whisper model.",
        ),
        taskId: "download-whisper-model",
      };
    default:
      return null;
  }
}

export async function executeRuntimeInstallTasks(
  taskIds: string[],
  locale: AppLocale = DEFAULT_LOCALE,
) {
  const uniqueTaskIds = [...new Set(taskIds.filter(Boolean))];
  const results: DashboardLabRuntimeInstallResult[] = [];

  for (const taskId of uniqueTaskIds) {
    const label = getTaskLabel(taskId, locale);

    try {
      const detail = await executeRuntimeInstallTask(taskId, locale);
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
            : t(locale, "설치를 완료하지 못했습니다.", "The install task did not complete."),
        output: null,
      });
    }
  }

  return results;
}

async function executeRuntimeInstallTask(
  taskId: string,
  locale: AppLocale,
) {
  switch (taskId) {
    case "install-node": {
      const command = getNodeInstallCommand();
      if (!command) {
        throw new Error(
          t(
            locale,
            "현재 환경에서는 Node.js 자동 설치를 지원하지 않습니다.",
            "Automatic Node.js install is not supported in this environment.",
          ),
        );
      }

      const output = await runShellCommand(command);
      return { summary: t(locale, "Node.js 설치를 완료했습니다.", "Node.js installation completed."), output };
    }
    case "install-pnpm": {
      const command = getPnpmInstallCommand();
      if (!command) {
        throw new Error(
          t(
            locale,
            "현재 환경에서는 pnpm 자동 준비를 지원하지 않습니다.",
            "Automatic pnpm setup is not supported in this environment.",
          ),
        );
      }

      const output = await runShellCommand(command);
      return { summary: t(locale, "pnpm 준비를 완료했습니다.", "pnpm setup completed."), output };
    }
    case "install-ffmpeg": {
      const command = getFfmpegInstallCommand();
      if (!command) {
        throw new Error(
          t(
            locale,
            "현재 환경에서는 ffmpeg 자동 설치를 지원하지 않습니다.",
            "Automatic ffmpeg install is not supported in this environment.",
          ),
        );
      }

      const output = await runShellCommand(command);
      return { summary: t(locale, "ffmpeg 설치를 완료했습니다.", "ffmpeg installation completed."), output };
    }
    case "install-whisper-backend": {
      const command = getWhisperInstallCommand();
      if (!command) {
        throw new Error(
          t(
            locale,
            "현재 환경에서는 Whisper backend 자동 설치를 지원하지 않습니다.",
            "Automatic Whisper backend install is not supported in this environment.",
          ),
        );
      }

      const output = await runShellCommand(command);
      return { summary: t(locale, "Whisper backend 설치를 완료했습니다.", "Whisper backend installation completed."), output };
    }
    case "download-whisper-model": {
      const destination = await downloadWhisperModel();
      return {
        summary: t(
          locale,
          `Whisper 모델을 내려받았습니다: ${destination}`,
          `Downloaded the Whisper model: ${destination}`,
        ),
        output: destination,
      };
    }
    default:
      throw new Error(
        t(
          locale,
          `알 수 없는 설치 작업입니다: ${taskId}`,
          `Unknown install task: ${taskId}`,
        ),
      );
  }
}

function getNodeRemedy(locale: AppLocale): DashboardLabRuntimeCheckRemedy | null {
  const command = getNodeInstallCommand();

  if (command) {
    return {
      action: "run",
      label: t(locale, "Node.js 설치", "Install Node.js"),
      detail: t(locale, "앱에서 Node.js 설치를 실행합니다.", "Run Node.js installation from the app."),
      taskId: "install-node",
      command,
    };
  }

  return {
    action: "open_url",
    label: t(locale, "설치 페이지 열기", "Open Install Page"),
    detail: t(locale, "Node.js 22+ 설치 페이지를 엽니다.", "Open the Node.js 22+ install page."),
    url: "https://nodejs.org",
  };
}

function getPnpmRemedy(locale: AppLocale): DashboardLabRuntimeCheckRemedy | null {
  const command = getPnpmInstallCommand();

  if (command) {
    return {
      action: "run",
      label: t(locale, "pnpm 준비", "Setup pnpm"),
      detail: t(locale, "앱에서 pnpm 준비를 실행합니다.", "Run pnpm setup from the app."),
      taskId: "install-pnpm",
      command,
    };
  }

  return {
    action: "manual",
    label: t(locale, "수동 준비 필요", "Manual Setup Needed"),
    detail: `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate`,
    command: `corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate`,
  };
}

function getFfmpegRemedy(locale: AppLocale): DashboardLabRuntimeCheckRemedy | null {
  const command = getFfmpegInstallCommand();

  if (command) {
    return {
      action: "run",
      label: t(locale, "ffmpeg 설치", "Install ffmpeg"),
      detail: t(locale, "앱에서 ffmpeg 설치를 실행합니다.", "Run ffmpeg installation from the app."),
      taskId: "install-ffmpeg",
      command,
    };
  }

  if (process.platform === "darwin") {
    return {
      action: "open_url",
      label: t(locale, "Homebrew 설치 안내", "Homebrew Setup Guide"),
      detail: t(locale, "ffmpeg 자동 설치 전에 Homebrew가 필요합니다.", "Homebrew is required before ffmpeg can be installed automatically."),
      url: "https://brew.sh",
    };
  }

  return {
    action: "manual",
    label: t(locale, "수동 설치 안내", "Manual Install Help"),
    detail: getFfmpegManualHelp(locale),
    command: getFfmpegManualHelp(locale),
  };
}

function getWhisperRemedy(locale: AppLocale): DashboardLabRuntimeCheckRemedy | null {
  const command = getWhisperInstallCommand();

  if (command) {
    return {
      action: "run",
      label: t(locale, "Whisper 설치", "Install Whisper"),
      detail: t(locale, "앱에서 Whisper backend 설치를 실행합니다.", "Run Whisper backend installation from the app."),
      taskId: "install-whisper-backend",
      command,
    };
  }

  if (process.platform === "darwin") {
    return {
      action: "open_url",
      label: t(locale, "Homebrew 설치 안내", "Homebrew Setup Guide"),
      detail: t(locale, "whisper-cpp 자동 설치 전에 Homebrew가 필요합니다.", "Homebrew is required before whisper-cpp can be installed automatically."),
      url: "https://brew.sh",
    };
  }

  return {
    action: "manual",
    label: t(locale, "수동 설치 안내", "Manual Install Help"),
    detail: getWhisperManualHelp(locale),
    command: getWhisperManualHelp(locale),
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

function getFfmpegManualHelp(locale: AppLocale) {
  if (process.platform === "win32") {
    return "winget install Gyan.FFmpeg 또는 choco install ffmpeg";
  }

  return t(
    locale,
    "sudo apt install ffmpeg 또는 사용하는 패키지 매니저로 ffmpeg를 설치하세요.",
    "Install ffmpeg with sudo apt install ffmpeg or your package manager.",
  );
}

function getWhisperManualHelp(locale: AppLocale) {
  if (process.platform === "win32") {
    return t(
      locale,
      "python -m pip install openai-whisper 또는 whisper-cpp 바이너리를 PATH에 추가하세요.",
      "Run python -m pip install openai-whisper or add a whisper-cpp binary to PATH.",
    );
  }

  if (process.platform === "linux") {
    return t(
      locale,
      "python3 -m pip install openai-whisper 또는 whisper-cpp 패키지를 설치하세요.",
      "Run python3 -m pip install openai-whisper or install a whisper-cpp package.",
    );
  }

  return t(
    locale,
    "brew install whisper-cpp 또는 python3 -m pip install openai-whisper",
    "Run brew install whisper-cpp or python3 -m pip install openai-whisper.",
  );
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
    throw new Error(
      t(
        DEFAULT_LOCALE,
        "Whisper 모델을 내려받지 못했습니다.",
        "Failed to download the Whisper model.",
      ),
    );
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

      reject(
        new Error(
          trimCommandOutput(output) ||
            t(
              DEFAULT_LOCALE,
              `명령 실행에 실패했습니다. code=${code}`,
              `Command execution failed. code=${code}`,
            ),
        ),
      );
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

function getTaskLabel(taskId: string, locale: AppLocale) {
  const labels: Record<string, string> = {
    "install-node": t(locale, "Node.js 설치", "Install Node.js"),
    "install-pnpm": t(locale, "pnpm 준비", "Setup pnpm"),
    "install-ffmpeg": t(locale, "ffmpeg 설치", "Install ffmpeg"),
    "install-whisper-backend": t(locale, "Whisper backend 설치", "Install Whisper Backend"),
    "download-whisper-model": t(locale, "Whisper 모델 다운로드", "Download Whisper Model"),
  };

  return labels[taskId] ?? taskId;
}

function t(locale: AppLocale, ko: string, en: string) {
  return pickLocale(locale, { ko, en });
}
