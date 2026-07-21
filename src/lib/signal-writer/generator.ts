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
  buildAngle,
  buildHashtags,
  buildHashtagsFromPayload,
  buildHookVariants,
  getModeGuideEn,
  getModeGuideKo,
  getTakeaway,
  normalizeAngle,
  normalizeHookVariants,
  scoreDraft,
} from "@/lib/signal-writer/generator/draft-normalize";

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

