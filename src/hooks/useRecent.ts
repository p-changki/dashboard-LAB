"use client";

import { useEffect, useState } from "react";

import { CLIENT_EVENTS, CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import type { RecentItem } from "@/lib/types";

const STORAGE_KEY = CLIENT_STORAGE_KEYS.recent;
const RECENT_EVENT = CLIENT_EVENTS.recent;
const MAX_ITEMS = 30;

export function useRecent() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    setItems(readRecentItems());
    const onChange = () => setItems(readRecentItems());
    window.addEventListener(RECENT_EVENT, onChange);
    return () => window.removeEventListener(RECENT_EVENT, onChange);
  }, []);

  return {
    items,
    push: (item: RecentItem) => {
      const next = pushRecentItem(item);
      setItems(next);
    },
  };
}

export function readRecentItems() {
  if (typeof window === "undefined") {
    return [] as RecentItem[];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

export function pushRecentItem(item: RecentItem) {
  const current = readRecentItems();
  const deduped = current.filter((entry) => entry.id !== item.id);
  const next = [{ ...item, timestamp: new Date().toISOString() }, ...deduped].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(RECENT_EVENT));
  return next;
}
