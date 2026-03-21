import type { FeedItem, TrendingItem } from "@/lib/types";

import { buildGoogleTranslateUrl, sanitizeText } from "./sanitizer";
import { translateTitle } from "./translator";

const SEARCH_URL = "https://registry.npmjs.org/-/v1/search?text=ai+agent&popularity=1.0";

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
  const response = await fetch(SEARCH_URL, { cache: "no-store" });
  const payload = (await response.json()) as {
    objects?: Array<{
      package: { name: string; description?: string; version: string; links?: { npm?: string } };
      score?: { final?: number };
    }>;
  };

  return (payload.objects ?? []).slice(0, 10).map((item, index) => ({
    type: "npm",
    rank: index + 1,
    name: item.package.name,
    description: sanitizeText(item.package.description || ""),
    link: item.package.links?.npm || `https://www.npmjs.com/package/${item.package.name}`,
    extra: {
      version: item.package.version,
      weeklyDownloads: Math.round((item.score?.final ?? 0) * 10_000),
      npmPackage: item.package.name,
    },
    publishedAt: new Date().toISOString(),
  }));
}
