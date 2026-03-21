"use client";

import { useEffect, useState } from "react";

import type { DocSearchResult } from "@/lib/types";

interface DocSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSelectDoc: (project: string, file: string) => void;
}

export function DocSearch({ query, onQueryChange, onSelectDoc }: DocSearchProps) {
  const [results, setResults] = useState<DocSearchResult[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchResults(query, setResults);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="문서 검색..."
        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-300 outline-none placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      {results.length > 0 ? (
        <div className="absolute left-0 right-0 top-[58px] z-20 max-h-80 overflow-auto rounded-2xl border border-gray-800 bg-gray-900 p-2 shadow-2xl">
          {results.map((result) => (
            <button
              key={`${result.doc.projectName}-${result.doc.filePath}`}
              type="button"
              onClick={() => onSelectDoc(result.doc.projectName, result.doc.filePath)}
              className="flex w-full flex-col gap-2 rounded-xl px-3 py-3 text-left hover:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{result.doc.fileName}</span>
                <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-[11px] text-gray-300">
                  {result.matchType === "filename" ? "파일명" : "본문"}
                </span>
              </div>
              <p className="text-xs text-gray-400">{result.snippet}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function fetchResults(query: string, setResults: (value: DocSearchResult[]) => void) {
  const normalized = query.trim();

  if (!normalized) {
    setResults([]);
    return;
  }

  const response = await fetch(`/api/doc-hub/search?q=${encodeURIComponent(normalized)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    setResults([]);
    return;
  }

  const payload = (await response.json()) as { results: DocSearchResult[] };
  setResults(payload.results);
}
