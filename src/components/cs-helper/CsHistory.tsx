"use client";

import { useEffect, useState } from "react";

import { Pagination } from "@/components/common/Pagination";
import { CopyButton } from "@/components/CopyButton";
import type { CsHistoryItem } from "@/lib/types";

interface CsHistoryProps {
  items: CsHistoryItem[];
  projectNameMap?: Record<string, string>;
  onSelect: (item: CsHistoryItem) => void;
}

export function CsHistory({ items, projectNameMap = {}, onSelect }: CsHistoryProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "runner">("latest");
  const pageSize = 5;
  const sortedItems = sortHistory(items, sortBy);
  const pagedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [items.length, sortBy]);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-white">히스토리</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/60">
            {items.length}건
          </span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "latest" | "oldest" | "runner")}
            className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs text-white"
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="runner">AI순</option>
          </select>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-[var(--color-text-soft)]">
            아직 생성 기록이 없습니다.
          </div>
        ) : null}
        {pagedItems.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">
                  {projectNameMap[item.projectId] ?? item.projectId} · {item.channel} · {item.runner}
                </p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {new Date(item.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <CopyButton value={item.reply} label="복사" />
            </div>
            <p className="mt-3 text-sm text-white/75">{item.customerMessagePreview}</p>
            {item.additionalContext ? (
              <p className="mt-2 text-xs text-cyan-200/70">추가 맥락: {item.additionalContext}</p>
            ) : null}
            <p className="mt-2 text-sm text-[var(--color-text-soft)]">{item.replyPreview}</p>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="mt-4 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white transition hover:bg-white/10"
            >
              다시 보기
            </button>
          </article>
        ))}
      </div>
      <Pagination
        page={page}
        totalItems={sortedItems.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </section>
  );
}

function sortHistory(items: CsHistoryItem[], sortBy: "latest" | "oldest" | "runner") {
  return [...items].sort((left, right) => {
    if (sortBy === "oldest") {
      return left.createdAt.localeCompare(right.createdAt);
    }

    if (sortBy === "runner") {
      return left.runner.localeCompare(right.runner, "ko-KR");
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}
