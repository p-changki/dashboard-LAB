"use client";

import { useEffect, useState } from "react";

import { CLIENT_EVENTS, CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import type { PinnedItem } from "@/lib/types";

const STORAGE_KEY = CLIENT_STORAGE_KEYS.pinned;
const PINNED_EVENT = CLIENT_EVENTS.pinned;

export function usePinned() {
  const [items, setItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    setItems(readPinnedItems());
    const onChange = () => setItems(readPinnedItems());
    window.addEventListener(PINNED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(PINNED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function toggle(item: PinnedItem) {
    const next = togglePinnedItem(item);
    setItems(next);
  }

  return {
    items,
    isPinned: (id: string) => items.some((item) => item.id === id),
    toggle,
  };
}

export function readPinnedItems() {
  if (typeof window === "undefined") {
    return [] as PinnedItem[];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PinnedItem[]) : [];
  } catch {
    return [];
  }
}

export function togglePinnedItem(item: PinnedItem) {
  const current = readPinnedItems();
  const exists = current.some((entry) => entry.id === item.id);
  const next = exists
    ? current.filter((entry) => entry.id !== item.id)
    : [{ ...item, pinnedAt: new Date().toISOString() }, ...current].slice(0, 20);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(PINNED_EVENT));
  return next;
}
