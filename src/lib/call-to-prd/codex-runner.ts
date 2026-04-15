import { spawn } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";

import {
  checkCommandAvailable,
  getCommandEnvironment,
} from "@/lib/command-availability";
import { buildDashboardLabCodexExecArgs } from "@/lib/codex-cli";

const TIMEOUT_MS = 5 * 60 * 1000;
const MAX_LOG_OUTPUT = 16 * 1024;

export async function runCodexPrd(prompt: string, options?: { cwd?: string }): Promise<string> {
  const outputPath = `/tmp/codex-prd-${Date.now()}.txt`;

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(
      "codex",
      buildDashboardLabCodexExecArgs(prompt, { outputPath }),
      {
      cwd: options?.cwd,
      env: getCommandEnvironment({ TERM: "dumb" }),
      },
    );

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      reject(new Error(buildTimeoutError(stderr, stdout)));
    }, TIMEOUT_MS);

    proc.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < MAX_LOG_OUTPUT) {
        stdout += chunk.toString();
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_LOG_OUTPUT) {
        stderr += chunk.toString();
      }
    });

    proc.on("close", async (code) => {
      clearTimeout(timer);
      if (killed) return;

      if (code === 0) {
        try {
          const output = await readFile(outputPath, "utf-8");
          await unlink(outputPath).catch(() => {});
          resolve(output.trim());
        } catch {
          reject(new Error("Codex 출력 파일 읽기 실패"));
        }
        return;
      }

      await unlink(outputPath).catch(() => {});
      reject(new Error(buildProcessError("Codex", code, stderr, stdout)));
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function checkCodexInstalled(): Promise<boolean> {
  return checkCommandAvailable("codex");
}

function buildProcessError(label: string, code: number | null, stderr: string, stdout: string): string {
  const detail = stderr.trim() || stdout.trim();

  if (!detail) {
    return `${label} 프로세스 종료 코드: ${code ?? "unknown"}`;
  }

  return `${label} 프로세스 종료 코드: ${code ?? "unknown"}\n${detail}`;
}

function buildTimeoutError(stderr: string, stdout: string): string {
  const detail = compactLogDetail(stderr, stdout);

  if (!detail) {
    return "Codex PRD 생성 타임아웃 (5분)";
  }

  return `Codex PRD 생성 타임아웃 (5분)\n최근 로그:\n${detail}`;
}

function compactLogDetail(stderr: string, stdout: string): string {
  const source = stderr.trim() || stdout.trim();
  if (!source) {
    return "";
  }

  const lines = source
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return lines.slice(-12).join("\n");
}
