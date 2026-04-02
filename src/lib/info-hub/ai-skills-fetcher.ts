import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import type { AppLocale } from "@/lib/locale";
import type {
  AiSkillModel,
  AiSkillRecommendationSection,
  AiSkillRecommendationsResponse,
  FeedItem,
} from "@/lib/types";

import { readUtf8 } from "@/lib/parsers/shared";

import {
  fetchNpmPackageMetadata,
  fetchNpmSearchResults,
  getNpmFreshnessScore,
  getNpmPublishedAt,
} from "./npm-registry";
import { buildGoogleTranslateUrl, sanitizeText } from "./sanitizer";
import { translateTitle } from "./translator";

const DAY_MS = 24 * 60 * 60_000;
const ITEMS_PER_MODEL = 3;
const FEED_ITEMS_PER_MODEL = 4;

const MODEL_SKILL_QUERIES: Array<{
  model: AiSkillModel;
  githubQueries: string[];
  npmQueries: string[];
  summary: string;
}> = [
  {
    model: "Claude",
    githubQueries: ["claude code", "claude agent"],
    npmQueries: ["claude code", "claude agent", "claude prompt"],
    summary: "Claude Code, CLAUDE.md, 프롬프트 운영 흐름에 맞는 공개 스킬과 도구를 모았습니다.",
  },
  {
    model: "Codex",
    githubQueries: ["codex cli", "openai codex"],
    npmQueries: ["codex cli", "openai codex", "codex prompt"],
    summary: "Codex 기반 코드 작업, 리뷰, 자동화 흐름에 맞는 레포와 패키지를 모았습니다.",
  },
  {
    model: "Gemini",
    githubQueries: ["gemini cli", "gemini agent"],
    npmQueries: ["gemini cli", "gemini prompt", "gemini tool"],
    summary: "Gemini CLI와 GEMINI.md 워크플로우에 연결하기 쉬운 공개 스킬 후보입니다.",
  },
  {
    model: "General",
    githubQueries: ["model context protocol", "ai agent tool"],
    npmQueries: ["ai agent", "mcp tool", "agent prompt"],
    summary: "모델에 종속되지 않고 재사용하기 좋은 에이전트/프롬프트/도구 계열 후보입니다.",
  },
];

const SIGNAL_KEYWORDS: Array<{ signal: string; keywords: string[] }> = [
  { signal: "Next.js", keywords: ["next", "vercel", "app router"] },
  { signal: "React", keywords: ["react", "component", "ui", "tsx"] },
  { signal: "TypeScript", keywords: ["typescript", "ts", "typed"] },
  { signal: "Tailwind CSS", keywords: ["tailwind", "css", "design system"] },
  { signal: "Markdown", keywords: ["markdown", "md", "docs", "documentation"] },
  { signal: "CLI", keywords: ["cli", "terminal", "command", "shell"] },
  { signal: "MCP", keywords: ["mcp", "model context protocol", "tool calling"] },
];

interface GithubSearchResult {
  full_name: string;
  description?: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language?: string | null;
  topics?: string[];
  owner?: { login?: string | null };
  name: string;
  updated_at?: string;
}

interface NpmSearchResult {
  package: {
    name: string;
    description?: string;
    version: string;
    links?: { npm?: string };
    keywords?: string[];
  };
  score?: { final?: number };
}

export async function fetchAiSkillTrendFeed(): Promise<FeedItem[]> {
  const groups = await Promise.all(MODEL_SKILL_QUERIES.map((query) => fetchModelSkillItems(query, FEED_ITEMS_PER_MODEL)));
  const items = groups.flat();
  const deduped = dedupeFeedItems(items);
  return deduped.sort((left, right) => (right.extra?.score ?? 0) - (left.extra?.score ?? 0));
}

export async function fetchAiSkillRecommendations(locale: AppLocale = "ko"): Promise<AiSkillRecommendationsResponse> {
  const projectSignals = await readCurrentProjectSignals();
  const groups = await Promise.all(
    MODEL_SKILL_QUERIES.map(async (query) => {
      const items = await fetchModelSkillItems(query, ITEMS_PER_MODEL);
      return {
        model: query.model,
        summary: getModelSummary(query.model, locale),
        items: items
          .map((item) => withRecommendationReason(item, projectSignals, locale))
          .sort((left, right) => (right.extra?.score ?? 0) - (left.extra?.score ?? 0))
          .slice(0, ITEMS_PER_MODEL),
      } satisfies AiSkillRecommendationSection;
    }),
  );

  return {
    sections: groups.filter((section) => section.items.length > 0),
    projectSignals,
    cachedAt: new Date().toISOString(),
    nextRefreshAt: new Date(Date.now() + DAY_MS).toISOString(),
  };
}

async function fetchModelSkillItems(
  query: (typeof MODEL_SKILL_QUERIES)[number],
  limitPerSource: number,
): Promise<FeedItem[]> {
  const [githubItems, npmItems] = await Promise.all([
    fetchGithubModelItems(query, limitPerSource),
    fetchNpmModelItems(query, limitPerSource),
  ]);

  return [...githubItems, ...npmItems];
}

