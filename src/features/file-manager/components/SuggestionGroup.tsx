import { useEffect, useState } from "react";

import { Pagination } from "@/components/common/Pagination";
import type { CleanupSuggestion } from "@/lib/types";

import { SuggestionItem } from "./SuggestionItem";

interface SuggestionGroupProps {
  title: string;
  suggestions: CleanupSuggestion[];
}

export function SuggestionGroup({ title, suggestions }: SuggestionGroupProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "size">("latest");
  const pageSize = 8;

  useEffect(() => {
    setPage(1);
  }, [suggestions.length, title, sortBy]);

  if (suggestions.length === 0) {
    return null;
  }

  const sortedSuggestions = sortSuggestions(suggestions, sortBy);
  const pagedSuggestions = sortedSuggestions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-text-primary">{title}</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs text-text-muted">
            {suggestions.length}개
          </span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "latest" | "oldest" | "size")}
            className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-text-secondary"
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="size">큰 파일순</option>
          </select>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {pagedSuggestions.map((suggestion) => (
          <SuggestionItem
            key={`${suggestion.file.path}-${suggestion.action}`}
            suggestion={suggestion}
          />
        ))}
      </div>
      <Pagination
        page={page}
        totalItems={sortedSuggestions.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </section>
  );
}

function sortSuggestions(
  suggestions: CleanupSuggestion[],
  sortBy: "latest" | "oldest" | "size",
) {
  return [...suggestions].sort((left, right) => {
    if (sortBy === "oldest") {
      return new Date(left.file.lastModified).getTime() - new Date(right.file.lastModified).getTime();
    }

    if (sortBy === "size") {
      return right.file.sizeBytes - left.file.sizeBytes;
    }

    return new Date(right.file.lastModified).getTime() - new Date(left.file.lastModified).getTime();
  });
}
