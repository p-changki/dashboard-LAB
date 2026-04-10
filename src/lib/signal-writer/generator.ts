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
  createSignalWriterCodexInvalidOutputError,
  isSignalWriterCodexOutputError,
  throwIfSignalWriterCodexOutputCorrupted,
  unwrapSignalWriterCodexResult,
} from "@/lib/signal-writer/codex";
import { loadSignalWriterSourceContext } from "@/lib/signal-writer/source-context";
import { buildSignalCoverImageUrl, buildSignalVisualStrategy } from "@/lib/signal-writer/visuals";
import type {
  SignalWriterAiRunner,
  SignalWriterAngle,
  SignalWriterDraft,
  SignalWriterDraftMode,
  SignalWriterFactCheckContext,
  SignalWriterHookVariant,
  SignalWriterResearchContext,
  SignalWriterQualityDimension,
  SignalWriterQualityLevel,
  SignalWriterSignal,
  SignalWriterSourceContext,
  SignalWriterTargetChannel,
  SignalWriterTimingRecommendation,
} from "@/lib/types";

type DraftPayload = {
  hook: string;
  hookVariants: Array<{ text: string; intent?: string }>;
  angle: SignalWriterAngle;
  shortPost: string;
  threadPosts: string[];
  firstComment: string;
  followUpReplies: string[];
  hashtags: string[];
  whyNow: string;
  postingTips: string[];
};

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

function getChannelLabelEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "X";
    case "linkedin":
      return "LinkedIn";
    default:
      return "Threads";
  }
}

function getChannelLabelKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "X / Twitter";
    case "linkedin":
      return "LinkedIn";
    default:
      return "Threads";
  }
}

function getChannelPromptGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "Write tighter than Threads. The first line should work as a standalone X post, and the follow-up sequence should feel quotable.";
    case "linkedin":
      return "Write with a more professional, operator-facing tone. Translate the story into workflow, product, or business impact.";
    default:
      return "Keep the tone conversational and skim-friendly, with a flow that feels easy to save and share.";
  }
}

function getChannelPromptGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "Threads보다 더 짧고 날카롭게 쓰세요. 첫 줄은 단독 X 포스트로도 설 수 있어야 하고, 이어지는 문장도 인용되기 쉬워야 합니다.";
    case "linkedin":
      return "조금 더 실무형이고 전문적인 톤으로 쓰세요. 기사를 업무 흐름, 제품, 비즈니스 영향으로 번역하세요.";
    default:
      return "대화체 흐름을 유지하면서 저장하고 공유하기 쉬운 밀도로 쓰세요.";
  }
}

function getShortPostGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "one publishable X post with a concrete point of view";
    case "linkedin":
      return "one publishable LinkedIn post with clearer structure and a professional tone";
    default:
      return "one publishable Threads post with a concrete point of view";
  }
}

function getShortPostGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "바로 올릴 수 있는 한 개의 X 포스트여야 합니다";
    case "linkedin":
      return "전문적인 톤과 구조를 갖춘 한 개의 LinkedIn 포스트여야 합니다";
    default:
      return "바로 올릴 수 있는 한 개의 Threads 포스트여야 합니다";
  }
}

function getSeriesGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "3 or 4 sequenced X posts max";
    case "linkedin":
      return "3 or 4 sequenced LinkedIn follow-up blocks max";
    default:
      return "4 or 5 posts max";
  }
}

function getSeriesGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "3~4개 X 포스트까지만 작성하세요";
    case "linkedin":
      return "3~4개 LinkedIn 연속 블록까지만 작성하세요";
    default:
      return "4~5개 포스트까지만 작성하세요";
  }
}

function getHashtagGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "linkedin":
      return "1 to 3 specific tags";
    default:
      return "2 to 4 specific tags";
  }
}

function getHashtagGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "linkedin":
      return "1~3개 정도의 구체적인 태그여야 합니다";
    default:
      return "2~4개의 구체적인 태그여야 합니다";
  }
}

