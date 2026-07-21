// Draft normalization, fallback construction, and quality scoring. All pure —
// they take a signal/draft and return derived values, with no runner or I/O.
import type { AppLocale } from "@/lib/locale";
import type {
  SignalWriterAngle,
  SignalWriterDraftMode,
  SignalWriterHookVariant,
  SignalWriterQualityDimension,
  SignalWriterQualityLevel,
  SignalWriterSignal,
  SignalWriterTargetChannel,
} from "@/lib/types/signal-writer";

export function normalizeAngle(
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

export function normalizeHookVariants(
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

export function buildFallbackHookTexts(hook: string, locale: AppLocale) {
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

export function buildHashtagsFromPayload(
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

export function buildHashtags(signal: SignalWriterSignal, locale: AppLocale, mode: SignalWriterDraftMode) {
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

export function buildAngle(
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

export function getAudienceEn(
  channel: SignalWriterTargetChannel,
  labels: Record<SignalWriterTargetChannel, string>,
) {
  return labels[channel];
}

export function getAudienceKo(
  channel: SignalWriterTargetChannel,
  labels: Record<SignalWriterTargetChannel, string>,
) {
  return labels[channel];
}

export function buildHookVariants(
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

export function scoreDraft(
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

export function buildHookDimension(
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

export function buildSpecificityDimension(
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

export function buildPointOfViewDimension(
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

export function buildShareabilityDimension(
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

export function getTakeaway(signal: SignalWriterSignal) {
  return firstSentence(signal.whyItMatters) || firstSentence(signal.summary) || signal.title;
}

export function normalizeHashtags(values: string[]) {
  return [...new Set(values.map((item) => item.replace(/^#+/, "").trim()).filter(Boolean))];
}

export function isGenericHashtag(value: string) {
  return ["general", "agent", "agents", "npm", "thread", "threads", "generalnmpicks"].includes(
    value.toLowerCase().replace(/[^a-z0-9가-힣]/g, ""),
  );
}

export function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);
}

export function firstSentence(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .find(Boolean) ?? "";
}

export function equalsIgnoringCase(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function hasCueWord(value: string, locale: AppLocale, english: string[], korean: string[]) {
  const source = value.toLowerCase();
  const words = locale === "en" ? english : korean;
  return words.some((word) => source.includes(word.toLowerCase()));
}

export function getFallbackHookIntent(index: number, locale: AppLocale) {
  if (locale === "en") {
    return ["Timely", "Contrarian", "Practical"][index] ?? "Angle";
  }
  return ["시의성", "관점", "실무성"][index] ?? "각도";
}

export function getModeGuideEn(mode: SignalWriterDraftMode) {
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

export function getModeGuideKo(mode: SignalWriterDraftMode) {
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
