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

export type SignalWriterVisualAccent =
  | "amber"
  | "cyan"
  | "emerald"
  | "violet"
  | "rose";

export interface SignalWriterVisualStrategy {
  mode: SignalWriterVisualMode;
  accent: SignalWriterVisualAccent;
  badge: string;
  headline: string;
  subline: string;
  footer: string;
}

export interface SignalWriterSignal {
  id: string;
  categoryId: FeedCategoryId;
  categoryLabel: string;
  title: string;
  summary: string;
  sourceName: string;
  link: string;
  publishedAt: string;
  tags: string[];
  thumbnailUrl?: string;
  whyItMatters: string;
  score: number;
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
  mode: SignalWriterDraftMode;
  angle: SignalWriterAngle;
  hook: string;
  hookVariants: SignalWriterHookVariant[];
  shortPost: string;
  threadPosts: string[];
  hashtags: string[];
  whyNow: string;
  postingTips: string[];
  quality: SignalWriterQualityScore;
  generatedAt: string;
  sourceModel: "openai" | "template";
  visualStrategy: SignalWriterVisualStrategy;
  coverImageUrl: string | null;
  markdownPath: string | null;
  jsonPath: string | null;
}

export interface SignalWriterGenerateRequest {
  signal: SignalWriterSignal;
  mode?: SignalWriterDraftMode;
}

export interface SignalWriterGenerateResponse {
  draft: SignalWriterDraft;
}
