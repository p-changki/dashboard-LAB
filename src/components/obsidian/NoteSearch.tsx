"use client";

import { useEffect, useState } from "react";

import type { ObsidianSearchResult } from "@/lib/types";

interface NoteSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSelectNote: (path: string) => void;
}

export function NoteSearch({
  query,
  onQueryChange,
  onSelectNote,
}: NoteSearchProps) {
  const [results, setResults] = useState<ObsidianSearchResult[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchResults(query, setResults);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="panel relative p-4">
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="노트 검색..."
        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-200 outline-none placeholder:text-gray-500 focus:border-blue-500"
      />
      {results.length > 0 ? (
        <div className="absolute left-4 right-4 top-[72px] z-10 max-h-96 overflow-auto rounded-2xl border border-white/10 bg-gray-900/95 p-2 shadow-2xl">
          {results.map((result) => (
            <button
              key={`${result.note.path}-${result.matchType}`}
              type="button"
              onClick={() => onSelectNote(result.note.path)}
              className="flex w-full flex-col gap-2 rounded-xl px-3 py-3 text-left hover:bg-white/6"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{result.note.name}</span>
                <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-[11px] text-blue-200">
                  {MATCH_TYPE_LABEL[result.matchType]}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-soft)]">{result.snippet}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function fetchResults(
  query: string,
  setResults: (value: ObsidianSearchResult[]) => void,
) {
  const normalized = query.trim();

  if (!normalized) {
    setResults([]);
    return;
  }

  const response = await fetch(`/api/obsidian/search?q=${encodeURIComponent(normalized)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    setResults([]);
    return;
  }

  const payload = (await response.json()) as { results: ObsidianSearchResult[] };
  setResults(payload.results);
}

const MATCH_TYPE_LABEL = {
  title: "제목",
  content: "본문",
  tag: "태그",
} as const;
