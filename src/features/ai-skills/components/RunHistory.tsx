"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Pagination } from "@/components/common/Pagination";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatAiSkillDate, getAiSkillsCopy } from "@/features/ai-skills/copy";
import type { SkillRun } from "@/lib/types";

interface RunHistoryProps {
  runs: SkillRun[];
  onView: (run: SkillRun) => void;
  onCancel: (runId: string) => void;
}

export function RunHistory({ runs, onView, onCancel }: RunHistoryProps) {
  const { locale } = useLocale();
  const copy = getAiSkillsCopy(locale);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "status">("latest");
  const pageSize = 6;
  const sortedRuns = sortRuns(runs, sortBy);
  const pagedRuns = sortedRuns.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [runs.length, sortBy]);

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-white">{copy.historyTitle}</p>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">{copy.resultsCount(runs.length)}</Badge>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "latest" | "oldest" | "status")}
            className="rounded-full border border-border-base bg-black/15 px-3 py-1 text-xs text-white"
          >
            <option value="latest">{copy.sortLatest}</option>
            <option value="oldest">{copy.sortOldest}</option>
            <option value="status">{copy.sortStatus}</option>
          </select>
        </div>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-base px-4 py-6 text-sm text-text-secondary xl:col-span-2">
            {copy.noHistory}
          </div>
        ) : null}
        {pagedRuns.map((run) => (
          <article key={run.id} className="rounded-3xl border border-border-base bg-black/15 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-medium text-white">{run.skillName}</p>
                  <Badge variant="neutral" size="sm">{run.runner}</Badge>
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  {copy.startedAt} {formatAiSkillDate(locale, run.startedAt)}
                </p>
              </div>
              <Badge variant={runStatusVariant(run.status)}>{copy.status[run.status]}</Badge>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-secondary">
              {run.prompt}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onView(run)}
              >
                {copy.viewResult}
              </Button>
              {run.status === "queued" || run.status === "running" ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onCancel(run.id)}
                >
                  {copy.cancel}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <Pagination
        page={page}
        totalItems={sortedRuns.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </section>
  );
}

function sortRuns(runs: SkillRun[], sortBy: "latest" | "oldest" | "status") {
  const statusRank: Record<SkillRun["status"], number> = {
    running: 0,
    queued: 1,
    failed: 2,
    completed: 3,
  };

  return [...runs].sort((left, right) => {
    if (sortBy === "oldest") {
      return left.startedAt.localeCompare(right.startedAt);
    }

    if (sortBy === "status") {
      return statusRank[left.status] - statusRank[right.status];
    }

    return right.startedAt.localeCompare(left.startedAt);
  });
}

function runStatusVariant(status: SkillRun["status"]): BadgeVariant {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  return "warning"; // queued | running
}
