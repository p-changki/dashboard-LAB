"use client";

import { useEffect, useState } from "react";

import { AiSkillRecommendations } from "@/components/info-hub/AiSkillRecommendations";
import { FeedCardGrid } from "@/components/info-hub/FeedCardGrid";
import { InfoHubFilterBar } from "@/components/info-hub/InfoHubFilterBar";
import { InfoHubPagination } from "@/components/info-hub/InfoHubPagination";
import { InfoHubToolbar } from "@/components/info-hub/InfoHubToolbar";
import { PackageUpdates } from "@/components/info-hub/PackageUpdates";
import { SecurityAudit } from "@/components/info-hub/SecurityAudit";
import { TrendingSection } from "@/components/info-hub/TrendingSection";
import type {
  AiSkillRecommendationsResponse,
  FeedCategory,
  FeedCategoryId,
  FeedResponse,
  FeedSourcesResponse,
  PackageUpdatesResponse,
  SecurityAuditResponse,
  TrendingResponse,
} from "@/lib/types";

const INFO_HUB_CLIENT_TTL_MS = 24 * 60 * 60 * 1000;

type InfoHubSnapshot = {
  aiSkills: AiSkillRecommendationsResponse | null;
  feed: FeedResponse;
  trending: TrendingResponse | null;
  packages: PackageUpdatesResponse | null;
  security: SecurityAuditResponse | null;
  expiresAt: number;
};

let infoHubSourcesCache: FeedCategory[] | null = null;
const infoHubSnapshotCache = new Map<string, InfoHubSnapshot>();

export function InfoHubTab() {
  const [category, setCategory] = useState<FeedCategoryId | "all">("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<FeedCategory[]>([]);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [aiSkills, setAiSkills] = useState<AiSkillRecommendationsResponse | null>(null);
  const [trending, setTrending] = useState<TrendingResponse | null>(null);
  const [packages, setPackages] = useState<PackageUpdatesResponse | null>(null);
  const [security, setSecurity] = useState<SecurityAuditResponse | null>(null);

  useEffect(() => {
    void loadStaticSources(setCategories);
  }, []);

  useEffect(() => {
    const cacheKey = buildInfoHubSnapshotKey(category, page, query);
    const cached = infoHubSnapshotCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      setAiSkills(cached.aiSkills);
      setFeed(cached.feed);
      setTrending(cached.trending);
      setPackages(cached.packages);
      setSecurity(cached.security);
      setLoading(false);
      setError("");
      return;
    }

    void loadInfoHub(
      category,
      page,
      query,
      setAiSkills,
      setFeed,
      setTrending,
      setPackages,
      setSecurity,
      setLoading,
      setError,
      { cacheKey },
    );
  }, [category, page, query]);

  return (
    <div className="space-y-6">
      <InfoHubToolbar
        loading={loading}
        onRefresh={() =>
          void loadInfoHub(
            category,
            page,
            query,
            setAiSkills,
            setFeed,
            setTrending,
            setPackages,
            setSecurity,
            setLoading,
            setError,
            {
              cacheKey: buildInfoHubSnapshotKey(category, page, query),
              forceRefresh: true,
            },
          )
        }
      />
      <InfoHubFilterBar
        categories={categories}
        category={category}
        query={query}
        onChange={(value) => { setCategory(value); setPage(1); }}
        onQueryChange={(value) => { setQuery(value); setPage(1); }}
      />
      {error ? <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{error}</p> : null}
      {(category === "all" || category === "ai-skill-trends") ? <AiSkillRecommendations data={aiSkills} /> : null}
      <TrendingSection data={trending} />
      <PackageUpdates data={packages} />
      <SecurityAudit data={security} />
      {feed ? <FeedCardGrid items={feed.items} /> : null}
      {loading && !feed ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">기사와 패키지 정보를 불러오는 중입니다.</p> : null}
      {!loading && feed && feed.items.length === 0 ? <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">현재 표시할 기사가 없습니다. 다른 카테고리를 선택하거나 잠시 후 새로고침해 보세요.</p> : null}
      {feed ? <InfoHubPagination page={feed.page} totalItems={feed.totalItems} pageSize={feed.limit} onChange={setPage} /> : null}
    </div>
  );
}

async function loadStaticSources(setCategories: (value: FeedCategory[]) => void) {
  if (infoHubSourcesCache) {
    setCategories(infoHubSourcesCache);
    return;
  }

  const response = await fetch("/api/info-hub/sources", { cache: "no-store" });
  const payload = (await response.json()) as FeedSourcesResponse;
  infoHubSourcesCache = payload.categories;
  setCategories(payload.categories);
}

async function loadInfoHub(
  category: FeedCategoryId | "all",
  page: number,
  query: string,
  setAiSkills: (value: AiSkillRecommendationsResponse | null) => void,
  setFeed: (value: FeedResponse) => void,
  setTrending: (value: TrendingResponse | null) => void,
  setPackages: (value: PackageUpdatesResponse | null) => void,
  setSecurity: (value: SecurityAuditResponse | null) => void,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  options?: {
    cacheKey?: string;
    forceRefresh?: boolean;
  },
) {
  setLoading(true);
  setError("");

  try {
    const refreshSuffix = options?.forceRefresh ? "&refresh=1" : "";
    const [aiSkillsResult, feedResult, trendingResult, packageResult, securityResult] = await Promise.allSettled([
      loadJson<AiSkillRecommendationsResponse>(`/api/info-hub/ai-skills?refresh=${options?.forceRefresh ? "1" : "0"}`),
      loadJson<FeedResponse>(`/api/info-hub?category=${category}&page=${page}&limit=20&q=${encodeURIComponent(query)}${refreshSuffix}`),
      loadJson<TrendingResponse>(`/api/info-hub/trending?refresh=${options?.forceRefresh ? "1" : "0"}`),
      loadJson<PackageUpdatesResponse>(`/api/info-hub/my-packages?refresh=${options?.forceRefresh ? "1" : "0"}`),
      loadJson<SecurityAuditResponse>(`/api/info-hub/security?refresh=${options?.forceRefresh ? "1" : "0"}`),
    ]);

    const nextAiSkills = aiSkillsResult.status === "fulfilled" ? aiSkillsResult.value : null;
    const nextFeed = feedResult.status === "fulfilled" ? feedResult.value : null;
    const nextTrending = trendingResult.status === "fulfilled" ? trendingResult.value : null;
    const nextPackages = packageResult.status === "fulfilled" ? packageResult.value : null;
    const nextSecurity = securityResult.status === "fulfilled" ? securityResult.value : null;

    setAiSkills(nextAiSkills);

    if (nextFeed) {
      setFeed(nextFeed);
    } else {
      setError("기사 목록을 불러오지 못했습니다.");
    }

    setTrending(nextTrending);
    setPackages(nextPackages);
    setSecurity(nextSecurity);

    if (options?.cacheKey && nextFeed) {
      infoHubSnapshotCache.set(options.cacheKey, {
        aiSkills: nextAiSkills,
        feed: nextFeed,
        trending: nextTrending,
        packages: nextPackages,
        security: nextSecurity,
        expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
      });
    }
  } finally {
    setLoading(false);
  }
}

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildInfoHubSnapshotKey(category: FeedCategoryId | "all", page: number, query: string) {
  return `${category}:${page}:${query.trim().toLowerCase()}`;
}
