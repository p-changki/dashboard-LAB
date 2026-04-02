"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import type { CsProject } from "@/lib/types";

const PAGE_SIZE = 5;

interface CsContextManagerProps {
  projects: CsProject[];
  copy: {
    title: string;
    count: (count: number) => string;
    hasContext: string;
    noContext: string;
    path: string;
    create: string;
  };
  onInit: (projectName: string) => void;
}

export function CsContextManager({ projects, copy, onInit }: CsContextManagerProps) {
  const [page, setPage] = useState(0);
  const [collapsed, setCollapsed] = useState(true);

  const totalPages = Math.ceil(projects.length / PAGE_SIZE);
  const paged = projects.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-border-base bg-bg-card p-5">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full !justify-between text-left !h-auto py-0 !shrink !px-0"
      >
        <div className="flex items-center gap-3">
          <p className="text-lg font-semibold text-text-primary">{copy.title}</p>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-text-muted">
            {copy.count(projects.length)}
          </span>
        </div>
        <ChevronDown className={`h-5 w-5 text-text-muted transition-transform duration-[150ms] ${collapsed ? "" : "rotate-180"}`} />
      </Button>

      {!collapsed && (
        <>
          <div className="mt-4 space-y-2">
            {paged.map((project) => (
              <article
                key={project.id}
                className="grid gap-3 rounded-2xl border border-border-base bg-bg-page/40 px-4 py-4 transition-all duration-[150ms] hover:border-border-hover md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-text-primary">{project.name}</p>
                  <p className="mt-1 overflow-hidden text-xs leading-6 text-text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                    {project.contextSummary}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      project.hasContext
                        ? "border border-emerald-500/20 bg-emerald-900/30 text-emerald-300"
                        : "border border-amber-500/20 bg-amber-900/30 text-amber-300"
                    }`}
                  >
                    {project.hasContext ? copy.hasContext : copy.noContext}
                  </span>
                  {project.contextPath ? (
                    <CopyButton value={project.contextPath} label={copy.path} />
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onInit(project.name)}
                    >
                      {copy.create}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, projects.length)} / {projects.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    type="button"
                    variant={i === page ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setPage(i)}
                    className={i === page ? "bg-purple-900/30 text-purple-300 border-purple-500/20" : undefined}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
