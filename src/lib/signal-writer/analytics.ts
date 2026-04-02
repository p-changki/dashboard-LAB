import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { AppLocale } from "@/lib/locale";
import { getRuntimeConfig } from "@/lib/runtime/config";
import type {
  SignalWriterAiRunner,
  SignalWriterDraft,
  SignalWriterDraftMode,
  SignalWriterPerformanceEntry,
  SignalWriterPerformanceSummary,
  SignalWriterSignal,
  SignalWriterTargetChannel,
  SignalWriterTimingRecommendation,
  SignalWriterTimingWindow,
  SignalWriterTimingWindowId,
} from "@/lib/types";

interface PersistedSignalWriterArtifact {
  signal: SignalWriterSignal;
  draft: SignalWriterDraft;
  performanceEntries: SignalWriterPerformanceEntry[];
}

interface SignalWriterPerformanceSample {
  categoryId: string;
  sourceName: string;
  tags: string[];
  channel: SignalWriterTargetChannel;
  mode: SignalWriterDraftMode;
  runner: Exclude<SignalWriterAiRunner, "auto">;
  hookStyle: string;
  windowId: SignalWriterTimingWindowId;
  views: number;
  replies: number;
  saves: number;
  engagementScore: number;
}

interface SignalWriterPerformanceInsights {
  samples: SignalWriterPerformanceSample[];
  byChannelWindow: Map<string, number>;
}

export interface SignalWriterRecentExposureInsights {
  signalIds: Map<string, number>;
  links: Map<string, number>;
  titles: Map<string, number>;
}

const PERFORMANCE_LOOKBACK_DAYS = 45;
const RECENT_EXPOSURE_LOOKBACK_DAYS = 7;

export function loadSignalWriterPerformanceInsights(): SignalWriterPerformanceInsights {
  const samples = listSignalWriterArtifacts(PERFORMANCE_LOOKBACK_DAYS).flatMap((artifact) =>
    artifact.performanceEntries.map((entry) => toPerformanceSample(artifact, entry)),
  );

  const byChannelWindow = new Map<string, number>();
  for (const sample of samples) {
    const key = `${sample.channel}:${sample.windowId}`;
    byChannelWindow.set(key, (byChannelWindow.get(key) ?? 0) + sample.engagementScore);
  }

  return {
    samples,
    byChannelWindow,
  };
}

export function loadSignalWriterRecentExposureInsights(
  lookbackDays: number = RECENT_EXPOSURE_LOOKBACK_DAYS,
): SignalWriterRecentExposureInsights {
  const artifacts = listSignalWriterArtifacts(lookbackDays);

  const signalIds = new Map<string, number>();
  const links = new Map<string, number>();
  const titles = new Map<string, number>();

  for (const artifact of artifacts) {
    incrementCount(signalIds, artifact.signal.id);
    incrementCount(links, artifact.signal.link);
    incrementCount(titles, normalizeText(artifact.signal.title));
  }

  return {
    signalIds,
    links,
    titles,
  };
}

export function getSignalWriterRecentExposurePenalty(
  signal: SignalWriterSignal,
  insights: SignalWriterRecentExposureInsights,
) {
  const signalIdHits = insights.signalIds.get(signal.id) ?? 0;
  const linkHits = insights.links.get(signal.link) ?? 0;
  const titleHits = insights.titles.get(normalizeText(signal.title)) ?? 0;

  const penalty = Math.min(
    24,
    signalIdHits * 8 + linkHits * 7 + titleHits * 5,
  );

  return Number(penalty.toFixed(2));
}

