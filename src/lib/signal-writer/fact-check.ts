import "server-only";

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

import {
  containsCliTranscriptLeakInStrings,
  isRecord,
  parseLastJsonObject,
} from "@/lib/ai/structured-output";
import { generateOpenAiText, hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { runSpawnTask } from "@/lib/ai-skills/runner";
import {
  checkCommandAvailable,
  getCommandEnvironment,
} from "@/lib/command-availability";
import type { AppLocale } from "@/lib/locale";
import {
  buildSignalWriterCodexArgs,
  unwrapSignalWriterCodexResult,
} from "@/lib/signal-writer/codex";
import { loadSignalWriterSourceContext } from "@/lib/signal-writer/source-context";
import type {
  SignalWriterFactCheckFinding,
  SignalWriterFactCheckFindingStatus,
  SignalWriterFactCheckRequest,
  SignalWriterFactCheckResult,
  SignalWriterFactCheckRunner,
  SignalWriterFactCheckVerdict,
  SignalWriterSignal,
  SignalWriterSourceContext,
} from "@/lib/types";

const FACT_CHECK_TIMEOUT_MS = 70_000;

type FactCheckPayload = {
  verdict: string;
  confidence: number;
  summary: string;
  findings: Array<{
    claim?: string;
    status?: string;
    reason?: string;
    suggestedFix?: string;
  }>;
  rewriteBrief: string;
};

export async function runSignalWriterFactCheck(
  signal: SignalWriterSignal,
  draft: SignalWriterFactCheckRequest["draft"],
  locale: AppLocale,
  requestedRunner: SignalWriterFactCheckRunner,
): Promise<SignalWriterFactCheckResult> {
  const runner = await resolveFactCheckRunner(requestedRunner);
  const createdAt = new Date().toISOString();
  const sourceContext = await loadSignalWriterSourceContext(signal);
  const prompt = buildFactCheckPrompt(signal, draft, locale, sourceContext);
  const raw = await runFactCheckModel(runner, prompt, locale);
  const parsed = parseFactCheckPayload(raw);

  if (!parsed) {
    throw new Error(
      locale === "en"
        ? "The fact-check output could not be parsed."
        : "팩트체크 결과를 해석하지 못했습니다.",
    );
  }

  const findings = normalizeFindings(parsed.findings);
  const verdict = normalizeVerdict(parsed.verdict, findings);

  return {
    draftId: draft.id,
    signalId: signal.id,
    runner,
    createdAt,
    verdict,
    confidence: clampPercentage(parsed.confidence),
    summary: clampSentence(parsed.summary, 280),
    findings,
    rewriteBrief: buildRewriteBrief(parsed.rewriteBrief, findings, verdict, locale),
    sourceContext,
  };
}

async function resolveFactCheckRunner(runner: SignalWriterFactCheckRunner) {
  if (runner === "openai") {
    if (!hasOpenAiApiFallback()) {
      throw new Error("OpenAI API key is not configured.");
    }

    return runner;
  }

  if (await checkCommandAvailable(runner)) {
    return runner;
  }

  const labels: Record<SignalWriterFactCheckRunner, string> = {
    claude: "Claude CLI",
    codex: "Codex CLI",
    gemini: "Gemini CLI",
    openai: "OpenAI API",
  };

  throw new Error(`${labels[runner]} is not available.`);
}

async function runFactCheckModel(
  runner: SignalWriterFactCheckRunner,
  prompt: string,
  locale: AppLocale,
) {
  if (runner === "openai") {
    return generateOpenAiText(prompt, { model: "gpt-5-mini", reasoningEffort: "medium" });
  }

  if (runner === "claude") {
    return runClaude(prompt);
  }

  if (runner === "codex") {
    const outputPath = `/tmp/dashboard-lab-signal-writer-fact-check-${randomUUID()}.txt`;
    const result = await runSpawnTask({
      command: "codex",
      args: buildSignalWriterCodexArgs(prompt, outputPath, "fact-check"),
      cwd: process.env.HOME || "/",
      outputPath,
      timeoutMs: FACT_CHECK_TIMEOUT_MS,
    });
    return unwrapSignalWriterCodexResult(
      result,
      locale,
      "fact-check",
      "Signal Writer fact-check response is empty.",
    );
  }

  const result = await runSpawnTask({
    command: "gemini",
    args: ["-p", prompt],
    cwd: process.env.HOME || "/",
    timeoutMs: FACT_CHECK_TIMEOUT_MS,
  });

  return unwrapOutput(result.output, result.error);
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", "--output-format", "text", "--effort", "medium"],
      { cwd: process.env.HOME || "/", env: getCommandEnvironment({ TERM: "dumb" }) },
    );

    let output = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Signal Writer fact-check timed out."));
    }, FACT_CHECK_TIMEOUT_MS);

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

