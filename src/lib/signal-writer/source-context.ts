import "server-only";

import { Buffer } from "node:buffer";
import { access } from "node:fs/promises";
import path from "node:path";

import { APP_META } from "@/lib/app-meta";
import { FEED_SOURCES } from "@/lib/info-hub/categories";
import { readThroughCache } from "@/lib/parsers/cache";
import type { SignalWriterSignal, SignalWriterSourceContext } from "@/lib/types";
import {
  compactSentence,
  dedupeCompact,
  extractArticleContext,
  getMetaContent,
  shouldUseBrowserFallback,
} from "@/lib/signal-writer/source-context/html-extract";

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

