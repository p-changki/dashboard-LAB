"use client";

import { ListTodo } from "lucide-react";

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
  return (
    <Panel title={copy.views.actions} icon={ListTodo}>
      {summaryLoading && fullActions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-[var(--color-text-soft)]">
          {copy.loading}
        </div>
      ) : fullActions.length > 0 ? (
        <div className="space-y-3">
          {fullActions.map((item) => (
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
      ) : (
        <EmptyStateCard
          title={copy.empty.actionsTitle}
          message={copy.empty.actionsMessage}
        />
      )}
    </Panel>
  );
}
