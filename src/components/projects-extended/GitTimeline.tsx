"use client";

import { useEffect, useState } from "react";

import type { GitTimelineResponse } from "@/lib/types";

export function GitTimeline() {
  const [data, setData] = useState<GitTimelineResponse | null>(null);

  useEffect(() => {
    void fetch("/api/projects/git-timeline", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: GitTimelineResponse) => setData(payload))
      .catch(() => setData({ commits: [], totalCommits: 0 }));
  }, []);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <SectionTitle title="Git Timeline" meta={`${data?.totalCommits ?? 0}개 커밋`} />
      <div className="mt-4 space-y-3">
        {(data?.commits ?? []).slice(0, 20).map((commit) => (
          <article key={`${commit.projectName}-${commit.hash}`} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs text-blue-300">
                {commit.projectName}
              </span>
              <span className="text-xs text-gray-500">{commit.shortHash}</span>
            </div>
            <p className="mt-3 text-sm text-white">{commit.message}</p>
            <p className="mt-1 text-xs text-gray-500">
              {commit.author} · {new Date(commit.authoredAt).toLocaleString("ko-KR")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-lg font-semibold text-gray-100">{title}</p>
      <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs text-gray-400">
        {meta}
      </span>
    </div>
  );
}