export function applySignalWriterPerformanceSummary(
  signal: SignalWriterSignal,
  insights: SignalWriterPerformanceInsights,
  locale: AppLocale,
): SignalWriterSignal {
  const matched = insights.samples.filter((sample) => isRelatedSample(sample, signal));
  if (matched.length === 0) {
    return signal;
  }

  const totalEngagement = matched.reduce((sum, sample) => sum + sample.engagementScore, 0);
  const averageEngagement = totalEngagement / matched.length;
  const scoreBoost = Number(Math.min(18, Math.log10(averageEngagement + 1) * 5.5).toFixed(2));

  const preferredChannel = pickTopKey(matched.map((sample) => sample.channel));
  const channelMatched = preferredChannel
    ? matched.filter((sample) => sample.channel === preferredChannel)
    : matched;
  const preferredMode = pickTopKey(channelMatched.map((sample) => sample.mode));
  const preferredRunner = pickTopKey(channelMatched.map((sample) => sample.runner));
  const preferredHookStyle = formatHookStyleLabel(
    locale,
    pickTopKey(channelMatched.map((sample) => sample.hookStyle)),
  );
  const bestWindowId = pickTopKey(channelMatched.map((sample) => sample.windowId));

  const performanceSummary: SignalWriterPerformanceSummary = {
    matchedEntries: matched.length,
    scoreBoost,
    averageViews: averageMetric(matched, "views"),
    averageReplies: averageMetric(matched, "replies"),
    averageSaves: averageMetric(matched, "saves"),
    preferredChannel: preferredChannel ?? undefined,
    preferredMode: preferredMode ?? undefined,
    preferredRunner: preferredRunner ?? undefined,
    preferredHookStyle,
    bestWindowId: bestWindowId ?? undefined,
    bestWindowLabel: bestWindowId ? buildTimingWindow(bestWindowId, locale).label : undefined,
  };

  return {
    ...signal,
    score: Number((signal.score + scoreBoost).toFixed(2)),
    performanceSummary,
  };
}

export function buildSignalWriterTimingRecommendation(
  signal: SignalWriterSignal,
  channel: SignalWriterTargetChannel,
  locale: AppLocale,
  insights: SignalWriterPerformanceInsights,
): SignalWriterTimingRecommendation {
  const matched = insights.samples.filter(
    (sample) => sample.channel === channel && isRelatedSample(sample, signal),
  );
  const bestMatchedWindow = pickBestWindow(matched);

  if (bestMatchedWindow) {
    const secondaryWindow = pickBestWindow(
      matched.filter((sample) => sample.windowId !== bestMatchedWindow),
    );
    const primary = buildTimingWindow(bestMatchedWindow, locale);

    return {
      basis: "history",
      primaryWindow: primary,
      secondaryWindow: secondaryWindow ? buildTimingWindow(secondaryWindow, locale) : undefined,
      reason:
        locale === "en"
          ? `Recent posts like this performed best around ${primary.label.toLowerCase()} on ${formatChannelName(channel)}.`
          : `최근 비슷한 글 기록 기준으로 ${formatChannelName(channel, locale)}에서는 ${primary.label}대 반응이 가장 좋았습니다.`,
    };
  }

  const bestChannelWindow = pickBestWindowByChannel(channel, insights);
  if (bestChannelWindow) {
    const primary = buildTimingWindow(bestChannelWindow, locale);
    const secondary = buildTimingWindow(getFallbackWindow(channel), locale);

    return {
      basis: "history",
      primaryWindow: primary,
      secondaryWindow: primary.id === secondary.id ? undefined : secondary,
      reason:
        locale === "en"
          ? `Your recent ${formatChannelName(channel)} logs were strongest around ${primary.label.toLowerCase()}.`
          : `최근 ${formatChannelName(channel, locale)} 기록 전체 기준으로는 ${primary.label}대가 가장 안정적이었습니다.`,
    };
  }

  const primaryWindow = buildTimingWindow(getFallbackWindow(channel), locale);
  const secondaryWindow = buildTimingWindow(getSecondaryFallbackWindow(channel), locale);

  return {
    basis: "default",
    primaryWindow,
    secondaryWindow,
    reason:
      locale === "en"
        ? `Default recommendation for ${formatChannelName(channel)}: post when readers are likely checking updates without rushing.`
        : `${formatChannelName(channel, locale)} 기본 기준으로는 독자가 비교적 여유 있게 피드를 보는 시간대를 우선 추천합니다.`,
  };
}