function parseDraftPayload(raw: string): DraftPayload | null {
  const parsed = parseLastJsonObject(raw, (value): value is Partial<{
      hook: string;
      hookVariants: Array<{ text?: string; intent?: string }>;
      angle: Partial<SignalWriterAngle>;
      shortPost: string;
      threadPosts: string[];
      firstComment: string;
      followUpReplies: string[];
      hashtags: string[];
      whyNow: string;
      postingTips: string[];
    }> => {
      if (!isRecord(value)) {
        return false;
      }

      return (
        typeof value.hook === "string"
        && typeof value.shortPost === "string"
        && Array.isArray(value.threadPosts)
      );
    });

  if (!parsed) {
    return null;
  }

  const hook = typeof parsed.hook === "string" ? parsed.hook : "";
  const shortPost = typeof parsed.shortPost === "string" ? parsed.shortPost : "";
  const hookVariants = Array.isArray(parsed.hookVariants)
    ? parsed.hookVariants
        .map((item) => ({
          text: typeof item?.text === "string" ? item.text : "",
          intent: typeof item?.intent === "string" ? item.intent : "",
        }))
        .filter((item) => item.text)
    : [];
  const angle = {
    label: typeof parsed.angle?.label === "string" ? parsed.angle.label : "",
    summary: typeof parsed.angle?.summary === "string" ? parsed.angle.summary : "",
    audience: typeof parsed.angle?.audience === "string" ? parsed.angle.audience : "",
  };
  const threadPosts = Array.isArray(parsed.threadPosts)
    ? parsed.threadPosts.filter((item): item is string => typeof item === "string")
    : [];
  const firstComment = typeof parsed.firstComment === "string" ? parsed.firstComment : "";
  const followUpReplies = Array.isArray(parsed.followUpReplies)
    ? parsed.followUpReplies.filter((item): item is string => typeof item === "string")
    : [];
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.filter((item): item is string => typeof item === "string")
    : [];
  const whyNow = typeof parsed.whyNow === "string" ? parsed.whyNow : "";
  const postingTips = Array.isArray(parsed.postingTips)
    ? parsed.postingTips.filter((item): item is string => typeof item === "string")
    : [];

  if (
    containsCliTranscriptLeakInStrings([
      hook,
      shortPost,
      angle.label,
      angle.summary,
      angle.audience,
      firstComment,
      whyNow,
      ...threadPosts,
      ...followUpReplies,
      ...hashtags,
      ...postingTips,
      ...hookVariants.flatMap((item) => [item.text, item.intent || ""]),
    ])
  ) {
    return null;
  }

  return {
    hook,
    hookVariants,
    angle,
    shortPost,
    threadPosts,
    firstComment,
    followUpReplies,
    hashtags,
    whyNow,
    postingTips,
  };
}

