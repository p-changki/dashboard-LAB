"use client";

import { useRecent } from "@/hooks/useRecent";
import type { RecentItem } from "@/lib/types";

interface RecentItemsProps {
  onSelect: (item: RecentItem) => void;
}

export function RecentItems({ onSelect }: RecentItemsProps) {
  const { items } = useRecent();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
        최근 사용 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.24em] text-white/40">최근 사용</p>
      {items.slice(0, 8).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8"
        >
          <div>
            <p className="text-sm font-medium text-white">{item.name}</p>
            <p className="mt-1 text-xs text-white/45">{item.type}</p>
          </div>
          <span className="text-xs text-white/35">{item.action}</span>
        </button>
      ))}
    </div>
  );
}
