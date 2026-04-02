"use client";

import type { TrendingResponse } from "@/lib/types";

export function TrendingSection({ data }: { data: TrendingResponse | null }) {
  if (!data || (data.github.length === 0 && data.npm.length === 0)) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <TrendingList title="GitHub Trending" items={data.github.map((item) => `${item.rank}. ${item.name}`)} />
      <TrendingList title="npm Trends" items={data.npm.map((item) => `${item.rank}. ${item.name}`)} />
    </div>
  );
}

function TrendingList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border-base bg-white/5 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-2">
        {items.slice(0, 8).map((item) => (
          <p key={item} className="text-sm text-white/75">{item}</p>
        ))}
      </div>
    </div>
  );
}
