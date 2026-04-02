"use client";

import { useEffect, useState } from "react";

import { CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import type { TerminalBookmark } from "@/lib/types";

interface BookmarkCommandsProps {
  onRun: (command: string) => void;
}

const STORAGE_KEY = CLIENT_STORAGE_KEYS.terminalBookmarks;

export function BookmarkCommands({ onRun }: BookmarkCommandsProps) {
  const [bookmarks, setBookmarks] = useState<TerminalBookmark[]>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setBookmarks(raw ? (JSON.parse(raw) as TerminalBookmark[]) : []);
  }, []);

  function save(next: TerminalBookmark[]) {
    setBookmarks(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-text-primary">Bookmarks</p>
      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="북마크 명령어 추가"
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm text-text-secondary outline-none placeholder:text-text-muted"
        />
        <button
          type="button"
          onClick={() => addBookmark(value, bookmarks, save, setValue)}
          className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-text-secondary hover:bg-gray-800"
        >
          추가
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="flex items-center gap-2 rounded-full bg-gray-900 px-3 py-2 text-sm text-text-secondary">
            <button type="button" onClick={() => onRun(bookmark.command)}>
              {bookmark.label}
            </button>
            <button type="button" onClick={() => save(bookmarks.filter((item) => item.id !== bookmark.id))} className="text-xs text-text-muted">
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function addBookmark(
  value: string,
  bookmarks: TerminalBookmark[],
  save: (value: TerminalBookmark[]) => void,
  setValue: (value: string) => void,
) {
  const normalized = value.trim();

  if (!normalized) {
    return;
  }

  save([
    ...bookmarks,
    {
      id: crypto.randomUUID(),
      label: normalized,
      command: normalized,
      createdAt: new Date().toISOString(),
    },
  ]);
  setValue("");
}
