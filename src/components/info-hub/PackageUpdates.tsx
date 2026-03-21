"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { PackageUpdatesResponse } from "@/lib/types";

export function PackageUpdates({ data }: { data: PackageUpdatesResponse | null }) {
  const [open, setOpen] = useState(true);

  if (!data) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">패키지 업데이트</p>
          <p className="mt-1 text-xs text-white/45">현재 프로젝트에서 버전 차이가 있는 패키지를 빠르게 확인합니다.</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-white/45 transition-transform duration-[150ms] ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          {data.items.slice(0, 10).map((item) => (
            <div key={item.name} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-sm font-medium text-white">{item.name}</p>
              <p className="mt-1 text-xs text-white/55">{item.currentVersion} → {item.latestVersion} · {item.updateType}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