function listSignalWriterArtifacts(lookbackDays: number): PersistedSignalWriterArtifact[] {
  const root = path.join(getRuntimeConfig().paths.dataDir, "signal-writer");
  if (!existsSync(root)) {
    return [];
  }

  const cutoffTimestamp = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dayDir = path.join(root, entry.name);
      const dayTimestamp = Date.parse(entry.name);
      if (!Number.isNaN(dayTimestamp) && dayTimestamp < cutoffTimestamp) {
        return [];
      }

      return readdirSync(dayDir, { withFileTypes: true })
        .filter((file) => file.isFile() && file.name.endsWith(".json"))
        .flatMap((file) => {
          try {
            const raw = readFileSync(path.join(dayDir, file.name), "utf8");
            const parsed = JSON.parse(raw) as Partial<PersistedSignalWriterArtifact>;
            if (!parsed.signal || !parsed.draft) {
              return [];
            }

            return [
              {
                signal: parsed.signal,
                draft: parsed.draft,
                performanceEntries: Array.isArray(parsed.performanceEntries)
                  ? parsed.performanceEntries
                  : [],
              },
            ];
          } catch {
            return [];
          }
        });
    });
}

function toPerformanceSample(
  artifact: PersistedSignalWriterArtifact,
  entry: SignalWriterPerformanceEntry,
): SignalWriterPerformanceSample {
  const timingSource = entry.postedAt || entry.capturedAt;

  return {
    categoryId: artifact.signal.categoryId,
    sourceName: artifact.signal.sourceName,
    tags: artifact.signal.tags,
    channel: entry.channel,
    mode: artifact.draft.mode,
    runner: artifact.draft.sourceModel,
    hookStyle: inferHookStyle(artifact.draft, entry.hook),
    windowId: getWindowId(timingSource),
    views: entry.views,
    replies: entry.replies,
    saves: entry.saves,
    engagementScore: scorePerformanceEntry(entry),
  };
}

function scorePerformanceEntry(entry: SignalWriterPerformanceEntry) {
  const reachScore = Math.log10(entry.views + 1) * 9;
  return reachScore + entry.likes * 0.4 + entry.replies * 3 + entry.reposts * 2.2 + entry.saves * 3.2;
}

function averageMetric(
  samples: SignalWriterPerformanceSample[],
  field: "views" | "replies" | "saves",
) {
  return Math.round(samples.reduce((sum, sample) => sum + sample[field], 0) / samples.length);
}

function pickTopKey<T extends string>(values: T[]) {
  if (values.length === 0) {
    return null;
  }

  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let topValue: T | null = null;
  let topCount = -1;
  for (const [value, count] of counts) {
    if (count > topCount) {
      topValue = value;
      topCount = count;
    }
  }

  return topValue;
}

function incrementCount(map: Map<string, number>, value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return;
  }

  map.set(normalizedValue, (map.get(normalizedValue) ?? 0) + 1);
}

