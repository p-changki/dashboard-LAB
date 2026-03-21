"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { CopyButton } from "@/components/CopyButton";
import type { CsProject } from "@/lib/types";

const PAGE_SIZE = 5;

interface CsContextManagerProps {
  projects: CsProject[];
  onInit: (projectName: string) => void;
}

export function CsContextManager({ projects, onInit }: CsContextManagerProps) {
  const [page, setPage] = useState(0);
  const [collapsed, setCollapsed] = useState(true);

  const totalPages = Math.ceil(projects.length / PAGE_SIZE);
  const paged = projects.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <p className="text-lg font-semibold text-[#f0f0f0]">컨텍스트 관리</p>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-gray-400">
            {projects.length}개
          </span>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-[150ms] ${collapsed ? "" : "rotate-180"}`} />
      </button>

      {!collapsed && (
        <>
          <div className="mt-4 space-y-2">
            {paged.map((project) => (
              <article
                key={project.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0f0f0f]/40 px-4 py-3 transition-all duration-[150ms] hover:border-white/[.14]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#f0f0f0]">{project.name}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{project.contextSummary}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      project.hasContext
                        ? "border border-emerald-500/20 bg-emerald-900/30 text-emerald-300"
                        : "border border-amber-500/20 bg-amber-900/30 text-amber-300"
                    }`}
                  >
                    {project.hasContext ? "있음" : "없음"}
                  </span>
                  {project.contextPath ? (
                    <CopyButton value={project.contextPath} label="경로" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onInit(project.name)}
                      className="rounded-lg border border-white/8 bg-[#1e1e1e] px-3 py-1.5 text-xs text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]"
                    >
                      생성
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {page * PAGE_SIZE + 1}~{Math.min((page + 1) * PAGE_SIZE, projects.length)} / {projects.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-white/8 p-1.5 text-gray-400 transition-all duration-[150ms] hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={`h-7 w-7 rounded-lg text-xs transition-all duration-[150ms] ${
                      i === page
                        ? "bg-purple-900/30 text-purple-300 border border-purple-500/20"
                        : "text-gray-500 hover:bg-white/5"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/8 p-1.5 text-gray-400 transition-all duration-[150ms] hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
