import "server-only";

import { getInfoHubFeed } from "@/lib/info-hub/feed-service";
import type { AppLocale } from "@/lib/locale";
import { loadSignalWriterSourceContext } from "@/lib/signal-writer/source-context";
import { toSignalWriterSignal } from "@/lib/signal-writer/signals";
import type {
  FeedCategoryId,
  FeedItem,
  SignalWriterTrendBoard,
  SignalWriterTrendBoardId,
  SignalWriterTrendBoardItem,
} from "@/lib/types";

type BoardDefinition = {
  id: SignalWriterTrendBoardId;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
  categories: FeedCategoryId[];
  keywords: string[];
  limitDefault: number;
};

const DAY_MS = 24 * 60 * 60_000;

const BOARD_DEFINITIONS: BoardDefinition[] = [
  {
    id: "github",
    labelKo: "GitHub 트렌딩",
    labelEn: "GitHub",
    descriptionKo: "오늘 GitHub에서 빠르게 올라오는 레포를 팩트 중심으로 정리합니다.",
    descriptionEn: "Review fast-rising GitHub repos with fact-based evidence.",
    categories: ["github-trending"],
    keywords: [],
    limitDefault: 10,
  },
  {
    id: "npm",
    labelKo: "npm 급상승",
    labelEn: "npm",
    descriptionKo: "npm 쪽에서 뜨는 패키지를 버전과 설명 중심으로 정리합니다.",
    descriptionEn: "Track fast-moving npm packages with version and package facts.",
    categories: ["npm-trends"],
    keywords: [],
    limitDefault: 10,
  },
  {
    id: "frontend",
    labelKo: "프런트엔드",
    labelEn: "Frontend",
    descriptionKo: "React, Next.js, UI, CSS, design system 흐름을 묶어 봅니다.",
    descriptionEn: "Track React, Next.js, UI, CSS, and design-system signals.",
    categories: ["webdev-news", "my-stack-news", "github-trending", "npm-trends", "ai-skill-trends"],
    keywords: ["frontend", "react", "next", "ui", "design system", "tailwind", "css", "component", "vite"],
    limitDefault: 10,
  },
  {
    id: "backend",
    labelKo: "백엔드",
    labelEn: "Backend",
    descriptionKo: "API, infra, DB, auth, observability 쪽 신호를 묶어 봅니다.",
    descriptionEn: "Track API, infra, DB, auth, and observability signals.",
    categories: ["ai-cli-updates", "github-trending", "npm-trends", "ai-agent-prompt", "my-stack-news"],
    keywords: ["backend", "api", "server", "database", "db", "postgres", "redis", "auth", "queue", "infra", "observability", "kafka", "worker"],
    limitDefault: 10,
  },
  {
    id: "fullstack",
    labelKo: "풀스택",
    labelEn: "Fullstack",
    descriptionKo: "앱 전체 워크플로우와 생산성에 영향을 주는 툴과 업데이트를 묶습니다.",
    descriptionEn: "Track tools and updates that shift end-to-end app workflows.",
    categories: ["my-stack-news", "webdev-news", "github-trending", "npm-trends", "ai-cli-updates", "ai-skill-trends"],
    keywords: ["fullstack", "workflow", "app", "platform", "starter", "saas", "next", "react", "api", "tooling", "agent"],
    limitDefault: 10,
  },
  {
    id: "skills",
    labelKo: "AI 스킬/툴",
    labelEn: "Skills",
    descriptionKo: "Claude, Codex, Gemini, MCP와 연결되는 스킬/도구 후보를 모읍니다.",
    descriptionEn: "Track AI skill and tooling candidates around Claude, Codex, Gemini, and MCP.",
    categories: ["ai-skill-trends", "mcp-ecosystem", "github-trending", "npm-trends"],
    keywords: ["claude", "codex", "gemini", "prompt", "skill", "mcp", "agent", "tool", "sdk"],
    limitDefault: 10,
  },
];

export async function getSignalWriterTrendBoard(
  boardId: SignalWriterTrendBoardId,
  locale: AppLocale,
  limit?: number,
  options?: { forceRefresh?: boolean },
): Promise<SignalWriterTrendBoard> {
  const nextBoard = await buildSignalWriterTrendBoard(
    boardId,
    locale,
    limit,
    options,
  );

  if (nextBoard.items.length === 0 && !options?.forceRefresh) {
    return buildSignalWriterTrendBoard(boardId, locale, limit, { forceRefresh: true });
  }

  return nextBoard;
}

