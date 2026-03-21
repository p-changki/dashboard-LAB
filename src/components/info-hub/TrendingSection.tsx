"use client";

import type { TrendingResponse } from "@/lib/types";

export function TrendingSection({ data }: { data: TrendingResponse | null }) {
  if (!data) {
    return null;
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <TrendingList title="GitHub Trending" items={data.github.map((item) => `${item.rank}. ${item.name}`)} />
      <TrendingList title="npm Trends" items={data.npm.map((item) => `${item.rank}. ${item.name}`)} />
    </section>
  );
}

function TrendingList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-2">
        {items.slice(0, 8).map((item) => (
          <p key={item} className="text-sm text-white/75">{item}</p>
        ))}
      </div>
    </div>
  );
}
