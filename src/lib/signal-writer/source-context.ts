import "server-only";

import { Buffer } from "node:buffer";
import { parse, type HTMLElement } from "node-html-parser";
import { access } from "node:fs/promises";
import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import { FEED_SOURCES } from "@/lib/info-hub/categories";
import { sanitizeText } from "@/lib/info-hub/sanitizer";
import { readThroughCache } from "@/lib/parsers/cache";
import type { SignalWriterSignal, SignalWriterSourceContext } from "@/lib/types";

const GITHUB_CONTEXT_TTL_MS = 6 * 60 * 60_000;
const ARTICLE_CONTEXT_TTL_MS = 6 * 60 * 60_000;
const ROBOTS_TTL_MS = 12 * 60 * 60_000;
const ARTICLE_BROWSER_TIMEOUT_MS = 15_000;
const ARTICLE_ALLOWLIST_HOSTS = buildArticleAllowlistHosts();
const ARTICLE_PAYWALL_HOST_DENYLIST = ["medium.com", "www.medium.com", "substack.com"];
const ARTICLE_LOGIN_PATH_PATTERNS = [/(^|\/)(login|signin|sign-in|subscribe|membership|checkout|account|paywall)(\/|$)/i];
const BLOCKING_ROBOTS_DIRECTIVES = ["nosnippet", "noarchive", "none"];

let browserExecutablePathPromise: Promise<string | null> | null = null;

type GithubRepoApiResponse = {
  full_name?: string;
  description?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  language?: string | null;
  topics?: string[];
  homepage?: string | null;
  pushed_at?: string | null;
};

type GithubReadmeApiResponse = {
  content?: string;
  encoding?: string;
};

type ArticleMetadata = {
  title: string;
  description: string;
  siteName: string;
  author: string;
  publishedAt: string;
  canonicalUrl: string;
  topics: string[];
  articleBody: string;
};

type RobotsPolicy = {
  allowRules: string[];
  disallowRules: string[];
};

export async function loadSignalWriterSourceContext(
  signal: SignalWriterSignal,
): Promise<SignalWriterSourceContext | null> {
  const repo = extractGithubRepo(signal);

  if (repo) {
    return readThroughCache(
      `signal-writer:source-context:${repo.owner}/${repo.name}`,
      GITHUB_CONTEXT_TTL_MS,
      () => fetchGithubRepoContext(repo.owner, repo.name),
    );
  }

  const articleUrl = normalizeArticleUrl(signal.link);
  if (!articleUrl) {
    return null;
  }

  return readThroughCache(
    `signal-writer:source-context:article:${articleUrl}`,
    ARTICLE_CONTEXT_TTL_MS,
    () => fetchArticleContext(articleUrl),
  );
}

async function fetchGithubRepoContext(owner: string, name: string): Promise<SignalWriterSourceContext | null> {
  const headers = {
    "User-Agent": APP_META.slug,
    Accept: "application/vnd.github+json",
  };

  try {
    const [repoRes, readmeRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`https://api.github.com/repos/${owner}/${name}/readme`, {
        headers,
        cache: "no-store",
      }),
    ]);

    if (!repoRes.ok) {
      return null;
    }

    const repo = (await repoRes.json()) as GithubRepoApiResponse;
    const readme = readmeRes.ok ? ((await readmeRes.json()) as GithubReadmeApiResponse) : null;
    const readmeSummary = summarizeReadme(decodeGithubReadme(readme));
    const description = compactSentence(repo.description || "");
    const topics = Array.isArray(repo.topics) ? repo.topics.filter(Boolean).slice(0, 6) : [];
    const details = [
      description ? `Description: ${description}` : "",
      readmeSummary ? `README summary: ${readmeSummary}` : "",
      topics.length > 0 ? `Topics: ${topics.join(", ")}` : "",
      typeof repo.stargazers_count === "number" ? `Stars: ${repo.stargazers_count.toLocaleString("en-US")}` : "",
      typeof repo.forks_count === "number" ? `Forks: ${repo.forks_count.toLocaleString("en-US")}` : "",
      repo.language ? `Primary language: ${repo.language}` : "",
      repo.pushed_at ? `Last pushed: ${repo.pushed_at}` : "",
    ].filter(Boolean);

    return {
      kind: "github-repo",
      label: repo.full_name || `${owner}/${name}`,
      repoFullName: repo.full_name || `${owner}/${name}`,
      summary: readmeSummary || description || `${owner}/${name} repository context`,
      details: details.slice(0, 6),
      topics,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language ?? undefined,
      lastPushedAt: repo.pushed_at ?? undefined,
      homepage: repo.homepage ?? undefined,
    };
  } catch {
    return null;
  }
}

