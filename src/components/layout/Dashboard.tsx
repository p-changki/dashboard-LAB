"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";

import { DashboardGuideModal } from "@/components/layout/DashboardGuideModal";
import { useLocale } from "@/components/layout/LocaleProvider";
import { DashboardOnboardingModal } from "@/components/layout/DashboardOnboardingModal";
import {
  TabNav,
  type DashboardNavigationMode,
  type DashboardTabId,
  getVisibleTabs,
  isTabVisible,
} from "@/components/layout/TabNav";
import { HomeTab } from "@/features/home/HomeTab";
import { APP_META } from "@/lib/app-meta";
import { CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import { getDashboardTabMeta } from "@/lib/dashboard-guides";
import { pickLocale } from "@/lib/locale";
import type { OverviewResponse } from "@/lib/types";

interface DashboardProps {
  data?: OverviewResponse | null;
}

const ONBOARDING_STORAGE_KEY = CLIENT_STORAGE_KEYS.onboardingDismissed;

const AiSkillsTab = dynamic(
  () => import("@/features/ai-skills/AiSkillsTab").then((module) => module.AiSkillsTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="AI Skills" message="탭을 불러오는 중입니다." />,
  },
);

const CsTab = dynamic(
  () => import("@/features/cs-helper/CsTab").then((module) => module.CsTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="CS Helper" message="탭을 불러오는 중입니다." />,
  },
);

const ProjectsTab = dynamic(
  () => import("@/features/projects/ProjectsTab").then((module) => module.ProjectsTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="프로젝트" message="탭을 불러오는 중입니다." />,
  },
);

const DocHubTab = dynamic(
  () => import("@/features/doc-hub/DocHubTab").then((module) => module.DocHubTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="문서 허브" message="탭을 불러오는 중입니다." />,
  },
);

const MeetingHubTab = dynamic(
  () => import("@/features/meeting-hub/MeetingHubTab").then((module) => module.MeetingHubTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="Meeting Hub" message="탭을 불러오는 중입니다." />,
  },
);

const FileManagerTab = dynamic(
  () => import("@/features/file-manager/FileManagerTab").then((module) => module.FileManagerTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="파일 매니저" message="탭을 불러오는 중입니다." />,
  },
);

const SystemTab = dynamic(
  () => import("@/features/system/SystemTab").then((module) => module.SystemTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="시스템" message="탭을 불러오는 중입니다." />,
  },
);

const InfoHubTab = dynamic(
  () => import("@/features/info-hub/InfoHubTab").then((module) => module.InfoHubTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="Info Hub" message="탭을 불러오는 중입니다." />,
  },
);

const CallToPrdTab = dynamic(
  () => import("@/features/call-to-prd/CallToPrdTab").then((module) => module.CallToPrdTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="Call → PRD" message="탭을 불러오는 중입니다." />,
  },
);

export function Dashboard({ data }: DashboardProps) {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<DashboardTabId>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [navigationMode, setNavigationMode] = useState<DashboardNavigationMode>("core");
  const [guideOpen, setGuideOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(data ?? null);
  const [overviewLoading, setOverviewLoading] = useState(!data);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const meta = getDashboardTabMeta(locale)[activeTab];
  const copy = pickLocale(locale, {
    ko: {
      loading: "탭을 불러오는 중입니다.",
      projects: "프로젝트",
      dochub: "문서 허브",
      filemanager: "파일 매니저",
      system: "시스템",
      loadOverviewFailed: "홈 요약 데이터를 불러오지 못했습니다.",
      guide: "사용법",
      refresh: "새로고침",
    },
    en: {
      loading: "Loading tab...",
      projects: "Projects",
      dochub: "Doc Hub",
      meetinghub: "Meeting Hub",
      filemanager: "File Manager",
      system: "System",
      loadOverviewFailed: "Failed to load the home overview.",
      guide: "Guide",
      refresh: "Refresh",
    },
  });

  useEffect(() => {
    syncHashToState(setActiveTab);
    const handleHashChange = () => syncHashToState(setActiveTab);

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(CLIENT_STORAGE_KEYS.navigationMode);
      if (storedMode === "core" || storedMode === "advanced") {
        setNavigationMode(storedMode);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
        setOnboardingOpen(true);
      }
    } catch {
      setOnboardingOpen(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setOverviewLoading(true);
      setOverviewError(null);

      try {
        const response = await fetch("/api/overview", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(copy.loadOverviewFailed);
        }

        const nextOverview = (await response.json()) as OverviewResponse;

        if (!cancelled) {
          setOverviewData(nextOverview);
        }
      } catch (error) {
        if (!cancelled) {
          setOverviewError(
            error instanceof Error ? error.message : copy.loadOverviewFailed,
          );
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [copy.loadOverviewFailed]);

  useEffect(() => {
    if (isTabVisible(activeTab, navigationMode)) {
      return;
    }

    const fallbackTab = getVisibleTabs(navigationMode)[0]?.id ?? "home";
    setActiveTab(fallbackTab);
    window.location.hash = fallbackTab;
  }, [activeTab, navigationMode]);

  function handleTabChange(tab: DashboardTabId) {
    setActiveTab(tab);
    window.location.hash = tab;
  }

  function handleChangeNavigationMode(mode: DashboardNavigationMode) {
    setNavigationMode(mode);

    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEYS.navigationMode, mode);
    } catch {
      /* ignore */
    }
  }

  function handleCloseOnboarding() {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }

    setOnboardingOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <div className="flex min-h-screen">
        <TabNav
          activeTab={activeTab}
          collapsed={collapsed}
          mode={navigationMode}
          onChange={handleTabChange}
          onChangeMode={handleChangeNavigationMode}
          onToggleCollapse={() => setCollapsed((current) => !current)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-white/8 bg-[#0f0f0f] px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">{APP_META.displayName}</p>
              <h1 className="text-xl font-bold tracking-tight text-[#f0f0f0]">{meta.title}</h1>
              <p className="text-sm text-gray-400">{meta.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424] hover:border-white/[.14]"
              >
                <CircleHelp className="h-4 w-4" />
                {copy.guide}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424] hover:border-white/[.14]"
              >
                {copy.refresh}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
            <section className="mx-auto max-w-7xl space-y-6">
              {activeTab === "home" ? (
                <HomeTab
                  data={overviewData}
                  loading={overviewLoading}
                  error={overviewError}
                  mode={navigationMode}
                />
              ) : null}
              {activeTab === "aiskills" ? <AiSkillsTab mode={navigationMode} /> : null}
              {activeTab === "cshelper" ? <CsTab mode={navigationMode} /> : null}
              {activeTab === "projects" ? <ProjectsTab mode={navigationMode} /> : null}
              {activeTab === "dochub" ? <DocHubTab /> : null}
              {activeTab === "meetinghub" ? <MeetingHubTab mode={navigationMode} /> : null}
              {activeTab === "filemanager" ? <FileManagerTab /> : null}
              {activeTab === "system" ? <SystemTab /> : null}
              {activeTab === "infohub" ? <InfoHubTab mode={navigationMode} /> : null}
              {activeTab === "calltoprd" ? <CallToPrdTab mode={navigationMode} /> : null}
            </section>
          </div>
        </div>
      </div>
      <DashboardGuideModal
        initialTab={activeTab}
        onClose={() => setGuideOpen(false)}
        open={guideOpen}
      />
      <DashboardOnboardingModal
        open={onboardingOpen}
        onClose={handleCloseOnboarding}
        onSelectTab={handleTabChange}
      />
    </main>
  );
}

function syncHashToState(setActiveTab: (tab: DashboardTabId) => void) {
  const hash = window.location.hash.replace("#", "");

  if (isValidTab(hash)) {
    setActiveTab(hash);
  }
}

function isValidTab(value: string): value is DashboardTabId {
  return getVisibleTabs("advanced").some((tab) => tab.id === value);
}

function TabPanelMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-6">
      <p className="text-sm uppercase tracking-[0.24em] text-gray-500">{title}</p>
      <p className="mt-4 text-sm text-gray-300">{message}</p>
    </section>
  );
}
