"use client";

import { useEffect, useState } from "react";

import { CopyButton } from "@/components/ui/CopyButton";
import type { GitBatchStatus as GitBatchStatusType } from "@/lib/types";

export function GitBatchStatus() {
  const [data, setData] = useState<GitBatchStatusType | null>(null);

  useEffect(() => {
    void fetch("/api/projects/git-batch", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: GitBatchStatusType) => setData(payload))
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border-base bg-bg-card p-5 transition-all duration-[150ms] hover:bg-bg-card-hover">
      <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Git Overview</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <SummaryChip label="미커밋" value={data.summary.uncommittedCount} tone="text-amber-300" />
        <SummaryChip label="미푸시" value={data.summary.unpushedCount} tone="text-purple-300" />
        <SummaryChip label="클린" value={data.summary.cleanCount} tone="text-green-300" />
        <SummaryChip label="Git 없음" value={data.summary.noGitCount} tone="text-text-secondary" />
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ProjectList title="미커밋 변경" empty="모든 프로젝트가 클린 상태입니다.">
          {data.uncommitted.map((item) => (
            <StatusRow
              key={`${item.project}-${item.branch}`}
              title={item.project}
              subtitle={`${item.branch} · 변경 ${item.changedFiles} · 신규 ${item.untrackedFiles}`}
              command={`cd "${item.project}" && git status --short`}
            />
          ))}
        </ProjectList>
        <ProjectList title="미푸시 커밋" empty="미푸시 커밋이 없습니다.">
          {data.unpushed.map((item) => (
            <StatusRow
              key={`${item.project}-${item.branch}`}
              title={item.project}
              subtitle={`${item.branch} · ${item.aheadCount} ahead`}
              command={`cd "${item.project}" && git push`}
            />
          ))}
        </ProjectList>
        <ProjectList title="클린 프로젝트" empty="클린 프로젝트가 없습니다.">
          {data.clean.slice(0, 8).map((item) => (
            <div key={`${item.project}-${item.branch}`} className="rounded-2xl border border-border-base bg-black/20 px-4 py-3">
              <p className="text-sm font-medium text-white">{item.project}</p>
              <p className="mt-1 text-xs text-white/45">{item.branch} · {item.lastCommitDate || "최근 커밋 없음"}</p>
            </div>
          ))}
        </ProjectList>
      </div>
      {data.noGit.length > 0 ? <p className="mt-4 text-sm text-white/55">Git 없음: {data.noGit.join(", ")}</p> : null}
    </section>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border-base bg-black/20 p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function ProjectList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="rounded-2xl border border-border-base bg-black/20 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {count === 0 ? <p className="text-sm text-text-muted">{empty}</p> : children}
      </div>
    </div>
  );
}

function StatusRow({ title, subtitle, command }: { title: string; subtitle: string; command: string }) {
  return (
    <div className="rounded-2xl border border-border-base bg-bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-xs text-white/45">{subtitle}</p>
        </div>
        <CopyButton value={command} label="복사" recentItem={{ id: `git:${title}`, name: title, type: "project" }} />
      </div>
    </div>
  );
}