async function fetchGithubModelItems(
  query: (typeof MODEL_SKILL_QUERIES)[number],
  limit: number,
): Promise<FeedItem[]> {
  const searches = await Promise.all(
    query.githubQueries.flatMap((githubQuery) => [
      fetchGithubSearchItems(query.model, githubQuery, Math.max(2, limit), "updated"),
      fetchGithubSearchItems(query.model, githubQuery, Math.max(2, Math.ceil(limit / 2)), "stars"),
    ]),
  );

  return dedupeFeedItems(searches.flat())
    .sort((left, right) => {
      const scoreDelta = (right.extra?.score ?? 0) - (left.extra?.score ?? 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.publishedTimestamp - left.publishedTimestamp;
    })
    .slice(0, limit);
}

async function fetchNpmModelItems(
  query: (typeof MODEL_SKILL_QUERIES)[number],
  limit: number,
): Promise<FeedItem[]> {
  const searchGroups = await Promise.all(
    query.npmQueries.map(async (npmQuery) => ({
      npmQuery,
      items: await fetchNpmSearchResults(npmQuery, Math.max(2, limit)),
    })),
  );

  const candidates = new Map<
    string,
    {
      item: NpmSearchResult;
      searchScore: number;
    }
  >();

  for (const group of searchGroups) {
    for (const item of group.items) {
      const packageName = item.package.name;
      const searchScore =
        (item.score?.final ?? 0) *
        10 *
        Math.max(0.85, 1 - query.npmQueries.indexOf(group.npmQuery) * 0.08);
      const existing = candidates.get(packageName);

      if (!existing || searchScore > existing.searchScore) {
        candidates.set(packageName, {
          item,
          searchScore,
        });
      }
    }
  }

  const enriched = await Promise.all(
    [...candidates.values()].map(async ({ item, searchScore }) => {
      const packageName = item.package.name;
      const npmUrl = item.package.links?.npm || `https://www.npmjs.com/package/${packageName}`;
      const metadata = await fetchNpmPackageMetadata(packageName);
      const freshnessScore = getNpmFreshnessScore(metadata);
      const score = Number((searchScore + freshnessScore).toFixed(2));
      const publishedAt = getNpmPublishedAt(metadata);

      return {
        id: `ai-skill:npm:${query.model}:${packageName}`,
        categoryId: "ai-skill-trends",
        sourceId: "ai-skills-npm",
        sourceName: `${query.model} npm Picks`,
        title: packageName,
        titleKo: (await translateTitle(packageName, false)) ?? undefined,
        summary: sanitizeText(item.package.description ?? `${query.model} 관련 npm 스킬/도구 패키지`),
        link: npmUrl,
        googleTranslateUrl: buildGoogleTranslateUrl(npmUrl),
        publishedAt,
        publishedTimestamp: new Date(publishedAt).getTime(),
        tags: compactTags([
          query.model,
          "npm",
          ...(item.package.keywords ?? []),
        ]),
        extra: {
          model: query.model,
          score,
          skillType: "npm-package",
          version: metadata?.latestVersion ?? item.package.version,
          weeklyDownloads: Math.round(searchScore * 1_000),
          npmPackage: packageName,
        },
      } satisfies FeedItem;
    }),
  );

  return enriched
    .sort((left, right) => {
      const scoreDelta = (right.extra?.score ?? 0) - (left.extra?.score ?? 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.publishedTimestamp - left.publishedTimestamp;
    })
    .slice(0, limit);
}

async function fetchGithubSearchItems(
  model: AiSkillModel,
  githubQuery: string,
  limit: number,
  strategy: "updated" | "stars",
): Promise<FeedItem[]> {
  const url = new URL("https://api.github.com/search/repositories");
  const recencyFloor = new Date(Date.now() - 45 * DAY_MS).toISOString().slice(0, 10);
  url.searchParams.set(
    "q",
    strategy === "updated" ? `${githubQuery} pushed:>=${recencyFloor}` : githubQuery,
  );
  url.searchParams.set("sort", strategy);
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(limit));

  const payload = await fetch(url, {
    headers: {
      "User-Agent": APP_META.slug,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  })
    .then((response) => response.json() as Promise<{ items?: GithubSearchResult[] }>)
    .catch(() => ({ items: [] as GithubSearchResult[] }));

  return Promise.all(
    (payload.items ?? []).map(async (item) => {
      const tags = compactTags([
        model,
        item.language ?? "",
        ...(item.topics ?? []),
        "GitHub",
        strategy === "updated" ? "fresh" : "popular",
      ]);
      const publishedAt = item.updated_at ?? new Date(Date.now() - 14 * DAY_MS).toISOString();
      const freshnessScore = Math.max(
        0,
        18 - (Date.now() - new Date(publishedAt).getTime()) / DAY_MS,
      );
      const popularityScore =
        item.stargazers_count / 1800 +
        item.forks_count / 6000 +
        (item.topics?.length ?? 0) * 0.3;
      const score = Number(
        (
          popularityScore +
          freshnessScore +
          (strategy === "updated" ? 3.5 : 0)
        ).toFixed(2),
      );

      return {
        id: `ai-skill:github:${item.full_name}`,
        categoryId: "ai-skill-trends",
        sourceId: "ai-skills-github",
        sourceName: `${model} GitHub Picks`,
        title: item.full_name,
        titleKo: (await translateTitle(item.full_name, false)) ?? undefined,
        summary: sanitizeText(item.description ?? "공개 스킬/도구 레포지토리"),
        link: item.html_url,
        googleTranslateUrl: buildGoogleTranslateUrl(item.html_url),
        publishedAt,
        publishedTimestamp: new Date(publishedAt).getTime(),
        tags,
        extra: {
          model,
          score,
          skillType: "github-repo",
          stars: item.stargazers_count,
          forks: item.forks_count,
          language: item.language ?? undefined,
          repoOwner: item.owner?.login ?? undefined,
          repoName: item.name,
        },
      } satisfies FeedItem;
    }),
  );
}

async function readCurrentProjectSignals(): Promise<string[]> {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const raw = await readUtf8(packageJsonPath);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = new Set([
      ...Object.keys(parsed.dependencies ?? {}),
      ...Object.keys(parsed.devDependencies ?? {}),
    ]);

    const signals: string[] = [];

    if (deps.has("next")) signals.push("Next.js");
    if (deps.has("react")) signals.push("React");
    if (deps.has("typescript")) signals.push("TypeScript");
    if (deps.has("tailwindcss")) signals.push("Tailwind CSS");
    if (deps.has("react-markdown") || deps.has("gray-matter")) signals.push("Markdown");
    if (deps.has("@xterm/xterm")) signals.push("CLI");

    return signals;
  } catch {
    return [];
  }
}

function withRecommendationReason(item: FeedItem, projectSignals: string[], locale: AppLocale): FeedItem {
  const matchedSignals = projectSignals.filter((signal) => matchesSignal(item, signal));
  const fallbackReason = locale === "en"
    ? item.extra?.model === "General"
      ? "This is model-agnostic enough to fit into the current workflow as a general tool."
      : `This looks like a practical public skill candidate to try in a ${item.extra?.model ?? "AI"} workflow.`
    : item.extra?.model === "General"
      ? "모델 종속성이 낮아 현재 워크플로우에 범용으로 붙이기 좋습니다."
      : `${item.extra?.model ?? "AI"} 워크플로우에 바로 실험하기 좋은 공개 스킬 후보입니다.`;

  const recommendationReason = matchedSignals.length > 0
    ? locale === "en"
      ? `Your current project already uses ${matchedSignals.slice(0, 2).join(", ")}, so the integration points are clearer.`
      : `현재 프로젝트가 ${matchedSignals.slice(0, 2).join(", ")} 기반이라 연동 포인트가 분명합니다.`
    : fallbackReason;

  return {
    ...item,
    extra: {
      ...item.extra,
      score: (item.extra?.score ?? 0) + matchedSignals.length * 2,
      recommendationReason,
    },
  };
}

function matchesSignal(item: FeedItem, signal: string) {
  const matcher = SIGNAL_KEYWORDS.find((entry) => entry.signal === signal);

  if (!matcher) {
    return false;
  }

  const haystack = [
    item.title,
    item.summary,
    item.titleKo ?? "",
    item.summaryKo ?? "",
    ...item.tags,
  ]
    .join(" ")
    .toLowerCase();

  return matcher.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function dedupeFeedItems(items: FeedItem[]) {
  const map = new Map<string, FeedItem>();

  items.forEach((item) => {
    const key = item.link;
    const existing = map.get(key);

    if (!existing || (item.extra?.score ?? 0) > (existing.extra?.score ?? 0)) {
      map.set(key, item);
    }
  });

  return [...map.values()];
}

function compactTags(tags: string[]) {
  return [...new Set(tags.filter(Boolean))].slice(0, 6);
}

function getModelSummary(model: AiSkillModel, locale: AppLocale) {
  if (locale === "en") {
    return {
      Claude: "Public skills and tools that fit Claude Code, CLAUDE.md, and prompt-driven workflows.",
      Codex: "Repos and packages that map well to Codex-based coding, review, and automation workflows.",
      Gemini: "Public skill candidates that are easy to connect to Gemini CLI and GEMINI.md workflows.",
      General: "Reusable agent, prompt, and tool candidates that are less tied to a single model.",
    }[model];
  }

  return {
    Claude: "Claude Code, CLAUDE.md, 프롬프트 운영 흐름에 맞는 공개 스킬과 도구를 모았습니다.",
    Codex: "Codex 기반 코드 작업, 리뷰, 자동화 흐름에 맞는 레포와 패키지를 모았습니다.",
    Gemini: "Gemini CLI와 GEMINI.md 워크플로우에 연결하기 쉬운 공개 스킬 후보입니다.",
    General: "모델에 종속되지 않고 재사용하기 좋은 에이전트/프롬프트/도구 계열 후보입니다.",
  }[model];
}
