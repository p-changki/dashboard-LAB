import type {
  AiSkillRecommendationsResponse,
  FeedCategoryId,
  FeedItem,
  FeedResponse,
  FeedSourcesResponse,
  TrendingResponse,
} from "@/lib/types";

import { clearCache, readThroughCache } from "@/lib/parsers/cache";

import { fetchAiSkillRecommendations, fetchAiSkillTrendFeed } from "./ai-skills-fetcher";
import { FEED_CATEGORIES, FEED_SOURCES, getFeedCategory, getSourcesForCategory } from "./categories";
import { fetchGithubTrending, fetchGithubTrendingFeed } from "./github-scraper";
import { fetchNpmTrending, fetchNpmTrendFeed } from "./npm-fetcher";
import { fetchRssItems } from "./rss-fetcher";

const DAY_MS = 24 * 60 * 60_000;

export async function getInfoHubFeed(
  categoryId: FeedCategoryId | "all",
  page = 1,
  limit = 20,
  query = "",
  options?: { forceRefresh?: boolean },
): Promise<FeedResponse> {
  const ttl = getInfoHubFeedTtl(categoryId);
  const items = filterFeedItems(await loadFeedItems(categoryId, Boolean(options?.forceRefresh)), query);
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const totalPages = Math.max(1, Math.ceil(items.length / safeLimit));
  const sliced = items.slice((page - 1) * safeLimit, page * safeLimit);

  return {
    items: sliced,
    totalItems: items.length,
    page,
    limit: safeLimit,
    totalPages,
    categoryId,
    query,
    cachedAt: new Date().toISOString(),
    nextRefreshAt: new Date(Date.now() + ttl).toISOString(),
  };
}

export function getInfoHubSources(): FeedSourcesResponse {
  return { sources: FEED_SOURCES, categories: FEED_CATEGORIES };
}

export async function getInfoHubTrending(options?: { forceRefresh?: boolean }): Promise<TrendingResponse> {
  if (options?.forceRefresh) {
    clearCache("info-hub:trending:github");
    clearCache("info-hub:trending:npm");
  }

  const [github, npm] = await Promise.all([
    readThroughCache("info-hub:trending:github", DAY_MS, fetchGithubTrending),
    readThroughCache("info-hub:trending:npm", DAY_MS, fetchNpmTrending),
  ]);

  return {
    github,
    npm,
    cachedAt: new Date().toISOString(),
    nextRefreshAt: new Date(Date.now() + DAY_MS).toISOString(),
  };
}

export async function getAiSkillRecommendations(
  options?: { forceRefresh?: boolean },
): Promise<AiSkillRecommendationsResponse> {
  const cacheKey = "info-hub:ai-skills:recommendations";

  if (options?.forceRefresh) {
    clearCache(cacheKey);
  }

  return readThroughCache(cacheKey, DAY_MS, fetchAiSkillRecommendations);
}

async function loadFeedItems(categoryId: FeedCategoryId | "all", forceRefresh: boolean) {
  if (categoryId === "all") {
    const items = await Promise.all(FEED_CATEGORIES.map((category) => loadCategoryFeed(category.id, forceRefresh)));
    return items.flat().sort((left, right) => right.publishedTimestamp - left.publishedTimestamp);
  }

  return loadCategoryFeed(categoryId, forceRefresh);
}

async function loadCategoryFeed(categoryId: FeedCategoryId, forceRefresh: boolean): Promise<FeedItem[]> {
  const ttl = getInfoHubFeedTtl(categoryId);
  const cacheKey = `info-hub:feed:${categoryId}`;

  if (forceRefresh) {
    clearCache(cacheKey);
  }

  return readThroughCache(cacheKey, ttl, async () => {
    if (categoryId === "ai-skill-trends") {
      return fetchAiSkillTrendFeed();
    }

    if (categoryId === "github-trending") {
      return fetchGithubTrendingFeed();
    }

    if (categoryId === "npm-trends") {
      return fetchNpmTrendFeed();
    }

    const results = await Promise.allSettled(getSourcesForCategory(categoryId).map(fetchRssItems));
    return results
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .sort((left, right) => right.publishedTimestamp - left.publishedTimestamp);
  });
}

function getInfoHubFeedTtl(categoryId: FeedCategoryId | "all") {
  if (categoryId === "all") {
    return DAY_MS;
  }

  return getFeedCategory(categoryId)?.cacheTtlMs ?? DAY_MS;
}

function filterFeedItems(items: FeedItem[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return items;
  }

  return items.filter((item) =>
    [
      item.title,
      item.titleKo,
      item.summary,
      item.summaryKo,
      item.sourceName,
      item.author,
      ...item.tags,
    ]
      .map(toSearchText)
      .filter(Boolean)
      .some((value) => value.includes(normalized)),
  );
}

function toSearchText(value: unknown) {
  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`.toLowerCase();
  }

  return "";
}
