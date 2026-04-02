import { spawn } from "node:child_process";

import {
  checkCommandAvailable,
  getCommandEnvironment,
} from "@/lib/command-availability";
import { generateOpenAiText, hasOpenAiApiFallback } from "@/lib/ai/openai-responses";

const TIMEOUT_MS = 5 * 60 * 1000; // 5분
const MAX_OUTPUT = 1024 * 1024; // 1MB

export type PrdTextRunner = "claude" | "openai";

export function runClaudePrd(
  prompt: string,
  options?: {
    cwd?: string;
    reasoningEffort?: "low" | "medium" | "high" | "xhigh";
    provider?: PrdTextRunner;
    allowOpenAiFallback?: boolean;
  },
): Promise<string> {
  return resolvePrdProvider(options?.provider ?? "claude", options?.allowOpenAiFallback ?? true).then((provider) => {
    if (provider === "openai") {
      return generateOpenAiText(prompt, {
        reasoningEffort: options?.reasoningEffort,
      });
    }

    return runClaudeCliPrd(prompt, options);
  });
}

export async function checkClaudeInstalled(): Promise<boolean> {
  return checkCommandAvailable("claude");
}

export async function resolvePrdProvider(
  requestedProvider: PrdTextRunner,
  allowOpenAiFallback = true,
): Promise<PrdTextRunner> {
  if (requestedProvider === "openai") {
    if (!hasOpenAiApiFallback()) {
      throw new Error("OpenAI API 키가 설정되어 있지 않습니다. 온보딩에서 API 키를 저장해 주세요.");
    }

    return "openai";
  }

  if (await checkClaudeInstalled()) {
    return "claude";
  }

  if (allowOpenAiFallback && hasOpenAiApiFallback()) {
    return "openai";
  }

  throw new Error("Claude CLI가 설치되어 있지 않습니다. CLI를 설치하거나 온보딩에서 OpenAI API 키를 저장해 주세요.");
}

function runClaudeCliPrd(
  prompt: string,
  options?: { cwd?: string; reasoningEffort?: "low" | "medium" | "high" | "xhigh" },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "text"];
    if (options?.reasoningEffort) {
      args.push("--effort", options.reasoningEffort === "xhigh" ? "max" : options.reasoningEffort);
    }

    const proc = spawn("claude", args, {
      cwd: options?.cwd,
      env: getCommandEnvironment({ TERM: "dumb" }),
    });

    let output = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      reject(new Error("PRD 생성 타임아웃 (5분)"));
    }, TIMEOUT_MS);

    proc.stdout.on("data", (chunk: Buffer) => {
      if (output.length < MAX_OUTPUT) {
        output += chunk.toString();
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT) {
        stderr += chunk.toString();
      }
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(buildProcessError(code, stderr, output)));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function buildProcessError(code: number | null, stderr: string, stdout: string): string {
  const detail = stderr.trim() || stdout.trim();

  if (!detail) {
    return `Claude 프로세스 종료 코드: ${code ?? "unknown"}`;
  }

  return `Claude 프로세스 종료 코드: ${code ?? "unknown"}\n${detail}`;
}
