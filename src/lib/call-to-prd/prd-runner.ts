import { spawn } from "node:child_process";

const TIMEOUT_MS = 5 * 60 * 1000; // 5분
const MAX_OUTPUT = 1024 * 1024; // 1MB

export function runClaudePrd(
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
      env: { ...process.env, TERM: "dumb" },
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
