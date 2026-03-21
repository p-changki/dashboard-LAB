"use client";

interface PaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({
  page,
  totalItems,
  pageSize,
  onChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  const pages = buildPages(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-xs text-[var(--color-muted)]">
        {page} / {totalPages} 페이지 · 총 {totalItems}개
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-white transition hover:bg-white/10 disabled:opacity-30"
        >
          이전
        </button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={[
              "rounded-full px-3 py-1.5 text-xs transition",
              item === page
                ? "bg-cyan-300 text-black"
                : "border border-white/10 bg-white/6 text-white hover:bg-white/10",
            ].join(" ")}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-white transition hover:bg-white/10 disabled:opacity-30"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function buildPages(page: number, totalPages: number) {
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}
