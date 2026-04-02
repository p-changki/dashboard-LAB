import type { FeedItem, TrendingItem } from "@/lib/types";

import {
  fetchNpmPackageMetadata,
  fetchNpmSearchResults,
  getNpmFreshnessScore,
  getNpmPublishedAt,
} from "./npm-registry";
import { buildGoogleTranslateUrl, sanitizeText } from "./sanitizer";
import { translateTitle } from "./translator";

const SEARCH_RESULTS_PER_QUERY = 4;
const SEARCH_LIMIT = 10;
const SEARCH_STRATEGIES = [
  { text: "ai agent", weight: 1.1 },
  { text: "mcp", weight: 1.05 },
  { text: "developer tools", weight: 0.95 },
  { text: "cli automation", weight: 0.9 },
] as const;

export async function fetchNpmTrendFeed(): Promise<FeedItem[]> {
  const items = await fetchNpmTrending();
  return Promise.all(
    items.map(async (item) => ({
      id: `npm:${item.name}`,
      categoryId: "npm-trends",
      sourceId: "npm-trends",
      sourceName: "npm Trends",
      title: item.name,
      titleKo: (await translateTitle(item.name, false)) ?? undefined,
      summary: item.description,
      link: item.link,
      googleTranslateUrl: buildGoogleTranslateUrl(item.link),
      publishedAt: item.publishedAt,
      publishedTimestamp: new Date(item.publishedAt).getTime(),
      tags: ["npm"],
      extra: item.extra,
    })),
  );
}

export async function fetchNpmTrending(): Promise<TrendingItem[]> {
  const groups = await Promise.all(
    SEARCH_STRATEGIES.map(async (strategy) => ({
      strategy,
      items: await fetchNpmSearchResults(strategy.text, SEARCH_RESULTS_PER_QUERY),
    })),
  );

  const candidates = new Map<
    string,
    {
      packageName: string;
      description: string;
      version: string;
      link: string;
      searchScore: number;
    }
  >();

  for (const group of groups) {
    for (const item of group.items) {
      const packageName = item.package.name;
      const searchScore = (item.score?.final ?? 0) * 10 * group.strategy.weight;
      const existing = candidates.get(packageName);

      if (!existing || searchScore > existing.searchScore) {
        candidates.set(packageName, {
          packageName,
          description: sanitizeText(item.package.description || ""),
          version: item.package.version,
          link: item.package.links?.npm || `https://www.npmjs.com/package/${packageName}`,
          searchScore,
        });
      }
    }
  }

  const enriched = await Promise.all(
    [...candidates.values()].map(async (candidate) => {
      const metadata = await fetchNpmPackageMetadata(candidate.packageName);
      const freshnessScore = getNpmFreshnessScore(metadata);
      const totalScore = Number((candidate.searchScore + freshnessScore).toFixed(2));

      return {
        type: "npm" as const,
        name: candidate.packageName,
        description: candidate.description,
        link: candidate.link,
        extra: {
          score: totalScore,
          version: metadata?.latestVersion ?? candidate.version,
          weeklyDownloads: Math.round(candidate.searchScore * 1_000),
          npmPackage: candidate.packageName,
        },
        publishedAt: getNpmPublishedAt(metadata),
      };
    }),
  );

  return enriched
    .sort((left, right) => {
      const scoreDelta = (right.extra.score ?? 0) - (left.extra.score ?? 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
    })
    .slice(0, SEARCH_LIMIT)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}
