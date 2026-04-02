"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { AiSkillRecommendations } from "@/features/info-hub/components/AiSkillRecommendations";
import { FeedCardGrid } from "@/features/info-hub/components/FeedCardGrid";
import { InfoHubFilterBar } from "@/features/info-hub/components/InfoHubFilterBar";
import { InfoHubLazySection } from "@/features/info-hub/components/InfoHubLazySection";
import { InfoHubPagination } from "@/features/info-hub/components/InfoHubPagination";
import { InfoHubToolbar } from "@/features/info-hub/components/InfoHubToolbar";
import { PackageUpdates } from "@/features/info-hub/components/PackageUpdates";
import { SecurityAudit } from "@/features/info-hub/components/SecurityAudit";
import { TrendingSection } from "@/features/info-hub/components/TrendingSection";
import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { getInfoHubCopy } from "@/features/info-hub/copy";
import {
  getDashboardLabAutoRefreshIntervalMs,
  getDailyAutoRefreshKey,
  readDashboardLabAutoRefreshMode,
  runDailyAutoRefresh,
  scheduleIdleRefresh,
  writeDashboardLabAutoRefreshMode,
} from "@/lib/client/daily-auto-refresh";
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
const INFO_HUB_CLIENT_CACHE_LIMIT = 80;

type InfoHubFeedSnapshot = {
  feed: FeedResponse;
  expiresAt: number;
};

type InfoHubLazySectionKey = "aiSkills" | "trending" | "packages" | "security";

type InfoHubLazySectionState = Record<InfoHubLazySectionKey, boolean>;
type InfoHubLazySectionErrorState = Record<InfoHubLazySectionKey, string>;
type InfoHubLazySectionLoadingState = Record<InfoHubLazySectionKey, boolean>;

type InfoHubLazySectionSnapshot<T> = {
  data: T;
  expiresAt: number;
};

const INITIAL_SECTION_OPEN_STATE: InfoHubLazySectionState = {
  aiSkills: false,
  trending: false,
  packages: false,
  security: false,
};

const INITIAL_SECTION_ERROR_STATE: InfoHubLazySectionErrorState = {
  aiSkills: "",
  trending: "",
  packages: "",
  security: "",
};

const INITIAL_SECTION_LOADING_STATE: InfoHubLazySectionLoadingState = {
  aiSkills: false,
  trending: false,
  packages: false,
  security: false,
};

let infoHubSourcesCache: FeedCategory[] | null = null;
const infoHubFeedCache = new Map<string, InfoHubFeedSnapshot>();
const infoHubAiSkillsCache = new Map<string, InfoHubLazySectionSnapshot<AiSkillRecommendationsResponse>>();
const infoHubTrendingCache = new Map<string, InfoHubLazySectionSnapshot<TrendingResponse>>();
const infoHubPackagesCache = new Map<string, InfoHubLazySectionSnapshot<PackageUpdatesResponse>>();
const infoHubSecurityCache = new Map<string, InfoHubLazySectionSnapshot<SecurityAuditResponse>>();

interface InfoHubTabProps {
  mode?: DashboardNavigationMode;
}

