import { z } from "zod";

import { CALL_DOC_TYPES } from "@/lib/call-to-prd/document-config";
import {
  CALL_CUSTOMER_IMPACTS,
  CALL_INPUT_KINDS,
  CALL_REPRODUCIBILITY_STATES,
  CALL_SEVERITIES,
  CALL_URGENCY_LEVELS,
} from "@/lib/call-to-prd/intake-config";

const nonEmptyString = z.string().trim().min(1);
const optionalTrimmedString = z.string().trim().optional();
const nullableTrimmedString = z.string().trim().nullable().optional();
const stringArray = z.array(nonEmptyString);
const nonNegativeInt = z.coerce.number().int().min(0);
const feedCategoryIds = [
  "ai-cli-updates",
  "ai-skill-trends",
  "mcp-ecosystem",
  "github-trending",
  "npm-trends",
  "ai-agent-prompt",
  "webdev-news",
  "korean-dev-news",
  "my-stack-news",
  "my-packages",
  "security-audit",
] as const;
const signalWriterTrendBoardIds = ["github", "npm", "frontend", "backend", "fullstack", "skills"] as const;
const searchString = z.string().trim();
const optionalSearchString = z.string().optional().transform((value) => value?.trim() ?? "");
const searchBooleanFlag = z
  .enum(["0", "1"])
  .optional()
  .transform((value) => value === "1");
const positiveIntParam = (fallback: number, max?: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : value),
    max
      ? z.coerce.number().int().positive().max(max)
      : z.coerce.number().int().positive(),
  );
const csvStringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(nonEmptyString));
const safeRelativePathString = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !value.includes(".."), "Path traversal is not allowed.");

export const routeIdParamSchema = z.object({
  id: nonEmptyString,
});

export const routeRunIdParamSchema = z.object({
  runId: nonEmptyString,
});

export const routeActionIdParamSchema = z.object({
  actionId: nonEmptyString,
});

export const savedBundleFileNameParamSchema = z.object({
  fileName: safeRelativePathString,
});

export const searchQuerySchema = z.object({
  q: optionalSearchString,
});

export const docHubSearchQuerySchema = z.object({
  q: searchString.min(1),
});

export const docHubContentQuerySchema = z.object({
  project: safeRelativePathString,
  file: safeRelativePathString,
});

export const infoHubFeedQuerySchema = z.object({
  category: z.union([z.enum(feedCategoryIds), z.literal("all")]).optional().default("all"),
  page: positiveIntParam(1, 1000),
  limit: positiveIntParam(20, 100),
  q: optionalSearchString,
  refresh: searchBooleanFlag,
});

export const refreshOnlyQuerySchema = z.object({
  refresh: searchBooleanFlag,
});

export const callSavedBundlesQuerySchema = z.object({
  query: optionalSearchString,
  page: positiveIntParam(1, 1000),
  pageSize: positiveIntParam(6, 50),
});

export const callProjectContextQuerySchema = z.object({
  projectPath: nonEmptyString,
});

export const fileManagerPreviewQuerySchema = z.object({
  action: z.enum(["move", "delete", "review", "keep"]).optional().default("review"),
  files: csvStringArray,
});

export const iCloudBrowseQuerySchema = z.object({
  path: z.string().optional().transform((value) => value?.trim() ?? "").refine(
    (value) => !value.includes(".."),
    "Path traversal is not allowed.",
  ),
});

export const meetingHubGithubOverviewQuerySchema = z.object({
  repos: csvStringArray,
});

export const signalWriterCoverQuerySchema = z.object({
  title: optionalSearchString.transform((value) => value || "Signal Writer"),
  subtitle: optionalSearchString,
  badge: optionalSearchString.transform((value) => value || "Signal"),
  footer: optionalSearchString,
  source: optionalSearchString,
  accent: z.enum(["amber", "cyan", "emerald", "violet", "rose"]).optional().default("amber"),
  mode: z.enum(["news-flash", "tool-spotlight", "trend-brief", "opinion-angle"]).optional().default("news-flash"),
});

