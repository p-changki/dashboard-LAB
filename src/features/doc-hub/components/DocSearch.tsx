"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getDocHubCopy } from "@/features/doc-hub/copy";
import type { AppLocale } from "@/lib/locale";
import type { DocSearchResult } from "@/lib/types";

interface DocSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSelectDoc: (project: string, file: string) => void;
}

export function DocSearch({ query, onQueryChange, onSelectDoc }: DocSearchProps) {
  const { locale } = useLocale();
  const copy = getDocHubCopy(locale);
  const [results, setResults] = useState<DocSearchResult[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchResults(query, locale, setResults);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, locale]);

  return (
    <div className="relative">
      <Input
        variant="default"
        size="lg"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={copy.searchPlaceholder}
        className="rounded-xl text-text-secondary placeholder:text-text-muted focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      {results.length > 0 ? (
        <div className="absolute left-0 right-0 top-[58px] z-20 max-h-80 overflow-auto rounded-2xl border border-gray-800 bg-gray-900 p-2 shadow-2xl">
          {results.map((result) => (
            <Button
              key={`${result.doc.projectName}-${result.doc.filePath}`}
              type="button"
              variant="ghost"
              onClick={() => onSelectDoc(result.doc.projectName, result.doc.filePath)}
              className="flex w-full flex-col !items-start gap-2 rounded-xl px-3 py-3 !h-auto"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{result.doc.fileName}</span>
                <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-[11px] text-text-secondary">
                  {result.matchType === "filename" ? copy.matchFilename : copy.matchContent}
                </span>
              </div>
              <p className="text-xs text-text-muted">{result.snippet}</p>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function fetchResults(
  query: string,
  locale: AppLocale,
  setResults: (value: DocSearchResult[]) => void,
) {
  const normalized = query.trim();

  if (!normalized) {
    setResults([]);
    return;
  }

  const response = await fetch(`/api/doc-hub/search?q=${encodeURIComponent(normalized)}`, {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });

  if (!response.ok) {
    setResults([]);
    return;
  }

  const payload = (await response.json()) as { results: DocSearchResult[] };
  setResults(payload.results);
}