function buildTemplateDraft(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
  channel: SignalWriterTargetChannel,
  preferredHook?: string,
  researchContext?: SignalWriterResearchContext,
  sourceContext?: SignalWriterSourceContext | null,
): DraftPayload {
  const angle = researchContext?.primaryAngle ?? buildAngle(signal, locale, mode, channel);
  const takeaway = researchContext?.summary || sourceContext?.summary || getTakeaway(signal);
  const hooks = buildHookVariants(signal, locale, mode, takeaway);
  const hook =
    preferredHook?.trim() ||
    researchContext?.bestHook?.trim() ||
    hooks[0]?.text ||
    (locale === "en" ? signal.title : `오늘 볼 만한 건 ${signal.title}`);
  const hashtags = buildHashtags(signal, locale, mode);
  const replyAssets = buildReplyAssets(signal, locale, channel, hook, angle.summary);

  if (locale === "en") {
    if (channel === "x") {
      return {
        hook,
        hookVariants: hooks,
        angle,
        shortPost: [
          hook,
          "",
          `${signal.summary}`,
          "",
          `My take: ${angle.summary}`,
        ].join("\n"),
        threadPosts: [
          `1/ ${hook}`,
          `2/ ${signal.summary}`,
          `3/ What matters is ${takeaway}`,
          `4/ My take: ${angle.summary}`,
        ],
        ...replyAssets,
        hashtags,
        whyNow: researchContext?.whyNow || "The signal is still early enough to reward a sharper take instead of another plain recap.",
        postingTips: [
          "Keep the first line tight enough to work as a standalone X post.",
          "Put the source link in a reply if you want a cleaner main post.",
          "End with one opinion or implication, not just the facts.",
        ],
      };
    }

    if (channel === "linkedin") {
      return {
        hook,
        hookVariants: hooks,
        angle,
        shortPost: [
          hook,
          "",
          signal.summary,
          "",
          `The practical takeaway: ${takeaway}`,
          "",
          `Why it matters now: ${angle.summary}`,
        ].join("\n"),
        threadPosts: [
          `1. ${hook}`,
          `2. ${signal.summary}`,
          `3. Practical takeaway: ${takeaway}`,
          `4. My read: ${angle.summary}`,
        ],
        ...replyAssets,
        hashtags: hashtags.slice(0, 3),
        whyNow: researchContext?.whyNow || "It is timely enough to add a practical read before this turns into background industry noise.",
        postingTips: [
          "Keep the opening claim readable in two short paragraphs.",
          "Translate the story into workflow or business impact by the third block.",
          "Use fewer hashtags and end with one clear takeaway.",
        ],
      };
    }

    return {
      hook,
      hookVariants: hooks,
      angle,
      shortPost: [
        hook,
        "",
        signal.summary,
        "",
        `What matters: ${takeaway}`,
        "",
        `The real angle here is ${angle.summary.toLowerCase()}.`,
      ].join("\n"),
      threadPosts: [
        `1/ ${hook}`,
        `2/ ${signal.summary}`,
        `3/ What makes this worth posting today is simple: ${takeaway}`,
        `4/ My read: ${angle.summary}`,
        "5/ Worth bookmarking now, because once this becomes consensus it stops being useful as an early signal.",
      ],
      ...replyAssets,
      hashtags,
      whyNow: researchContext?.whyNow || "It is still early enough to post a useful take, not just repeat what everyone already knows.",
      postingTips: [
        "Lead with the claim, not the package name.",
        "Keep one practical takeaway in the second post.",
        "Use the source link in a reply if you want cleaner reach.",
      ],
    };
  }

  if (channel === "x") {
    return {
      hook,
      hookVariants: hooks,
      angle,
      shortPost: [
        hook,
        "",
        signal.summary,
        "",
        `제 해석은 ${angle.summary}`,
      ].join("\n"),
      threadPosts: [
        `1/ ${hook}`,
        `2/ ${signal.summary}`,
        `3/ 제가 본 핵심은 ${takeaway}`,
        `4/ 제 관점은 ${angle.summary}`,
      ],
      ...replyAssets,
      hashtags,
      whyNow: researchContext?.whyNow || "지금은 요약보다 한 줄 해석이 더 잘 먹히는 타이밍이라, X에서 먼저 짧고 강하게 던지기 좋습니다.",
      postingTips: [
        "첫 줄은 최대한 짧게 끊어서 단일 포스트로도 서게 만드세요.",
        "링크는 본문보다 답글로 빼는 편이 깔끔합니다.",
        "사실 요약 뒤에 네 관점을 한 줄 더 붙이세요.",
      ],
    };
  }

  if (channel === "linkedin") {
    return {
      hook,
      hookVariants: hooks,
      angle,
      shortPost: [
        hook,
        "",
        signal.summary,
        "",
        `실무적으로 보면 ${takeaway}`,
        "",
        `지금 이 글의 핵심 각도는 ${angle.summary}입니다.`,
      ].join("\n"),
      threadPosts: [
        `1. ${hook}`,
        `2. ${signal.summary}`,
        `3. 실무 포인트는 ${takeaway}`,
        `4. 제 해석은 ${angle.summary}`,
      ],
      ...replyAssets,
      hashtags: hashtags.slice(0, 3),
      whyNow: researchContext?.whyNow || "아직 업계 잡음으로 굳기 전이라, LinkedIn에서 실무형 인사이트로 정리하기 좋은 시점입니다.",
      postingTips: [
        "문단 간격을 넉넉하게 두고 업무 영향 관점으로 번역하세요.",
        "세 번째 블록 안에는 실무 takeaway를 꼭 넣으세요.",
        "해시태그는 적게 쓰고 마지막 문장은 한 줄 결론으로 닫으세요.",
      ],
    };
  }

  return {
    hook,
    hookVariants: hooks,
    angle,
    shortPost: [
      hook,
      "",
      signal.summary,
      "",
      `제가 중요하게 본 포인트는 ${takeaway}`,
      "",
      `이번 글의 각도는 ${angle.summary} 쪽입니다.`,
    ].join("\n"),
    threadPosts: [
      `1/ ${hook}`,
      `2/ ${signal.summary}`,
      `3/ 제가 이걸 저장할 만하다고 본 이유는 ${takeaway}`,
      `4/ 제 관점은 ${angle.summary}`,
      "5/ 이런 신호는 며칠 지나면 그냥 뉴스가 되기 쉬워서, 지금 짧게 관점을 남기는 쪽이 낫습니다.",
    ],
    ...replyAssets,
    hashtags,
    whyNow: researchContext?.whyNow || "아직 타이밍이 살아 있어서 단순 번역이 아니라 관점 있는 글로 전환하기 좋습니다.",
    postingTips: [
      "첫 줄은 뉴스 제목보다 네 주장으로 시작하세요.",
      "두 번째 문단에 왜 중요한지 한 문장으로 고정하세요.",
      "링크는 본문보다 답글에 두는 쪽이 깔끔합니다.",
    ],
  };
}

