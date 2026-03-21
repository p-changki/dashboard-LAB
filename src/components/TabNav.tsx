"use client";

import {
  ChevronRight,
  FileSearch,
  FolderCog,
  FolderKanban,
  Home,
  MessageSquare,
  Monitor,
  Phone,
  Rss,
  Sparkles,
} from "lucide-react";

import { APP_META } from "@/lib/app-meta";

const TABS = [
  { id: "home", label: "홈", icon: Home },
  { id: "aiskills", label: "AI Skills", icon: Sparkles },
  { id: "cshelper", label: "CS Helper", icon: MessageSquare },
  { id: "projects", label: "프로젝트", icon: FolderKanban },
  { id: "dochub", label: "문서 허브", icon: FileSearch },
  { id: "filemanager", label: "파일 매니저", icon: FolderCog },
  { id: "system", label: "시스템", icon: Monitor },
  { id: "infohub", label: "Info Hub", icon: Rss },
  { id: "calltoprd", label: "Call → PRD", icon: Phone },
] as const;

const TOOL_STATUS = [
  { name: "Claude", tone: "text-purple-300", dot: "bg-purple-400" },
  { name: "Codex", tone: "text-green-300", dot: "bg-green-400" },
  { name: "Gemini", tone: "text-blue-300", dot: "bg-blue-400" },
] as const;

export type DashboardTabId = (typeof TABS)[number]["id"];

interface TabNavProps {
  activeTab: DashboardTabId;
  collapsed: boolean;
  onChange: (tab: DashboardTabId) => void;
  onToggleCollapse: () => void;
}

export function TabNav({
  activeTab,
  collapsed,
  onChange,
  onToggleCollapse,
}: TabNavProps) {
  return (
    <aside
      className={[
        "flex min-h-screen flex-col border-r border-white/8 bg-[#161616] transition-all duration-[250ms]",
        collapsed ? "w-16" : "w-64",
      ].join(" ")}
    >
      <div className="flex h-16 items-center border-b border-white/8 px-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-400 text-sm font-bold text-black shadow-lg shadow-cyan-500/20">
            {APP_META.shortName}
          </div>
          {!collapsed ? (
            <div>
              <p className="text-sm font-semibold text-gray-100">{APP_META.displayName}</p>
              <p className="text-xs text-gray-500">보일러플레이트 워크스페이스</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "flex w-full items-center gap-3 rounded-r-2xl border-l-2 px-3 py-2.5 text-left text-sm transition-all duration-[150ms]",
                isActive
                  ? "border-purple-500/60 bg-purple-900/[.15] text-purple-400"
                  : "border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-100",
                collapsed ? "justify-center rounded-l-2xl" : "",
              ].join(" ")}
              title={collapsed ? tab.label : undefined}
            >
              <tab.icon aria-hidden className="h-4 w-4 shrink-0" />
              {!collapsed ? <span>{tab.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/8 p-3">
        {!collapsed ? (
          <div className="rounded-2xl border border-white/8 bg-[#0f0f0f]/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600">
              AI 상태
            </p>
            <div className="mt-3 space-y-2">
              {TOOL_STATUS.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between text-sm text-gray-300"
                >
                  <span>{tool.name}</span>
                  <span className={`inline-flex items-center gap-2 ${tool.tone}`}>
                    <span className={`h-2 w-2 rounded-full ${tool.dot}`} />
                    온라인
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {TOOL_STATUS.map((tool) => (
              <span
                key={tool.name}
                className={`h-2.5 w-2.5 rounded-full ${tool.dot}`}
                title={`${tool.name} 온라인`}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center rounded-2xl border border-white/8 bg-[#0f0f0f]/60 px-3 py-2 text-sm text-gray-400 transition-all duration-[150ms] hover:bg-white/5 hover:text-gray-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : "사이드바 접기"}
        </button>
      </div>
    </aside>
  );
}
