"use client";

import { SearchResultItem } from "@/components/global-search/SearchResultItem";
import type { GlobalSearchResult } from "@/lib/types";

interface SearchResultsProps {
  results: GlobalSearchResult[];
  activeIndex: number;
  onSelect: (result: GlobalSearchResult) => void;
}

export function SearchResults({ results, activeIndex, onSelect }: SearchResultsProps) {
  const groups = groupResults(results);

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-6 text-sm text-white/55">
        검색 결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([label, items]) => (
        <section key={label} className="space-y-2">
          <p className="px-2 text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
          <div className="space-y-1">
            {items.map(({ result, index }) => (
              <SearchResultItem
                key={result.id}
                result={result}
                active={index === activeIndex}
                onSelect={() => onSelect(result)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupResults(results: GlobalSearchResult[]) {
  const labels: Record<GlobalSearchResult["type"], string> = {
    skill: "스킬",
    agent: "에이전트",
    team: "팀",
    command: "커맨드",
    mcp: "MCP",
    project: "프로젝트",
    "obsidian-note": "옵시디언",
    "ai-doc": "문서",
    app: "앱",
  };

  const grouped = new Map<string, Array<{ result: GlobalSearchResult; index: number }>>();
  results.forEach((result, index) => {
    const label = labels[result.type];
    const current = grouped.get(label) ?? [];
    current.push({ result, index });
    grouped.set(label, current);
  });
  return [...grouped.entries()];
}
