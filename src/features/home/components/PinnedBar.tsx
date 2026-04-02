"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { usePinned } from "@/hooks/usePinned";
import { getHomeCopy } from "@/features/home/copy";
import { navigateDashboard } from "@/lib/navigation";
import type { PinnedItem } from "@/lib/types";

export function PinnedBar() {
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);
  const { items, toggle } = usePinned();

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border-base bg-bg-card p-5 transition-all duration-[150ms] hover:bg-bg-card-hover">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
            {copy.pinnedTitle}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {copy.pinnedDescription}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
          {copy.pinnedCount(items.length)}
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
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm">
      <Button
        type="button"
        variant="ghost"
        onClick={() => handlePinnedClick(item)}
        className="text-white/85 hover:text-white h-auto p-0 rounded-none text-sm font-normal"
      >
        {item.name}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onRemove}
        title={copy.removePinned}
        className="text-white/45 hover:text-white h-auto p-0 rounded-none text-xs font-normal"
      >
        ✕
      </Button>
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
