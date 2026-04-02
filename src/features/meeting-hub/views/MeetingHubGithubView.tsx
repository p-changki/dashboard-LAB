"use client";

import { useMemo } from "react";
import { ArrowUpRight, CheckCircle2, Github, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import type { AppLocale } from "@/lib/locale";
import type { MeetingHubGithubOverviewResponse } from "@/lib/types";
import { CollapsiblePanel, GitHubList, KanbanBoard, Panel } from "@/features/meeting-hub/components/MeetingHubUI";

import type { MeetingHubCopy } from "../copy";

type MeetingHubGithubViewProps = {
  locale: AppLocale;
  copy: MeetingHubCopy;
  linkedRepositories: string[];
  githubOverview: MeetingHubGithubOverviewResponse | null;
  githubLoading: boolean;
  syncingGithubActions: boolean;
  onSyncGithubActions: () => void;
};

export function MeetingHubGithubView({
  locale,
  copy,
  linkedRepositories,
  githubOverview,
  githubLoading,
  syncingGithubActions,
  onSyncGithubActions,
}: MeetingHubGithubViewProps) {
  const githubStats = useMemo(() => {
    const repos = githubOverview?.repos ?? [];
    return {
      repoCount: repos.length,
      boardCount: repos.reduce((total, repo) => total + repo.boards.length, 0),
      issueCount: repos.reduce((total, repo) => total + repo.issues.length, 0),
      pullCount: repos.reduce((total, repo) => total + repo.pulls.length, 0),
    };
  }, [githubOverview]);

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
      <Panel title={copy.github.title} icon={Github}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm leading-6 text-text-secondary">
            {copy.github.description}
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={onSyncGithubActions}
            disabled={syncingGithubActions}
            className="rounded-2xl"
          >
            {syncingGithubActions ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            {syncingGithubActions ? copy.github.syncing : copy.github.sync}
          </Button>
        </div>
        {githubLoading ? (
          <div className="mt-5 rounded-3xl border border-border-base bg-white/[0.03] p-4 text-sm text-text-secondary">
            {copy.loading}
          </div>
        ) : githubOverview?.authenticated ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <GithubMetricCard label={copy.cards.linkedRepos} value={githubStats.repoCount} tone="slate" />
              <GithubMetricCard label={copy.github.projectBoards} value={githubStats.boardCount} tone="cyan" />
              <GithubMetricCard label={copy.github.issues} value={githubStats.issueCount} tone="amber" />
              <GithubMetricCard label={copy.github.pulls} value={githubStats.pullCount} tone="emerald" />
            </div>
            {githubOverview.repos.map((repo) => (
              <div key={repo.repo} className="rounded-3xl border border-border-base bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-white">{repo.repo}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="neutral" size="sm">{repo.issues.length} {copy.github.issues}</Badge>
                      <Badge variant="neutral" size="sm">{repo.pulls.length} {copy.github.pulls}</Badge>
                      <Badge variant="info" size="sm">{repo.boards.length} {copy.github.projectBoards}</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                      {copy.github.projectBoards}
                    </p>
                    <div className="mt-3 space-y-4">
                      {repo.boards.length > 0 ? (
                        repo.boards.map((board) => (
                          <KanbanBoard
                            key={board.id}
                            board={board}
                            locale={locale}
                            projectLabel={copy.github.projectBoardBadge}
                            inferredLabel={copy.github.inferredBoardBadge}
                            emptyLabel={copy.github.columnEmpty}
                          />
                        ))
                      ) : (
                        <div className="rounded-2xl border border-border-base bg-black/20 px-4 py-4 text-sm text-text-secondary">
                          {copy.github.noBoards}
                        </div>
                      )}
                    </div>
                  </div>

                  {repo.boardMessage === "project_access_unavailable" ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-100">
                      {copy.github.projectAccessUnavailable}
                    </div>
                  ) : null}

                  {repo.boards.some((board) => board.source === "inferred") ||
                  repo.boardMessage === "no_projects_found" ? (
                    <div className="rounded-2xl border border-border-base bg-black/20 px-4 py-4 text-sm leading-6 text-text-secondary">
                      {copy.github.inferredBoardDescription}
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <GitHubList
                      title={copy.github.issues}
                      emptyLabel={copy.status.none}
                      items={repo.issues.map((issue) => ({
                        id: issue.number,
                        title: issue.title,
                        meta: `#${issue.number} · ${issue.author ?? "unknown"}`,
                        url: issue.url,
                      }))}
                    />
                    <GitHubList
                      title={copy.github.pulls}
                      emptyLabel={copy.status.none}
                      items={repo.pulls.map((pull) => ({
                        id: pull.number,
                        title: pull.title,
                        meta: `#${pull.number} · ${pull.author ?? "unknown"}`,
                        url: pull.url,
                      }))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            {copy.github.authMissing}
          </div>
        )}
      </Panel>

      <CollapsiblePanel title={copy.cards.linkedRepos} icon={ArrowUpRight}>
        <div className="mb-5 rounded-3xl border border-border-base bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">
            {locale === "ko" ? "GitHub 연결 상태" : "GitHub connection status"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-border-base bg-black/20 px-3 py-1 text-white/70">
              {locale === "ko" ? "연결 저장소" : "Linked repos"} {linkedRepositories.length}
            </span>
            {githubOverview?.authenticated ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                {locale === "ko" ? "인증됨" : "Authenticated"} · {githubOverview.source}
              </span>
            ) : (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                {locale === "ko" ? "인증 필요" : "Auth required"}
              </span>
            )}
          </div>
        </div>
        {linkedRepositories.length > 0 ? (
          <div className="space-y-3">
            {linkedRepositories.map((repo) => (
              <a
                key={repo}
                href={`https://github.com/${repo}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-border-base bg-white/[0.03] px-4 py-3 text-sm text-white transition hover:bg-white/6"
              >
                <span className="break-words">{repo}</span>
                <ArrowUpRight className="h-4 w-4 text-text-muted" />
              </a>
            ))}
          </div>
        ) : (
          <EmptyStateCard
            title={copy.github.noRepo}
            message={copy.github.description}
          />
        )}
        <div className="mt-5 rounded-3xl border border-border-base bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">{copy.github.planned}</p>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {copy.github.items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </CollapsiblePanel>
    </div>
  );
}

function GithubMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "cyan" | "amber" | "emerald";
}) {
  const toneClassName = {
    slate: "border-border-base bg-white/5 text-white/70",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-border-base bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={["mt-3 inline-flex rounded-full px-3 py-1 text-xs", toneClassName].join(" ")}>{value}</p>
    </div>
  );
}
