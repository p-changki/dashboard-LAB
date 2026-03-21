import Parser from "rss-parser";

import type { FeedItem, FeedSource } from "@/lib/types";

import { buildGoogleTranslateUrl, sanitizeText } from "./sanitizer";
import { translateTitle } from "./translator";

const parser = new Parser();

export async function fetchRssItems(source: FeedSource): Promise<FeedItem[]> {
  const feed = await parser.parseURL(source.url);
  const items = await Promise.all(
    (feed.items ?? []).slice(0, 12).map(async (item, index) => {
      const title = item.title?.trim() || `${source.name} ${index + 1}`;
      return {
        id: `${source.id}:${item.link ?? index}`,
        categoryId: source.categoryId,
        sourceId: source.id,
        sourceName: source.name,
        title,
        titleKo: (await translateTitle(title, source.isKorean)) ?? undefined,
        summary: sanitizeText(item.contentSnippet || item.content || item.summary || ""),
        link: item.link || source.url,
        googleTranslateUrl: buildGoogleTranslateUrl(item.link || source.url),
        author: item.creator || item.author,
        publishedAt: new Date(item.isoDate || item.pubDate || Date.now()).toISOString(),
        publishedTimestamp: new Date(item.isoDate || item.pubDate || Date.now()).getTime(),
        tags: (item.categories ?? []).slice(0, 5),
      } satisfies FeedItem;
    }),
  );

  return items;
}
