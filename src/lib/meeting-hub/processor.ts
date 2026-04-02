import "server-only";

import { spawn } from "node:child_process";

import { generateOpenAiText, hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { runSpawnTask } from "@/lib/ai-skills/runner";
import {
  checkCommandAvailable,
  getCommandEnvironment,
} from "@/lib/command-availability";
import type {
  CreateMeetingHubMeetingInput,
  MeetingHubAiRunner,
  MeetingHubProcessedMeeting,
} from "@/lib/types";

const PROMPT_TIMEOUT_MS = 90_000;

export async function processMeetingHubNotes(
  input: Pick<
    CreateMeetingHubMeetingInput,
    "title" | "type" | "date" | "participants" | "linkedRepository" | "notes" | "runner"
  >,
): Promise<MeetingHubProcessedMeeting> {
  const resolvedRunner = await resolveMeetingHubRunner(input.runner ?? "auto");

  if (resolvedRunner === "rule") {
    throw new Error("AI runner unavailable.");
  }

  const prompt = buildMeetingHubPrompt(input);
  const raw = await runMeetingHubModel(resolvedRunner, prompt);
  const parsed = parseMeetingHubJson(raw);

  return {
    ...parsed,
    processingMode: "ai",
    processingRunner: resolvedRunner,
  };
}

async function resolveMeetingHubRunner(
  requestedRunner: MeetingHubAiRunner,
): Promise<Exclude<MeetingHubAiRunner, "auto">> {
  if (requestedRunner === "rule") {
    return "rule";
  }

  if (requestedRunner === "openai") {
    if (!hasOpenAiApiFallback()) {
      throw new Error("OpenAI API key is not configured.");
    }

    return "openai";
  }

  if (requestedRunner === "claude") {
    if (await checkCommandAvailable("claude")) {
      return "claude";
    }
    throw new Error("Claude CLI is not available.");
  }

  if (requestedRunner === "codex") {
    if (await checkCommandAvailable("codex")) {
      return "codex";
    }
    throw new Error("Codex CLI is not available.");
  }

  if (requestedRunner === "gemini") {
    if (await checkCommandAvailable("gemini")) {
      return "gemini";
    }
    throw new Error("Gemini CLI is not available.");
  }

  if (await checkCommandAvailable("claude")) {
    return "claude";
  }

  if (await checkCommandAvailable("codex")) {
    return "codex";
  }

  if (await checkCommandAvailable("gemini")) {
    return "gemini";
  }

  if (hasOpenAiApiFallback()) {
    return "openai";
  }

  return "rule";
}

async function runMeetingHubModel(
  runner: Exclude<MeetingHubAiRunner, "auto" | "rule">,
  prompt: string,
) {
  if (runner === "openai") {
    return generateOpenAiText(prompt, { reasoningEffort: "low" });
  }

  if (runner === "claude") {
    return runClaude(prompt);
  }

  if (runner === "codex") {
    const outputPath = `/tmp/dashboard-lab-meeting-hub-${crypto.randomUUID()}.txt`;
    const result = await runSpawnTask({
      command: "codex",
      args: ["exec", "--skip-git-repo-check", "-o", outputPath, prompt],
      cwd: process.env.HOME || "/",
      outputPath,
      timeoutMs: PROMPT_TIMEOUT_MS,
    });
    return unwrapOutput(result.output, result.error);
  }

  const result = await runSpawnTask({
    command: "gemini",
    args: ["-p", prompt],
    cwd: process.env.HOME || "/",
    timeoutMs: PROMPT_TIMEOUT_MS,
  });
  return unwrapOutput(result.output, result.error);
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", "--output-format", "text", "--effort", "low"],
      { cwd: process.env.HOME || "/", env: getCommandEnvironment({ TERM: "dumb" }) },
    );

    let output = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Meeting Hub AI processing timed out."));
    }, PROMPT_TIMEOUT_MS);

    proc.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(output.trim());
        return;
      }

      reject(new Error(stderr.trim() || `Claude exited with code ${code ?? "unknown"}`));
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function buildMeetingHubPrompt(
  input: Pick<
    CreateMeetingHubMeetingInput,
    "title" | "type" | "date" | "participants" | "linkedRepository" | "notes"
  >,
) {
  return `
You are converting meeting notes into structured project operations data.

Return JSON only. Do not wrap in markdown. Do not add commentary.

Use this schema exactly:
{
  "summary": "string",
  "discussion": ["string"],
  "decisions": ["string"],
  "actionItems": [
    {
      "title": "string",
      "owner": "string or null",
      "dueDate": "YYYY-MM-DD or null",
      "status": "open",
      "sourceLine": "string"
    }
  ],
  "risks": ["string"],
  "followUp": ["string"]
}

Rules:
- Keep summary concise, 1-2 sentences.
- discussion should be factual discussion points, not the entire transcript.
- decisions should only contain explicit or strongly implied decisions.
- actionItems should only contain executable next steps.
- owner should be null if not clear.
- dueDate should be null if not clear.
- status must always be "open".
- If a section is empty, return an empty array.

Meeting metadata:
- Title: ${input.title}
- Type: ${input.type}
- Date: ${input.date}
- Participants: ${(input.participants ?? []).join(", ") || "Unknown"}
- Linked Repository: ${input.linkedRepository ?? "None"}

Meeting notes:
${input.notes}
`.trim();
}

function parseMeetingHubJson(raw: string): Omit<MeetingHubProcessedMeeting, "processingMode" | "processingRunner"> {
  const source = extractJsonObject(raw);
  const parsed = JSON.parse(source) as Partial<MeetingHubProcessedMeeting>;

  return {
    summary: normalizeString(parsed.summary),
    discussion: normalizeStringArray(parsed.discussion),
    decisions: normalizeStringArray(parsed.decisions),
    actionItems: normalizeActionItems(parsed.actionItems),
    risks: normalizeStringArray(parsed.risks),
    followUp: normalizeStringArray(parsed.followUp),
  };
}

function normalizeActionItems(
  value: unknown,
): MeetingHubProcessedMeeting["actionItems"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const title = normalizeString(candidate.title);
      if (!title) {
        return null;
      }

      return {
        title,
        owner: normalizeNullableString(candidate.owner),
        dueDate: normalizeNullableString(candidate.dueDate),
        status: "open" as const,
        sourceLine: normalizeString(candidate.sourceLine) || title,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function extractJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced?.trim() || raw.trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Meeting Hub AI response did not contain valid JSON.");
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}

function unwrapOutput(output: string | null, error: string | null) {
  if (error) {
    throw new Error(error);
  }

  if (!output) {
    throw new Error("AI response is empty.");
  }

  return output;
}
