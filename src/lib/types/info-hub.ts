// ───────────────────────────────────────────────
// Info Hub — TypeScript Type Definitions
// ───────────────────────────────────────────────

// Feed category identifiers
export type FeedCategoryId =
  | "ai-cli-updates"
  | "ai-skill-trends"
  | "mcp-ecosystem"
  | "github-trending"
  | "npm-trends"
  | "ai-agent-prompt"
  | "webdev-news"
  | "korean-dev-news"
  | "my-stack-news"
  | "my-packages"
  | "security-audit";

// Feed item source type (how data is fetched)
export type FeedSourceType = "rss" | "github-api" | "npm-api" | "scrape";

// Translation state of a feed item
export type TranslationState = "original" | "translated" | "pending";

// ───────────────────────────────────────────────
// Core Feed Types
// ───────────────────────────────────────────────

export interface FeedCategory {
  id: FeedCategoryId;
  label: string;         // Korean display label
  labelEn: string;       // English label (for badge/icon)
  icon: string;          // lucide-react icon name
  color: string;         // Tailwind color class prefix (e.g. "blue", "purple")
  cacheTtlMs: number;    // Cache TTL in milliseconds
}

export interface FeedSource {
  id: string;
  categoryId: FeedCategoryId;
  name: string;          // Display name (e.g. "Claude Code Releases")
  type: FeedSourceType;
  url: string;           // RSS URL or API endpoint base
  logoUrl?: string;      // Optional source logo
  isKorean: boolean;     // Whether source is primarily Korean
}

export interface FeedItem {
  id: string;                    // Deterministic: sha1(url) or `${source.id}:${link}`
  categoryId: FeedCategoryId;
  sourceId: string;
  sourceName: string;

  title: string;                 // Original title
  titleKo?: string;              // Korean translated title (may be absent)
  summary: string;               // Original excerpt/description (≤200 chars)
  summaryKo?: string;            // Korean translated summary (may be absent)

  link: string;                  // Article/item URL
  googleTranslateUrl: string;    // Pre-built Google Translate link for full page

  author?: string;
  publishedAt: string;           // ISO 8601
  publishedTimestamp: number;

  tags: string[];                // From RSS categories / GitHub topics / npm keywords
  thumbnailUrl?: string;

  // GitHub Trending / npm specific extras
  extra?: FeedItemExtra;
}

// Extra data for GitHub Trending and npm Trends items
export interface FeedItemExtra {
  model?: AiSkillModel;
  recommendationReason?: string;
  score?: number;
  skillType?: "github-repo" | "npm-package";
  // GitHub Trending
  stars?: number;
  starsDelta?: number;   // Stars gained "today" / "this week"
  forks?: number;
  language?: string;
  repoOwner?: string;
  repoName?: string;

  // npm Trends
  weeklyDownloads?: number;
  version?: string;
  npmPackage?: string;
}

export type AiSkillModel = "Claude" | "Codex" | "Gemini" | "General";

export interface AiSkillRecommendationSection {
  model: AiSkillModel;
  summary: string;
  items: FeedItem[];
}

export interface AiSkillRecommendationsResponse {
  sections: AiSkillRecommendationSection[];
  projectSignals: string[];
  cachedAt: string;
  nextRefreshAt: string;
}

// ───────────────────────────────────────────────
// API Response Types
// ───────────────────────────────────────────────

export interface FeedResponse {
  items: FeedItem[];
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
  categoryId: FeedCategoryId | "all";
  query: string;
  cachedAt: string;           // ISO 8601 — when cache was populated
  nextRefreshAt: string;      // ISO 8601 — when cache will expire
}

export interface FeedSourcesResponse {
  sources: FeedSource[];
  categories: FeedCategory[];
}

export interface TrendingItem {
  type: "github" | "npm";
  rank: number;
  name: string;               // repo full name or package name
  description: string;
  link: string;
  extra: FeedItemExtra;
  publishedAt: string;
}

export interface TrendingResponse {
  github: TrendingItem[];
  npm: TrendingItem[];
  cachedAt: string;
  nextRefreshAt: string;
}

export interface PackageUpdate {
  name: string;
  currentVersion: string;
  latestVersion: string;
  updateType: "major" | "minor";
  projects: string[];
  npmUrl: string;
  changelogUrl: string;
}

export interface PackageUpdatesResponse {
  items: PackageUpdate[];
  totalCount: number;
  cachedAt: string;
  nextRefreshAt: string;
}

export interface AuditIssue {
  package: string;
  severity: "critical" | "high" | "moderate" | "low";
  title: string;
  fixAvailable: boolean;
}

export interface AuditResult {
  project: string;
  vulnerabilities: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    total: number;
  };
  topIssues: AuditIssue[];
  lastChecked: string;
}

export interface SecurityAuditResponse {
  items: AuditResult[];
  totalCount: number;
  cachedAt: string;
  nextRefreshAt: string;
}

// ───────────────────────────────────────────────
// LocalStorage Persistence Types
// ───────────────────────────────────────────────

// Stored in localStorage key: "info-hub:bookmarks"
export interface BookmarkedItem {
  feedItemId: string;
  feedItem: FeedItem;       // Snapshot at time of bookmark
  bookmarkedAt: string;     // ISO 8601
}

// Stored in localStorage key: "info-hub:read"
export interface ReadItem {
  feedItemId: string;
  readAt: string;           // ISO 8601
}

// Aggregated localStorage state (in-memory shape)
export interface InfoHubLocalState {
  bookmarks: Record<string, BookmarkedItem>;  // key: feedItemId
  readItems: Record<string, ReadItem>;        // key: feedItemId
}

// ───────────────────────────────────────────────
// UI Filter / Query State
// ───────────────────────────────────────────────

export interface InfoHubFilter {
  categoryId: FeedCategoryId | "all";
  page: number;
  limit: number;
  query: string;
  showBookmarksOnly: boolean;
  showUnreadOnly: boolean;
}
