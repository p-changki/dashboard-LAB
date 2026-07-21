// Draft assembly: parses the model's JSON payload, builds the template-based
// fallback draft, and normalizes both into the final draft shape. All pure —
// no runner invocation or I/O.
import { randomUUID } from "node:crypto";

import {
  containsCliTranscriptLeakInStrings,
  isRecord,
  parseLastJsonObject,
} from "@/lib/ai/structured-output";
import { buildSignalCoverImageUrl, buildSignalVisualStrategy } from "@/lib/signal-writer/visuals";
import type { AppLocale } from "@/lib/locale";
import type {
  SignalWriterAiRunner,
  SignalWriterAngle,
  SignalWriterDraft,
  SignalWriterDraftMode,
  SignalWriterResearchContext,
  SignalWriterSignal,
  SignalWriterSourceContext,
  SignalWriterTargetChannel,
  SignalWriterTimingRecommendation,
} from "@/lib/types/signal-writer";
import {
  buildAngle,
  buildHashtags,
  buildHashtagsFromPayload,
  buildHookVariants,
  getTakeaway,
  normalizeAngle,
  normalizeHookVariants,
  scoreDraft,
} from "@/lib/signal-writer/generator/draft-normalize";

export type DraftPayload = {
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

export function parseDraftPayload(raw: string): DraftPayload | null {
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

export function buildTemplateDraft(
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

export function normalizeDraft(
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

export function normalizeReplyAssets(
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

export function buildReplyAssets(
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

export function buildFallbackTimingRecommendation(
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