function unwrapOutput(output: string | null, error: string | null) {
  if (error) {
    throw new Error(error);
  }

  if (!output) {
    throw new Error("Signal Writer fact-check response is empty.");
  }

  return output;
}

function buildFactCheckPrompt(
  signal: SignalWriterSignal,
  draft: SignalWriterFactCheckRequest["draft"],
  locale: AppLocale,
  sourceContext: SignalWriterSourceContext | null,
) {
  const responseShape =
    '{"verdict":"pass|mixed|fail","confidence":0,"summary":"string","findings":[{"claim":"string","status":"supported|uncertain|incorrect","reason":"string","suggestedFix":"string"}],"rewriteBrief":"string"}';

  if (locale === "en") {
    return [
      "You are fact-checking a social media draft against the researched source evidence.",
      "Use only the evidence in the signal metadata and source context below.",
      "Do not invent missing facts. If a claim is plausible but unsupported, mark it uncertain.",
      "Ignore pure opinion or stylistic choices unless they imply a concrete factual claim.",
      "Return strict JSON only.",
      `JSON shape: ${responseShape}`,
      "Rules:",
      "- verdict must be pass, mixed, or fail.",
      "- confidence must be an integer from 0 to 100.",
      "- findings should cover the 1 to 5 highest-impact factual claims in the draft.",
      "- status must be supported, uncertain, or incorrect.",
      "- reason should explain what evidence supports or conflicts with the claim.",
      "- suggestedFix should be a concise correction direction, not a full rewrite.",
      "- rewriteBrief should be short, actionable instructions for regenerating the draft with factual fixes.",
      "",
      `Signal title: ${signal.title}`,
      `Signal summary: ${signal.summary}`,
      `Why it matters: ${signal.whyItMatters}`,
      `Source name: ${signal.sourceName}`,
      `Source link: ${signal.link}`,
      `Published at: ${signal.publishedAt}`,
      `Category: ${signal.categoryLabel}`,
      `Tags: ${signal.tags.join(", ") || "none"}`,
      ...(sourceContext
        ? [
            `Source context label: ${sourceContext.label}`,
            `Source context summary: ${sourceContext.summary}`,
            `Source context details: ${sourceContext.details.join(" | ") || "none"}`,
          ]
        : ["Source context: unavailable"]),
      "",
      `Draft hook: ${draft.hook}`,
      `Draft primary post: ${draft.shortPost}`,
      `Draft thread posts: ${draft.threadPosts.join(" | ") || "none"}`,
      `Draft first comment: ${draft.firstComment}`,
      `Draft follow-up replies: ${draft.followUpReplies.join(" | ") || "none"}`,
      `Draft why-now: ${draft.whyNow}`,
      `Draft hashtags: ${draft.hashtags.join(", ") || "none"}`,
    ].join("\n");
  }

  return [
    "당신은 리서치된 원문 근거를 기준으로 소셜 초안의 팩트를 검증합니다.",
    "아래에 제공된 시그널 정보와 source context만 근거로 사용하세요.",
    "없는 사실을 추정하지 마세요. 그럴듯하지만 근거가 부족하면 uncertain으로 표시하세요.",
    "순수한 의견이나 문체는 무시하되, 구체적인 사실 주장으로 읽히면 검증 대상에 포함하세요.",
    "반드시 JSON만 반환하세요.",
    `JSON 형태: ${responseShape}`,
    "규칙:",
    "- verdict는 pass, mixed, fail 중 하나여야 합니다.",
    "- confidence는 0~100 정수여야 합니다.",
    "- findings는 초안에서 영향도가 큰 팩트 주장 1~5개만 뽑으세요.",
    "- status는 supported, uncertain, incorrect 중 하나여야 합니다.",
    "- reason에는 어떤 근거가 있거나 충돌하는지 적으세요.",
    "- suggestedFix는 짧은 수정 방향만 적고 전체 문장을 다시 쓰지 마세요.",
    "- rewriteBrief는 재생성할 때 바로 쓸 수 있는 짧은 수정 지시여야 합니다.",
    "",
    `시그널 제목: ${signal.title}`,
    `시그널 요약: ${signal.summary}`,
    `왜 중요한가: ${signal.whyItMatters}`,
    `출처명: ${signal.sourceName}`,
    `원문 링크: ${signal.link}`,
    `발행 시각: ${signal.publishedAt}`,
    `카테고리: ${signal.categoryLabel}`,
    `태그: ${signal.tags.join(", ") || "없음"}`,
    ...(sourceContext
      ? [
          `원문 컨텍스트 이름: ${sourceContext.label}`,
          `원문 컨텍스트 요약: ${sourceContext.summary}`,
          `원문 컨텍스트 세부 정보: ${sourceContext.details.join(" | ") || "없음"}`,
        ]
      : ["원문 컨텍스트: 없음"]),
    "",
    `초안 훅: ${draft.hook}`,
    `초안 본문: ${draft.shortPost}`,
    `초안 스레드: ${draft.threadPosts.join(" | ") || "없음"}`,
    `초안 첫 댓글: ${draft.firstComment}`,
    `초안 후속 답글: ${draft.followUpReplies.join(" | ") || "없음"}`,
    `초안 why-now: ${draft.whyNow}`,
    `초안 해시태그: ${draft.hashtags.join(", ") || "없음"}`,
  ].join("\n");
}

