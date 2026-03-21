"use client";

import { useEffect, useState } from "react";

import { togglePinnedItem } from "@/hooks/usePinned";
import { CLIENT_EVENTS, CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import type { PinnedItem } from "@/lib/types";

interface PinButtonProps {
  item: Omit<PinnedItem, "pinnedAt">;
}

export function PinButton({ item }: PinButtonProps) {
  const [pinned, setPinned] = useState(false);
  const pinnedEvent = CLIENT_EVENTS.pinned;

  useEffect(() => {
    syncPinnedState(item.id, setPinned);
    const onChange = () => syncPinnedState(item.id, setPinned);
    window.addEventListener(pinnedEvent, onChange);
    return () => window.removeEventListener(pinnedEvent, onChange);
  }, [item.id, pinnedEvent]);

  return (
    <button
      type="button"
      onClick={() => setPinned(togglePinnedItem({ ...item, pinnedAt: "" }).some((entry) => entry.id === item.id))}
      className={[
        "rounded-full border px-2.5 py-1 text-xs transition",
        pinned
          ? "border-amber-400/30 bg-amber-400/12 text-amber-200"
          : "border-white/10 bg-white/6 text-white/55 hover:text-white",
      ].join(" ")}
      title={pinned ? "즐겨찾기 해제" : "즐겨찾기 추가"}
    >
      {pinned ? "★" : "☆"}
    </button>
  );
}

function syncPinnedState(id: string, setPinned: (value: boolean) => void) {
  try {
    const raw = localStorage.getItem(CLIENT_STORAGE_KEYS.pinned);
    const items = raw ? (JSON.parse(raw) as PinnedItem[]) : [];
    setPinned(items.some((item) => item.id === id));
  } catch {
    setPinned(false);
  }
}
