"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, Github, LoaderCircle, Users } from "lucide-react";

import { pickLocale } from "@/lib/locale";
import type {
  MeetingHubActionItem,
  MeetingHubDecisionEntry,
  MeetingHubGithubProjectBoard,
  MeetingHubMeeting,
  MeetingHubWeeklyBrief,
} from "@/lib/types";

export function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/20 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-text-soft)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/20 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function MeetingRow({
  meeting,
  locale,
  detailed = false,
}: {
  meeting: MeetingHubMeeting;
  locale: "ko" | "en";
  detailed?: boolean;
}) {
  const typeLabel = pickLocale(locale, {
    ko: {
      standup: "스탠드업",
      planning: "플래닝",
      review: "리뷰",
      retro: "회고",
      client: "고객 미팅",
    },
    en: {
      standup: "Standup",
      planning: "Planning",
      review: "Review",
      retro: "Retro",
      client: "Client Meeting",
    },
  })[meeting.type];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{meeting.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">
            {meeting.date} · {typeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
            {meeting.actionItems.length} actions
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
            {meeting.inputSource === "audio"
              ? pickLocale(locale, { ko: "녹음 입력", en: "Audio input" })
              : pickLocale(locale, { ko: "텍스트 입력", en: "Text input" })}
          </span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            {meeting.processingMode === "ai"
              ? pickLocale(locale, { ko: "AI 구조화", en: "AI structured" })
              : pickLocale(locale, { ko: "규칙 기반", en: "Rule-based" })}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">
        {meeting.summary || pickLocale(locale, { ko: "요약 없음", en: "No summary yet" })}
      </p>
      {detailed ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoBlock
            label={pickLocale(locale, { ko: "참석자", en: "Participants" })}
            value={meeting.participants.join(", ") || pickLocale(locale, { ko: "없음", en: "None" })}
          />
          <InfoBlock
            label={pickLocale(locale, { ko: "원본 파일", en: "Source File" })}
            value={meeting.sourceFileName ?? pickLocale(locale, { ko: "없음", en: "None" })}
          />
          <InfoBlock
            label={pickLocale(locale, { ko: "저장된 Markdown", en: "Saved Markdown" })}
            value={meeting.markdownPath}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ActionRow({
  item,
  locale,
  copyStatus,
  draftLabel,
  createIssueLabel,
  issueCreatedLabel,
  creating,
  onCreateIssue,
  onStatusChange,
  detailed = false,
}: {
  item: MeetingHubActionItem;
  locale: "ko" | "en";
  copyStatus: {
    none: string;
    open: string;
    inProgress: string;
    done: string;
    issueOpen: string;
    issueClosed: string;
    neverSynced: string;
  };
  draftLabel: string;
  createIssueLabel: string;
  issueCreatedLabel: string;
  creating: boolean;
  onCreateIssue?: (item: MeetingHubActionItem) => void;
  onStatusChange?: (actionId: string, status: "open" | "in_progress" | "done") => void;
  detailed?: boolean;
}) {
  const draftUrl = item.repository
    ? buildIssueDraftUrl(item.repository, item.title, item.sourceLine)
    : null;
  const statusLabel =
    item.status === "done"
      ? copyStatus.done
      : item.status === "in_progress"
        ? copyStatus.inProgress
        : copyStatus.open;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">
            {[
              item.owner ? `@${item.owner}` : pickLocale(locale, { ko: "담당자 미정", en: "Unassigned" }),
              item.dueDate ?? pickLocale(locale, { ko: "기한 없음", en: "No due date" }),
            ].join(" · ")}
          </p>
        </div>
        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
          {statusLabel}
        </span>
      </div>
      {detailed ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-[var(--color-text-soft)]">{item.sourceLine}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock
              label={pickLocale(locale, { ko: "GitHub 이슈 상태", en: "GitHub Issue State" })}
              value={
                item.issueState === "closed"
                  ? copyStatus.issueClosed
                  : item.issueState === "open"
                    ? copyStatus.issueOpen
                    : copyStatus.neverSynced
              }
            />
            <InfoBlock
              label={pickLocale(locale, { ko: "마지막 동기화", en: "Last Sync" })}
              value={item.syncedAt ?? copyStatus.neverSynced}
            />
          </div>
          {onStatusChange ? (
            <div className="flex flex-wrap gap-2">
              {([
                ["open", copyStatus.open],
                ["in_progress", copyStatus.inProgress],
                ["done", copyStatus.done],
              ] as const).map(([status, label]) => (
                <button
                  key={`${item.id}-${status}`}
                  type="button"
                  onClick={() => onStatusChange(item.id, status)}
                  className={[
                    "rounded-full border px-3 py-2 text-xs transition",
                    item.status === status
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-black/20 text-gray-300 hover:bg-white/6 hover:text-white",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {item.issueUrl ? (
          <a
            href={item.issueUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-400/15"
          >
            <Github className="h-4 w-4" />
            {issueCreatedLabel} #{item.issueNumber}
          </a>
        ) : null}
        {!item.issueUrl && item.repository && onCreateIssue ? (
          <button
            type="button"
            onClick={() => onCreateIssue(item)}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
            {createIssueLabel}
          </button>
        ) : null}
        {draftUrl ? (
          <a
            href={draftUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white transition hover:bg-black/30"
          >
            <Github className="h-4 w-4" />
            {draftLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/30"
      />
      {hint ? <span className="text-xs leading-5 text-gray-500">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  hint,
  rows,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/30"
      />
      {hint ? <span className="text-xs leading-5 text-gray-500">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/30"
      >
        <option value="">{placeholder ?? "Select"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white">{value}</p>
    </div>
  );
}

export function GitHubList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ id: number; title: string; meta: string; url: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <a
              key={`${title}-${item.id}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:bg-white/6"
            >
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
            </a>
          ))
        ) : (
          <p className="text-sm text-[var(--color-text-soft)]">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  board,
  locale,
  projectLabel,
  inferredLabel,
  emptyLabel,
}: {
  board: MeetingHubGithubProjectBoard;
  locale: "ko" | "en";
  projectLabel: string;
  inferredLabel: string;
  emptyLabel: string;
}) {
  const badgeLabel = board.source === "project" ? projectLabel : inferredLabel;
  const updatedLabel = board.updatedAt
    ? new Date(board.updatedAt).toLocaleDateString(
        locale === "ko" ? "ko-KR" : "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      )
    : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">{board.title}</p>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-gray-300">
              {badgeLabel}
            </span>
            {board.closed ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-100">
                {pickLocale(locale, { ko: "닫힘", en: "Closed" })}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            {updatedLabel
              ? pickLocale(locale, {
                  ko: `최근 갱신 ${updatedLabel}`,
                  en: `Updated ${updatedLabel}`,
                })
              : pickLocale(locale, { ko: "최근 갱신 정보 없음", en: "No recent update info" })}
          </p>
        </div>
        {board.url ? (
          <a
            href={board.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white transition hover:bg-white/6"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            {pickLocale(locale, { ko: "GitHub에서 열기", en: "Open on GitHub" })}
          </a>
        ) : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[760px] gap-3 md:grid-cols-2 xl:grid-cols-4">
          {board.columns.map((column) => (
            <div key={`${board.id}-${column.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">{column.title}</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-gray-300">
                  {column.cards.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {column.cards.length > 0 ? (
                  column.cards.map((card) => (
                    <article
                      key={card.id}
                      className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{card.title}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {[
                              card.kind === "pull"
                                ? "PR"
                                : card.kind === "issue"
                                  ? "Issue"
                                  : pickLocale(locale, { ko: "초안", en: "Draft" }),
                              card.number ? `#${card.number}` : null,
                              card.state,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        {card.url ? (
                          <a
                            href={card.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 transition hover:text-white"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                      {card.labels.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {card.labels.slice(0, 3).map((label) => (
                            <span
                              key={`${card.id}-${label}`}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-gray-300"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-sm text-[var(--color-text-soft)]">
                    {emptyLabel}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeeklyBriefRow({
  brief,
  locale,
}: {
  brief: MeetingHubWeeklyBrief;
  locale: "ko" | "en";
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{brief.teamName}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
            {brief.fromDate} → {brief.toDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
            {pickLocale(locale, {
              ko: `회의 ${brief.meetingCount}개`,
              en: `${brief.meetingCount} meetings`,
            })}
          </span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            {pickLocale(locale, {
              ko: `열린 액션 ${brief.openActionItems}개`,
              en: `${brief.openActionItems} open actions`,
            })}
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoBlock
          label={pickLocale(locale, { ko: "결정", en: "Decisions" })}
          value={brief.decisions.join(" | ") || pickLocale(locale, { ko: "없음", en: "None" })}
        />
        <InfoBlock
          label={pickLocale(locale, { ko: "리스크", en: "Risks" })}
          value={brief.risks.join(" | ") || pickLocale(locale, { ko: "없음", en: "None" })}
        />
        <InfoBlock
          label={pickLocale(locale, { ko: "후속", en: "Follow-up" })}
          value={brief.followUp.join(" | ") || pickLocale(locale, { ko: "없음", en: "None" })}
        />
      </div>
    </div>
  );
}

export function DecisionRow({
  entry,
  locale,
}: {
  entry: MeetingHubDecisionEntry;
  locale: "ko" | "en";
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{entry.decision}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">
            {entry.date} · {entry.teamName}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
          {entry.meetingTitle}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">
        {pickLocale(locale, {
          ko: "이 결정은 Meeting Hub의 decision-log와 weekly brief에도 반영됩니다.",
          en: "This decision is also reflected in the Meeting Hub decision log and weekly brief.",
        })}
      </p>
    </div>
  );
}

function buildIssueDraftUrl(repository: string, title: string, sourceLine: string) {
  const params = new URLSearchParams({
    title,
    body: `## Context\n- Imported from Meeting Hub\n\n## Action\n- ${sourceLine}\n`,
  });

  return `https://github.com/${repository}/issues/new?${params.toString()}`;
}