function normalizeDraft(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
  channel: SignalWriterTargetChannel,
  payload: DraftPayload,
  generatedAt: string,
  sourceModel: Exclude<SignalWriterAiRunner, "auto">,
  preferredHook?: string,
  timingRecommendation?: SignalWriterTimingRecommendation,
  researchContext?: SignalWriterResearchContext,
): SignalWriterDraft {
  const hook = preferredHook?.trim() || payload.hook.trim();
  const whyNow = (payload.whyNow.trim() || researchContext?.whyNow || "").trim();
  const angle = researchContext?.primaryAngle ?? normalizeAngle(payload.angle, signal, locale, mode, channel);
  const hookVariants = normalizeHookVariants(payload.hookVariants, hook, locale);
  const replyAssets = normalizeReplyAssets(signal, locale, channel, hook, angle.summary, payload);
  const maxSeriesItems = channel === "threads" ? 5 : 4;
  const threadPosts = payload.threadPosts
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxSeriesItems);
  const hashtags = buildHashtagsFromPayload(signal, payload.hashtags, locale, mode).slice(
    0,
    channel === "linkedin" ? 3 : 4,
  );
  const postingTips = payload.postingTips.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const quality = scoreDraft(signal, locale, {
    hook,
    hookVariants,
    shortPost: payload.shortPost.trim(),
    threadPosts,
    whyNow,
    hashtags,
  });
  const visualStrategy = buildSignalVisualStrategy(signal, locale, {
    hook,
    whyNow,
  });

  return {
    id: randomUUID(),
    signalId: signal.id,
    title: signal.title,
    channel,
    mode,
    angle,
    hook,
    hookVariants,
    shortPost: payload.shortPost.trim(),
    threadPosts,
    firstComment: replyAssets.firstComment,
    followUpReplies: replyAssets.followUpReplies,
    hashtags,
    whyNow,
    postingTips,
    timingRecommendation:
      timingRecommendation ?? buildFallbackTimingRecommendation(locale, channel),
    quality,
    generatedAt,
    sourceModel,
    visualStrategy,
    coverImageUrl: buildSignalCoverImageUrl(visualStrategy, signal),
    markdownPath: null,
    jsonPath: null,
  };
}

function normalizeReplyAssets(
  signal: SignalWriterSignal,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
  hook: string,
  angleSummary: string,
  payload: DraftPayload,
) {
  const fallback = buildReplyAssets(signal, locale, channel, hook, angleSummary);
  const firstComment = payload.firstComment.trim() || fallback.firstComment;
  const followUpReplies = payload.followUpReplies
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);

  return {
    firstComment,
    followUpReplies:
      followUpReplies.length === 2 ? followUpReplies : fallback.followUpReplies,
  };
}

function buildReplyAssets(
  signal: SignalWriterSignal,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
  hook: string,
  angleSummary: string,
) {
  if (locale === "en") {
    if (channel === "linkedin") {
      return {
        firstComment: `Source for context: ${signal.link}`,
        followUpReplies: [
          "What would you want to test first if this shift reaches your team workflow?",
          `My working assumption is simple: ${angleSummary}`,
        ],
      };
    }

    return {
      firstComment: `Source link: ${signal.link}`,
      followUpReplies: [
        `Curious what people here think: does this feel like a real workflow shift, or just another release note wrapped in hype?`,
        `If someone asks what matters here, my short answer is: ${angleSummary}`,
      ],
    };
  }

  if (channel === "linkedin") {
    return {
      firstComment: `원문 링크는 여기입니다: ${signal.link}`,
      followUpReplies: [
        "이 변화가 실제 팀 워크플로에 들어온다면, 제일 먼저 어디에 써볼 것 같으신가요?",
        `제 기준에서 핵심 해석은 이겁니다: ${angleSummary}`,
      ],
    };
  }

  return {
    firstComment: `원문 링크는 여기입니다: ${signal.link}`,
    followUpReplies: [
      "이건 진짜 작업 방식 변화로 이어질까요, 아니면 이번 주 뉴스로 끝날까요?",
      `제가 짧게 정리하면 핵심은 이겁니다: ${hook}`,
    ],
  };
}

function buildFallbackTimingRecommendation(
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
): SignalWriterTimingRecommendation {
  const defaults =
    locale === "en"
      ? {
          threads: {
            primary: {
              id: "evening" as const,
              label: "Evening (18:00-22:00)",
              description: "Usually the easiest time to get both reach and replies on Threads.",
            },
            secondary: {
              id: "lunch" as const,
              label: "Lunch (11:00-14:00)",
              description: "A good fallback window when people skim and save posts.",
            },
          },
          x: {
            primary: {
              id: "morning" as const,
              label: "Morning (07:00-11:00)",
              description: "Good when people are checking updates quickly.",
            },
            secondary: {
              id: "evening" as const,
              label: "Evening (18:00-22:00)",
              description: "Good when the hook is strong enough to trigger replies.",
            },
          },
          linkedin: {
            primary: {
              id: "afternoon" as const,
              label: "Afternoon (14:00-18:00)",
              description: "Often the most natural window for practical work-facing posts.",
            },
            secondary: {
              id: "morning" as const,
              label: "Morning (07:00-11:00)",
              description: "Useful fallback when posting before the workday fills up.",
            },
          },
        }
      : {
          threads: {
            primary: {
              id: "evening" as const,
              label: "저녁 (18:00-22:00)",
              description: "Threads에서 조회수와 답글을 함께 노리기 가장 무난한 시간대입니다.",
            },
            secondary: {
              id: "lunch" as const,
              label: "점심 (11:00-14:00)",
              description: "짧게 읽고 저장하는 흐름이 붙기 좋은 보조 시간대입니다.",
            },
          },
          x: {
            primary: {
              id: "morning" as const,
              label: "오전 (07:00-11:00)",
              description: "빠르게 훑어보는 피드 흐름에 맞는 시간대입니다.",
            },
            secondary: {
              id: "evening" as const,
              label: "저녁 (18:00-22:00)",
              description: "훅이 강한 글이면 답글까지 붙기 쉬운 보조 시간대입니다.",
            },
          },
          linkedin: {
            primary: {
              id: "afternoon" as const,
              label: "오후 (14:00-18:00)",
              description: "실무형 포스트를 읽고 저장하기 자연스러운 시간대입니다.",
            },
            secondary: {
              id: "morning" as const,
              label: "오전 (07:00-11:00)",
              description: "업무가 본격화되기 전에 읽히기 좋은 대안 시간대입니다.",
            },
          },
        };

  const selected = defaults[channel];
  return {
    basis: "default",
    primaryWindow: selected.primary,
    secondaryWindow: selected.secondary,
    reason:
      locale === "en"
        ? "Fallback posting windows based on the default reading rhythm for this channel."
        : "이 채널에서 보통 잘 읽히는 기본 시간대를 기준으로 잡은 권장값입니다.",
  };
}