export const signalWriterTrendBoardQuerySchema = z.object({
  board: z.enum(signalWriterTrendBoardIds),
  limit: positiveIntParam(10, 20),
  refresh: searchBooleanFlag,
});

export const skillRunRequestSchema = z.object({
  skillId: nonEmptyString,
  inputs: z.record(z.string(), z.string()),
});

export const csRequestSchema = z.object({
  projectId: nonEmptyString,
  runner: z.enum(["claude", "codex", "gemini", "openai"]),
  channel: z.enum(["kakao", "email", "instagram", "phone", "other"]),
  tone: z.enum(["friendly", "formal", "casual"]),
  inputMode: z.enum(["customer", "summary"]),
  customerMessage: z.string(),
  additionalContext: z.string(),
  includeAnalysis: z.boolean(),
});

export const csContextInitRequestSchema = z.object({
  projectName: nonEmptyString,
});

export const csRegenerateRequestSchema = z.object({
  originalId: nonEmptyString,
  tone: z.enum(["friendly", "formal", "casual"]).optional(),
  runner: z.enum(["claude", "codex", "gemini", "openai"]).optional(),
  includeAnalysis: z.boolean().optional(),
});

export const signalWriterGenerateRequestSchema = z.object({
  signal: z.object({
    id: nonEmptyString,
    categoryId: z.enum(feedCategoryIds),
    categoryLabel: nonEmptyString,
    selectionSource: z.enum(["auto", "manual"]).optional(),
    title: nonEmptyString,
    summary: nonEmptyString,
    sourceName: nonEmptyString,
    link: nonEmptyString,
    publishedAt: nonEmptyString,
    tags: z.array(z.string()),
    thumbnailUrl: z.string().optional(),
    whyItMatters: nonEmptyString,
    score: z.number(),
  }),
  channel: z.enum(["threads", "x", "linkedin"]).optional(),
  mode: z.enum(["news-brief", "insight", "opinion", "viral"]).optional(),
  runner: z.enum(["auto", "claude", "codex", "gemini", "openai", "template"]).optional(),
  preferredHook: optionalTrimmedString,
  researchContext: z.object({
    summary: nonEmptyString,
    whyNow: nonEmptyString,
    bestHook: nonEmptyString,
    bestQuestion: nonEmptyString,
    primaryAngle: z.object({
      label: nonEmptyString,
      summary: nonEmptyString,
      audience: nonEmptyString,
    }),
    keyPoints: z.array(nonEmptyString).max(5),
    watchouts: z.array(nonEmptyString).max(5),
  }).optional(),
  factCheckContext: z.object({
    summary: nonEmptyString,
    rewriteBrief: nonEmptyString,
    findings: z.array(
      z.object({
        claim: nonEmptyString,
        status: z.enum(["supported", "uncertain", "incorrect"]),
        reason: nonEmptyString,
        suggestedFix: nonEmptyString,
      }),
    ).max(5),
  }).optional(),
});

export const signalWriterResearchRequestSchema = z.object({
  signal: signalWriterGenerateRequestSchema.shape.signal,
  channel: z.enum(["threads", "x", "linkedin"]).optional(),
});

export const signalWriterFactCheckRequestSchema = z.object({
  signal: signalWriterGenerateRequestSchema.shape.signal,
  draft: z.object({
    id: nonEmptyString,
    signalId: nonEmptyString,
    title: nonEmptyString,
    channel: z.enum(["threads", "x", "linkedin"]),
    mode: z.enum(["news-brief", "insight", "opinion", "viral"]),
    hook: nonEmptyString,
    shortPost: nonEmptyString,
    threadPosts: z.array(nonEmptyString).max(8),
    firstComment: nonEmptyString,
    followUpReplies: z.array(nonEmptyString).max(6),
    hashtags: z.array(z.string()).max(8),
    whyNow: nonEmptyString,
  }),
  runner: z.enum(["claude", "codex", "gemini", "openai"]),
});