export function InfoHubTab({ mode = "advanced" }: InfoHubTabProps) {
  const { locale } = useLocale();
  const copy = getInfoHubCopy(locale);
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
  const [sectionOpen, setSectionOpen] = useState<InfoHubLazySectionState>(INITIAL_SECTION_OPEN_STATE);
  const [sectionErrors, setSectionErrors] = useState<InfoHubLazySectionErrorState>(
    INITIAL_SECTION_ERROR_STATE,
  );
  const [sectionLoading, setSectionLoading] = useState<InfoHubLazySectionLoadingState>(
    INITIAL_SECTION_LOADING_STATE,
  );
  const [autoRefreshMode, setAutoRefreshMode] = useState(() =>
    readDashboardLabAutoRefreshMode(),
  );
  const isCoreMode = mode === "core";
  const showsAiSkillsSection = category === "all" || category === "ai-skill-trends";
  const toolbarLoading = loading || Object.values(sectionLoading).some(Boolean);
  const autoRefreshIntervalMs = getDashboardLabAutoRefreshIntervalMs(autoRefreshMode);

  useEffect(() => {
    void loadStaticSources(setCategories, locale);
  }, [locale]);

  useEffect(() => {
    writeDashboardLabAutoRefreshMode(autoRefreshMode);
  }, [autoRefreshMode]);

  useEffect(() => {
    const cacheKey = buildInfoHubSnapshotKey(category, page, query, locale);
    pruneClientCache(infoHubFeedCache);
    const cached = infoHubFeedCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      setFeed(cached.feed);
      setLoading(false);
      setError("");
      return;
    }

    void loadFeed(
      category,
      page,
      query,
      locale,
      setFeed,
      setLoading,
      setError,
      { cacheKey },
    );
  }, [category, page, query, locale]);

  useEffect(() => {
    async function runInfoHubBackgroundRefresh() {
      await loadFeed(
        "all",
        1,
        "",
        locale,
        setFeed,
        setLoading,
        setError,
        {
          cacheKey: buildInfoHubSnapshotKey("all", 1, "", locale),
          forceRefresh: true,
          background: true,
        },
      );
      await Promise.allSettled([
        prefetchInfoHubSection("aiSkills", locale),
        prefetchInfoHubSection("trending", locale),
        prefetchInfoHubSection("packages", locale),
        prefetchInfoHubSection("security", locale),
        runDailyAutoRefresh(
          getDailyAutoRefreshKey("signal-writer", locale),
          () => prefetchSignalWriterSignals(locale),
          autoRefreshIntervalMs,
        ),
      ]);
    }

    const cancelIdleRefresh = scheduleIdleRefresh(() => {
      void runDailyAutoRefresh(
        getDailyAutoRefreshKey("info-hub", locale),
        runInfoHubBackgroundRefresh,
        autoRefreshIntervalMs,
      );
    });

    const intervalId =
      autoRefreshMode === "realtime"
        ? window.setInterval(() => {
            void runDailyAutoRefresh(
              getDailyAutoRefreshKey("info-hub", locale),
              runInfoHubBackgroundRefresh,
              autoRefreshIntervalMs,
            );
          }, autoRefreshIntervalMs)
        : null;

    return () => {
      cancelIdleRefresh();
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [autoRefreshIntervalMs, autoRefreshMode, locale]);

  useEffect(() => {
    const openSections = getOpenSections(sectionOpen).filter((section) =>
      isSectionVisible(section, showsAiSkillsSection),
    );
    if (openSections.length === 0) {
      return;
    }

    void Promise.all(
      openSections.map((section) =>
        ensureLazySection(
          section,
          locale,
          {
            setAiSkills,
            setTrending,
            setPackages,
            setSecurity,
            setSectionErrors,
            setSectionLoading,
          },
          { forceRefresh: false },
        ),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only, sectionOpen/showsAiSkillsSection are read-only snapshots
  }, [locale]);

  async function handleRefresh() {
    await Promise.all([
      loadFeed(category, page, query, locale, setFeed, setLoading, setError, {
        cacheKey: buildInfoHubSnapshotKey(category, page, query, locale),
        forceRefresh: true,
      }),
      ...getOpenSections(sectionOpen)
        .filter((section) => isSectionVisible(section, showsAiSkillsSection))
        .map((section) =>
        ensureLazySection(section, locale, {
          setAiSkills,
          setTrending,
          setPackages,
          setSecurity,
          setSectionErrors,
          setSectionLoading,
        }, { forceRefresh: true }),
      ),
    ]);
  }

  function handleToggleSection(section: InfoHubLazySectionKey) {
    const nextOpen = !sectionOpen[section];
    setSectionOpen((current) => ({
      ...current,
      [section]: nextOpen,
    }));

    if (nextOpen) {
      void ensureLazySection(section, locale, {
        setAiSkills,
        setTrending,
        setPackages,
        setSecurity,
        setSectionErrors,
        setSectionLoading,
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-base bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.14),_transparent_42%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Info Hub</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{copy.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
          {copy.description}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {copy.cards.map((item) => (
            <article key={item.label} className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-200/70">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-text-secondary">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      {isCoreMode ? (
        <NoticeBanner
          tone="info"
          title={copy.coreModeTitle}
          message={copy.coreModeMessage}
        />
      ) : null}
      <InfoHubToolbar
        loading={toolbarLoading}
        copy={copy}
        onRefresh={() => void handleRefresh()}
        autoRefreshMode={autoRefreshMode}
        onToggleAutoRefreshMode={() =>
          setAutoRefreshMode((current) =>
            current === "realtime" ? "standard" : "realtime",
          )
        }
      />
      <InfoHubFilterBar
        categories={categories}
        category={category}
        query={query}
        locale={locale}
        copy={copy}
        onChange={(value) => { setCategory(value); setPage(1); }}
        onQueryChange={(value) => { setQuery(value); setPage(1); }}
      />
      {error ? <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{error}</p> : null}
      {showsAiSkillsSection ? (
        <InfoHubLazySection
          title={copy.aiSkillsTitle}
          description={copy.aiSkillsDescription}
          open={sectionOpen.aiSkills}
          loading={sectionLoading.aiSkills}
          error={sectionErrors.aiSkills}
          emptyMessage={copy.emptySection}
          loadingMessage={copy.loadingSection}
          onToggle={() => handleToggleSection("aiSkills")}
        >
          <AiSkillRecommendations data={aiSkills} />
        </InfoHubLazySection>
      ) : null}
      <InfoHubLazySection
        title={copy.trendingTitle}
        description={copy.trendingDescription}
        open={sectionOpen.trending}
        loading={sectionLoading.trending}
        error={sectionErrors.trending}
        emptyMessage={copy.emptySection}
        loadingMessage={copy.loadingSection}
        onToggle={() => handleToggleSection("trending")}
      >
        <TrendingSection data={trending} />
      </InfoHubLazySection>
      <InfoHubLazySection
        title={copy.packageUpdatesTitle}
        description={copy.packageUpdatesDescription}
        open={sectionOpen.packages}
        loading={sectionLoading.packages}
        error={sectionErrors.packages}
        emptyMessage={copy.emptySection}
        loadingMessage={copy.loadingSection}
        onToggle={() => handleToggleSection("packages")}
      >
        <PackageUpdates data={packages} />
      </InfoHubLazySection>
      <InfoHubLazySection
        title={copy.securityTitle}
        description={copy.securityDescription}
        open={sectionOpen.security}
        loading={sectionLoading.security}
        error={sectionErrors.security}
        emptyMessage={copy.emptySection}
        loadingMessage={copy.loadingSection}
        onToggle={() => handleToggleSection("security")}
      >
        <SecurityAudit data={security} />
      </InfoHubLazySection>
      {feed ? <FeedCardGrid items={feed.items} /> : null}
      {loading && !feed ? <p className="rounded-2xl border border-border-base bg-white/5 px-4 py-6 text-sm text-white/65">{copy.loadingFeed}</p> : null}
      {!loading && feed && feed.items.length === 0 ? <p className="rounded-2xl border border-border-base bg-white/5 px-4 py-6 text-sm text-white/65">{copy.emptyFeed}</p> : null}
      {feed ? <InfoHubPagination page={feed.page} totalItems={feed.totalItems} pageSize={feed.limit} onChange={setPage} /> : null}
    </div>
  );
}

async function loadStaticSources(setCategories: (value: FeedCategory[]) => void, locale: "ko" | "en") {
  if (infoHubSourcesCache) {
    setCategories(infoHubSourcesCache);
    return;
  }

  const response = await fetch("/api/info-hub/sources", {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });
  const payload = (await response.json()) as FeedSourcesResponse;
  infoHubSourcesCache = payload.categories;
  setCategories(payload.categories);
}

async function loadFeed(
  category: FeedCategoryId | "all",
  page: number,
  query: string,
  locale: "ko" | "en",
  setFeed: (value: FeedResponse) => void,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  options?: {
    cacheKey?: string;
    forceRefresh?: boolean;
    background?: boolean;
  },
) {
  if (!options?.background) {
    setLoading(true);
    setError("");
  }

  try {
    pruneClientCache(infoHubFeedCache);
    const refreshSuffix = options?.forceRefresh ? "&refresh=1" : "";
    const nextFeed = await loadJson<FeedResponse>(
      `/api/info-hub?category=${category}&page=${page}&limit=20&q=${encodeURIComponent(query)}${refreshSuffix}`,
      locale,
    );

    setFeed(nextFeed);

    if (options?.cacheKey) {
      infoHubFeedCache.set(options.cacheKey, {
        feed: nextFeed,
        expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
      });
      enforceClientCacheLimit(infoHubFeedCache);
    }
  } catch {
    if (!options?.background) {
      setError(getInfoHubCopy(locale).feedLoadFailed);
    }
  } finally {
    if (!options?.background) {
      setLoading(false);
    }
  }
}

async function ensureLazySection(
  section: InfoHubLazySectionKey,
  locale: "ko" | "en",
  controllers: {
    setAiSkills: (value: AiSkillRecommendationsResponse | null) => void;
    setTrending: (value: TrendingResponse | null) => void;
    setPackages: (value: PackageUpdatesResponse | null) => void;
    setSecurity: (value: SecurityAuditResponse | null) => void;
    setSectionErrors: Dispatch<SetStateAction<InfoHubLazySectionErrorState>>;
    setSectionLoading: Dispatch<SetStateAction<InfoHubLazySectionLoadingState>>;
  },
  options?: { forceRefresh?: boolean },
) {
  const copy = getInfoHubCopy(locale);
  const refreshParam = options?.forceRefresh ? "1" : "0";

  controllers.setSectionLoading((current) => ({ ...current, [section]: true }));
  controllers.setSectionErrors((current) => ({ ...current, [section]: "" }));

  try {
    switch (section) {
      case "aiSkills": {
        const cacheKey = buildLazySectionCacheKey(section, locale);
        pruneClientCache(infoHubAiSkillsCache);
        const cached = !options?.forceRefresh ? infoHubAiSkillsCache.get(cacheKey) : null;

        if (cached && cached.expiresAt > Date.now()) {
          controllers.setAiSkills(cached.data);
          return;
        }

        const nextData = await loadJson<AiSkillRecommendationsResponse>(
          `/api/info-hub/ai-skills?refresh=${refreshParam}`,
          locale,
        );
        infoHubAiSkillsCache.set(cacheKey, {
          data: nextData,
          expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
        });
        enforceClientCacheLimit(infoHubAiSkillsCache);
        controllers.setAiSkills(nextData);
        return;
      }

      case "trending": {
        const cacheKey = buildLazySectionCacheKey(section, locale);
        pruneClientCache(infoHubTrendingCache);
        const cached = !options?.forceRefresh ? infoHubTrendingCache.get(cacheKey) : null;

        if (cached && cached.expiresAt > Date.now()) {
          controllers.setTrending(cached.data);
          return;
        }

        const nextData = await loadJson<TrendingResponse>(
          `/api/info-hub/trending?refresh=${refreshParam}`,
          locale,
        );
        infoHubTrendingCache.set(cacheKey, {
          data: nextData,
          expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
        });
        enforceClientCacheLimit(infoHubTrendingCache);
        controllers.setTrending(nextData);
        return;
      }

      case "packages": {
        const cacheKey = buildLazySectionCacheKey(section, locale);
        pruneClientCache(infoHubPackagesCache);
        const cached = !options?.forceRefresh ? infoHubPackagesCache.get(cacheKey) : null;

        if (cached && cached.expiresAt > Date.now()) {
          controllers.setPackages(cached.data);
          return;
        }

        const nextData = await loadJson<PackageUpdatesResponse>(
          `/api/info-hub/my-packages?refresh=${refreshParam}`,
          locale,
        );
        infoHubPackagesCache.set(cacheKey, {
          data: nextData,
          expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
        });
        enforceClientCacheLimit(infoHubPackagesCache);
        controllers.setPackages(nextData);
        return;
      }

      case "security": {
        const cacheKey = buildLazySectionCacheKey(section, locale);
        pruneClientCache(infoHubSecurityCache);
        const cached = !options?.forceRefresh ? infoHubSecurityCache.get(cacheKey) : null;

        if (cached && cached.expiresAt > Date.now()) {
          controllers.setSecurity(cached.data);
          return;
        }

        const nextData = await loadJson<SecurityAuditResponse>(
          `/api/info-hub/security?refresh=${refreshParam}`,
          locale,
        );
        infoHubSecurityCache.set(cacheKey, {
          data: nextData,
          expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
        });
        enforceClientCacheLimit(infoHubSecurityCache);
        controllers.setSecurity(nextData);
      }
    }
  } catch {
    controllers.setSectionErrors((current) => ({
      ...current,
      [section]: copy.sectionLoadFailed,
    }));
  } finally {
    controllers.setSectionLoading((current) => ({ ...current, [section]: false }));
  }
}

async function loadJson<T>(url: string, locale: "ko" | "en"): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildInfoHubSnapshotKey(category: FeedCategoryId | "all", page: number, query: string, locale: "ko" | "en") {
  return `${locale}:${category}:${page}:${query.trim().toLowerCase()}`;
}

function buildLazySectionCacheKey(section: InfoHubLazySectionKey, locale: "ko" | "en") {
  return `${locale}:${section}`;
}

function getOpenSections(state: InfoHubLazySectionState) {
  return (Object.entries(state) as Array<[InfoHubLazySectionKey, boolean]>)
    .filter(([, open]) => open)
    .map(([section]) => section);
}

function isSectionVisible(section: InfoHubLazySectionKey, showsAiSkillsSection: boolean) {
  if (section === "aiSkills") {
    return showsAiSkillsSection;
  }

  return true;
}

function pruneClientCache<T extends { expiresAt: number }>(cache: Map<string, T>) {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function enforceClientCacheLimit<T>(cache: Map<string, T>) {
  if (cache.size <= INFO_HUB_CLIENT_CACHE_LIMIT) {
    return;
  }

  const overflow = cache.size - INFO_HUB_CLIENT_CACHE_LIMIT;
  let removed = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    removed += 1;
    if (removed >= overflow) {
      break;
    }
  }
}

async function prefetchInfoHubSection(
  section: InfoHubLazySectionKey,
  locale: "ko" | "en",
) {
  const refreshParam = "1";

  switch (section) {
    case "aiSkills": {
      const nextData = await loadJson<AiSkillRecommendationsResponse>(
        `/api/info-hub/ai-skills?refresh=${refreshParam}`,
        locale,
      );
      infoHubAiSkillsCache.set(buildLazySectionCacheKey(section, locale), {
        data: nextData,
        expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
      });
      enforceClientCacheLimit(infoHubAiSkillsCache);
      return;
    }

    case "trending": {
      const nextData = await loadJson<TrendingResponse>(
        `/api/info-hub/trending?refresh=${refreshParam}`,
        locale,
      );
      infoHubTrendingCache.set(buildLazySectionCacheKey(section, locale), {
        data: nextData,
        expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
      });
      enforceClientCacheLimit(infoHubTrendingCache);
      return;
    }

    case "packages": {
      const nextData = await loadJson<PackageUpdatesResponse>(
        `/api/info-hub/my-packages?refresh=${refreshParam}`,
        locale,
      );
      infoHubPackagesCache.set(buildLazySectionCacheKey(section, locale), {
        data: nextData,
        expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
      });
      enforceClientCacheLimit(infoHubPackagesCache);
      return;
    }

    case "security": {
      const nextData = await loadJson<SecurityAuditResponse>(
        `/api/info-hub/security?refresh=${refreshParam}`,
        locale,
      );
      infoHubSecurityCache.set(buildLazySectionCacheKey(section, locale), {
        data: nextData,
        expiresAt: Date.now() + INFO_HUB_CLIENT_TTL_MS,
      });
      enforceClientCacheLimit(infoHubSecurityCache);
    }
  }
}

async function prefetchSignalWriterSignals(locale: "ko" | "en") {
  const response = await fetch("/api/signal-writer/signals?refresh=1", {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });

  if (!response.ok) {
    throw new Error(`Signal Writer prefetch failed: ${response.status}`);
  }

  await response.json();
}
