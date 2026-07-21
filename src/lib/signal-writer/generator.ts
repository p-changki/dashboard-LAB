import "server-only";

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

import { generateOpenAiText, hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { runSpawnTask } from "@/lib/ai-skills/runner";
import {
  checkCommandAvailable,
  getCommandEnvironment,
} from "@/lib/command-availability";
import type { AppLocale } from "@/lib/locale";
import {
  buildSignalWriterCodexArgs,
  createSignalWriterCodexInvalidOutputError,
  isSignalWriterCodexOutputError,
  throwIfSignalWriterCodexOutputCorrupted,
  unwrapSignalWriterCodexResult,
} from "@/lib/signal-writer/codex";
import { loadSignalWriterSourceContext } from "@/lib/signal-writer/source-context";
import type {
  SignalWriterAiRunner,
  SignalWriterDraft,
  SignalWriterDraftMode,
  SignalWriterFactCheckContext,
  SignalWriterResearchContext,
  SignalWriterSignal,
  SignalWriterSourceContext,
  SignalWriterTargetChannel,
  SignalWriterTimingRecommendation,
} from "@/lib/types";
import {
  getChannelLabelEn,
  getChannelLabelKo,
  getChannelPromptGuideEn,
  getChannelPromptGuideKo,
  getHashtagGuideEn,
  getHashtagGuideKo,
  getSeriesGuideEn,
  getSeriesGuideKo,
  getShortPostGuideEn,
  getShortPostGuideKo,
} from "@/lib/signal-writer/generator/channel-guides";
import {
  getModeGuideEn,
  getModeGuideKo,
} from "@/lib/signal-writer/generator/draft-normalize";
import {
  buildTemplateDraft,
  normalizeDraft,
  parseDraftPayload,
} from "@/lib/signal-writer/generator/draft-assembly";


const DEFAULT_MODE: SignalWriterDraftMode = "viral";
const DEFAULT_RUNNER: SignalWriterAiRunner = "auto";
const DEFAULT_CHANNEL: SignalWriterTargetChannel = "threads";
const SIGNAL_WRITER_TIMEOUT_MS = 90_000;

export async function generateSignalWriterDraft(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode = DEFAULT_MODE,
  requestedRunner: SignalWriterAiRunner = DEFAULT_RUNNER,
  channel: SignalWriterTargetChannel = DEFAULT_CHANNEL,
  preferredHook?: string,
  timingRecommendation?: SignalWriterTimingRecommendation,
  researchContext?: SignalWriterResearchContext,
  factCheckContext?: SignalWriterFactCheckContext,
): Promise<SignalWriterDraft> {
  const generatedAt = new Date().toISOString();
  const normalizedPreferredHook = preferredHook?.trim() || researchContext?.bestHook?.trim() || undefined;
  const sourceContext = await loadSignalWriterSourceContext(signal);
  const prompt = buildPrompt(
    signal,
    locale,
    mode,
    channel,
    normalizedPreferredHook,
    researchContext,
    factCheckContext,
    sourceContext,
  );
  const resolvedRunner = await resolveSignalWriterRunner(requestedRunner);

  if (resolvedRunner !== "template") {
    try {
      const raw = await runSignalWriterModel(resolvedRunner, prompt, locale);
      if (resolvedRunner === "codex") {
        throwIfSignalWriterCodexOutputCorrupted(raw, locale, "draft");
      }
      const parsed = parseDraftPayload(raw);
      if (parsed) {
        return normalizeDraft(
          signal,
          locale,
          mode,
          channel,
          parsed,
          generatedAt,
          resolvedRunner,
          normalizedPreferredHook,
          timingRecommendation,
          researchContext,
        );
      }

      if (resolvedRunner === "codex") {
        throw createSignalWriterCodexInvalidOutputError(locale, "draft");
      }
    } catch (error) {
      if (isSignalWriterCodexOutputError(error)) {
        throw error;
      }

      if (requestedRunner !== "auto") {
        throw error;
      }
    }
  }

  return normalizeDraft(
    signal,
    locale,
    mode,
    channel,
    buildTemplateDraft(signal, locale, mode, channel, normalizedPreferredHook, researchContext, sourceContext),
    generatedAt,
    "template",
    normalizedPreferredHook,
    timingRecommendation,
    researchContext,
  );
}

async function resolveSignalWriterRunner(
  requestedRunner: SignalWriterAiRunner,
): Promise<Exclude<SignalWriterAiRunner, "auto">> {
  if (requestedRunner === "template") {
    return "template";
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

  return "template";
}

async function runSignalWriterModel(
  runner: Exclude<SignalWriterAiRunner, "auto" | "template">,
  prompt: string,
  locale: AppLocale,
) {
  if (runner === "openai") {
    return generateOpenAiText(prompt, { model: "gpt-5-mini", reasoningEffort: "low" });
  }

  if (runner === "claude") {
    return runClaude(prompt);
  }

  if (runner === "codex") {
    const outputPath = `/tmp/dashboard-lab-signal-writer-${randomUUID()}.txt`;
    const result = await runSpawnTask({
      command: "codex",
      args: buildSignalWriterCodexArgs(prompt, outputPath, "draft"),
      cwd: process.env.HOME || "/",
      outputPath,
      timeoutMs: SIGNAL_WRITER_TIMEOUT_MS,
    });
    return unwrapSignalWriterCodexResult(result, locale, "draft", "Signal Writer AI response is empty.");
  }

  const result = await runSpawnTask({
    command: "gemini",
    args: ["-p", prompt],
    cwd: process.env.HOME || "/",
    timeoutMs: SIGNAL_WRITER_TIMEOUT_MS,
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
      reject(new Error("Signal Writer AI processing timed out."));
    }, SIGNAL_WRITER_TIMEOUT_MS);

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
    throw new Error("Signal Writer AI response is empty.");
  }

  return output;
}

function buildPrompt(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
  channel: SignalWriterTargetChannel,
  preferredHook?: string,
  researchContext?: SignalWriterResearchContext,
  factCheckContext?: SignalWriterFactCheckContext,
  sourceContext?: SignalWriterSourceContext | null,
) {
  const modeGuide = locale === "en" ? getModeGuideEn(mode) : getModeGuideKo(mode);
  const channelLabel = locale === "en" ? getChannelLabelEn(channel) : getChannelLabelKo(channel);
  const shortPostGuide = locale === "en" ? getShortPostGuideEn(channel) : getShortPostGuideKo(channel);
  const seriesGuide = locale === "en" ? getSeriesGuideEn(channel) : getSeriesGuideKo(channel);
  const hashtagsGuide = locale === "en" ? getHashtagGuideEn(channel) : getHashtagGuideKo(channel);
  const channelToneGuide =
    locale === "en" ? getChannelPromptGuideEn(channel) : getChannelPromptGuideKo(channel);

  if (locale === "en") {
    return [
      `You write ${channelLabel} drafts for a solo builder account that wants reach and credibility.`,
      "Write crisp English with a clear point of view. Avoid bland summaries, generic praise, and filler hashtags.",
      channelToneGuide,
      ...(researchContext
        ? [
            `Research summary: ${researchContext.summary}`,
            `Research why-now: ${researchContext.whyNow}`,
            `Primary angle: ${researchContext.primaryAngle.label} / ${researchContext.primaryAngle.summary} / audience: ${researchContext.primaryAngle.audience}`,
            `Debate question: ${researchContext.bestQuestion}`,
            `Research key points: ${researchContext.keyPoints.join(" | ") || "none"}`,
            `Research watchouts: ${researchContext.watchouts.join(" | ") || "none"}`,
          ]
        : []),
      ...(factCheckContext
        ? [
            `Fact-check summary: ${factCheckContext.summary}`,
            `Fact-check rewrite brief: ${factCheckContext.rewriteBrief}`,
            `Fact-check findings: ${factCheckContext.findings.map((item) => `[${item.status}] ${item.claim} -> ${item.suggestedFix}`).join(" | ") || "none"}`,
          ]
        : []),
      ...(sourceContext
        ? [
            `Source context: ${sourceContext.label}`,
            `Source summary: ${sourceContext.summary}`,
            `Source details: ${sourceContext.details.join(" | ") || "none"}`,
          ]
        : []),
      `Draft mode: ${mode}. ${modeGuide}`,
      "Return strict JSON only with this exact shape:",
      '{"hook":"string","hookVariants":[{"text":"string","intent":"string"}],"angle":{"label":"string","summary":"string","audience":"string"},"shortPost":"string","threadPosts":["string"],"firstComment":"string","followUpReplies":["string"],"hashtags":["string"],"whyNow":"string","postingTips":["string"]}',
      "",
      `Title: ${signal.title}`,
      `Summary: ${signal.summary}`,
      `Source: ${signal.sourceName}`,
      `Category: ${signal.categoryLabel}`,
      `Why it matters: ${signal.whyItMatters}`,
      `Tags: ${signal.tags.join(", ") || "none"}`,
      ...(preferredHook ? ["", `Preferred hook: ${preferredHook}`] : []),
      "",
      "Rules:",
      ...(preferredHook
        ? [
            "- Use the preferred hook exactly as the final hook.",
            "- Rewrite the short post and thread so they clearly build around that preferred hook.",
          ]
        : []),
      "- hookVariants must contain exactly 3 distinct hooks.",
      "- Each hook should use a different intent: timely, contrarian, practical.",
      "- The hook should stop the scroll and avoid sounding like a changelog.",
      `- shortPost should be ${shortPostGuide}.`,
      `- threadPosts should contain ${seriesGuide}.`,
      "- firstComment should be one reply/comment to post right after publishing, ideally where you would place the source link or one extra context line.",
      "- followUpReplies should contain exactly 2 short replies: one discussion prompt and one response-ready follow-up.",
      "- whyNow should explain why this deserves posting today, not this week.",
      `- hashtags should be ${hashtagsGuide}. Never use generic tags like General or Agent.`,
      "- postingTips should be 2 or 3 practical tips.",
      "- Do not repeat the exact package or project name in every line.",
      "- If the fact-check section says a claim is uncertain or incorrect, fix or soften it before writing.",
      "- Prefer conservative wording when the evidence is thin.",
    ].join("\n");
  }

  return [
    `당신은 빌더 계정의 ${channelLabel} 초안을 작성합니다.`,
    "목표는 조회수보다 저장/공유를 부르는 글입니다. 밋밋한 뉴스 요약, 과한 과장, 쓸모없는 해시태그는 피하세요.",
    channelToneGuide,
    ...(researchContext
      ? [
          `리서치 요약: ${researchContext.summary}`,
          `리서치 타이밍 포인트: ${researchContext.whyNow}`,
          `핵심 각도: ${researchContext.primaryAngle.label} / ${researchContext.primaryAngle.summary} / 독자: ${researchContext.primaryAngle.audience}`,
          `답글 유도 질문: ${researchContext.bestQuestion}`,
          `리서치 핵심 포인트: ${researchContext.keyPoints.join(" | ") || "없음"}`,
          `리서치 주의점: ${researchContext.watchouts.join(" | ") || "없음"}`,
        ]
      : []),
    ...(factCheckContext
      ? [
          `팩트체크 요약: ${factCheckContext.summary}`,
          `팩트체크 수정 지시: ${factCheckContext.rewriteBrief}`,
          `팩트체크 발견 사항: ${factCheckContext.findings.map((item) => `[${item.status}] ${item.claim} -> ${item.suggestedFix}`).join(" | ") || "없음"}`,
        ]
      : []),
    ...(sourceContext
      ? [
          `원문 컨텍스트: ${sourceContext.label}`,
          `원문 요약: ${sourceContext.summary}`,
          `원문 세부 정보: ${sourceContext.details.join(" | ") || "없음"}`,
        ]
      : []),
    `초안 모드: ${mode}. ${modeGuide}`,
    "반드시 아래 JSON만 반환하세요:",
    '{"hook":"string","hookVariants":[{"text":"string","intent":"string"}],"angle":{"label":"string","summary":"string","audience":"string"},"shortPost":"string","threadPosts":["string"],"firstComment":"string","followUpReplies":["string"],"hashtags":["string"],"whyNow":"string","postingTips":["string"]}',
    "",
    `제목: ${signal.title}`,
    `요약: ${signal.summary}`,
    `출처: ${signal.sourceName}`,
    `카테고리: ${signal.categoryLabel}`,
    `왜 중요한가: ${signal.whyItMatters}`,
    `태그: ${signal.tags.join(", ") || "없음"}`,
    ...(preferredHook ? ["", `고정 훅: ${preferredHook}`] : []),
    "",
    "규칙:",
    ...(preferredHook
      ? [
          "- 고정 훅을 최종 hook으로 그대로 사용하세요.",
          "- shortPost와 threadPosts도 그 고정 훅을 중심으로 다시 쓰세요.",
        ]
      : []),
    "- hookVariants는 성격이 다른 훅 3개를 반환하세요.",
    "- 훅 의도는 각각 시의성, 역설/관점, 실무성으로 나누세요.",
    "- hook은 뉴스 제목 낭독이 아니라 스크롤을 멈추게 하는 문장이어야 합니다.",
    `- shortPost는 ${shortPostGuide}.`,
    `- threadPosts는 ${seriesGuide}.`,
    "- firstComment는 게시 직후 달아둘 첫 댓글/후속 댓글 1개여야 합니다. 링크를 붙이거나 맥락을 보강하는 문장이면 좋습니다.",
    "- followUpReplies는 정확히 2개 작성하세요. 하나는 대화 유도용, 하나는 질문이 들어왔을 때 바로 붙일 수 있는 후속 답글이어야 합니다.",
    "- whyNow는 왜 오늘 올릴 가치가 있는지 설명해야 합니다.",
    `- hashtags는 ${hashtagsGuide}. 너무 넓은 태그는 쓰지 마세요.`,
    "- postingTips는 2~3개 짧고 실전적으로 작성하세요.",
    "- 패키지명이나 프로젝트명을 모든 줄에 반복하지 마세요.",
    "- 팩트체크에 uncertain 또는 incorrect가 있으면 해당 표현을 바로잡거나 보수적으로 낮추세요.",
    "- 근거가 약한 내용은 단정하지 마세요.",
  ].join("\n");
}

