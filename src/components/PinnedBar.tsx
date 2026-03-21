"use client";

import { usePinned } from "@/hooks/usePinned";
import { navigateDashboard } from "@/lib/navigation";
import type { PinnedItem } from "@/lib/types";

export function PinnedBar() {
  const { items, toggle } = usePinned();

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 transition-all duration-[150ms] hover:bg-[#242424]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
            즐겨찾기
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-soft)]">
            자주 쓰는 항목을 한 번에 열거나 복사합니다.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
          {items.length}개
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <PinnedChip key={item.id} item={item} onRemove={() => toggle(item)} />
        ))}
      </div>
    </section>
  );
}

function PinnedChip({ item, onRemove }: { item: PinnedItem; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm">
      <button
        type="button"
        onClick={() => handlePinnedClick(item)}
        className="text-white/85 transition hover:text-white"
      >
        {item.name}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-white/45 transition hover:text-white"
        title="즐겨찾기 해제"
      >
        ✕
      </button>
    </div>
  );
}

async function handlePinnedClick(item: PinnedItem) {
  if (item.actionMode === "copy") {
    await navigator.clipboard.writeText(item.action);
    return;
  }

  navigateDashboard({
    tab: item.tab as Parameters<typeof navigateDashboard>[0]["tab"],
  });
}
