import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getRuntimeConfig } from "@/lib/runtime/config";
import type {
  SignalWriterDraft,
  SignalWriterPerformanceEntry,
  SignalWriterSignal,
} from "@/lib/types";

interface PersistedSignalWriterArtifact {
  signal: SignalWriterSignal;
  draft: SignalWriterDraft;
  performanceEntries: SignalWriterPerformanceEntry[];
}

export function persistSignalWriterDraft(signal: SignalWriterSignal, draft: SignalWriterDraft) {
  const day = draft.generatedAt.slice(0, 10);
  const slug = slugify(signal.title) || signal.id;
  const artifactRoot = path.join(getRuntimeConfig().paths.dataDir, "signal-writer", day);
  mkdirSync(artifactRoot, { recursive: true });

  const jsonPath = path.join(artifactRoot, `${slug}.json`);
  const markdownPath = path.join(artifactRoot, `${slug}.md`);

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        signal,
        draft,
        performanceEntries: [],
      },
      null,
      2,
    ),
    "utf8",
  );

  writeFileSync(markdownPath, buildMarkdown(signal, draft, []), "utf8");

  return {
    jsonPath: path.relative(process.cwd(), jsonPath),
    markdownPath: path.relative(process.cwd(), markdownPath),
  };
}

export function persistSignalWriterPerformance(
  jsonPath: string,
  entry: SignalWriterPerformanceEntry,
) {
  const resolvedJsonPath = resolveSignalWriterArtifactPath(jsonPath);
  const artifact = readArtifact(resolvedJsonPath);
  const nextEntries = [...artifact.performanceEntries, entry];

  writeFileSync(
    resolvedJsonPath,
    JSON.stringify(
      {
        signal: artifact.signal,
        draft: artifact.draft,
        performanceEntries: nextEntries,
      },
      null,
      2,
    ),
    "utf8",
  );

  const markdownPath = resolvedJsonPath.replace(/\.json$/u, ".md");
  writeFileSync(markdownPath, buildMarkdown(artifact.signal, artifact.draft, nextEntries), "utf8");

  return {
    entry,
    totalEntries: nextEntries.length,
  };
}

function buildMarkdown(
  signal: SignalWriterSignal,
  draft: SignalWriterDraft,
  performanceEntries: SignalWriterPerformanceEntry[],
) {
  const firstComment = typeof draft.firstComment === "string" ? draft.firstComment : "";
  const followUpReplies = Array.isArray(draft.followUpReplies) ? draft.followUpReplies : [];
  const timingRecommendation = draft.timingRecommendation;

  return [
    `# ${signal.title}`,
    "",
    `- Source: ${signal.sourceName}`,
    `- Published: ${signal.publishedAt}`,
    `- Category: ${signal.categoryLabel}`,
    `- Link: ${signal.link}`,
    `- Channel: ${draft.channel}`,
    `- Draft mode: ${draft.mode}`,
    "",
    "## Signal Summary",
    signal.summary,
    "",
    "## Why It Matters",
    signal.whyItMatters,
    "",
    "## Angle",
    `- Label: ${draft.angle.label}`,
    `- Summary: ${draft.angle.summary}`,
    `- Audience: ${draft.angle.audience}`,
    "",
    "## Hook",
    draft.hook,
    "",
    "## Hook Variants",
    ...draft.hookVariants.map((item) => `- ${item.intent}: ${item.text}`),
    "",
    "## Primary Post",
    draft.shortPost,
    "",
    "## Series Posts",
    ...draft.threadPosts.map((item) => `- ${item}`),
    "",
    "## Comment Kit",
    `- First comment: ${firstComment || "-"}`,
    ...followUpReplies.map((item, index) => `- Follow-up ${index + 1}: ${item}`),
    "",
    "## Hashtags",
    draft.hashtags.map((tag) => `#${tag}`).join(" "),
    "",
    "## Why Now",
    draft.whyNow,
    "",
    "## Timing Recommendation",
    `- Basis: ${timingRecommendation?.basis ?? "-"}`,
    `- Primary: ${timingRecommendation?.primaryWindow.label ?? "-"}`,
    ...(timingRecommendation?.secondaryWindow
      ? [`- Secondary: ${timingRecommendation.secondaryWindow.label}`]
      : []),
    `- Reason: ${timingRecommendation?.reason ?? "-"}`,
    "",
    "## Quality Score",
    `- Total: ${draft.quality.total}`,
    `- Level: ${draft.quality.level}`,
    ...draft.quality.dimensions.map(
      (item) => `- ${item.label} (${item.score}/10): ${item.reason}`,
    ),
    "",
    "## Visual Strategy",
    `- Mode: ${draft.visualStrategy.mode}`,
    `- Accent: ${draft.visualStrategy.accent}`,
    `- Badge: ${draft.visualStrategy.badge}`,
    `- Headline: ${draft.visualStrategy.headline}`,
    `- Footer: ${draft.visualStrategy.footer}`,
    ...(signal.thumbnailUrl ? ["", "## Source Image", signal.thumbnailUrl] : []),
    ...(draft.coverImageUrl ? ["", "## Generated Cover", draft.coverImageUrl] : []),
    "",
    "## Posting Tips",
    ...draft.postingTips.map((item) => `- ${item}`),
    ...(performanceEntries.length > 0
      ? [
          "",
          "## Performance Logs",
          ...performanceEntries.flatMap((item) => [
            `- Captured: ${item.capturedAt}`,
            `  - Posted: ${item.postedAt || "-"}`,
            `  - Hook: ${item.hook}`,
            `  - URL: ${item.postUrl || "-"}`,
            `  - Views: ${item.views}`,
            `  - Likes: ${item.likes}`,
            `  - Replies: ${item.replies}`,
            `  - Reposts: ${item.reposts}`,
            `  - Saves: ${item.saves}`,
            ...(item.notes ? [`  - Notes: ${item.notes}`] : []),
          ]),
        ]
      : []),
    "",
  ].join("\n");
}

function readArtifact(jsonPath: string): PersistedSignalWriterArtifact {
  if (!existsSync(jsonPath)) {
    throw new Error("Signal Writer artifact file does not exist.");
  }

  const raw = readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<PersistedSignalWriterArtifact>;

  if (!parsed.signal || !parsed.draft) {
    throw new Error("Signal Writer artifact is invalid.");
  }

  return {
    signal: parsed.signal,
    draft: parsed.draft,
    performanceEntries: Array.isArray(parsed.performanceEntries) ? parsed.performanceEntries : [],
  };
}

function resolveSignalWriterArtifactPath(relativePath: string) {
  const runtimeDataRoot = path.resolve(getRuntimeConfig().paths.dataDir, "signal-writer");
  const absolutePath = path.resolve(process.cwd(), relativePath);

  if (
    !absolutePath.startsWith(`${runtimeDataRoot}${path.sep}`) &&
    absolutePath !== runtimeDataRoot
  ) {
    throw new Error("Signal Writer artifact path is outside the allowed directory.");
  }

  return absolutePath;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
