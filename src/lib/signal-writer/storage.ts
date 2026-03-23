import "server-only";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getRuntimeConfig } from "@/lib/runtime/config";
import type { SignalWriterDraft, SignalWriterSignal } from "@/lib/types";

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
      },
      null,
      2,
    ),
    "utf8",
  );

  writeFileSync(markdownPath, buildMarkdown(signal, draft), "utf8");

  return {
    jsonPath: path.relative(process.cwd(), jsonPath),
    markdownPath: path.relative(process.cwd(), markdownPath),
  };
}

function buildMarkdown(signal: SignalWriterSignal, draft: SignalWriterDraft) {
  return [
    `# ${signal.title}`,
    "",
    `- Source: ${signal.sourceName}`,
    `- Published: ${signal.publishedAt}`,
    `- Category: ${signal.categoryLabel}`,
    `- Link: ${signal.link}`,
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
    "## Short Post",
    draft.shortPost,
    "",
    "## Thread",
    ...draft.threadPosts.map((item) => `- ${item}`),
    "",
    "## Hashtags",
    draft.hashtags.map((tag) => `#${tag}`).join(" "),
    "",
    "## Why Now",
    draft.whyNow,
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
    "",
  ].join("\n");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
