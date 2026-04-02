"use client";

import type { BookmarkedItem, FeedItem, ReadItem, SignalWriterPickItem } from "@/lib/types";

const BOOKMARK_KEY = "info-hub:bookmarks";
const READ_KEY = "info-hub:read";
const SIGNAL_WRITER_PICK_KEY = "info-hub:signal-writer-picks";
const LOCAL_STATE_EVENT = "dashboard-lab:info-hub-local-state";

export function toggleBookmark(feedItem: FeedItem) {
  const bookmarks = readBookmarks();
  const next = { ...bookmarks };

  if (next[feedItem.id]) {
    delete next[feedItem.id];
  } else {
    next[feedItem.id] = {
      feedItemId: feedItem.id,
      feedItem,
      bookmarkedAt: new Date().toISOString(),
    };
  }

  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
  emitStateChange(BOOKMARK_KEY);
  return next;
}

export function markAsRead(feedItemId: string) {
  const items = readReadItems();
  const next: Record<string, ReadItem> = {
    ...items,
    [feedItemId]: { feedItemId, readAt: new Date().toISOString() },
  };
  localStorage.setItem(READ_KEY, JSON.stringify(next));
  emitStateChange(READ_KEY);
  return next;
}

export function readBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return raw ? (JSON.parse(raw) as Record<string, BookmarkedItem>) : {};
  } catch {
    return {};
  }
}

export function toggleSignalWriterPick(feedItem: FeedItem) {
  const picks = readSignalWriterPicks();
  const next = { ...picks };

  if (next[feedItem.id]) {
    delete next[feedItem.id];
  } else {
    next[feedItem.id] = {
      feedItemId: feedItem.id,
      feedItem,
      pickedAt: new Date().toISOString(),
    };
  }

  localStorage.setItem(SIGNAL_WRITER_PICK_KEY, JSON.stringify(next));
  emitStateChange(SIGNAL_WRITER_PICK_KEY);
  return next;
}

export function removeSignalWriterPick(feedItemId: string) {
  const picks = readSignalWriterPicks();
  if (!picks[feedItemId]) {
    return picks;
  }

  const next = { ...picks };
  delete next[feedItemId];
  localStorage.setItem(SIGNAL_WRITER_PICK_KEY, JSON.stringify(next));
  emitStateChange(SIGNAL_WRITER_PICK_KEY);
  return next;
}

export function clearSignalWriterPicks() {
  localStorage.removeItem(SIGNAL_WRITER_PICK_KEY);
  emitStateChange(SIGNAL_WRITER_PICK_KEY);
  return {};
}

export function readSignalWriterPicks() {
  try {
    const raw = localStorage.getItem(SIGNAL_WRITER_PICK_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SignalWriterPickItem>) : {};
  } catch {
    return {};
  }
}

export function readReadItems() {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReadItem>) : {};
  } catch {
    return {};
  }
}

export function subscribeBookmarks(onChange: () => void) {
  return subscribeToStorageKey(BOOKMARK_KEY, onChange);
}

export function subscribeSignalWriterPicks(onChange: () => void) {
  return subscribeToStorageKey(SIGNAL_WRITER_PICK_KEY, onChange);
}

function subscribeToStorageKey(key: string, onChange: () => void) {
  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{ key?: string }>;
    if (customEvent.detail?.key === key) {
      onChange();
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === key) {
      onChange();
    }
  };

  window.addEventListener(LOCAL_STATE_EVENT, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(LOCAL_STATE_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

function emitStateChange(key: string) {
  window.dispatchEvent(new CustomEvent(LOCAL_STATE_EVENT, { detail: { key } }));
}