function normalizeAngle(
  angle: SignalWriterAngle,
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
  channel: SignalWriterTargetChannel,
): SignalWriterAngle {
  if (angle.label && angle.summary && angle.audience) {
    return {
      label: angle.label.trim(),
      summary: angle.summary.trim(),
      audience: angle.audience.trim(),
    };
  }

  return buildAngle(signal, locale, mode, channel);
}

function normalizeHookVariants(
  values: Array<{ text: string; intent?: string }>,
  fallbackHook: string,
  locale: AppLocale,
): SignalWriterHookVariant[] {
  const normalized = values
    .map((item, index) => ({
      id: `hook-${index + 1}`,
      text: item.text.trim(),
      intent: (item.intent || getFallbackHookIntent(index, locale)).trim(),
    }))
    .filter((item) => item.text)
    .slice(0, 3);

  const includesFallback = normalized.some(
    (item) => item.text.toLowerCase() === fallbackHook.toLowerCase(),
  );

  if (!includesFallback && fallbackHook.trim()) {
    normalized.unshift({
      id: "hook-0",
      text: fallbackHook,
      intent: getFallbackHookIntent(0, locale),
    });
  }

  if (normalized.length >= 3) {
    return normalized.slice(0, 3).map((item, index) => ({
      ...item,
      id: `hook-${index + 1}`,
    }));
  }

  const fallbacks = [fallbackHook, ...buildFallbackHookTexts(fallbackHook, locale)];
  while (normalized.length < 3 && fallbacks[normalized.length]) {
    normalized.push({
      id: `hook-${normalized.length + 1}`,
      text: fallbacks[normalized.length],
      intent: getFallbackHookIntent(normalized.length, locale),
    });
  }

  return normalized.slice(0, 3);
}

function buildFallbackHookTexts(hook: string, locale: AppLocale) {
  if (locale === "en") {
    return [
      `Quietly important today: ${hook}`,
      "The practical shift here is not the name, but what it changes for builders.",
    ];
  }

  return [
    "오늘 그냥 넘기기 아까웠던 건 이 포인트였습니다.",
    "이름보다 중요한 건, 이 변화가 실제 작업 방식으로 번질 수 있다는 점입니다.",
  ];
}

function buildHashtagsFromPayload(
  signal: SignalWriterSignal,
  values: string[],
  locale: AppLocale,
  mode: SignalWriterDraftMode,
) {
  const filtered = normalizeHashtags(values).filter((item) => !isGenericHashtag(item));
  if (filtered.length >= 2) {
    return filtered;
  }

  return buildHashtags(signal, locale, mode);
}

function buildHashtags(signal: SignalWriterSignal, locale: AppLocale, mode: SignalWriterDraftMode) {
  const modeTags =
    locale === "en"
      ? {
          "news-brief": ["AINews", "DevTools"],
          insight: ["Builders", "AIWorkflows"],
          opinion: ["AICommentary", "FutureOfWork"],
          viral: ["AITrends", "BuilderNotes"],
        }
      : {
          "news-brief": ["AI뉴스", "개발도구"],
          insight: ["빌더", "AI워크플로"],
          opinion: ["AI관점", "실무인사이트"],
          viral: ["AI트렌드", "빌더노트"],
        };

  return normalizeHashtags([
    ...signal.tags,
    signal.categoryLabel.replace(/\s+/g, ""),
    ...modeTags[mode],
  ])
    .filter((item) => !isGenericHashtag(item))
    .slice(0, 4);
}

