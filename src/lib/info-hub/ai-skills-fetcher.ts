import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import type {
  AiSkillModel,
  AiSkillRecommendationSection,
  AiSkillRecommendationsResponse,
  FeedItem,
} from "@/lib/types";

import { readUtf8 } from "@/lib/parsers/shared";

import { buildGoogleTranslateUrl, sanitizeText } from "./sanitizer";
import { translateTitle } from "./translator";

const DAY_MS = 24 * 60 * 60_000;
const ITEMS_PER_MODEL = 3;
const FEED_ITEMS_PER_MODEL = 4;

const MODEL_SKILL_QUERIES: Array<{
  model: AiSkillModel;
  githubQuery: string;
  npmQuery: string;
  summary: string;
}> = [
  {
    model: "Claude",
    githubQuery: "claude code prompt",
    npmQuery: "claude prompt",
    summary: "Claude Code, CLAUDE.md, 프롬프트 운영 흐름에 맞는 공개 스킬과 도구를 모았습니다.",
  },
  {
    model: "Codex",
    githubQuery: "codex cli prompt",
    npmQuery: "codex prompt",
    summary: "Codex 기반 코드 작업, 리뷰, 자동화 흐름에 맞는 레포와 패키지를 모았습니다.",
  },
  {
    model: "Gemini",
    githubQuery: "gemini cli prompt",
    npmQuery: "gemini prompt",
    summary: "Gemini CLI와 GEMINI.md 워크플로우에 연결하기 쉬운 공개 스킬 후보입니다.",
  },
  {
    model: "General",
    githubQuery: "ai agent mcp prompt",
    npmQuery: "ai agent prompt",
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

export async function fetchAiSkillRecommendations(): Promise<AiSkillRecommendationsResponse> {
  const projectSignals = await readCurrentProjectSignals();
  const groups = await Promise.all(
    MODEL_SKILL_QUERIES.map(async (query) => {
      const items = await fetchModelSkillItems(query, ITEMS_PER_MODEL);
      return {
        model: query.model,
        summary: query.summary,
        items: items
          .map((item) => withRecommendationReason(item, projectSignals))
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
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query.githubQuery);
  url.searchParams.set("sort", "stars");
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
        query.model,
        item.language ?? "",
        ...(item.topics ?? []),
        "GitHub",
      ]);

      const score = item.stargazers_count / 1000 + item.forks_count / 4000 + (item.topics?.length ?? 0) * 0.2;

      return {
        id: `ai-skill:github:${query.model}:${item.full_name}`,
        categoryId: "ai-skill-trends",
        sourceId: "ai-skills-github",
        sourceName: `${query.model} GitHub Picks`,
        title: item.full_name,
        titleKo: (await translateTitle(item.full_name, false)) ?? undefined,
        summary: sanitizeText(item.description ?? `${query.model} 관련 공개 스킬/도구 레포지토리`),
        link: item.html_url,
        googleTranslateUrl: buildGoogleTranslateUrl(item.html_url),
        publishedAt: item.updated_at ?? new Date().toISOString(),
        publishedTimestamp: new Date(item.updated_at ?? new Date().toISOString()).getTime(),
        tags,
        extra: {
          model: query.model,
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

async function fetchNpmModelItems(
  query: (typeof MODEL_SKILL_QUERIES)[number],
  limit: number,
): Promise<FeedItem[]> {
  const url = new URL("https://registry.npmjs.org/-/v1/search");
  url.searchParams.set("text", query.npmQuery);
  url.searchParams.set("size", String(limit));
  url.searchParams.set("popularity", "1");

  const payload = await fetch(url, { cache: "no-store" })
    .then((response) => response.json() as Promise<{ objects?: NpmSearchResult[] }>)
    .catch(() => ({ objects: [] as NpmSearchResult[] }));

  return Promise.all(
    (payload.objects ?? []).map(async (item) => {
      const packageName = item.package.name;
      const npmUrl = item.package.links?.npm || `https://www.npmjs.com/package/${packageName}`;
      const tags = compactTags([
        query.model,
        "npm",
        ...(item.package.keywords ?? []),
      ]);
      const score = (item.score?.final ?? 0) * 10;

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
        publishedAt: new Date().toISOString(),
        publishedTimestamp: Date.now(),
        tags,
        extra: {
          model: query.model,
          score,
          skillType: "npm-package",
          version: item.package.version,
          weeklyDownloads: Math.round((item.score?.final ?? 0) * 10_000),
          npmPackage: packageName,
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

function withRecommendationReason(item: FeedItem, projectSignals: string[]): FeedItem {
  const matchedSignals = projectSignals.filter((signal) => matchesSignal(item, signal));
  const fallbackReason = item.extra?.model === "General"
    ? "모델 종속성이 낮아 현재 워크플로우에 범용으로 붙이기 좋습니다."
    : `${item.extra?.model ?? "AI"} 워크플로우에 바로 실험하기 좋은 공개 스킬 후보입니다.`;

  const recommendationReason = matchedSignals.length > 0
    ? `현재 프로젝트가 ${matchedSignals.slice(0, 2).join(", ")} 기반이라 연동 포인트가 분명합니다.`
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
