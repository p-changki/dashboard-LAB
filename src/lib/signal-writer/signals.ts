import { getFeedCategory } from "@/lib/info-hub/categories";
import type { AppLocale } from "@/lib/locale";
import type {
  FeedItem,
  SignalWriterSelectionSource,
  SignalWriterSignal,
} from "@/lib/types";

const CATEGORY_WEIGHTS: Record<string, number> = {
  "ai-cli-updates": 22,
  "mcp-ecosystem": 18,
  "ai-skill-trends": 15,
  "my-stack-news": 16,
  "github-trending": 15,
  "webdev-news": 12,
  "npm-trends": 12,
  "ai-agent-prompt": 10,
  "korean-dev-news": 8,
};

export function toSignalWriterSignal(
  item: FeedItem,
  locale: AppLocale,
  selectionSource: SignalWriterSelectionSource = "auto",
): SignalWriterSignal {
  const category = getFeedCategory(item.categoryId);
  const hoursSincePublished = Math.max(
    0,
    (Date.now() - item.publishedTimestamp) / (1000 * 60 * 60),
  );
  const recencyScore = Math.max(0, 20 - hoursSincePublished * 1.5);
  const categoryScore = CATEGORY_WEIGHTS[item.categoryId] ?? 8;
  const extraScore = Math.min(20, item.extra?.score ?? 0);
  const momentumScore = Math.min(12, Math.log10((item.extra?.starsDelta ?? 0) + 1) * 6);
  const score = Number((categoryScore + recencyScore + extraScore + momentumScore).toFixed(2));

  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryLabel:
      locale === "en" ? category?.labelEn ?? item.categoryId : category?.label ?? item.categoryId,
    selectionSource,
    title: pickText(locale, item.titleKo, item.title),
    summary: summarizeText(pickText(locale, item.summaryKo, item.summary)),
    sourceName: item.sourceName,
    link: item.link,
    publishedAt: item.publishedAt,
    tags: item.tags.slice(0, 5),
    thumbnailUrl: item.thumbnailUrl,
    whyItMatters: buildWhyItMatters(item, locale),
    score,
  };
}

function buildWhyItMatters(item: FeedItem, locale: AppLocale) {
  if (item.extra?.recommendationReason?.trim()) {
    return item.extra.recommendationReason.trim();
  }

  if (item.categoryId === "ai-cli-updates") {
    return locale === "en"
      ? "This is a product-level update that can change how people actually use local AI workflows."
      : "실제 로컬 AI 작업 방식에 영향을 줄 수 있는 제품 업데이트입니다.";
  }

  if (item.categoryId === "my-stack-news") {
    return locale === "en"
      ? "This is close to the stack you already use, so it is more likely to matter in real work."
      : "현재 쓰는 스택과 가까워서 실제 작업에 바로 영향을 줄 가능성이 큽니다.";
  }

  if (item.categoryId === "github-trending" && item.extra?.starsDelta) {
    return locale === "en"
      ? "This repo is pulling fast attention right now, which makes it a strong signal to interpret early."
      : "짧은 시간 안에 관심이 몰린 저장소라, 지금 맥락을 먼저 잡아두기 좋은 신호입니다.";
  }

  if (item.categoryId === "mcp-ecosystem") {
    return locale === "en"
      ? "The MCP ecosystem is moving quickly, so this is useful context for agent and tooling discussions."
      : "MCP 생태계 변화는 에이전트와 도구 흐름에 직접 연결되기 때문에 지금 볼 가치가 있습니다.";
  }

  return locale === "en"
    ? "This is recent enough and strong enough to turn into a short perspective post today."
    : "오늘 짧은 관점 글로 바로 풀어낼 수 있을 만큼 최근성과 의미가 있는 업데이트입니다.";
}

function pickText(locale: AppLocale, localized: string | undefined, original: string) {
  if (locale === "ko") {
    return localized?.trim() || original;
  }

  return original;
}

function summarizeText(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 180) {
    return trimmed;
  }

  return `${trimmed.slice(0, 177).trimEnd()}...`;
}