function buildAngle(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
  channel: SignalWriterTargetChannel,
): SignalWriterAngle {
  if (locale === "en") {
    switch (mode) {
      case "news-brief":
        return {
          label: "Fast brief",
          summary: "A clean read on what changed and why it deserves attention today.",
          audience: getAudienceEn(channel, {
            threads: "Builders tracking the market without reading the full article.",
            x: "People who want a tight signal and a fast read on X.",
            linkedin: "Professionals who want the takeaway without reading the whole article.",
          }),
        };
      case "insight":
        return {
          label: "Practical shift",
          summary: "Translate the news into what changes for builders, operators, or teams.",
          audience: getAudienceEn(channel, {
            threads: "People who care more about workflow impact than headlines.",
            x: "X readers who want the practical implication, not just the headline.",
            linkedin: "Operators, builders, and leads who want practical workflow impact.",
          }),
        };
      case "opinion":
        return {
          label: "Point of view",
          summary: "Turn the signal into a clear stance instead of repeating the article.",
          audience: getAudienceEn(channel, {
            threads: "Followers who come for interpretation, not just summaries.",
            x: "X readers who react to a sharp, defensible take.",
            linkedin: "Professionals who want a take tied to real work, not hot air.",
          }),
        };
      default:
        return {
          label: "Shareable angle",
          summary: "Focus on the line that feels timely, bookmarkable, and discussion-worthy.",
          audience: getAudienceEn(channel, {
            threads: "Threads readers who react to sharp takes more than neutral updates.",
            x: "X readers who reward concise hooks and a clear second-order implication.",
            linkedin: "LinkedIn readers who save concise, useful takes with work relevance.",
          }),
        };
    }
  }

  switch (mode) {
    case "news-brief":
      return {
        label: "빠른 브리프",
        summary: "무슨 변화가 있었는지와 왜 봐야 하는지를 빠르게 전달하는 각도입니다.",
        audience: getAudienceKo(channel, {
          threads: "기사 원문을 다 읽지 않고 흐름만 빠르게 잡고 싶은 사람",
          x: "X에서 짧고 빠르게 핵심만 확인하고 싶은 사람",
          linkedin: "업무 관점에서 빠르게 요점을 파악하고 싶은 사람",
        }),
      };
    case "insight":
      return {
        label: "실무 인사이트",
        summary: "뉴스를 실무 변화로 번역해서 보여주는 각도입니다.",
        audience: getAudienceKo(channel, {
          threads: "빌더, PM, 운영 관점에서 의미를 보고 싶은 사람",
          x: "짧은 글에서도 실무 함의를 바로 보고 싶은 X 독자",
          linkedin: "실무 변화와 업무 영향 중심으로 읽는 LinkedIn 독자",
        }),
      };
    case "opinion":
      return {
        label: "관점형",
        summary: "기사 요약보다 내 해석과 판단을 앞세우는 각도입니다.",
        audience: getAudienceKo(channel, {
          threads: "그냥 뉴스보다 해석과 의견을 기대하는 팔로워",
          x: "짧아도 선명한 관점을 기대하는 X 독자",
          linkedin: "실무와 연결된 해석을 기대하는 LinkedIn 독자",
        }),
      };
    default:
      return {
        label: "바이럴형",
        summary: "지금 저장하거나 공유하고 싶게 만드는 포인트를 앞세우는 각도입니다.",
        audience: getAudienceKo(channel, {
          threads: "짧고 강한 관점에 반응하는 Threads 독자",
          x: "짧은 훅과 선명한 결론에 반응하는 X 독자",
          linkedin: "실무적으로 저장할 만한 정리글에 반응하는 LinkedIn 독자",
        }),
      };
  }
}

function getAudienceEn(
  channel: SignalWriterTargetChannel,
  labels: Record<SignalWriterTargetChannel, string>,
) {
  return labels[channel];
}

function getAudienceKo(
  channel: SignalWriterTargetChannel,
  labels: Record<SignalWriterTargetChannel, string>,
) {
  return labels[channel];
}

