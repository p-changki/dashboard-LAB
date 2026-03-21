"use client";

import { FileTypeIcon } from "@/components/common/FileTypeIcon";
import type { GlobalSearchResult } from "@/lib/types";

interface SearchResultItemProps {
  result: GlobalSearchResult;
  active: boolean;
  onSelect: () => void;
}

export function SearchResultItem({ result, active, onSelect }: SearchResultItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-[150ms]",
        active
          ? "border-purple-500/40 bg-purple-500/12 text-white"
          : "border-white/8 bg-[#1e1e1e] text-white/80 hover:border-white/[.14] hover:bg-[#242424]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {isFileResult(result.type) ? (
          <FileTypeIcon extension={getExtension(result.type)} />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/6 text-xs text-white/70">
            {result.icon.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <p className="text-sm font-medium">{result.title}</p>
          <p className="mt-1 text-xs text-white/45">{result.subtitle}</p>
        </div>
      </div>
      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
        {result.matchField}
      </span>
    </button>
  );
}

function isFileResult(type: GlobalSearchResult["type"]) {
  return type === "obsidian-note" || type === "ai-doc";
}

function getExtension(type: GlobalSearchResult["type"]) {
  return type === "obsidian-note" ? "md" : "txt";
}
