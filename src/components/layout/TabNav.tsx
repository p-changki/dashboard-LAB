"use client";

import {
  ChevronRight,
  FileSearch,
  FolderCog,
  FolderKanban,
  Home,
  MessageSquare,
  Monitor,
  NotebookPen,
  PenLine,
  Phone,
  Rss,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { APP_META } from "@/lib/app-meta";
import { getDashboardTabMeta } from "@/lib/dashboard-guides";
import { pickLocale } from "@/lib/locale";

const TABS = [
  { id: "home", icon: Home, tier: "core" },
  { id: "aiskills", icon: Sparkles, tier: "core" },
  { id: "cshelper", icon: MessageSquare, tier: "core" },
  { id: "projects", icon: FolderKanban, tier: "core" },
  { id: "dochub", icon: FileSearch, tier: "core" },
  { id: "meetinghub", icon: NotebookPen, tier: "core" },
  { id: "filemanager", icon: FolderCog, tier: "advanced" },
  { id: "system", icon: Monitor, tier: "advanced" },
  { id: "infohub", icon: Rss, tier: "core" },
  { id: "signalwriter", icon: PenLine, tier: "core" },
  { id: "calltoprd", icon: Phone, tier: "core" },
] as const;

const TOOL_STATUS = [
  { name: "Claude", tone: "text-purple-300", dot: "bg-purple-400" },
  { name: "Codex", tone: "text-green-300", dot: "bg-green-400" },
  { name: "Gemini", tone: "text-blue-300", dot: "bg-blue-400" },
] as const;

export type DashboardTabId = (typeof TABS)[number]["id"];
export type DashboardNavigationMode = "core" | "advanced";

export function getVisibleTabs(mode: DashboardNavigationMode) {
  return mode === "advanced" ? TABS : TABS.filter((tab) => tab.tier === "core");
}

export function isTabVisible(tabId: DashboardTabId, mode: DashboardNavigationMode) {
  return getVisibleTabs(mode).some((tab) => tab.id === tabId);
}

interface TabNavProps {
  activeTab: DashboardTabId;
  collapsed: boolean;
  mode: DashboardNavigationMode;
  onChange: (tab: DashboardTabId) => void;
  onChangeMode: (mode: DashboardNavigationMode) => void;
  onToggleCollapse: () => void;
}

export function TabNav({
  activeTab,
  collapsed,
  mode,
  onChange,
  onChangeMode,
  onToggleCollapse,
}: TabNavProps) {
  const { locale, setLocale } = useLocale();
  const tabMeta = getDashboardTabMeta(locale);
  const copy = pickLocale(locale, {
    ko: {
      viewMode: "보기 모드",
      coreMode: "간단 모드",
      advancedMode: "전체 모드",
      modeHint:
        "간단 모드는 핵심 탭만 보여주고, 전체 모드는 시스템과 파일 정리 기능까지 엽니다.",
      aiStatus: "AI 상태",
      online: "온라인",
      switchToAdvanced: "전체 모드로 전환",
      switchToCore: "간단 모드로 전환",
      collapseSidebar: "사이드바 접기",
      expandSidebar: "사이드바 펼치기",
      language: "언어",
    },
    en: {
      viewMode: "View Mode",
      coreMode: "Simple",
      advancedMode: "Full",
      modeHint:
        "Simple mode shows the core tabs first. Full mode opens system and file-management tools as well.",
      aiStatus: "AI Status",
      online: "Online",
      switchToAdvanced: "Switch to full mode",
      switchToCore: "Switch to simple mode",
      collapseSidebar: "Collapse sidebar",
      expandSidebar: "Expand sidebar",
      language: "Language",
    },
  });

  return (
    <aside
      aria-label={APP_META.displayName}
      className={[
        "flex min-h-screen flex-col border-r border-border-base bg-bg-surface transition-all duration-[250ms]",
        collapsed ? "w-16" : "w-64",
      ].join(" ")}
    >
      <div className="flex h-16 items-center border-b border-border-base px-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-400 text-sm font-bold text-black shadow-lg shadow-cyan-500/20">
            {APP_META.shortName}
          </div>
          {!collapsed ? (
            <div>
              <p className="text-sm font-semibold text-text-primary">{APP_META.displayName}</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-4">
        {getVisibleTabs(mode).map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={collapsed ? tabMeta[tab.id].title : undefined}
              className={[
                "flex w-full items-center gap-3 rounded-r-2xl border-l-2 px-3 py-2.5 text-left text-sm transition-all duration-[150ms]",
                isActive
                  ? "border-accent-claude/60 bg-accent-claude-muted text-accent-claude"
                  : "border-transparent text-text-muted hover:bg-white/5 hover:text-text-primary",
                collapsed ? "justify-center rounded-l-2xl" : "",
              ].join(" ")}
            >
              <tab.icon aria-hidden className="h-4 w-4 shrink-0" />
              {!collapsed ? <span>{tabMeta[tab.id].title}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border-base p-3">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border-base bg-bg-page/60 p-3">
              <p className="text-[10px] uppercase tracking-widest text-text-disabled">
                {copy.viewMode}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeMode("core")}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs transition",
                    mode === "core"
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                      : "border-border-base bg-white/[0.03] text-text-muted hover:bg-white/5 hover:text-text-secondary",
                  ].join(" ")}
                >
                  {copy.coreMode}
                </button>
                <button
                  type="button"
                  onClick={() => onChangeMode("advanced")}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs transition",
                    mode === "advanced"
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                      : "border-border-base bg-white/[0.03] text-text-muted hover:bg-white/5 hover:text-text-secondary",
                  ].join(" ")}
                >
                  {copy.advancedMode}
                </button>
              </div>
              <p className="mt-3 text-xs leading-5 text-text-muted">
                {copy.modeHint}
              </p>
            </div>
            <div className="rounded-2xl border border-border-base bg-bg-page/60 p-3">
              <p className="text-[10px] uppercase tracking-widest text-text-disabled">
                {copy.language}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["ko", "en"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLocale(value)}
                    className={[
                      "rounded-xl border px-3 py-2 text-xs transition",
                      locale === value
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "border-border-base bg-white/[0.03] text-text-muted hover:bg-white/5 hover:text-text-secondary",
                    ].join(" ")}
                  >
                    {value.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border-base bg-bg-page/60 p-3">
              <p className="text-[10px] uppercase tracking-widest text-text-disabled">
                {copy.aiStatus}
              </p>
              <div className="mt-3 space-y-2">
                {TOOL_STATUS.map((tool) => (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between text-sm text-text-secondary"
                  >
                    <span>{tool.name}</span>
                    <span className={`inline-flex items-center gap-2 ${tool.tone}`}>
                      <span className={`h-2 w-2 rounded-full ${tool.dot}`} />
                      {copy.online}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeMode(mode === "core" ? "advanced" : "core")}
              className="grid h-8 w-8 place-items-center rounded-xl border border-border-base bg-bg-page/60 text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
              title={mode === "core" ? copy.switchToAdvanced : copy.switchToCore}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            {TOOL_STATUS.map((tool) => (
              <span
                key={tool.name}
                className={`h-2.5 w-2.5 rounded-full ${tool.dot}`}
                title={`${tool.name} ${copy.online}`}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? copy.expandSidebar : copy.collapseSidebar}
          className="flex w-full items-center justify-center rounded-2xl border border-border-base bg-bg-page/60 px-3 py-2 text-sm text-text-muted transition-all duration-[150ms] hover:bg-white/5 hover:text-text-secondary"
        >
          {collapsed ? <ChevronRight aria-hidden className="h-4 w-4" /> : copy.collapseSidebar}
        </button>
      </div>
    </aside>
  );
}
