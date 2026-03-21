import { parse } from "node-html-parser";

import { APP_META } from "@/lib/app-meta";
import type { FeedItem, TrendingItem } from "@/lib/types";

import { buildGoogleTranslateUrl, sanitizeText } from "./sanitizer";
import { translateTitle } from "./translator";

const URL = "https://github.com/trending?since=daily";

export async function fetchGithubTrendingFeed(): Promise<FeedItem[]> {
  const trending = await fetchGithubTrending();
  return Promise.all(
    trending.map(async (item) => ({
      id: `github:${item.name}`,
      categoryId: "github-trending",
      sourceId: "github-trending",
      sourceName: "GitHub Trending",
      title: item.name,
      titleKo: (await translateTitle(item.name, false)) ?? undefined,
      summary: item.description,
      link: item.link,
      googleTranslateUrl: buildGoogleTranslateUrl(item.link),
      publishedAt: item.publishedAt,
      publishedTimestamp: new Date(item.publishedAt).getTime(),
      tags: [item.extra.language ?? "unknown"],
      extra: item.extra,
    })),
  );
}

export async function fetchGithubTrending(): Promise<TrendingItem[]> {
  const response = await fetch(URL, { headers: { "User-Agent": APP_META.slug }, cache: "no-store" });
  const html = await response.text();
  const root = parse(html);

  return root.querySelectorAll("article.Box-row").slice(0, 10).map((node, index) => {
    const repo = sanitizeText(node.querySelector("h2")?.text || "unknown/repo", 100).replace(/\s+/g, "");
    const description = sanitizeText(node.querySelector("p")?.text || "");
    const language = sanitizeText(node.querySelector("[itemprop='programmingLanguage']")?.text || "", 20);
    const starTexts = node.querySelectorAll("a.Link--muted").map((item) => sanitizeText(item.text, 20));
    const href = node.querySelector("h2 a")?.getAttribute("href") || "/";

    return {
      type: "github",
      rank: index + 1,
      name: repo,
      description,
      link: `https://github.com${href}`,
      extra: {
        language,
        stars: parseCompactNumber(starTexts[0]),
        forks: parseCompactNumber(starTexts[1]),
      },
      publishedAt: new Date().toISOString(),
    } satisfies TrendingItem;
  });
}

function parseCompactNumber(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (normalized.endsWith("k")) {
    return Math.round(Number.parseFloat(normalized) * 1000);
  }
  return Number.parseInt(normalized.replace(/,/g, ""), 10) || 0;
}
