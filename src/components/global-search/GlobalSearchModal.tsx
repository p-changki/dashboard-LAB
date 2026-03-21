"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { RecentItems } from "@/components/global-search/RecentItems";
import { SearchInput } from "@/components/global-search/SearchInput";
import { SearchResults } from "@/components/global-search/SearchResults";
import { pushRecentItem } from "@/hooks/useRecent";
import { navigateDashboard } from "@/lib/navigation";
import type { GlobalSearchResponse, GlobalSearchResult, RecentItem } from "@/lib/types";

export function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const activeResult = useMemo(() => results[activeIndex] ?? null, [activeIndex, results]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (!open) {
        return;
      }

      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === "Enter" && activeResult) {
        event.preventDefault();
        void handleSelect(activeResult, close, event.metaKey || event.ctrlKey);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeResult, close, open, results.length]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    void fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<GlobalSearchResponse>)
      .then((payload) => {
        if (!controller.signal.aborted) {
          setResults(payload.results);
          setActiveIndex(0);
        }
      })
      .catch((error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) {
          return;
        }

        setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [open, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 py-16 backdrop-blur-sm">
      <button type="button" aria-label="검색 닫기" className="absolute inset-0 cursor-default" onClick={close} />
      <div className="relative w-full max-w-3xl rounded-[28px] border border-white/8 bg-[#161616] shadow-2xl">
        <div className="border-b border-white/10 p-4">
          <SearchInput open={open} onQueryChange={setQuery} />
          <p className="mt-2 text-right text-xs text-white/35">ESC 닫기</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading ? <div className="text-sm text-white/55">검색 중입니다.</div> : null}
          {!loading && query.trim() ? (
            <SearchResults results={results} activeIndex={activeIndex} onSelect={(result) => void handleSelect(result, close)} />
          ) : null}
          {!loading && !query.trim() ? <RecentItems onSelect={(item) => void handleRecentSelect(item, close)} /> : null}
        </div>
      </div>
    </div>
  );
}

async function handleSelect(result: GlobalSearchResult, close: () => void, forceCopy = false) {
  if (result.actionMode === "copy" || forceCopy) {
    await navigator.clipboard.writeText(result.action);
    pushRecentItem({ id: result.id, name: result.title, type: result.type, action: "copied", timestamp: "", value: result.action });
    close();
    return;
  }

  if (result.actionMode === "launch") {
    await fetch("/api/system/apps/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appPath: result.payload?.appPath ?? result.action }),
    });
    pushRecentItem({ id: result.id, name: result.title, type: result.type, action: "launched", timestamp: "", payload: result.payload });
    close();
    return;
  }

  navigateDashboard({ tab: result.tab as Parameters<typeof navigateDashboard>[0]["tab"], payload: result.payload });
  pushRecentItem({ id: result.id, name: result.title, type: result.type, action: "navigated", timestamp: "", tab: result.tab, payload: result.payload });
  close();
}

async function handleRecentSelect(item: RecentItem, close: () => void) {
  if (item.action === "copied" && item.value) {
    await navigator.clipboard.writeText(item.value);
    close();
    return;
  }

  if (item.action === "launched" && item.payload?.appPath) {
    await fetch("/api/system/apps/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appPath: item.payload.appPath }),
    });
    close();
    return;
  }

  if (item.tab) {
    navigateDashboard({ tab: item.tab as Parameters<typeof navigateDashboard>[0]["tab"], payload: item.payload });
  }

  close();
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