export const affiliateProductInputSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  affiliateUrl: optionalTrimmedString,
  referenceUrl: optionalTrimmedString,
  priceText: nonEmptyString,
  category: nonEmptyString,
  sellingPoints: z.array(nonEmptyString).max(5),
  trustPoints: z.array(nonEmptyString).max(5),
  cautionPoints: z.array(nonEmptyString).max(5),
});

export const affiliateTrendItemSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  summary: nonEmptyString,
  whyNow: nonEmptyString,
  sourceName: nonEmptyString,
  link: nonEmptyString,
  publishedAt: nonEmptyString,
  tags: z.array(z.string()),
  searchQueries: z.array(nonEmptyString).max(5),
  watchouts: z.array(nonEmptyString).max(5),
  categoryHint: z.enum(["digital", "home", "lifestyle", "beauty", "mixed"]),
  freshnessScore: z.number(),
  viralityScore: z.number(),
  commerceFitScore: z.number(),
  overallScore: z.number(),
  evidence: z.array(
    z.object({
      id: nonEmptyString,
      sourceName: nonEmptyString,
      link: nonEmptyString,
      publishedAt: nonEmptyString,
      title: nonEmptyString,
      summary: nonEmptyString,
      tags: z.array(z.string()),
    }),
  ).min(1).max(4),
});

export const affiliateFactCheckContextSchema = z.object({
  summary: nonEmptyString,
  rewriteBrief: nonEmptyString,
  findings: z.array(
    z.object({
      claim: nonEmptyString,
      status: z.enum(["supported", "uncertain", "incorrect"]),
      reason: nonEmptyString,
      suggestedFix: nonEmptyString,
    }),
  ).max(5),
});

export const affiliateProductHintsRequestSchema = z.object({
  trend: affiliateTrendItemSchema,
  candidates: z.array(affiliateProductInputSchema).max(3).optional(),
});

export const affiliateGenerateDraftRequestSchema = z.object({
  trend: affiliateTrendItemSchema,
  product: affiliateProductInputSchema,
  runner: z.enum(["auto", "claude", "codex", "gemini", "openai", "template"]).optional(),
  preferredHook: optionalTrimmedString,
  factCheckContext: affiliateFactCheckContextSchema.optional(),
});

export const affiliateFactCheckRequestSchema = z.object({
  trend: affiliateTrendItemSchema,
  product: affiliateProductInputSchema,
  draft: z.object({
    id: nonEmptyString,
    trendId: nonEmptyString,
    productId: nonEmptyString,
    title: nonEmptyString,
    channel: z.literal("threads"),
    hook: nonEmptyString,
    shortPost: nonEmptyString,
    threadPosts: z.array(nonEmptyString).max(6),
    firstComment: nonEmptyString,
    ctaVariants: z.array(nonEmptyString).max(4),
    disclosure: nonEmptyString,
    hashtags: z.array(z.string()).max(8),
    whyBuyNow: nonEmptyString,
  }),
  runner: z.enum(["claude", "codex", "gemini", "openai"]),
});

export const affiliateLogPostRequestSchema = z.object({
  jsonPath: safeRelativePathString,
  draftId: nonEmptyString,
  trendId: nonEmptyString,
  productId: nonEmptyString,
  postedAt: nonEmptyString,
  postUrl: optionalTrimmedString,
  hook: nonEmptyString,
  notes: optionalTrimmedString,
});

export const affiliateImportPerformanceRequestSchema = z.object({
  jsonPath: safeRelativePathString.optional(),
  draftId: optionalTrimmedString,
  reportDate: nonEmptyString,
  clicks: nonNegativeInt,
  orders: nonNegativeInt,
  orderAmount: nonNegativeInt,
  revenue: nonNegativeInt,
  conversionRate: z.coerce.number().min(0).max(100).optional(),
  notes: optionalTrimmedString,
});

