// Pure HTML/JSON-LD extraction for article source context. No network or
// filesystem access — callers fetch the HTML and pass it in.
import { parse, type HTMLElement } from "node-html-parser";

import { sanitizeText } from "@/lib/info-hub/sanitizer";
import type { SignalWriterSourceContext } from "@/lib/types";

export type ArticleMetadata = {
  title: string;
  description: string;
  siteName: string;
  author: string;
  publishedAt: string;
  canonicalUrl: string;
  topics: string[];
  articleBody: string;
};

export function extractArticleContext(html: string, url: string): SignalWriterSourceContext | null {
  const root = parse(html, {
    comment: false,
    lowerCaseTagName: false,
    blockTextElements: {
      script: true,
      style: true,
      noscript: false,
      pre: true,
    },
  });
  const metadata = extractArticleMetadata(root, html, url);
  const canonicalUrl = metadata.canonicalUrl || url;
  const domain = safeHostname(canonicalUrl) || safeHostname(url) || "";
  const bodyText = metadata.articleBody || extractPrimaryText(root, html);
  const opening = compactSentence(bodyText, 280);
  const summary = compactSentence(metadata.description || opening || metadata.title, 220);

  if (!summary) {
    return null;
  }

  const details = [
    metadata.title ? `Title: ${compactSentence(metadata.title, 160)}` : "",
    metadata.description ? `Description: ${compactSentence(metadata.description, 200)}` : "",
    opening ? `Opening lines: ${opening}` : "",
    metadata.author ? `Author: ${metadata.author}` : "",
    metadata.publishedAt ? `Published: ${metadata.publishedAt}` : "",
    metadata.topics.length > 0 ? `Keywords: ${metadata.topics.join(", ")}` : "",
    metadata.siteName ? `Site: ${metadata.siteName}` : domain ? `Domain: ${domain}` : "",
  ].filter(Boolean);

  return {
    kind: "web-article",
    label: compactSentence(metadata.title || metadata.siteName || domain || url, 140),
    title: metadata.title || undefined,
    summary,
    details: details.slice(0, 6),
    topics: metadata.topics,
    domain: domain || undefined,
    author: metadata.author || undefined,
    canonicalUrl,
    publishedAt: metadata.publishedAt || undefined,
  };
}

