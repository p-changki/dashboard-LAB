"use client";

import type { ProjectInfo } from "@/lib/types";

interface ProjectFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: ProjectInfo["type"] | "all";
  onTypeFilterChange: (value: ProjectInfo["type"] | "all") => void;
  sortBy: "name" | "size" | "modified" | "commit";
  onSortChange: (value: "name" | "size" | "modified" | "commit") => void;
}

export function ProjectFilters({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortChange,
}: ProjectFiltersProps) {
  return (
    <div className="panel grid gap-3 p-4 md:grid-cols-[1.6fr_1fr_1fr]">
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="프로젝트 검색"
        className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
      />
      <select
        value={typeFilter}
        onChange={(event) =>
          onTypeFilterChange(event.target.value as ProjectInfo["type"] | "all")
        }
        className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="all">전체</option>
        <option value="nextjs">Next.js</option>
        <option value="turbo">Turbo</option>
        <option value="node-backend">Backend</option>
        <option value="document">문서</option>
        <option value="other">기타</option>
      </select>
      <select
        value={sortBy}
        onChange={(event) =>
          onSortChange(event.target.value as "name" | "size" | "modified" | "commit")
        }
        className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none"
      >
        <option value="name">이름순</option>
        <option value="size">용량순</option>
        <option value="modified">최근 수정순</option>
        <option value="commit">최근 커밋순</option>
      </select>
    </div>
  );
}
