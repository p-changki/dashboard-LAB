import type { AppLocale } from "@/lib/locale";
import type {
  SignalWriterAiRunner,
  SignalWriterDraftMode,
  SignalWriterSignal,
  SignalWriterTargetChannel,
} from "@/lib/types";

export type SignalWriterRunnerAvailability = Record<SignalWriterAiRunner, boolean>;

export interface SignalWriterRecommendation {
  mode: SignalWriterDraftMode;
  runner: SignalWriterAiRunner;
  reason: string;
  criteria: string[];
}

export function getDefaultSignalWriterRunnerAvailability(): SignalWriterRunnerAvailability {
  return {
    auto: true,
    claude: false,
    codex: false,
    gemini: false,
    openai: false,
    template: true,
  };
}

export function recommendSignalWriterSetup(
  signal: SignalWriterSignal,
  locale: AppLocale,
  availability: SignalWriterRunnerAvailability,
  channel: SignalWriterTargetChannel,
): SignalWriterRecommendation {
  const haystack = [
    signal.title,
    signal.summary,
    signal.whyItMatters,
    signal.categoryLabel,
    signal.sourceName,
    signal.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const isSecurity = hasOneOf(haystack, [
    "security",
    "breach",
    "vulnerability",
    "cve",
    "policy",
    "compliance",
    "보안",
    "취약점",
    "정책",
  ]);
  const isOpinionHeavy = hasOneOf(haystack, [
    "opinion",
    "debate",
    "why",
    "future",
    "controvers",
    "take",
    "관점",
    "왜",
    "미래",
    "논쟁",
  ]);
  const isReleaseLike = hasOneOf(haystack, [
    "launch",
    "release",
    "update",
    "preview",
    "beta",
    "announc",
    "shipped",
    "introduc",
    "출시",
    "업데이트",
    "공개",
    "베타",
  ]);
  const isPracticalTool = hasOneOf(haystack, [
    "cli",
    "sdk",
    "tool",
    "agent",
    "api",
    "workflow",
    "automation",
    "npm",
    "open source",
    "개발",
    "도구",
    "워크플로",
    "자동화",
  ]);

  const mode = pickMode({
    channel,
    isOpinionHeavy,
    isSecurity,
    isReleaseLike,
    isPracticalTool,
    score: signal.score,
    signal,
  });
  const runner = pickRunner(mode, availability, channel, signal);

  return {
    mode,
    runner,
    reason: buildReason(locale, mode, runner, channel),
    criteria: buildCriteria(locale, {
      channel,
      isOpinionHeavy,
      isSecurity,
      isReleaseLike,
      isPracticalTool,
      signal,
      runner,
    }),
  };
}

function pickMode(input: {
  channel: SignalWriterTargetChannel;
  isOpinionHeavy: boolean;
  isSecurity: boolean;
  isReleaseLike: boolean;
  isPracticalTool: boolean;
  score: number;
  signal: SignalWriterSignal;
}): SignalWriterDraftMode {
  const historySummary = input.signal.performanceSummary;
  const historyMode =
    historySummary &&
    historySummary.matchedEntries >= 2 &&
    historySummary.preferredChannel === input.channel
      ? historySummary.preferredMode
      : undefined;

  if (historyMode) {
    return historyMode;
  }

  if (input.channel === "linkedin") {
    if (input.isOpinionHeavy) {
      return "opinion";
    }

    if (input.isSecurity || input.isPracticalTool || input.isReleaseLike) {
      return "insight";
    }

    return "insight";
  }

  if (input.isOpinionHeavy) {
    return "opinion";
  }

  if (input.isSecurity) {
    return "insight";
  }

  if (input.isPracticalTool && input.score >= 75) {
    return "viral";
  }

  if (input.isReleaseLike) {
    return "news-brief";
  }

  if (input.isPracticalTool) {
    return "insight";
  }

  return "viral";
}

function pickRunner(
  mode: SignalWriterDraftMode,
  availability: SignalWriterRunnerAvailability,
  channel: SignalWriterTargetChannel,
  signal: SignalWriterSignal,
): SignalWriterAiRunner {
  const prioritiesByChannel: Record<
    SignalWriterTargetChannel,
    Record<SignalWriterDraftMode, SignalWriterAiRunner[]>
  > = {
    threads: {
      "news-brief": ["gemini", "claude", "codex", "openai", "template"],
      insight: ["codex", "claude", "gemini", "openai", "template"],
      opinion: ["claude", "gemini", "codex", "openai", "template"],
      viral: ["claude", "gemini", "codex", "openai", "template"],
    },
    x: {
      "news-brief": ["gemini", "claude", "codex", "openai", "template"],
      insight: ["codex", "claude", "gemini", "openai", "template"],
      opinion: ["claude", "codex", "gemini", "openai", "template"],
      viral: ["claude", "codex", "gemini", "openai", "template"],
    },
    linkedin: {
      "news-brief": ["codex", "claude", "openai", "gemini", "template"],
      insight: ["codex", "claude", "openai", "gemini", "template"],
      opinion: ["claude", "codex", "openai", "gemini", "template"],
      viral: ["claude", "codex", "gemini", "openai", "template"],
    },
  };

  const historySummary = signal.performanceSummary;
  const preferredRunner =
    historySummary &&
    historySummary.matchedEntries >= 2 &&
    historySummary.preferredChannel === channel
      ? historySummary.preferredRunner
      : undefined;

  const runnerPriority = preferredRunner
    ? [preferredRunner, ...prioritiesByChannel[channel][mode].filter((runner) => runner !== preferredRunner)]
    : prioritiesByChannel[channel][mode];

  return runnerPriority.find((runner) => availability[runner]) ?? "template";
}

function buildReason(
  locale: AppLocale,
  mode: SignalWriterDraftMode,
  runner: SignalWriterAiRunner,
  channel: SignalWriterTargetChannel,
) {
  if (locale === "en") {
    if (runner === "template") {
      return `No AI runner is ready right now, so use the recommended ${formatChannelLabel(locale, channel)} setup as a structure guide first.`;
    }

    const modeLabel = {
      "news-brief": "news brief",
      insight: "insight",
      opinion: "opinion",
      viral: "viral",
    }[mode];

    return `Recommended: ${modeLabel} mode with ${runner} for the cleanest ${formatChannelLabel(locale, channel)} first draft on this signal.`;
  }

  if (runner === "template") {
    return `지금 바로 쓸 수 있는 AI 러너가 없어서, ${formatChannelLabel(locale, channel)} 기준 추천 모드로 템플릿 초안을 먼저 잡는 쪽이 맞습니다.`;
  }

  const modeLabel = {
    "news-brief": "뉴스 요약형",
    insight: "인사이트형",
    opinion: "의견형",
    viral: "바이럴형",
  }[mode];

  return `추천: ${formatChannelLabel(locale, channel)}에서 ${modeLabel} + ${formatRunnerLabel(locale, runner)} 조합이 이 시그널의 첫 초안에 가장 잘 맞습니다.`;
}

function buildCriteria(
  locale: AppLocale,
  input: {
    channel: SignalWriterTargetChannel;
    isOpinionHeavy: boolean;
    isSecurity: boolean;
    isReleaseLike: boolean;
    isPracticalTool: boolean;
    signal: SignalWriterSignal;
    runner: SignalWriterAiRunner;
  },
) {
  const criteria: string[] = [];

  if (input.channel === "x") {
    criteria.push(
      locale === "en"
        ? "X usually rewards a tighter hook and a clearer stance than a soft summary."
        : "X는 부드러운 요약보다 짧고 날카로운 훅, 선명한 관점이 더 잘 맞습니다.",
    );
  }

  if (input.channel === "linkedin") {
    criteria.push(
      locale === "en"
        ? "LinkedIn usually performs better when the story is translated into practical workflow or business impact."
        : "LinkedIn은 기사 소개보다 실무 변화나 업무 영향으로 번역했을 때 더 잘 읽힙니다.",
    );
  }

  if (input.channel === "threads") {
    criteria.push(
      locale === "en"
        ? "Threads usually performs better when the draft feels conversational, bookmarkable, and easy to skim."
        : "Threads는 대화체 흐름과 저장해둘 만한 포인트가 있을 때 반응이 더 잘 붙습니다.",
    );
  }

  if (input.isOpinionHeavy) {
    criteria.push(
      locale === "en"
        ? "The signal already invites a take, so a point-of-view post will feel stronger than a summary."
        : "이 신호는 해석이 붙을수록 힘이 생겨서, 단순 요약보다 관점형 글이 더 잘 맞습니다.",
    );
  }

  if (input.isSecurity) {
    criteria.push(
      locale === "en"
        ? "Security and policy stories usually perform better when translated into operational impact."
        : "보안·정책 이슈는 헤드라인보다 실무 영향으로 번역했을 때 반응이 더 좋습니다.",
    );
  }

  if (input.isReleaseLike) {
    criteria.push(
      locale === "en"
        ? "It reads like a fresh release/update, so speed and clarity matter more than long commentary."
        : "지금 막 나온 릴리즈/업데이트 성격이 강해서, 길게 말하기보다 빠르고 선명하게 정리하는 편이 좋습니다.",
    );
  }

  if (input.isPracticalTool) {
    criteria.push(
      locale === "en"
        ? "Builder-facing tools tend to travel further when you frame them as workflow change, not product news."
        : "빌더용 툴은 제품 소개보다 워크플로 변화로 풀었을 때 저장/공유가 더 잘 일어납니다.",
    );
  }

  if (input.signal.performanceSummary?.matchedEntries) {
    const summary = input.signal.performanceSummary;
    criteria.push(
      locale === "en"
        ? `Recent similar posts logged ${summary.matchedEntries} times, averaging ${summary.averageViews} views / ${summary.averageReplies} replies / ${summary.averageSaves} saves.`
        : `최근 비슷한 글 기록 ${summary.matchedEntries}건 기준으로 평균 ${summary.averageViews} 조회 / ${summary.averageReplies} 답글 / ${summary.averageSaves} 저장이 나왔습니다.`,
    );

    if (summary.preferredHookStyle) {
      criteria.push(
        locale === "en"
          ? `The strongest historical pattern here was ${summary.preferredHookStyle}.`
          : `최근에는 ${summary.preferredHookStyle} 쪽이 가장 안정적으로 반응했습니다.`,
      );
    }

    if (summary.bestWindowLabel) {
      criteria.push(
        locale === "en"
          ? `Similar posts also showed the best momentum around ${summary.bestWindowLabel.toLowerCase()}.`
          : `비슷한 글은 ${summary.bestWindowLabel}대 반응이 가장 안정적이었습니다.`,
      );
    }
  }

  criteria.push(
    locale === "en"
      ? `Signal score ${Math.round(input.signal.score)} suggests this is worth a sharper post, not just a headline relay.`
      : `시그널 점수 ${Math.round(input.signal.score)}점 수준이면 단순 전달보다 한 단계 더 날카로운 글이 어울립니다.`,
  );

  criteria.push(
    locale === "en"
      ? `Best available runner now: ${formatRunnerLabel(locale, input.runner)}.`
      : `현재 사용 가능한 최적 러너: ${formatRunnerLabel(locale, input.runner)}.`,
  );

  return criteria.slice(0, 5);
}

function formatChannelLabel(locale: AppLocale, channel: SignalWriterTargetChannel) {
  const labels = {
    ko: {
      threads: "Threads",
      x: "X",
      linkedin: "LinkedIn",
    },
    en: {
      threads: "Threads",
      x: "X",
      linkedin: "LinkedIn",
    },
  };

  return labels[locale][channel];
}

function formatRunnerLabel(locale: AppLocale, runner: SignalWriterAiRunner) {
  const labels = {
    ko: {
      auto: "자동 선택",
      claude: "Claude",
      codex: "Codex",
      gemini: "Gemini",
      openai: "OpenAI",
      template: "템플릿",
    },
    en: {
      auto: "Auto",
      claude: "Claude",
      codex: "Codex",
      gemini: "Gemini",
      openai: "OpenAI",
      template: "Template",
    },
  };

  return labels[locale][runner];
}

function hasOneOf(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}