async function buildSignalWriterTrendBoard(
  boardId: SignalWriterTrendBoardId,
  locale: AppLocale,
  limit?: number,
  options?: { forceRefresh?: boolean },
): Promise<SignalWriterTrendBoard> {
  const board = BOARD_DEFINITIONS.find((item) => item.id === boardId);

  if (!board) {
    throw new Error("Unknown trend board.");
  }

  const targetLimit = Math.min(Math.max(limit ?? board.limitDefault, 5), 20);
  const feeds = await Promise.all(
    board.categories.map((categoryId) =>
      getInfoHubFeed(categoryId, 1, 20, "", { forceRefresh: options?.forceRefresh }),
    ),
  );

  const nextRefreshAt = feeds
    .map((feed) => feed.nextRefreshAt)
    .sort()[0] ?? new Date(Date.now() + DAY_MS).toISOString();

  const merged = feeds.flatMap((feed) => feed.items);
  const ranked = rankBoardItems(board, merged, locale).slice(0, targetLimit);
  const enriched = await Promise.all(
    ranked.map(async (entry, index) => ({
      ...entry,
      rank: index + 1,
      sourceContext: await loadSignalWriterSourceContext({
        id: entry.id,
        categoryId: entry.categoryId,
        categoryLabel: entry.categoryLabel,
        title: entry.title,
        summary: entry.summary,
        sourceName: entry.sourceName,
        link: entry.link,
        publishedAt: entry.publishedAt,
        tags: entry.tags,
        whyItMatters: entry.summary,
        score: entry.score,
      }),
    })),
  );

  return {
    id: board.id,
    label: locale === "en" ? board.labelEn : board.labelKo,
    description: locale === "en" ? board.descriptionEn : board.descriptionKo,
    items: enriched.map((item) => ({
      ...item,
      facts: buildFacts(item, locale),
    })),
    generatedAt: new Date().toISOString(),
    nextRefreshAt,
  };
}

function rankBoardItems(
  board: BoardDefinition,
  items: FeedItem[],
  locale: AppLocale,
): Array<Omit<SignalWriterTrendBoardItem, "rank" | "facts" | "sourceContext">> {
  const seen = new Set<string>();

  return items
    .map((item) => {
      const signal = toSignalWriterSignal(item, locale, "auto");
      const keywordScore = board.keywords.length === 0 ? 0 : countKeywordMatches(item, board.keywords) * 5;
      const categoryBoost = board.id === "github" || board.id === "npm" || board.id === "skills" ? 6 : 0;
      const score = Number((signal.score + keywordScore + categoryBoost).toFixed(2));
      const dedupeKey = normalizeKey(`${item.title} ${item.link || ""}`);

      return {
        id: item.id,
        dedupeKey,
        categoryId: item.categoryId,
        categoryLabel: signal.categoryLabel,
        title: signal.title,
        summary: signal.summary,
        link: signal.link,
        sourceName: signal.sourceName,
        publishedAt: signal.publishedAt,
        tags: signal.tags,
        score,
        extra: item.extra,
      };
    })
    .filter((item) => {
      if (!item.dedupeKey || seen.has(item.dedupeKey)) {
        return false;
      }

      if (board.keywords.length > 0 && countKeywordMatches(item, board.keywords) === 0) {
        return false;
      }

      seen.add(item.dedupeKey);
      return true;
    })
    .sort((left, right) => right.score - left.score)
    .map((item) => {
      const { dedupeKey, extra, ...result } = item;
      void dedupeKey;
      void extra;
      return result;
    });
}

function countKeywordMatches(item: Pick<FeedItem, "title" | "summary" | "tags"> | { title: string; summary: string; tags: string[] }, keywords: string[]) {
  const haystack = [item.title, item.summary, item.tags.join(" ")].join(" ").toLowerCase();
  return keywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).length;
}

function buildFacts(
  item: Omit<SignalWriterTrendBoardItem, "facts"> & { sourceContext?: SignalWriterTrendBoardItem["sourceContext"] },
  locale: AppLocale,
) {
  const facts = [
    item.summary,
    ...item.tags.slice(0, 4).map((tag) =>
      locale === "en" ? `Tag: ${tag}` : `태그: ${tag}`,
    ),
  ];

  if (item.sourceContext) {
    facts.push(...item.sourceContext.details.slice(0, 4));
  }

  return dedupeStrings(
    facts
      .map((entry) => entry.trim())
      .filter(Boolean),
  ).slice(0, 5);
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();
}

function dedupeStrings(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeKey(item);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