export const signalWriterTrendBoardGenerateRequestSchema = z.object({
  board: z.object({
    id: z.enum(signalWriterTrendBoardIds),
    label: nonEmptyString,
    description: nonEmptyString,
    generatedAt: nonEmptyString,
    nextRefreshAt: nonEmptyString,
    items: z.array(
      z.object({
        id: nonEmptyString,
        rank: nonNegativeInt,
        title: nonEmptyString,
        summary: nonEmptyString,
        link: nonEmptyString,
        sourceName: nonEmptyString,
        categoryId: z.enum(feedCategoryIds),
        categoryLabel: nonEmptyString,
        publishedAt: nonEmptyString,
        tags: z.array(z.string()),
        score: z.number(),
        facts: z.array(nonEmptyString),
        reviewNote: optionalTrimmedString,
        sourceContext: z.object({
          kind: z.enum(["github-repo", "web-article"]),
          label: nonEmptyString,
          summary: nonEmptyString,
          details: z.array(nonEmptyString),
          topics: z.array(nonEmptyString),
          repoFullName: optionalTrimmedString,
          stars: nonNegativeInt.optional(),
          forks: nonNegativeInt.optional(),
          language: optionalTrimmedString,
          lastPushedAt: optionalTrimmedString,
          homepage: optionalTrimmedString,
          title: optionalTrimmedString,
          domain: optionalTrimmedString,
          author: optionalTrimmedString,
          canonicalUrl: optionalTrimmedString,
          publishedAt: optionalTrimmedString,
        }).nullable().optional(),
      }),
    ).min(1).max(20),
  }),
  channel: z.enum(["threads", "x", "linkedin"]).optional(),
  runner: z.enum(["auto", "claude", "codex", "gemini", "openai", "template"]).optional(),
});

export const signalWriterPerformanceRequestSchema = z.object({
  jsonPath: safeRelativePathString.refine(
    (value) => value.startsWith("data/signal-writer/") && value.endsWith(".json"),
    "Signal Writer artifact path is invalid.",
  ),
  draftId: nonEmptyString,
  signalId: nonEmptyString,
  channel: z.enum(["threads", "x", "linkedin"]),
  hook: nonEmptyString,
  postUrl: z
    .union([z.literal(""), z.string().trim().url()])
    .optional()
    .transform((value) => value ?? ""),
  postedAt: z
    .union([z.literal(""), z.string().trim()])
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), "A valid posted timestamp is required."),
  views: nonNegativeInt.optional().default(0),
  likes: nonNegativeInt.optional().default(0),
  replies: nonNegativeInt.optional().default(0),
  reposts: nonNegativeInt.optional().default(0),
  saves: nonNegativeInt.optional().default(0),
  notes: z.string().trim().max(500).optional().default(""),
});

export const fileManagerExecuteRequestSchema = z.object({
  actions: z.array(
    z.object({
      type: z.enum(["move", "delete"]),
      sourcePath: nonEmptyString,
      destinationPath: z.string().nullable(),
      command: nonEmptyString,
    }),
  ),
  dryRun: z.boolean().optional(),
});

export const autoOrganizeRequestSchema = z.object({
  target: z.enum(["desktop", "downloads", "both"]).optional(),
  dryRun: z.boolean().optional(),
});

export const cleanNodeModulesRequestSchema = z.object({
  dryRun: z.boolean().optional(),
  projectPaths: stringArray.optional(),
});

export const meetingHubTeamInputSchema = z.object({
  name: nonEmptyString,
  description: optionalTrimmedString,
  members: z.array(
    z.object({
      name: nonEmptyString,
      role: optionalTrimmedString,
      email: optionalTrimmedString,
      githubLogin: optionalTrimmedString,
    }),
  ).optional(),
  connectedProjectIds: stringArray.optional(),
  defaultRepository: nullableTrimmedString,
});