async function fetchArticleContext(url: string): Promise<SignalWriterSourceContext | null> {
  try {
    const accessPolicy = await getArticleAccessPolicy(url);
    if (!accessPolicy.allowed) {
      return null;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": APP_META.slug,
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    if (hasBlockingRobotsDirective(response.headers.get("x-robots-tag"))) {
      return null;
    }

    const html = await response.text();
    if (hasBlockingMetaRobots(html) || detectPaywall(html, response.url || url)) {
      return null;
    }

    const parsed = extractArticleContext(html, response.url || url);
    if (!shouldUseBrowserFallback(parsed, html)) {
      return parsed;
    }

    if (!accessPolicy.allowBrowserFallback) {
      return parsed;
    }

    const browserParsed = await fetchArticleContextWithBrowser(response.url || url);
    return browserParsed ?? parsed;
  } catch {
    return null;
  }
}

function extractGithubRepo(signal: SignalWriterSignal) {
  try {
    const url = new URL(signal.link);
    if (url.hostname !== "github.com") {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      return null;
    }

    return {
      owner: parts[0],
      name: parts[1].replace(/\.git$/i, ""),
    };
  } catch {
    return null;
  }
}

function normalizeArticleUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (!/^https?:$/u.test(url.protocol)) {
      return null;
    }

    if (url.hostname === "github.com") {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function decodeGithubReadme(payload: GithubReadmeApiResponse | null) {
  if (!payload?.content || payload.encoding !== "base64") {
    return "";
  }

  try {
    return Buffer.from(payload.content, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function summarizeReadme(raw: string) {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return compactSentence(cleaned, 320);
}

function extractArticleContext(html: string, url: string): SignalWriterSourceContext | null {
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

function shouldUseBrowserFallback(context: SignalWriterSourceContext | null, html: string) {
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

function compactSentence(value: string, maxLength = 180) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

function getMetaContent(html: string, attribute: "property" | "name", value: string) {
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

function getCanonicalUrl(html: string) {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.trim() || "";
}

function getTagText(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? decodeHtmlEntities(sanitizeText(match[1], 240)) : "";
}

function extractArticleMetadata(root: HTMLElement, html: string, url: string): ArticleMetadata {
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

function extractJsonLdArticle(root: HTMLElement) {
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

function collectJsonLdArticleNodes(value: unknown): Record<string, unknown>[] {
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

function normalizeJsonLdArticle(record: Record<string, unknown>) {
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

function extractPrimaryText(root: HTMLElement, html: string) {
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

async function fetchArticleContextWithBrowser(url: string): Promise<SignalWriterSourceContext | null> {
  const executablePath = await resolveBrowserExecutablePath();
  if (!executablePath) {
    return null;
  }

  try {
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: ARTICLE_BROWSER_TIMEOUT_MS,
      });
      await page.waitForLoadState("networkidle", {
        timeout: 4_000,
      }).catch(() => undefined);
      await page.waitForTimeout(1_200).catch(() => undefined);

      const finalUrl = page.url() || url;
      const renderedHtml = await page.content();
      if (hasBlockingMetaRobots(renderedHtml) || detectPaywall(renderedHtml, finalUrl)) {
        return null;
      }
      return extractArticleContext(renderedHtml, finalUrl);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

function scoreContentElement(element: HTMLElement) {
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

function cleanElementText(element: HTMLElement) {
  const text = decodeHtmlEntities(sanitizeText(element.textContent || "", 5000));
  return text;
}

function matchFirstBlock(html: string, tagName: string) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] || "";
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function safeHostname(raw: string) {
  try {
    return new URL(raw).hostname.replace(/^www\./u, "");
  } catch {
    return "";
  }
}

async function getArticleAccessPolicy(url: string) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();

  if (!isAllowedArticleHostname(hostname)) {
    return { allowed: false, allowBrowserFallback: false };
  }

  if (isBlockedArticleUrl(parsed)) {
    return { allowed: false, allowBrowserFallback: false };
  }

  const robotsAllowed = await isRobotsAllowed(url);
  if (!robotsAllowed) {
    return { allowed: false, allowBrowserFallback: false };
  }

  return {
    allowed: true,
    allowBrowserFallback: true,
  };
}

function isAllowedArticleHostname(hostname: string) {
  if (!hostname) {
    return false;
  }

  return ARTICLE_ALLOWLIST_HOSTS.some(
    (allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`),
  );
}

function isBlockedArticleUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (ARTICLE_PAYWALL_HOST_DENYLIST.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`))) {
    return true;
  }

  const normalizedPath = `${url.pathname}${url.search}`;
  return ARTICLE_LOGIN_PATH_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

async function isRobotsAllowed(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const origin = `${url.protocol}//${url.host}`;
    const policy = await readThroughCache<RobotsPolicy | null>(
      `signal-writer:robots:${origin}`,
      ROBOTS_TTL_MS,
      async () => fetchRobotsPolicy(origin),
    );

    if (!policy) {
      return true;
    }

    return evaluateRobotsPolicy(policy, `${url.pathname}${url.search || ""}` || "/");
  } catch {
    return false;
  }
}

async function fetchRobotsPolicy(origin: string): Promise<RobotsPolicy | null> {
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: {
        "User-Agent": APP_META.slug,
        Accept: "text/plain",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !/text\/plain|text\/html|application\/octet-stream/i.test(contentType)) {
      return null;
    }

    const text = await response.text();
    return parseRobotsPolicy(text);
  } catch {
    return null;
  }
}

function parseRobotsPolicy(raw: string): RobotsPolicy | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/u, "").trim())
    .filter(Boolean);

  let active = false;
  const allowRules: string[] = [];
  const disallowRules: string[] = [];

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      active = agent === "*" || agent === APP_META.slug.toLowerCase();
      continue;
    }

    if (!active) {
      continue;
    }

    if (key === "allow" && value) {
      allowRules.push(value);
    }

    if (key === "disallow" && value) {
      disallowRules.push(value);
    }
  }

  if (allowRules.length === 0 && disallowRules.length === 0) {
    return null;
  }

  return {
    allowRules: dedupeCompact(allowRules),
    disallowRules: dedupeCompact(disallowRules),
  };
}

function evaluateRobotsPolicy(policy: RobotsPolicy, pathWithSearch: string) {
  const path = pathWithSearch || "/";
  const longestAllow = findLongestMatchingRule(policy.allowRules, path);
  const longestDisallow = findLongestMatchingRule(policy.disallowRules, path);

  if (!longestAllow && !longestDisallow) {
    return true;
  }

  return longestAllow.length >= longestDisallow.length;
}

function findLongestMatchingRule(rules: string[], path: string) {
  let winner = "";

  for (const rule of rules) {
    if (rule === "/") {
      if (winner.length < 1) {
        winner = rule;
      }
      continue;
    }

    if (path.startsWith(rule) && rule.length > winner.length) {
      winner = rule;
    }
  }

  return winner;
}

function hasBlockingRobotsDirective(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return BLOCKING_ROBOTS_DIRECTIVES.some((directive) => normalized.includes(directive));
}

function hasBlockingMetaRobots(html: string) {
  const robots = getMetaContent(html, "name", "robots") || getMetaContent(html, "name", "googlebot");
  if (!robots) {
    return false;
  }

  return hasBlockingRobotsDirective(robots);
}

function detectPaywall(html: string, url: string) {
  const lower = html.toLowerCase();
  if (/"isaccessibleforfree"\s*:\s*false/.test(lower) || /content="subscriber"/.test(lower)) {
    return true;
  }

  const paywallMarkers = [
    "subscribe to continue",
    "sign in to continue",
    "become a subscriber",
    "this article is for subscribers",
    "member-only story",
    "purchase a subscription",
    "already a subscriber",
    "premium content",
    "metered paywall",
  ];

  if (paywallMarkers.some((marker) => lower.includes(marker))) {
    return true;
  }

  try {
    return isBlockedArticleUrl(new URL(url));
  } catch {
    return false;
  }
}

function buildArticleAllowlistHosts() {
  const hosts = FEED_SOURCES
    .filter((source) => source.type === "rss")
    .map((source) => {
      try {
        return new URL(source.url).hostname.replace(/^www\./u, "").toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return dedupeCompact([
    ...hosts,
    "openai.com",
    "anthropic.com",
    "github.blog",
  ]);
}

async function resolveBrowserExecutablePath() {
  if (!browserExecutablePathPromise) {
    browserExecutablePathPromise = findBrowserExecutablePath();
  }

  return browserExecutablePathPromise;
}

async function findBrowserExecutablePath(): Promise<string | null> {
  const fromEnv = [
    process.env.DASHBOARD_LAB_HEADLESS_BROWSER_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    process.env.CHROMIUM_BIN,
  ].filter((value): value is string => Boolean(value));

  const candidates = [...fromEnv, ...getBrowserExecutableCandidates()];

  for (const candidate of candidates) {
    if (await canAccessFile(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getBrowserExecutableCandidates() {
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Arc.app/Contents/MacOS/Arc",
    ];
  }

  if (process.platform === "win32") {
    const roots = [
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA,
    ].filter((value): value is string => Boolean(value));

    return roots.flatMap((rootDir) => [
      path.join(rootDir, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(rootDir, "Chromium", "Application", "chrome.exe"),
      path.join(rootDir, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      path.join(rootDir, "Microsoft", "Edge", "Application", "msedge.exe"),
    ]);
  }

  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];
}

async function canAccessFile(candidate: string) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

function isArticleLikeType(value: unknown) {
  const normalized = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
  return /(article|blogposting|newsarticle|report|techarticle)/i.test(normalized);
}

function pickFirstString(...values: unknown[]) {
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

function pickAuthorName(value: unknown): string {
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

function pickPublisherName(value: unknown): string {
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

function pickUrlValue(...values: unknown[]): string {
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

function splitTopicValues(value: unknown): string[] {
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

function dedupeCompact(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
