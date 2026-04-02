import type { FeedCategoryId } from "@/lib/types/info-hub";

export type SignalWriterVisualMode =
  | "news-flash"
  | "tool-spotlight"
  | "trend-brief"
  | "opinion-angle";

export type SignalWriterDraftMode =
  | "news-brief"
  | "insight"
  | "opinion"
  | "viral";

export type SignalWriterQualityLevel = "rough" | "solid" | "strong";
export type SignalWriterAiRunner = "auto" | "claude" | "codex" | "gemini" | "openai" | "template";
export type SignalWriterFactCheckRunner = Exclude<SignalWriterAiRunner, "auto" | "template">;
export type SignalWriterTargetChannel = "threads" | "x" | "linkedin";
export type SignalWriterTimingWindowId = "morning" | "lunch" | "afternoon" | "evening" | "night";
export type SignalWriterFactCheckVerdict = "pass" | "mixed" | "fail";
export type SignalWriterFactCheckFindingStatus = "supported" | "uncertain" | "incorrect";

export type SignalWriterVisualAccent =
  | "amber"
  | "cyan"
  | "emerald"
  | "violet"
  | "rose";

export type SignalWriterSelectionSource = "auto" | "manual";
export type SignalWriterTrendBoardId =
  | "github"
  | "npm"
  | "frontend"
  | "backend"
  | "fullstack"
  | "skills";

export interface SignalWriterVisualStrategy {
  mode: SignalWriterVisualMode;
  accent: SignalWriterVisualAccent;
  badge: string;
  headline: string;
  subline: string;
  footer: string;
}

export interface SignalWriterTimingWindow {
  id: SignalWriterTimingWindowId;
  label: string;
  description: string;
}

export interface SignalWriterTimingRecommendation {
  basis: "default" | "history";
  primaryWindow: SignalWriterTimingWindow;
  secondaryWindow?: SignalWriterTimingWindow;
  reason: string;
}

export interface SignalWriterTrendBoardItem {
  id: string;
  rank: number;
  title: string;
  summary: string;
  link: string;
  sourceName: string;
  categoryId: FeedCategoryId;
  categoryLabel: string;
  publishedAt: string;
  tags: string[];
  score: number;
  facts: string[];
  sourceContext?: SignalWriterSourceContext | null;
  reviewNote?: string;
}

export interface SignalWriterTrendBoard {
  id: SignalWriterTrendBoardId;
  label: string;
  description: string;
  items: SignalWriterTrendBoardItem[];
  generatedAt: string;
  nextRefreshAt: string;
}

export interface SignalWriterPerformanceSummary {
  matchedEntries: number;
  scoreBoost: number;
  averageViews: number;
  averageReplies: number;
  averageSaves: number;
  preferredChannel?: SignalWriterTargetChannel;
  preferredMode?: SignalWriterDraftMode;
  preferredRunner?: Exclude<SignalWriterAiRunner, "auto">;
  preferredHookStyle?: string;
  bestWindowId?: SignalWriterTimingWindowId;
  bestWindowLabel?: string;
}

export interface SignalWriterResearchAngle {
  label: string;
  summary: string;
  audience: string;
}

export interface SignalWriterSourceContext {
  kind: "github-repo" | "web-article";
  label: string;
  summary: string;
  details: string[];
  topics: string[];
  repoFullName?: string;
  stars?: number;
  forks?: number;
  language?: string;
  lastPushedAt?: string;
  homepage?: string;
  title?: string;
  domain?: string;
  author?: string;
  canonicalUrl?: string;
  publishedAt?: string;
}

export interface SignalWriterResearchModelResult {
  id: "claude" | "codex";
  runner: "claude" | "codex" | "template";
  status: "completed" | "fallback" | "unavailable" | "failed";
  summary: string;
  keyPoints: string[];
  hooks: string[];
  angles: SignalWriterResearchAngle[];
  questions: string[];
  watchouts: string[];
  heatScore: number;
  noveltyScore: number;
  debateScore: number;
  practicalScore: number;
  error?: string;
}

export interface SignalWriterResearchSynthesis {
  summary: string;
  whyNow: string;
  bestHook: string;
  bestQuestion: string;
  recommendedMode: SignalWriterDraftMode;
  recommendedRunner: Exclude<SignalWriterAiRunner, "auto" | "gemini" | "openai">;
  primaryAngle: SignalWriterAngle;
  keyPoints: string[];
  watchouts: string[];
}

export interface SignalWriterResearchResult {
  signalId: string;
  channel: SignalWriterTargetChannel;
  createdAt: string;
  sourceContext?: SignalWriterSourceContext | null;
  scores: {
    heat: number;
    novelty: number;
    debate: number;
    practical: number;
    overall: number;
  };
  claude: SignalWriterResearchModelResult;
  codex: SignalWriterResearchModelResult;
  synthesis: SignalWriterResearchSynthesis;
}

export interface SignalWriterResearchContext {
  summary: string;
  whyNow: string;
  bestHook: string;
  bestQuestion: string;
  primaryAngle: SignalWriterAngle;
  keyPoints: string[];
  watchouts: string[];
}

export interface SignalWriterFactCheckFinding {
  claim: string;
  status: SignalWriterFactCheckFindingStatus;
  reason: string;
  suggestedFix: string;
}