function buildHookVariants(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
  takeaway: string,
): SignalWriterHookVariant[] {
  if (locale === "en") {
    const hooks = {
      "news-brief": [
        `A small release on paper, but one worth watching today: ${signal.title}.`,
        `The useful part of ${signal.title} is not the name. It is what it unlocks next.`,
        `If you only track one niche AI signal today, this one is worth the skim.`,
      ],
      insight: [
        `This is the kind of update that quietly changes builder workflows: ${signal.title}.`,
        "What matters here is not the launch itself, but the workflow shift behind it.",
        "This looks niche at first glance, but it points to a broader tool pattern.",
      ],
      opinion: [
        `My take: ${signal.title} matters less as news and more as a direction signal.`,
        "I would not file this under “just another release.” The practical change is the real story.",
        "The headline is fine. The second-order effect is the part worth paying attention to.",
      ],
      viral: [
        `Today’s “don’t just scroll past this” signal: ${signal.title}.`,
        "This is one of those updates that looks small until you think about what it enables.",
        "If this pattern keeps spreading, people will point back to signals like this one.",
      ],
    } satisfies Record<SignalWriterDraftMode, string[]>;

    return hooks[mode].map((text, index) => ({
      id: `hook-${index + 1}`,
      text,
      intent: ["Timely", "Contrarian", "Practical"][index] ?? "Angle",
    }));
  }

  const hooks = {
    "news-brief": [
      `오늘 빠르게 봐둘 만한 신호는 ${signal.title}입니다.`,
      "제목보다 중요한 건, 이 업데이트가 어디로 이어질 수 있느냐입니다.",
      "하루 지나면 묻히기 쉬운 타입이라 지금 짧게 짚어둘 가치가 있습니다.",
    ],
    insight: [
      `오늘 본 것 중 실무 감도가 높았던 건 ${signal.title}였습니다.`,
      "이걸 뉴스로만 보면 약하고, 작업 흐름 변화로 보면 훨씬 의미가 커집니다.",
      `핵심은 기능 설명이 아니라 ${takeaway}`,
    ],
    opinion: [
      "제 관점에선 이건 단순한 업데이트보다 방향 신호에 가깝습니다.",
      "이런 건 기사보다 해석을 먼저 붙여야 가치가 생깁니다.",
      "제목만 보면 평범하지만, 실제로는 다음 흐름을 꽤 잘 보여줍니다.",
    ],
    viral: [
      `오늘 그냥 넘기기 아까웠던 건 ${signal.title}였습니다.`,
      "이건 이름보다 “어디까지 번질 수 있나”를 봐야 하는 업데이트입니다.",
      "이런 신호는 지금 저장해두면 나중에 왜 중요했는지 더 잘 보입니다.",
    ],
  } satisfies Record<SignalWriterDraftMode, string[]>;

  return hooks[mode].map((text, index) => ({
    id: `hook-${index + 1}`,
    text,
    intent: ["시의성", "관점", "실무성"][index] ?? "각도",
  }));
}

function scoreDraft(
  signal: SignalWriterSignal,
  locale: AppLocale,
  input: {
    hook: string;
    hookVariants: SignalWriterHookVariant[];
    shortPost: string;
    threadPosts: string[];
    whyNow: string;
    hashtags: string[];
  },
) {
  const dimensions: SignalWriterQualityDimension[] = [
    buildHookDimension(signal, locale, input.hook, input.hookVariants),
    buildSpecificityDimension(signal, locale, input.shortPost, input.whyNow),
    buildPointOfViewDimension(locale, input.shortPost, input.threadPosts),
    buildShareabilityDimension(locale, input.threadPosts, input.hashtags, input.whyNow),
  ];

  const total = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length,
  ) * 10;
  const level: SignalWriterQualityLevel = total >= 80 ? "strong" : total >= 60 ? "solid" : "rough";

  return {
    total,
    level,
    dimensions,
  };
}

function buildHookDimension(
  signal: SignalWriterSignal,
  locale: AppLocale,
  hook: string,
  variants: SignalWriterHookVariant[],
): SignalWriterQualityDimension {
  const normalized = hook.trim();
  let score = 4;

  if (normalized.length >= 18 && normalized.length <= 90) {
    score += 2;
  }
  if (!equalsIgnoringCase(normalized, signal.title)) {
    score += 2;
  }
  if (hasCueWord(normalized, locale, ["today", "worth", "quietly", "today’s"], ["오늘", "지금", "아까웠", "봐둘"])) {
    score += 1;
  }
  if (variants.length >= 3) {
    score += 1;
  }

  return {
    id: "hook",
    label: locale === "en" ? "Hook strength" : "훅 강도",
    score: Math.min(score, 10),
    reason:
      locale === "en"
        ? score >= 8
          ? "The opening line feels timely and does more than repeat the title."
          : "The hook still reads too close to a headline and needs a sharper claim."
        : score >= 8
          ? "첫 줄이 제목 반복을 넘어서 지금 봐야 할 이유를 보여줍니다."
          : "첫 줄이 아직 기사 제목에 가까워서 더 날카로운 주장으로 바꿀 여지가 있습니다.",
  };
}