export function shouldUseBrowserFallback(context: SignalWriterSourceContext | null, html: string) {
  if (!context) {
    return true;
  }

  const summaryLength = context.summary.trim().length;
  const detailLength = context.details.join(" ").trim().length;
  const hasOpeningLines = context.details.some((item) => item.startsWith("Opening lines:"));
  const appShellSignal =
    /__next|__nuxt|data-reactroot|application\/ld\+json|id=["']app["']|id=["']root["']/i.test(html);

  if (summaryLength < 120 || detailLength < 220 || !hasOpeningLines) {
    return true;
  }

  return appShellSignal && detailLength < 320;
}

export function compactSentence(value: string, maxLength = 180) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

export function getMetaContent(html: string, attribute: "property" | "name", value: string) {
  const pattern = new RegExp(
    `<meta[^>]*${attribute}=["']${escapeRegExp(value)}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escapeRegExp(value)}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern) || html.match(reversePattern);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

export function getCanonicalUrl(html: string) {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.trim() || "";
}

export function getTagText(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? decodeHtmlEntities(sanitizeText(match[1], 240)) : "";
}

export function extractArticleMetadata(root: HTMLElement, html: string, url: string): ArticleMetadata {
  const jsonLd = extractJsonLdArticle(root);
  const title =
    jsonLd.title ||
    getMetaContent(html, "property", "og:title") ||
    getMetaContent(html, "name", "twitter:title") ||
    getTagText(html, "title") ||
    "";
  const description =
    jsonLd.description ||
    getMetaContent(html, "property", "og:description") ||
    getMetaContent(html, "name", "description") ||
    "";
  const siteName =
    jsonLd.siteName ||
    getMetaContent(html, "property", "og:site_name") ||
    getMetaContent(html, "name", "application-name") ||
    "";
  const author = jsonLd.author || getMetaContent(html, "name", "author") || "";
  const publishedAt =
    jsonLd.publishedAt ||
    getMetaContent(html, "property", "article:published_time") ||
    getMetaContent(html, "name", "publish-date") ||
    getMetaContent(html, "name", "article:published_time") ||
    "";
  const canonicalUrl = jsonLd.canonicalUrl || getCanonicalUrl(html) || url;
  const topicCandidates = [
    ...jsonLd.topics,
    ...splitTopicValues(getMetaContent(html, "name", "keywords")),
    ...splitTopicValues(getMetaContent(html, "property", "article:tag")),
  ];

  return {
    title,
    description,
    siteName,
    author,
    publishedAt,
    canonicalUrl,
    topics: dedupeCompact(topicCandidates).slice(0, 6),
    articleBody: jsonLd.articleBody,
  };
}

export function extractJsonLdArticle(root: HTMLElement) {
  const candidates = root.querySelectorAll('script[type="application/ld+json"]');
  let best: {
    title: string;
    description: string;
    siteName: string;
    author: string;
    publishedAt: string;
    canonicalUrl: string;
    topics: string[];
    articleBody: string;
    score: number;
  } | null = null;

  for (const script of candidates) {
    const raw = script.innerText?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const articleNodes = collectJsonLdArticleNodes(parsed);

      for (const node of articleNodes) {
        const candidate = normalizeJsonLdArticle(node);
        if (!candidate) {
          continue;
        }

        if (!best || candidate.score > best.score) {
          best = candidate;
        }
      }
    } catch {
      continue;
    }
  }

  return (
    best || {
      title: "",
      description: "",
      siteName: "",
      author: "",
      publishedAt: "",
      canonicalUrl: "",
      topics: [],
      articleBody: "",
      score: 0,
    }
  );
}

export function collectJsonLdArticleNodes(value: unknown): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      result.push(...collectJsonLdArticleNodes(item));
    }
    return result;
  }

  if (!value || typeof value !== "object") {
    return result;
  }

  const record = value as Record<string, unknown>;
  if (isArticleLikeType(record["@type"])) {
    result.push(record);
  }

  if (record["@graph"]) {
    result.push(...collectJsonLdArticleNodes(record["@graph"]));
  }

  if (record.mainEntity) {
    result.push(...collectJsonLdArticleNodes(record.mainEntity));
  }

  return result;
}

export function normalizeJsonLdArticle(record: Record<string, unknown>) {
  const title = pickFirstString(record.headline, record.name);
  const description = pickFirstString(record.description);
  const author = pickAuthorName(record.author);
  const publishedAt = pickFirstString(record.datePublished, record.dateCreated, record.dateModified);
  const canonicalUrl = pickUrlValue(record.url, record.mainEntityOfPage);
  const siteName = pickPublisherName(record.publisher);
  const articleBody = sanitizeText(pickFirstString(record.articleBody, record.text), 5000);
  const topics = dedupeCompact([
    ...splitTopicValues(record.keywords),
    ...splitTopicValues(record.articleSection),
  ]).slice(0, 6);

  const score =
    (title ? 6 : 0) +
    (description ? 4 : 0) +
    (articleBody ? 5 : 0) +
    (author ? 2 : 0) +
    (publishedAt ? 2 : 0) +
    topics.length;

  if (!title && !description && !articleBody) {
    return null;
  }

  return {
    title,
    description,
    siteName,
    author,
    publishedAt,
    canonicalUrl,
    topics,
    articleBody,
    score,
  };
}

export function extractPrimaryText(root: HTMLElement, html: string) {
  const candidates = [
    ...root.querySelectorAll("article"),
    ...root.querySelectorAll("main"),
    ...root.querySelectorAll("[role='main']"),
    ...root.querySelectorAll(
      ".article-content, .article-body, .post-content, .entry-content, .story-body, .blog-post, .markdown-body",
    ),
  ];

  let bestElement: HTMLElement | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreContentElement(candidate);
    if (score > bestScore) {
      bestElement = candidate;
      bestScore = score;
    }
  }

  if (bestElement) {
    const text = cleanElementText(bestElement);
    if (text) {
      return text;
    }
  }

  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ");
  const articleSection =
    matchFirstBlock(withoutNoise, "article") ||
    matchFirstBlock(withoutNoise, "main") ||
    matchFirstBlock(withoutNoise, "body") ||
    withoutNoise;

  return decodeHtmlEntities(
    sanitizeText(articleSection.replace(/<\/(p|div|section|article|li|h[1-6])>/gi, " "), 5000),
  );
}

export function scoreContentElement(element: HTMLElement) {
  const text = cleanElementText(element);
  if (!text) {
    return 0;
  }

  const paragraphCount = element.querySelectorAll("p").length;
  const headingCount = element.querySelectorAll("h1, h2, h3").length;
  const linkCount = element.querySelectorAll("a").length;
  const className = `${element.getAttribute("class") || ""} ${element.getAttribute("id") || ""}`.toLowerCase();
  const penalty = /(nav|footer|header|comment|related|share|social|menu|sidebar)/.test(className) ? 600 : 0;

  return text.length + paragraphCount * 120 + headingCount * 40 - linkCount * 20 - penalty;
}

export function cleanElementText(element: HTMLElement) {
  const text = decodeHtmlEntities(sanitizeText(element.textContent || "", 5000));
  return text;
}

export function matchFirstBlock(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] || "";
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function safeHostname(raw: string) {
  try {
    return new URL(raw).hostname.replace(/^www\./u, "");
  } catch {
    return "";
  }
}


export function isArticleLikeType(value: unknown) {
  const normalized = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
  return /(article|blogposting|newsarticle|report|techarticle)/i.test(normalized);
}

export function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return decodeHtmlEntities(value.trim());
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          return decodeHtmlEntities(item.trim());
        }
      }
    }
  }

  return "";
}

export function pickAuthorName(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return decodeHtmlEntities(value.trim());
  }

  if (Array.isArray(value)) {
    return value.map((item) => pickAuthorName(item)).find(Boolean) || "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return pickFirstString(record.name);
  }

  return "";
}

export function pickPublisherName(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return decodeHtmlEntities(value.trim());
  }

  if (Array.isArray(value)) {
    return value.map((item) => pickPublisherName(item)).find(Boolean) || "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return pickFirstString(record.name);
  }

  return "";
}

export function pickUrlValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const nested: string = pickUrlValue(...value);
      if (nested) {
        return nested;
      }
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const nested: string = pickUrlValue(record["@id"], record.url);
      if (nested) {
        return nested;
      }
    }
  }

  return "";
}

export function splitTopicValues(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => splitTopicValues(item));
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[,/|>#]/)
    .map((item) => decodeHtmlEntities(item.trim()))
    .filter(Boolean);
}

export function dedupeCompact(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