export interface SignalWriterFactCheckContext {
  summary: string;
  rewriteBrief: string;
  findings: SignalWriterFactCheckFinding[];
}

export interface SignalWriterSignal {
  id: string;
  categoryId: FeedCategoryId;
  categoryLabel: string;
  selectionSource?: SignalWriterSelectionSource;
  title: string;
  summary: string;
  sourceName: string;
  link: string;
  publishedAt: string;
  tags: string[];
  thumbnailUrl?: string;
  whyItMatters: string;
  score: number;
  performanceSummary?: SignalWriterPerformanceSummary;
}

export interface SignalWriterSignalsResponse {
  items: SignalWriterSignal[];
  generatedAt: string;
  nextRefreshAt: string;
}

export interface SignalWriterAngle {
  label: string;
  summary: string;
  audience: string;
}

export interface SignalWriterHookVariant {
  id: string;
  text: string;
  intent: string;
}

export interface SignalWriterQualityDimension {
  id: "hook" | "specificity" | "pointOfView" | "shareability";
  label: string;
  score: number;
  reason: string;
}

export interface SignalWriterQualityScore {
  total: number;
  level: SignalWriterQualityLevel;
  dimensions: SignalWriterQualityDimension[];
}

export interface SignalWriterDraft {
  id: string;
  signalId: string;
  title: string;
  channel: SignalWriterTargetChannel;
  mode: SignalWriterDraftMode;
  angle: SignalWriterAngle;
  hook: string;
  hookVariants: SignalWriterHookVariant[];
  shortPost: string;
  threadPosts: string[];
  firstComment: string;
  followUpReplies: string[];
  hashtags: string[];
  whyNow: string;
  postingTips: string[];
  timingRecommendation: SignalWriterTimingRecommendation;
  quality: SignalWriterQualityScore;
  generatedAt: string;
  sourceModel: Exclude<SignalWriterAiRunner, "auto">;
  visualStrategy: SignalWriterVisualStrategy;
  coverImageUrl: string | null;
  markdownPath: string | null;
  jsonPath: string | null;
}

export interface SignalWriterGenerateRequest {
  signal: SignalWriterSignal;
  channel?: SignalWriterTargetChannel;
  mode?: SignalWriterDraftMode;
  runner?: SignalWriterAiRunner;
  preferredHook?: string;
  researchContext?: SignalWriterResearchContext;
  factCheckContext?: SignalWriterFactCheckContext;
}

export interface SignalWriterGenerateResponse {
  draft: SignalWriterDraft;
}

export interface SignalWriterTrendBoardResponse {
  board: SignalWriterTrendBoard;
}

export interface SignalWriterTrendBoardGenerateRequest {
  board: SignalWriterTrendBoard;
  channel?: SignalWriterTargetChannel;
  runner?: SignalWriterAiRunner;
}

export interface SignalWriterTrendBoardDraft {
  id: string;
  boardId: SignalWriterTrendBoardId;
  title: string;
  boardSummary: string;
  hook: string;
  shortPost: string;
  threadPosts: string[];
  firstComment: string;
  followUpReplies: string[];
  hashtags: string[];
  whyNow: string;
  postingTips: string[];
  generatedAt: string;
  channel: SignalWriterTargetChannel;
  sourceModel: Exclude<SignalWriterAiRunner, "auto">;
}

export interface SignalWriterTrendBoardGenerateResponse {
  draft: SignalWriterTrendBoardDraft;
}

export interface SignalWriterResearchRequest {
  signal: SignalWriterSignal;
  channel?: SignalWriterTargetChannel;
}

export interface SignalWriterResearchResponse {
  research: SignalWriterResearchResult;
}

export interface SignalWriterFactCheckRequest {
  signal: SignalWriterSignal;
  draft: Pick<
    SignalWriterDraft,
    | "id"
    | "signalId"
    | "title"
    | "channel"
    | "mode"
    | "hook"
    | "shortPost"
    | "threadPosts"
    | "firstComment"
    | "followUpReplies"
    | "hashtags"
    | "whyNow"
  >;
  runner: SignalWriterFactCheckRunner;
}

export interface SignalWriterFactCheckResult {
  draftId: string;
  signalId: string;
  runner: SignalWriterFactCheckRunner;
  createdAt: string;
  verdict: SignalWriterFactCheckVerdict;
  confidence: number;
  summary: string;
  findings: SignalWriterFactCheckFinding[];
  rewriteBrief: string;
  sourceContext?: SignalWriterSourceContext | null;
}

export interface SignalWriterFactCheckResponse {
  factCheck: SignalWriterFactCheckResult;
}

export interface SignalWriterPerformanceEntry {
  id: string;
  draftId: string;
  signalId: string;
  channel: SignalWriterTargetChannel;
  hook: string;
  postUrl: string | null;
  postedAt: string | null;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  saves: number;
  notes: string;
  capturedAt: string;
}

export interface SignalWriterPerformanceRequest {
  jsonPath: string;
  draftId: string;
  signalId: string;
  channel: SignalWriterTargetChannel;
  hook: string;
  postUrl?: string;
  postedAt?: string;
  views?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  saves?: number;
  notes?: string;
}

export interface SignalWriterPerformanceResponse {
  entry: SignalWriterPerformanceEntry;
  totalEntries: number;
}
