import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const platform = process.platform;

const checks = [
  {
    label: "Supported OS",
    required: true,
    test: () => ["darwin", "win32", "linux"].includes(platform),
    fix: "dashboard-LAB은 macOS, Windows, Linux를 대상으로 합니다.",
  },
  {
    label: "Node.js",
    required: true,
    test: () => hasCommand("node"),
    fix: "Node.js 22+를 설치하세요: https://nodejs.org",
  },
  {
    label: "pnpm",
    required: true,
    test: () => hasCommand("pnpm") || hasCommand("corepack"),
    fix: "corepack enable && corepack prepare pnpm@10.17.1 --activate",
  },
  {
    label: "ffmpeg",
    required: true,
    test: () => hasCommand("ffmpeg"),
    fix: getFfmpegFix(),
  },
  {
    label: "whisper backend",
    required: true,
    test: () => hasCommand("whisper") || hasCommand("whisper-cli"),
    fix: getWhisperFix(),
  },
  {
    label: "node_modules",
    required: true,
    test: () => fileExists(path.join(repoRoot, "node_modules")),
    fix: "pnpm install",
  },
  {
    label: "Whisper model",
    required: true,
    test: () => fileExists(path.join(repoRoot, "models", "ggml-base.bin")),
    fix: "curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/ggml-base.bin",
  },
  {
    label: "Claude or Codex CLI",
    required: false,
    test: () => hasCommand("claude") || hasCommand("codex"),
    fix: "PRD 생성 기능을 쓰려면 claude 또는 codex CLI 로그인 환경이 필요합니다.",
  },
];

let hasBlockingIssue = false;

console.log("dashboard-LAB local doctor");
console.log(`repo: ${repoRoot}`);
console.log(`platform: ${platform} ${os.arch()}`);
console.log("");

for (const check of checks) {
  const ok = await Promise.resolve(check.test());
  const icon = ok ? "[OK]" : check.required ? "[FAIL]" : "[WARN]";
  console.log(`${icon} ${check.label}`);
  if (!ok) {
    console.log(`      ${check.fix}`);
    if (check.required) {
      hasBlockingIssue = true;
    }
  }
}

console.log("");
if (hasBlockingIssue) {
  console.log("환경이 아직 준비되지 않았습니다.");
  console.log(getHelpText());
  process.exitCode = 1;
} else {
  console.log("환경이 준비되었습니다.");
  console.log(getLaunchText());
}

function hasCommand(command) {
  if (platform === "win32") {
    const result = spawnSync("where", [command], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    return result.status === 0;
  }

  const result = spawnSync("sh", ["-lc", `command -v ${shellEscape(command)} >/dev/null 2>&1`], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  return result.status === 0;
}

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getFfmpegFix() {
  if (platform === "darwin") {
    return "brew install ffmpeg";
  }

  if (platform === "win32") {
    return "winget install Gyan.FFmpeg 또는 choco install ffmpeg";
  }

  return "sudo apt install ffmpeg 또는 사용하는 패키지 매니저로 ffmpeg를 설치하세요.";
}

function getWhisperFix() {
  if (platform === "darwin") {
    return "brew install whisper-cpp 또는 python3 -m pip install openai-whisper";
  }

  if (platform === "win32") {
    return "python -m pip install openai-whisper 또는 whisper-cpp 바이너리를 PATH에 추가하세요.";
  }

  return "python3 -m pip install openai-whisper 또는 whisper-cpp 패키지를 설치하세요.";
}

function getHelpText() {
  if (platform === "darwin") {
    return "macOS에서는 `pnpm setup:mac` 또는 `Run-Dashboard-LAB.command`로 정리할 수 있습니다.";
  }

  return "준비가 끝나면 `pnpm launch` 또는 Electron 빌드 스크립트를 사용하세요.";
}

function getLaunchText() {
  if (platform === "darwin") {
    return "실행: `pnpm launch`, `Run-Dashboard-LAB.command`, 또는 `pnpm desktop:dev`";
  }

  return "실행: `pnpm launch` 또는 `pnpm desktop:dev`";
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
