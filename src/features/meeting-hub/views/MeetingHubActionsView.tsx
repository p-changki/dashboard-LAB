"use client";

import { useMemo } from "react";
import { ListTodo } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import type { AppLocale } from "@/lib/locale";
import type { MeetingHubActionItem } from "@/lib/types";
import { ActionRow, Panel } from "@/features/meeting-hub/components/MeetingHubUI";

import type { MeetingHubCopy } from "../copy";

type MeetingHubActionsViewProps = {
  locale: AppLocale;
  copy: MeetingHubCopy;
  summaryLoading: boolean;
  fullActions: MeetingHubActionItem[];
  creatingIssueId: string | null;
  onCreateIssue: (item: MeetingHubActionItem) => void;
  onStatusChange: (actionId: string, status: "open" | "in_progress" | "done") => void;
};

export function MeetingHubActionsView({
  locale,
  copy,
  summaryLoading,
  fullActions,
  creatingIssueId,
  onCreateIssue,
  onStatusChange,
}: MeetingHubActionsViewProps) {
  const groupedActions = useMemo(
    () => ({
      open: fullActions.filter((item) => item.status === "open"),
      inProgress: fullActions.filter((item) => item.status === "in_progress"),
      done: fullActions.filter((item) => item.status === "done"),
      linkedIssues: fullActions.filter((item) => item.issueUrl).length,
    }),
    [fullActions],
  );
  const sections = [
    { key: "open", label: copy.status.open, items: groupedActions.open },
    { key: "in_progress", label: copy.status.inProgress, items: groupedActions.inProgress },
    { key: "done", label: copy.status.done, items: groupedActions.done },
  ] as const;

  return (
    <Panel title={copy.views.actions} icon={ListTodo}>
      {summaryLoading && fullActions.length === 0 ? (
        <div className="rounded-2xl border border-border-base bg-black/20 px-4 py-5 text-sm text-text-secondary">
          {copy.loading}
        </div>
      ) : fullActions.length > 0 ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ActionSummaryCard label={copy.status.open} value={groupedActions.open.length} tone="amber" />
            <ActionSummaryCard
              label={copy.status.inProgress}
              value={groupedActions.inProgress.length}
              tone="cyan"
            />
            <ActionSummaryCard label={copy.status.done} value={groupedActions.done.length} tone="emerald" />
            <ActionSummaryCard
              label={locale === "ko" ? "연결된 이슈" : "Linked issues"}
              value={groupedActions.linkedIssues}
              tone="slate"
            />
          </div>

          <div className="space-y-4">
            {sections
              .filter((section) => section.items.length > 0)
              .map((section) => (
                <section key={section.key} className="space-y-3 rounded-3xl border border-border-base bg-black/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{section.label}</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">
                        {locale === "ko"
                          ? `${section.items.length}개의 액션이 이 상태에 있습니다.`
                          : `${section.items.length} action items are currently in this status.`}
                      </p>
                    </div>
                    <Badge variant="neutral" size="sm">{section.items.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <ActionRow
                        key={item.id}
                        item={item}
                        locale={locale}
                        copyStatus={copy.status}
                        draftLabel={copy.github.draftIssue}
                        createIssueLabel={copy.github.createIssue}
                        issueCreatedLabel={copy.github.issueCreated}
                        creating={creatingIssueId === item.id}
                        onCreateIssue={onCreateIssue}
                        onStatusChange={onStatusChange}
                        detailed
                      />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </div>
      ) : (
        <EmptyStateCard
          title={copy.empty.actionsTitle}
          message={copy.empty.actionsMessage}
        />
      )}
    </Panel>
  );
}

function ActionSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "cyan" | "emerald" | "slate";
}) {
  const toneClassName = {
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    slate: "border-border-base bg-white/5 text-white/70",
  }[tone];

  return (
    <div className="rounded-2xl border border-border-base bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={["mt-3 inline-flex rounded-full px-3 py-1 text-xs", toneClassName].join(" ")}>{value}</p>
    </div>
  );
}
