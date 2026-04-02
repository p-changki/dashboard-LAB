"use client";

import type { PackageUpdatesResponse } from "@/lib/types";

export function PackageUpdates({ data }: { data: PackageUpdatesResponse | null }) {
  if (!data || data.items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {data.items.slice(0, 10).map((item) => (
        <div key={item.name} className="rounded-xl border border-border-base bg-black/20 px-4 py-3">
          <p className="text-sm font-medium text-white">{item.name}</p>
          <p className="mt-1 text-xs text-white/55">
            {item.currentVersion} → {item.latestVersion} · {item.updateType}
          </p>
        </div>
      ))}
    </div>
  );
}