export const meetingHubMeetingInputSchema = z.object({
  teamId: nonEmptyString,
  title: nonEmptyString,
  type: z.enum(["standup", "planning", "review", "retro", "client"]),
  date: nonEmptyString,
  inputSource: z.enum(["text", "audio"]).optional(),
  participants: stringArray.optional(),
  linkedProjectIds: stringArray.optional(),
  linkedRepository: nullableTrimmedString,
  sourceFileName: nullableTrimmedString,
  notes: nonEmptyString,
  useAi: z.boolean().optional(),
  runner: z.enum(["auto", "claude", "codex", "gemini", "openai", "rule"]).optional(),
});

export const meetingHubProcessRequestSchema = z.object({
  teamId: optionalTrimmedString,
  title: optionalTrimmedString,
  type: z.enum(["standup", "planning", "review", "retro", "client"]).optional(),
  date: optionalTrimmedString,
  participants: stringArray.optional(),
  linkedRepository: nullableTrimmedString,
  notes: nonEmptyString,
  runner: z.enum(["auto", "claude", "codex", "gemini", "openai", "rule"]).optional(),
});

export const meetingHubActionUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "done"]),
});

export const meetingHubGithubIssueCreateSchema = z.object({
  actionId: nonEmptyString,
  repo: nonEmptyString,
  title: nonEmptyString,
  body: nonEmptyString,
});

export const callNextActionRequestSchema = z.object({
  actionType: z.enum([
    "pm-handoff",
    "frontend-plan",
    "backend-plan",
    "qa-plan",
    "cs-brief",
    "github-issues",
  ]),
  savedEntryName: nullableTrimmedString,
  projectName: nullableTrimmedString,
  customerName: nullableTrimmedString,
  projectContext: nullableTrimmedString,
  projectContextSources: z.array(nonEmptyString).optional().default([]),
  baselineTitle: nullableTrimmedString,
  baselinePrd: nullableTrimmedString,
  additionalContext: nullableTrimmedString,
  inputKind: z.enum(CALL_INPUT_KINDS).optional(),
  severity: z.enum(CALL_SEVERITIES).optional(),
  customerImpact: z.enum(CALL_CUSTOMER_IMPACTS).optional(),
  urgency: z.enum(CALL_URGENCY_LEVELS).optional(),
  reproducibility: z.enum(CALL_REPRODUCIBILITY_STATES).optional(),
  currentWorkaround: nullableTrimmedString,
  separateExternalDocs: z.boolean().optional(),
  prdMarkdown: nonEmptyString,
  generatedDocs: z.array(
    z.object({
      type: z.enum(CALL_DOC_TYPES),
      title: nonEmptyString,
      markdown: nonEmptyString,
    }),
  ).default([]),
});

export const callSectionRegenerateRequestSchema = z.object({
  bundleId: safeRelativePathString,
  docType: z.enum(CALL_DOC_TYPES),
  sectionId: nonEmptyString,
  hint: optionalTrimmedString,
});

export const callObsidianExportRequestSchema = z.object({
  title: optionalTrimmedString,
  bundleId: optionalTrimmedString,
  projectName: nullableTrimmedString,
  customerName: nullableTrimmedString,
  createdAt: optionalTrimmedString,
  markdown: nonEmptyString,
});

export const callHistoryDeleteSchema = z.object({
  id: nonEmptyString,
});

export const runtimeSettingsRequestSchema = z.object({
  paths: z.object({
    projectsRoot: nullableTrimmedString,
    dataRoot: nullableTrimmedString,
    prdSaveDir: nullableTrimmedString,
    csContextsDir: nullableTrimmedString,
    allowedRoots: stringArray.optional(),
  }).optional(),
  secrets: z.object({
    openaiApiKey: optionalTrimmedString,
    clearOpenaiApiKey: z.boolean().optional(),
  }).optional(),
});

export const runtimeInstallRequestSchema = z.object({
  taskIds: stringArray.min(1),
});

export const appLaunchRequestSchema = z.object({
  appPath: nonEmptyString,
});

export const processKillRequestSchema = z.object({
  pid: z.number().int(),
  signal: z.enum(["SIGTERM", "SIGKILL"]).optional(),
});
