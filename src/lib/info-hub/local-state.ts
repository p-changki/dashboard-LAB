"use client";

import type { BookmarkedItem, FeedItem, ReadItem } from "@/lib/types";

const BOOKMARK_KEY = "info-hub:bookmarks";
const READ_KEY = "info-hub:read";

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
  return next;
}

export function markAsRead(feedItemId: string) {
  const items = readReadItems();
  const next: Record<string, ReadItem> = {
    ...items,
    [feedItemId]: { feedItemId, readAt: new Date().toISOString() },
  };
  localStorage.setItem(READ_KEY, JSON.stringify(next));
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

export function readReadItems() {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReadItem>) : {};
  } catch {
    return {};
  }
}
