"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";

import { DashboardGuideModal } from "@/components/dashboard/DashboardGuideModal";
import { DashboardOnboardingModal } from "@/components/dashboard/DashboardOnboardingModal";
import { TabNav, type DashboardTabId } from "@/components/TabNav";
import { HomeTab } from "@/components/tabs/HomeTab";
import { APP_META } from "@/lib/app-meta";
import { CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import { DASHBOARD_TAB_META } from "@/lib/dashboard-guides";
import type { OverviewResponse } from "@/lib/types";

interface DashboardProps {
  data: OverviewResponse;
}

const ONBOARDING_STORAGE_KEY = CLIENT_STORAGE_KEYS.onboardingDismissed;

const AiSkillsTab = dynamic(
  () => import("@/components/tabs/AiSkillsTab").then((module) => module.AiSkillsTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="AI Skills" message="탭을 불러오는 중입니다." />,
  },
);

const CsTab = dynamic(
  () => import("@/components/tabs/CsTab").then((module) => module.CsTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="CS Helper" message="탭을 불러오는 중입니다." />,
  },
);

const ProjectsTab = dynamic(
  () => import("@/components/tabs/ProjectsTab").then((module) => module.ProjectsTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="프로젝트" message="탭을 불러오는 중입니다." />,
  },
);

const DocHubTab = dynamic(
  () => import("@/components/tabs/DocHubTab").then((module) => module.DocHubTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="문서 허브" message="탭을 불러오는 중입니다." />,
  },
);

const FileManagerTab = dynamic(
  () => import("@/components/tabs/FileManagerTab").then((module) => module.FileManagerTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="파일 매니저" message="탭을 불러오는 중입니다." />,
  },
);

const SystemTab = dynamic(
  () => import("@/components/tabs/SystemTab").then((module) => module.SystemTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="시스템" message="탭을 불러오는 중입니다." />,
  },
);

const InfoHubTab = dynamic(
  () => import("@/components/tabs/InfoHubTab").then((module) => module.InfoHubTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="Info Hub" message="탭을 불러오는 중입니다." />,
  },
);

const CallToPrdTab = dynamic(
  () => import("@/components/tabs/CallToPrdTab").then((module) => module.CallToPrdTab),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="Call → PRD" message="탭을 불러오는 중입니다." />,
  },
);

export function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const meta = DASHBOARD_TAB_META[activeTab];

  useEffect(() => {
    syncHashToState(setActiveTab);
    const handleHashChange = () => syncHashToState(setActiveTab);

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
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

  function handleTabChange(tab: DashboardTabId) {
    setActiveTab(tab);
    window.location.hash = tab;
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
          onChange={handleTabChange}
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
                사용법
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424] hover:border-white/[.14]"
              >
                새로고침
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
            <section className="mx-auto max-w-7xl space-y-6">
              {activeTab === "home" ? <HomeTab data={data} /> : null}
              {activeTab === "aiskills" ? <AiSkillsTab /> : null}
              {activeTab === "cshelper" ? <CsTab /> : null}
              {activeTab === "projects" ? <ProjectsTab /> : null}
              {activeTab === "dochub" ? <DocHubTab /> : null}
              {activeTab === "filemanager" ? <FileManagerTab /> : null}
              {activeTab === "system" ? <SystemTab /> : null}
              {activeTab === "infohub" ? <InfoHubTab /> : null}
              {activeTab === "calltoprd" ? <CallToPrdTab /> : null}
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
  return [
    "home",
    "aiskills",
    "cshelper",
    "projects",
    "dochub",
    "filemanager",
    "system",
    "infohub",
    "calltoprd",
  ].includes(value);
}

function TabPanelMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-6">
      <p className="text-sm uppercase tracking-[0.24em] text-gray-500">{title}</p>
      <p className="mt-4 text-sm text-gray-300">{message}</p>
    </section>
  );
}
