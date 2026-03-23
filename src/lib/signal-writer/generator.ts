import "server-only";

import { randomUUID } from "node:crypto";

import { hasOpenAiApiFallback, generateOpenAiText } from "@/lib/ai/openai-responses";
import type { AppLocale } from "@/lib/locale";
import type {
  SignalWriterAngle,
  SignalWriterDraft,
  SignalWriterDraftMode,
  SignalWriterHookVariant,
  SignalWriterQualityDimension,
  SignalWriterQualityLevel,
  SignalWriterSignal,
} from "@/lib/types";
import { buildSignalCoverImageUrl, buildSignalVisualStrategy } from "@/lib/signal-writer/visuals";

type DraftPayload = {
  hook: string;
  hookVariants: Array<{ text: string; intent?: string }>;
  angle: SignalWriterAngle;
  shortPost: string;
  threadPosts: string[];
  hashtags: string[];
  whyNow: string;
  postingTips: string[];
};

const DEFAULT_MODE: SignalWriterDraftMode = "viral";

export async function generateSignalWriterDraft(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode = DEFAULT_MODE,
): Promise<SignalWriterDraft> {
  const generatedAt = new Date().toISOString();

  if (hasOpenAiApiFallback()) {
    try {
      const raw = await generateOpenAiText(buildPrompt(signal, locale, mode), {
        model: "gpt-5-mini",
        reasoningEffort: "low",
      });
      const parsed = parseDraftPayload(raw);
      if (parsed) {
        return normalizeDraft(signal, locale, mode, parsed, generatedAt, "openai");
      }
    } catch {
      /* fall back to template */
    }
  }

  return normalizeDraft(
    signal,
    locale,
    mode,
    buildTemplateDraft(signal, locale, mode),
    generatedAt,
    "template",
  );
}

function buildPrompt(signal: SignalWriterSignal, locale: AppLocale, mode: SignalWriterDraftMode) {
  const modeGuide =
    locale === "en"
      ? getModeGuideEn(mode)
      : getModeGuideKo(mode);

  if (locale === "en") {
    return [
      "You write Threads drafts for a solo builder account that wants reach and credibility.",
      "Write crisp English with a clear point of view. Avoid bland summaries, generic praise, and filler hashtags.",
      `Draft mode: ${mode}. ${modeGuide}`,
      "Return strict JSON only with this exact shape:",
      '{"hook":"string","hookVariants":[{"text":"string","intent":"string"}],"angle":{"label":"string","summary":"string","audience":"string"},"shortPost":"string","threadPosts":["string"],"hashtags":["string"],"whyNow":"string","postingTips":["string"]}',
      "",
      `Title: ${signal.title}`,
      `Summary: ${signal.summary}`,
      `Source: ${signal.sourceName}`,
      `Category: ${signal.categoryLabel}`,
      `Why it matters: ${signal.whyItMatters}`,
      `Tags: ${signal.tags.join(", ") || "none"}`,
      "",
      "Rules:",
      "- hookVariants must contain exactly 3 distinct hooks.",
      "- Each hook should use a different intent: timely, contrarian, practical.",
      "- The hook should stop the scroll and avoid sounding like a changelog.",
      "- shortPost should be one publishable Threads post with a concrete point of view.",
      "- threadPosts should contain 4 or 5 posts max.",
      "- whyNow should explain why this deserves posting today, not this week.",
      "- hashtags should be 2 to 4 specific tags only. Never use generic tags like General or Agent.",
      "- postingTips should be 2 or 3 practical tips.",
      "- Do not repeat the exact package or project name in every line.",
    ].join("\n");
  }

  return [
    "당신은 빌더 계정의 Threads 초안을 작성합니다.",
    "목표는 조회수보다 저장/공유를 부르는 글입니다. 밋밋한 뉴스 요약, 과한 과장, 쓸모없는 해시태그는 피하세요.",
    `초안 모드: ${mode}. ${modeGuide}`,
    "반드시 아래 JSON만 반환하세요:",
    '{"hook":"string","hookVariants":[{"text":"string","intent":"string"}],"angle":{"label":"string","summary":"string","audience":"string"},"shortPost":"string","threadPosts":["string"],"hashtags":["string"],"whyNow":"string","postingTips":["string"]}',
    "",
    `제목: ${signal.title}`,
    `요약: ${signal.summary}`,
    `출처: ${signal.sourceName}`,
    `카테고리: ${signal.categoryLabel}`,
    `왜 중요한가: ${signal.whyItMatters}`,
    `태그: ${signal.tags.join(", ") || "없음"}`,
    "",
    "규칙:",
    "- hookVariants는 성격이 다른 훅 3개를 반환하세요.",
    "- 훅 의도는 각각 시의성, 역설/관점, 실무성으로 나누세요.",
    "- hook은 뉴스 제목 낭독이 아니라 스크롤을 멈추게 하는 문장이어야 합니다.",
    "- shortPost는 바로 올릴 수 있는 한 개의 글이어야 합니다.",
    "- threadPosts는 4~5개까지만 작성하세요.",
    "- whyNow는 왜 오늘 올릴 가치가 있는지 설명해야 합니다.",
    "- hashtags는 2~4개, 너무 넓은 태그는 쓰지 마세요.",
    "- postingTips는 2~3개 짧고 실전적으로 작성하세요.",
    "- 패키지명이나 프로젝트명을 모든 줄에 반복하지 마세요.",
  ].join("\n");
}