function parseFactCheckPayload(raw: string): FactCheckPayload | null {
  const parsed = parseLastJsonObject(raw, (value): value is Partial<FactCheckPayload> => {
    if (!isRecord(value)) {
      return false;
    }

    return (
      typeof value.summary === "string"
      && typeof value.rewriteBrief === "string"
      && typeof value.confidence === "number"
      && Array.isArray(value.findings)
    );
  });

  if (!parsed) {
    return null;
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary : "";
  const rewriteBrief = typeof parsed.rewriteBrief === "string" ? parsed.rewriteBrief : "";
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
  const findings = (Array.isArray(parsed.findings) ? parsed.findings : [])
    .filter(isRecord)
    .map((item) => ({
      claim: typeof item.claim === "string" ? item.claim : "",
      status: typeof item.status === "string" ? item.status : "",
      reason: typeof item.reason === "string" ? item.reason : "",
      suggestedFix: typeof item.suggestedFix === "string" ? item.suggestedFix : "",
    }));

  if (
    containsCliTranscriptLeakInStrings([
      summary,
      rewriteBrief,
      ...findings.flatMap((item) => [item.claim, item.reason, item.suggestedFix]),
    ])
  ) {
    return null;
  }

  return {
    verdict: typeof parsed.verdict === "string" ? parsed.verdict : "mixed",
    confidence,
    summary,
    findings,
    rewriteBrief,
  };
}

function normalizeFindings(findings: FactCheckPayload["findings"]): SignalWriterFactCheckFinding[] {
  return findings
    .map((item) => ({
      claim: clampSentence(item.claim || "", 220),
      status: normalizeFindingStatus(item.status),
      reason: clampSentence(item.reason || "", 260),
      suggestedFix: clampSentence(item.suggestedFix || "", 220),
    }))
    .filter((item) => item.claim && item.reason && item.suggestedFix)
    .slice(0, 5);
}

function normalizeFindingStatus(value: string | undefined): SignalWriterFactCheckFindingStatus {
  switch (value) {
    case "supported":
    case "incorrect":
      return value;
    default:
      return "uncertain";
  }
}

function normalizeVerdict(
  verdict: string,
  findings: SignalWriterFactCheckFinding[],
): SignalWriterFactCheckVerdict {
  if (verdict === "pass" || verdict === "mixed" || verdict === "fail") {
    return verdict;
  }

  if (findings.some((item) => item.status === "incorrect")) {
    return "fail";
  }

  if (findings.some((item) => item.status === "uncertain")) {
    return "mixed";
  }

  return "pass";
}

function buildRewriteBrief(
  rewriteBrief: string,
  findings: SignalWriterFactCheckFinding[],
  verdict: SignalWriterFactCheckVerdict,
  locale: AppLocale,
) {
  const normalized = clampSentence(rewriteBrief, 360);
  if (normalized) {
    return normalized;
  }

  const actionableFindings = findings.filter((item) => item.status !== "supported");
  if (actionableFindings.length === 0 || verdict === "pass") {
    return locale === "en"
      ? "Keep the draft factual and conservative. Do not add unsupported claims."
      : "현재 근거 범위를 넘는 표현만 피하고, 팩트는 보수적으로 유지하세요.";
  }

  return actionableFindings
    .map((item, index) => `${index + 1}. ${item.suggestedFix}`)
    .join(" ");
}

function clampSentence(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