function pickBestWindow(samples: SignalWriterPerformanceSample[]) {
  if (samples.length === 0) {
    return null;
  }

  const scores = new Map<SignalWriterTimingWindowId, number>();
  for (const sample of samples) {
    scores.set(sample.windowId, (scores.get(sample.windowId) ?? 0) + sample.engagementScore);
  }

  return [...scores.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function pickBestWindowByChannel(
  channel: SignalWriterTargetChannel,
  insights: SignalWriterPerformanceInsights,
) {
  const channelEntries = [...insights.byChannelWindow.entries()]
    .filter(([key]) => key.startsWith(`${channel}:`))
    .map(([key, score]) => [key.split(":")[1] as SignalWriterTimingWindowId, score] as const)
    .sort((left, right) => right[1] - left[1]);

  return channelEntries[0]?.[0] ?? null;
}

function isRelatedSample(sample: SignalWriterPerformanceSample, signal: SignalWriterSignal) {
  if (sample.categoryId === signal.categoryId) {
    return true;
  }

  if (normalizeText(sample.sourceName) === normalizeText(signal.sourceName)) {
    return true;
  }

  const signalTags = new Set(signal.tags.map(normalizeText));
  return sample.tags.some((tag) => signalTags.has(normalizeText(tag)));
}

function inferHookStyle(draft: SignalWriterDraft, hook: string) {
  const matchedIndex = draft.hookVariants.findIndex(
    (item) => normalizeText(item.text) === normalizeText(hook),
  );
  const fallbackIndex = normalizeText(draft.hook) === normalizeText(hook) ? 0 : matchedIndex;
  switch (fallbackIndex) {
    case 1:
      return "contrarian";
    case 2:
      return "practical";
    default:
      return "timely";
  }
}

function formatHookStyleLabel(locale: AppLocale, hookStyle: string | null) {
  if (!hookStyle) {
    return undefined;
  }

  const labels =
    locale === "en"
      ? {
          timely: "timely hooks",
          contrarian: "contrarian takes",
          practical: "practical hooks",
        }
      : {
          timely: "시의성 훅",
          contrarian: "관점형 훅",
          practical: "실무형 훅",
        };

  return labels[hookStyle as keyof typeof labels] ?? hookStyle;
}

function getWindowId(value: string): SignalWriterTimingWindowId {
  const hour = new Date(value).getHours();

  if (hour >= 7 && hour < 11) {
    return "morning";
  }
  if (hour >= 11 && hour < 14) {
    return "lunch";
  }
  if (hour >= 14 && hour < 18) {
    return "afternoon";
  }
  if (hour >= 18 && hour < 22) {
    return "evening";
  }
  return "night";
}

function buildTimingWindow(id: SignalWriterTimingWindowId, locale: AppLocale): SignalWriterTimingWindow {
  const labels =
    locale === "en"
      ? {
          morning: {
            label: "Morning (07:00-11:00)",
            description: "Good for commute scrolls and first-work-block checking.",
          },
          lunch: {
            label: "Lunch (11:00-14:00)",
            description: "Good when people skim updates with slightly more attention.",
          },
          afternoon: {
            label: "Afternoon (14:00-18:00)",
            description: "Good for practical posts people save before ending the workday.",
          },
          evening: {
            label: "Evening (18:00-22:00)",
            description: "Good for broader reach when people have time to reply and share.",
          },
          night: {
            label: "Night (22:00-01:00)",
            description: "Good for sharp takes, but usually weaker for practical save-worthy posts.",
          },
        }
      : {
          morning: {
            label: "오전 (07:00-11:00)",
            description: "출근 전후나 첫 업무 블록에서 빠르게 훑어볼 때 맞는 시간대입니다.",
          },
          lunch: {
            label: "점심 (11:00-14:00)",
            description: "피드를 조금 더 여유 있게 읽는 시간대라 저장형 글에 유리합니다.",
          },
          afternoon: {
            label: "오후 (14:00-18:00)",
            description: "실무형 포인트를 저장하거나 공유하기 좋은 업무 시간대입니다.",
          },
          evening: {
            label: "저녁 (18:00-22:00)",
            description: "조회수와 답글을 함께 노릴 때 가장 무난한 시간대입니다.",
          },
          night: {
            label: "밤 (22:00-01:00)",
            description: "강한 훅에는 맞지만 실무형 저장 글은 상대적으로 덜 안정적입니다.",
          },
        };

  return {
    id,
    ...labels[id],
  };
}

function getFallbackWindow(channel: SignalWriterTargetChannel): SignalWriterTimingWindowId {
  switch (channel) {
    case "x":
      return "morning";
    case "linkedin":
      return "afternoon";
    default:
      return "evening";
  }
}

function getSecondaryFallbackWindow(channel: SignalWriterTargetChannel): SignalWriterTimingWindowId {
  switch (channel) {
    case "x":
      return "evening";
    case "linkedin":
      return "morning";
    default:
      return "lunch";
  }
}

function formatChannelName(channel: SignalWriterTargetChannel, locale: AppLocale = "en") {
  if (channel === "x") {
    return locale === "en" ? "X" : "X";
  }
  if (channel === "linkedin") {
    return "LinkedIn";
  }
  return "Threads";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}
