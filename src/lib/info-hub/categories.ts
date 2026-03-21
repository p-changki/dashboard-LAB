import type { FeedCategory, FeedSource } from "@/lib/types";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const FEED_CATEGORIES: FeedCategory[] = [
  { id: "ai-cli-updates", label: "AI CLI 업데이트", labelEn: "AI CLI", icon: "Sparkles", color: "purple", cacheTtlMs: DAY },
  { id: "ai-skill-trends", label: "AI 스킬 트렌드", labelEn: "Skills", icon: "WandSparkles", color: "teal", cacheTtlMs: DAY },
  { id: "mcp-ecosystem", label: "MCP 생태계", labelEn: "MCP", icon: "Blocks", color: "cyan", cacheTtlMs: DAY },
  { id: "github-trending", label: "GitHub 트렌딩", labelEn: "GitHub", icon: "TrendingUp", color: "emerald", cacheTtlMs: DAY },
  { id: "npm-trends", label: "npm 트렌드", labelEn: "npm", icon: "Package", color: "red", cacheTtlMs: DAY },
  { id: "ai-agent-prompt", label: "AI 에이전트/프롬프트", labelEn: "Agents", icon: "Bot", color: "amber", cacheTtlMs: DAY },
  { id: "webdev-news", label: "웹 개발 뉴스", labelEn: "WebDev", icon: "Globe", color: "blue", cacheTtlMs: DAY },
  { id: "korean-dev-news", label: "국내 개발 뉴스", labelEn: "Korea", icon: "Languages", color: "rose", cacheTtlMs: DAY },
  { id: "my-stack-news", label: "내 스택 뉴스", labelEn: "My Stack", icon: "Layers", color: "indigo", cacheTtlMs: DAY },
];

export const FEED_SOURCES: FeedSource[] = [
  { id: "claude-code-releases", categoryId: "ai-cli-updates", name: "Claude Code Releases", type: "rss", url: "https://github.com/anthropics/claude-code/releases.atom", isKorean: false },
  { id: "anthropic-blog", categoryId: "ai-cli-updates", name: "Anthropic Blog", type: "rss", url: "https://www.anthropic.com/blog/rss", isKorean: false },
  { id: "openai-blog", categoryId: "ai-cli-updates", name: "OpenAI Blog", type: "rss", url: "https://openai.com/blog/rss", isKorean: false },
  { id: "ai-skills-github", categoryId: "ai-skill-trends", name: "GitHub Skill Search", type: "github-api", url: "https://api.github.com/search/repositories", isKorean: false },
  { id: "ai-skills-npm", categoryId: "ai-skill-trends", name: "npm Skill Search", type: "npm-api", url: "https://registry.npmjs.org/-/v1/search", isKorean: false },
  { id: "mcp-spec", categoryId: "mcp-ecosystem", name: "MCP Spec Releases", type: "rss", url: "https://github.com/modelcontextprotocol/specification/releases.atom", isKorean: false },
  { id: "mcp-servers", categoryId: "mcp-ecosystem", name: "MCP Servers Releases", type: "rss", url: "https://github.com/modelcontextprotocol/servers/releases.atom", isKorean: false },
  { id: "github-trending", categoryId: "github-trending", name: "GitHub Trending", type: "scrape", url: "https://github.com/trending?since=daily", isKorean: false },
  { id: "npm-trends", categoryId: "npm-trends", name: "npm Registry Search", type: "npm-api", url: "https://registry.npmjs.org/-/v1/search?text=ai+agent&popularity=1.0", isKorean: false },
  { id: "simon-willison", categoryId: "ai-agent-prompt", name: "Simon Willison", type: "rss", url: "https://simonwillison.net/atom/everything/", isKorean: false },
  { id: "langchain-blog", categoryId: "ai-agent-prompt", name: "LangChain Blog", type: "rss", url: "https://blog.langchain.dev/rss/", isKorean: false },
  { id: "tds", categoryId: "ai-agent-prompt", name: "Towards Data Science", type: "rss", url: "https://towardsdatascience.com/feed", isKorean: false },
  { id: "css-tricks", categoryId: "webdev-news", name: "CSS-Tricks", type: "rss", url: "https://css-tricks.com/feed/", isKorean: false },
  { id: "smashing-magazine", categoryId: "webdev-news", name: "Smashing Magazine", type: "rss", url: "https://www.smashingmagazine.com/feed/", isKorean: false },
  { id: "devto-top", categoryId: "webdev-news", name: "Dev.to Top", type: "rss", url: "https://dev.to/feed/top/week", isKorean: false },
  { id: "kakao-tech", categoryId: "korean-dev-news", name: "Kakao Tech", type: "rss", url: "https://tech.kakao.com/feed/", isKorean: true },
  { id: "toss-tech", categoryId: "korean-dev-news", name: "Toss Tech", type: "rss", url: "https://toss.tech/rss.xml", isKorean: true },
  { id: "woowa-tech", categoryId: "korean-dev-news", name: "우아한기술블로그", type: "rss", url: "https://techblog.woowahan.com/feed/", isKorean: true },
  { id: "naver-d2", categoryId: "korean-dev-news", name: "Naver D2", type: "rss", url: "https://d2.naver.com/d2.atom", isKorean: true },
  { id: "line-engineering", categoryId: "korean-dev-news", name: "LINE Engineering", type: "rss", url: "https://engineering.linecorp.com/ko/feed", isKorean: true },
  { id: "nextjs-blog", categoryId: "my-stack-news", name: "Next.js Blog", type: "rss", url: "https://nextjs.org/feed.xml", isKorean: false },
  { id: "tailwind-blog", categoryId: "my-stack-news", name: "Tailwind CSS Blog", type: "rss", url: "https://tailwindcss.com/feeds/feed.xml", isKorean: false },
  { id: "vercel-blog", categoryId: "my-stack-news", name: "Vercel Blog", type: "rss", url: "https://vercel.com/atom", isKorean: false },
  { id: "typescript-blog", categoryId: "my-stack-news", name: "TypeScript Blog", type: "rss", url: "https://devblogs.microsoft.com/typescript/feed/", isKorean: false },
  { id: "prisma-blog", categoryId: "my-stack-news", name: "Prisma Blog", type: "rss", url: "https://www.prisma.io/blog/rss.xml", isKorean: false },
];

export function getFeedCategory(categoryId: FeedCategory["id"]) {
  return FEED_CATEGORIES.find((item) => item.id === categoryId) ?? null;
}

export function getSourcesForCategory(categoryId: FeedCategory["id"]) {
  return FEED_SOURCES.filter((item) => item.categoryId === categoryId);
}