function parseDraftPayload(raw: string): DraftPayload | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<{
      hook: string;
      hookVariants: Array<{ text?: string; intent?: string }>;
      angle: Partial<SignalWriterAngle>;
      shortPost: string;
      threadPosts: string[];
      hashtags: string[];
      whyNow: string;
      postingTips: string[];
    }>;

    if (
      typeof parsed.hook !== "string" ||
      typeof parsed.shortPost !== "string" ||
      !Array.isArray(parsed.threadPosts)
    ) {
      return null;
    }

    return {
      hook: parsed.hook,
      hookVariants: Array.isArray(parsed.hookVariants)
        ? parsed.hookVariants
            .map((item) => ({
              text: typeof item?.text === "string" ? item.text : "",
              intent: typeof item?.intent === "string" ? item.intent : "",
            }))
            .filter((item) => item.text)
        : [],
      angle: {
        label: typeof parsed.angle?.label === "string" ? parsed.angle.label : "",
        summary: typeof parsed.angle?.summary === "string" ? parsed.angle.summary : "",
        audience: typeof parsed.angle?.audience === "string" ? parsed.angle.audience : "",
      },
      shortPost: parsed.shortPost,
      threadPosts: parsed.threadPosts.filter((item): item is string => typeof item === "string"),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.filter((item): item is string => typeof item === "string")
        : [],
      whyNow: typeof parsed.whyNow === "string" ? parsed.whyNow : "",
      postingTips: Array.isArray(parsed.postingTips)
        ? parsed.postingTips.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function buildTemplateDraft(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
): DraftPayload {
  const angle = buildAngle(signal, locale, mode);
  const takeaway = getTakeaway(signal, locale);
  const hooks = buildHookVariants(signal, locale, mode, takeaway);
  const hook = hooks[0]?.text ?? (locale === "en" ? signal.title : `오늘 볼 만한 건 ${signal.title}`);
  const hashtags = buildHashtags(signal, locale, mode);

  if (locale === "en") {
    const shortPost = [
      hook,
      "",
      `${signal.summary}`,
      "",
      `What matters: ${takeaway}`,
      "",
      `The real angle here is ${angle.summary.toLowerCase()}.`,
    ].join("\n");

    return {
      hook,
      hookVariants: hooks,
      angle,
      shortPost,
      threadPosts: [
        `1/ ${hook}`,
        `2/ ${signal.summary}`,
        `3/ What makes this worth posting today is simple: ${takeaway}`,
        `4/ My read: ${angle.summary}`,
        "5/ Worth bookmarking now, because once this becomes consensus it stops being useful as an early signal.",
      ],
      hashtags,
      whyNow: "It is still early enough to post a useful take, not just repeat what everyone already knows.",
      postingTips: [
        "Lead with the claim, not the package name.",
        "Keep one practical takeaway in the second post.",
        "Use the source link in a reply if you want cleaner reach.",
      ],
    };
  }

  const shortPost = [
    hook,
    "",
    signal.summary,
    "",
    `제가 중요하게 본 포인트는 ${takeaway}`,
    "",
    `이번 글의 각도는 ${angle.summary} 쪽입니다.`,
  ].join("\n");

  return {
    hook,
    hookVariants: hooks,
    angle,
    shortPost,
    threadPosts: [
      `1/ ${hook}`,
      `2/ ${signal.summary}`,
      `3/ 제가 이걸 저장할 만하다고 본 이유는 ${takeaway}`,
      `4/ 제 관점은 ${angle.summary}`,
      "5/ 이런 신호는 며칠 지나면 그냥 뉴스가 되기 쉬워서, 지금 짧게 관점을 남기는 쪽이 낫습니다.",
    ],
    hashtags,
    whyNow: "아직 타이밍이 살아 있어서 단순 번역이 아니라 관점 있는 글로 전환하기 좋습니다.",
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
  payload: DraftPayload,
  generatedAt: string,
  sourceModel: "openai" | "template",
): SignalWriterDraft {
  const hook = payload.hook.trim();
  const whyNow = payload.whyNow.trim();
  const angle = normalizeAngle(payload.angle, signal, locale, mode);
  const hookVariants = normalizeHookVariants(payload.hookVariants, hook, locale);
  const threadPosts = payload.threadPosts.map((item) => item.trim()).filter(Boolean).slice(0, 5);
  const hashtags = buildHashtagsFromPayload(signal, payload.hashtags, locale, mode).slice(0, 4);
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
    mode,
    angle,
    hook,
    hookVariants,
    shortPost: payload.shortPost.trim(),
    threadPosts,
    hashtags,
    whyNow,
    postingTips,
    quality,
    generatedAt,
    sourceModel,
    visualStrategy,
    coverImageUrl: buildSignalCoverImageUrl(visualStrategy, signal),
    markdownPath: null,
    jsonPath: null,
  };
}

function normalizeAngle(
  angle: SignalWriterAngle,
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
): SignalWriterAngle {
  if (angle.label && angle.summary && angle.audience) {
    return {
      label: angle.label.trim(),
      summary: angle.summary.trim(),
      audience: angle.audience.trim(),
    };
  }

  return buildAngle(signal, locale, mode);
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

  if (normalized.length >= 3) {
    return normalized;
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
      `The practical shift here is not the name, but what it changes for builders.`,
    ];
  }

  return [
    `오늘 그냥 넘기기 아까웠던 건 이 포인트였습니다.`,
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

function buildHashtags(
  signal: SignalWriterSignal,
  locale: AppLocale,
  mode: SignalWriterDraftMode,
) {
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

function buildAngle(signal: SignalWriterSignal, locale: AppLocale, mode: SignalWriterDraftMode): SignalWriterAngle {
  if (locale === "en") {
    switch (mode) {
      case "news-brief":
        return {
          label: "Fast brief",
          summary: "A clean read on what changed and why it deserves attention today.",
          audience: "Builders tracking the market without reading the full article.",
        };
      case "insight":
        return {
          label: "Practical shift",
          summary: "Translate the news into what changes for builders, operators, or teams.",
          audience: "People who care more about workflow impact than headlines.",
        };
      case "opinion":
        return {
          label: "Point of view",
          summary: "Turn the signal into a clear stance instead of repeating the article.",
          audience: "Followers who come for interpretation, not just summaries.",
        };
      default:
        return {
          label: "Shareable angle",
          summary: "Focus on the line that feels timely, bookmarkable, and discussion-worthy.",
          audience: "Threads readers who react to sharp takes more than neutral updates.",
        };
    }
  }

  switch (mode) {
    case "news-brief":
      return {
        label: "빠른 브리프",
        summary: "무슨 변화가 있었는지와 왜 봐야 하는지를 빠르게 전달하는 각도입니다.",
        audience: "기사 원문을 다 읽지 않고 흐름만 빠르게 잡고 싶은 사람",
      };
    case "insight":
      return {
        label: "실무 인사이트",
        summary: "뉴스를 실무 변화로 번역해서 보여주는 각도입니다.",
        audience: "빌더, PM, 운영 관점에서 의미를 보고 싶은 사람",
      };
    case "opinion":
      return {
        label: "관점형",
        summary: "기사 요약보다 내 해석과 판단을 앞세우는 각도입니다.",
        audience: "그냥 뉴스보다 해석과 의견을 기대하는 팔로워",
      };
    default:
      return {
        label: "바이럴형",
        summary: "지금 저장하거나 공유하고 싶게 만드는 포인트를 앞세우는 각도입니다.",
        audience: "짧고 강한 관점에 반응하는 Threads 독자",
      };
  }
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
        `What matters here is not the launch itself, but the workflow shift behind it.`,
        `This looks niche at first glance, but it points to a broader tool pattern.`,
      ],
      opinion: [
        `My take: ${signal.title} matters less as news and more as a direction signal.`,
        `I would not file this under “just another release.” The practical change is the real story.`,
        `The headline is fine. The second-order effect is the part worth paying attention to.`,
      ],
      viral: [
        `Today’s “don’t just scroll past this” signal: ${signal.title}.`,
        `This is one of those updates that looks small until you think about what it enables.`,
        `If this pattern keeps spreading, people will point back to signals like this one.`,
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
      `제목보다 중요한 건, 이 업데이트가 어디로 이어질 수 있느냐입니다.`,
      "하루 지나면 묻히기 쉬운 타입이라 지금 짧게 짚어둘 가치가 있습니다.",
    ],
    insight: [
      `오늘 본 것 중 실무 감도가 높았던 건 ${signal.title}였습니다.`,
      `이걸 뉴스로만 보면 약하고, 작업 흐름 변화로 보면 훨씬 의미가 커집니다.`,
      `핵심은 기능 설명이 아니라 ${takeaway}`,
    ],
    opinion: [
      `제 관점에선 이건 단순한 업데이트보다 방향 신호에 가깝습니다.`,
      `이런 건 기사보다 해석을 먼저 붙여야 가치가 생깁니다.`,
      `제목만 보면 평범하지만, 실제로는 다음 흐름을 꽤 잘 보여줍니다.`,
    ],
    viral: [
      `오늘 그냥 넘기기 아까웠던 건 ${signal.title}였습니다.`,
      `이건 이름보다 “어디까지 번질 수 있나”를 봐야 하는 업데이트입니다.`,
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
  const level: SignalWriterQualityLevel =
    total >= 80 ? "strong" : total >= 60 ? "solid" : "rough";

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

function getTakeaway(signal: SignalWriterSignal, locale: AppLocale) {
  const preferred = firstSentence(signal.whyItMatters) || firstSentence(signal.summary) || signal.title;
  if (locale === "en") {
    return preferred;
  }
  return preferred;
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