function buildSpecificityDimension(
  signal: SignalWriterSignal,
  locale: AppLocale,
  shortPost: string,
  whyNow: string,
): SignalWriterQualityDimension {
  let score = 4;
  const text = `${shortPost} ${whyNow}`;
  const summaryWords = tokenize(signal.summary);
  const overlap = summaryWords.filter((word) => text.toLowerCase().includes(word)).length;

  if (overlap >= 3) {
    score += 2;
  }
  if (text.length >= 140) {
    score += 2;
  }
  if (hasCueWord(text, locale, ["workflow", "builders", "operators", "teams"], ["실무", "작업", "빌더", "팀"])) {
    score += 2;
  }

  return {
    id: "specificity",
    label: locale === "en" ? "Specificity" : "구체성",
    score: Math.min(score, 10),
    reason:
      locale === "en"
        ? score >= 8
          ? "The draft explains what changes and who should care."
          : "The draft still needs a clearer concrete effect, not just a general summary."
        : score >= 8
          ? "무슨 변화가 생기고 누가 봐야 하는지가 비교적 선명합니다."
          : "아직은 일반 요약에 가깝고, 실제 영향이 더 구체적으로 보여야 합니다.",
  };
}

function buildPointOfViewDimension(
  locale: AppLocale,
  shortPost: string,
  threadPosts: string[],
): SignalWriterQualityDimension {
  let score = 3;
  const joined = `${shortPost} ${threadPosts.join(" ")}`;
  if (hasCueWord(joined, locale, ["my take", "what matters", "the real", "i would"], ["제 관점", "제가", "핵심은", "중요한 건"])) {
    score += 4;
  }
  if (threadPosts.length >= 4) {
    score += 2;
  }
  if (threadPosts.some((item) => item.includes("?"))) {
    score += 1;
  }

  return {
    id: "pointOfView",
    label: locale === "en" ? "Point of view" : "관점성",
    score: Math.min(score, 10),
    reason:
      locale === "en"
        ? score >= 8
          ? "The draft sounds like a real take, not a neutral repost."
          : "The draft still leans closer to a summary than a memorable perspective."
        : score >= 8
          ? "단순 전달보다 해석과 판단이 들어간 글에 가깝습니다."
          : "요약은 되지만, 계정의 관점이 더 또렷하게 들어가야 합니다.",
  };
}

function buildShareabilityDimension(
  locale: AppLocale,
  threadPosts: string[],
  hashtags: string[],
  whyNow: string,
): SignalWriterQualityDimension {
  let score = 4;

  if (threadPosts.length >= 4) {
    score += 2;
  }
  if (hashtags.length >= 2 && hashtags.length <= 4) {
    score += 2;
  }
  if (whyNow.length >= 40) {
    score += 2;
  }

  return {
    id: "shareability",
    label: locale === "en" ? "Shareability" : "공유 가능성",
    score: Math.min(score, 10),
    reason:
      locale === "en"
        ? score >= 8
          ? "The draft is structured well enough to save, share, or split into a short thread."
          : "It can be posted, but it still needs a cleaner save-or-share payoff."
        : score >= 8
          ? "저장하거나 공유하기 좋은 구조로 정리돼 있습니다."
          : "올릴 수는 있지만, 저장/공유를 부를 한 방이 더 필요합니다.",
  };
}

function getTakeaway(signal: SignalWriterSignal) {
  return firstSentence(signal.whyItMatters) || firstSentence(signal.summary) || signal.title;
}

function normalizeHashtags(values: string[]) {
  return [...new Set(values.map((item) => item.replace(/^#+/, "").trim()).filter(Boolean))];
}

function isGenericHashtag(value: string) {
  return ["general", "agent", "agents", "npm", "thread", "threads", "generalnmpicks"].includes(
    value.toLowerCase().replace(/[^a-z0-9가-힣]/g, ""),
  );
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);
}

function firstSentence(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .find(Boolean) ?? "";
}

function equalsIgnoringCase(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function hasCueWord(value: string, locale: AppLocale, english: string[], korean: string[]) {
  const source = value.toLowerCase();
  const words = locale === "en" ? english : korean;
  return words.some((word) => source.includes(word.toLowerCase()));
}

function getFallbackHookIntent(index: number, locale: AppLocale) {
  if (locale === "en") {
    return ["Timely", "Contrarian", "Practical"][index] ?? "Angle";
  }
  return ["시의성", "관점", "실무성"][index] ?? "각도";
}

function getModeGuideEn(mode: SignalWriterDraftMode) {
  switch (mode) {
    case "news-brief":
      return "Keep it tight and useful. Make the update easy to understand fast.";
    case "insight":
      return "Translate the signal into practical impact for builders or operators.";
    case "opinion":
      return "Lead with a clear take. Sound like a person with judgment.";
    default:
      return "Optimize for stop-scroll quality, saving, and repostability without sounding spammy.";
  }
}

function getModeGuideKo(mode: SignalWriterDraftMode) {
  switch (mode) {
    case "news-brief":
      return "짧고 빠르게 핵심을 이해시키는 글로 만드세요.";
    case "insight":
      return "뉴스를 실무 영향으로 번역하는 데 집중하세요.";
    case "opinion":
      return "요약보다 분명한 해석과 판단을 앞세우세요.";
    default:
      return "과장 없이도 저장/공유를 부르는 강한 훅과 관점을 만드세요.";
  }
}
