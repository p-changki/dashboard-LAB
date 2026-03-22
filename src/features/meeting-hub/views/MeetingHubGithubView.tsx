"use client";

import { ArrowUpRight, CheckCircle2, Github, LoaderCircle } from "lucide-react";

import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import type { AppLocale } from "@/lib/locale";
import type { MeetingHubGithubOverviewResponse } from "@/lib/types";
import { GitHubList, KanbanBoard, Panel } from "@/features/meeting-hub/components/MeetingHubUI";

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
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title={copy.github.title} icon={Github}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm leading-6 text-[var(--color-text-soft)]">
            {copy.github.description}
          </p>
          <button
            type="button"
            onClick={onSyncGithubActions}
            disabled={syncingGithubActions}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingGithubActions ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            {syncingGithubActions ? copy.github.syncing : copy.github.sync}
          </button>
        </div>
        {githubLoading ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--color-text-soft)]">
            {copy.loading}
          </div>
        ) : githubOverview?.authenticated ? (
          <div className="mt-5 space-y-4">
            {githubOverview.repos.map((repo) => (
              <div key={repo.repo} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{repo.repo}</p>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
                    {repo.issues.length} {copy.github.issues} · {repo.pulls.length} {copy.github.pulls}
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
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
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-[var(--color-text-soft)]">
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
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-[var(--color-text-soft)]">
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

      <Panel title={copy.cards.linkedRepos} icon={ArrowUpRight}>
        {linkedRepositories.length > 0 ? (
          <div className="space-y-3">
            {linkedRepositories.map((repo) => (
              <a
                key={repo}
                href={`https://github.com/${repo}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white transition hover:bg-white/6"
              >
                <span>{repo}</span>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </a>
            ))}
          </div>
        ) : (
          <EmptyStateCard
            title={copy.github.noRepo}
            message={copy.github.description}
          />
        )}
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">{copy.github.planned}</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-soft)]">
            {copy.github.items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </div>
  );
}
