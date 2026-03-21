import { access } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const checks = [
  {
    label: "macOS",
    required: true,
    test: () => process.platform === "darwin",
    fix: "macOS 배포 기준으로 작성된 프로젝트입니다.",
  },
  {
    label: "Homebrew",
    required: true,
    test: () => hasCommand("brew"),
    fix: "Homebrew를 먼저 설치하세요: https://brew.sh",
  },
  {
    label: "Node.js",
    required: true,
    test: () => hasCommand("node"),
    fix: "brew install node",
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
    fix: "brew install ffmpeg",
  },
  {
    label: "whisper backend",
    required: true,
    test: () => hasCommand("whisper") || hasCommand("whisper-cli"),
    fix: "brew install whisper-cpp 또는 python3 -m pip install openai-whisper",
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
    fix: "pnpm setup:mac 또는 curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o models/ggml-base.bin",
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
  console.log("macOS에서는 `pnpm setup:mac` 또는 `Run-Dashboard-LAB.command`로 정리할 수 있습니다.");
  process.exitCode = 1;
} else {
  console.log("환경이 준비되었습니다.");
  console.log("실행: `pnpm launch` 또는 `Run-Dashboard-LAB.command`");
}

function hasCommand(command) {
  const result = spawnSync("bash", ["-lc", `command -v ${shellEscape(command)} >/dev/null 2>&1`], {
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

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
