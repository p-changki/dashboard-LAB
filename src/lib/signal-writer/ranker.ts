import "server-only";

import { getInfoHubFeed } from "@/lib/info-hub/feed-service";
import type { AppLocale } from "@/lib/locale";
import {
  applySignalWriterPerformanceSummary,
  getSignalWriterRecentExposurePenalty,
  loadSignalWriterPerformanceInsights,
  loadSignalWriterRecentExposureInsights,
} from "@/lib/signal-writer/analytics";
import { toSignalWriterSignal } from "@/lib/signal-writer/signals";
import type { FeedItem, SignalWriterSignalsResponse } from "@/lib/types";

const SIGNAL_LIMIT = 5;

export async function getSignalWriterSignals(
  locale: AppLocale,
  options?: { forceRefresh?: boolean },
): Promise<SignalWriterSignalsResponse> {
  const feed = await getInfoHubFeed("all", 1, 60, "", {
    forceRefresh: options?.forceRefresh,
  });
  const ranked = rankSignals(feed.items, locale).slice(0, SIGNAL_LIMIT);

  return {
    items: ranked,
    generatedAt: new Date().toISOString(),
    nextRefreshAt: feed.nextRefreshAt,
  };
}

function rankSignals(items: FeedItem[], locale: AppLocale) {
  const performanceInsights = loadSignalWriterPerformanceInsights();
  const recentExposureInsights = loadSignalWriterRecentExposureInsights();
  const deduped = new Map<string, ReturnType<typeof toSignalWriterSignal>>();

  items.forEach((item) => {
    const withPerformance = applySignalWriterPerformanceSummary(
      toSignalWriterSignal(item, locale, "auto"),
      performanceInsights,
      locale,
    );
    const recentExposurePenalty = getSignalWriterRecentExposurePenalty(
      withPerformance,
      recentExposureInsights,
    );
    const rankedSignal =
      recentExposurePenalty > 0
        ? {
            ...withPerformance,
            score: Number(
              Math.max(0, withPerformance.score - recentExposurePenalty).toFixed(2),
            ),
          }
        : withPerformance;
    const dedupeKey = normalizeDedupeKey(rankedSignal.title);

    if (!dedupeKey) {
      return;
    }

    const existing = deduped.get(dedupeKey);
    if (!existing || rankedSignal.score > existing.score) {
      deduped.set(dedupeKey, rankedSignal);
    }
  });

  return [...deduped.values()].sort((left, right) => {
    const scoreDelta = right.score - left.score;
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
  });
}

function normalizeDedupeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();
}
