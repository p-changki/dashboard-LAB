"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { useRecent } from "@/hooks/useRecent";
import { pickLocale } from "@/lib/locale";
import type { RecentItem } from "@/lib/types";

interface RecentItemsProps {
  onSelect: (item: RecentItem) => void;
}

export function RecentItems({ onSelect }: RecentItemsProps) {
  const { locale } = useLocale();
  const { items } = useRecent();
  const copy = pickLocale(locale, {
    ko: {
      empty: "최근 사용 기록이 없습니다.",
      title: "최근 사용",
      copied: "복사",
      launched: "실행",
      navigated: "이동",
      skill: "스킬",
      agent: "에이전트",
      team: "팀",
      command: "커맨드",
      mcp: "MCP",
      project: "프로젝트",
      "ai-doc": "문서",
      app: "앱",
    },
    en: {
      empty: "No recent items yet.",
      title: "Recent",
      copied: "Copied",
      launched: "Launched",
      navigated: "Opened",
      skill: "Skill",
      agent: "Agent",
      team: "Team",
      command: "Command",
      mcp: "MCP",
      project: "Project",
      "ai-doc": "Doc",
      app: "App",
    },
  });

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
        {copy.empty}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.24em] text-white/40">{copy.title}</p>
      {items.slice(0, 8).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8"
        >
          <div>
            <p className="text-sm font-medium text-white">{item.name}</p>
            <p className="mt-1 text-xs text-white/45">{copy[item.type]}</p>
          </div>
          <span className="text-xs text-white/35">
            {item.action === "copied" ? copy.copied : item.action === "launched" ? copy.launched : copy.navigated}
          </span>
        </button>
      ))}
    </div>
  );
}
