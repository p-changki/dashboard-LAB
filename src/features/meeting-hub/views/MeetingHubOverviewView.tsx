"use client";

import { ArrowUpRight, CheckCircle2, Github, ListTodo, NotebookPen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import type { AppLocale } from "@/lib/locale";
import type {
  MeetingHubActionItem,
  MeetingHubDecisionEntry,
  MeetingHubMeeting,
  MeetingHubWeeklyBrief,
} from "@/lib/types";
import {
  ActionRow,
  CollapsiblePanel,
  DecisionRow,
  MeetingRow,
  Panel,
  WeeklyBriefRow,
} from "@/features/meeting-hub/components/MeetingHubUI";

import type { MeetingHubCopy, MeetingHubView } from "../copy";

type MeetingHubOverviewViewProps = {
  locale: AppLocale;
  copy: MeetingHubCopy;
  recentMeetings: MeetingHubMeeting[];
  recentActions: MeetingHubActionItem[];
  recentDecisions: MeetingHubDecisionEntry[];
  weeklyBriefs: MeetingHubWeeklyBrief[];
  linkedRepositories: string[];
  creatingIssueId: string | null;
  setView: (view: MeetingHubView) => void;
  onCreateIssue: (item: MeetingHubActionItem) => void;
};

export function MeetingHubOverviewView({
  locale,
  copy,
  recentMeetings,
  recentActions,
  recentDecisions,
  weeklyBriefs,
  linkedRepositories,
  creatingIssueId,
  setView,
  onCreateIssue,
}: MeetingHubOverviewViewProps) {
  const quickMetrics = [
    { label: copy.cards.recentMeetings, value: recentMeetings.length },
    { label: copy.cards.recentActions, value: recentActions.length },
    { label: copy.cards.weeklyBrief, value: weeklyBriefs.length },
    { label: copy.cards.linkedRepos, value: linkedRepositories.length },
  ];

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
      <div className="space-y-6">
        <Panel title={copy.cards.recentMeetings} icon={NotebookPen}>
          {recentMeetings.length > 0 ? (
            <div className="space-y-3">
              {recentMeetings.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title={copy.empty.meetingsTitle}
              message={copy.empty.meetingsMessage}
              actionLabel={copy.views.meetings}
              onAction={() => setView("meetings")}
            />
          )}
        </Panel>

        <Panel title={copy.cards.recentActions} icon={ListTodo}>
          {recentActions.length > 0 ? (
            <div className="space-y-3">
              {recentActions.map((item) => (
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
                />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title={copy.empty.actionsTitle}
              message={copy.empty.actionsMessage}
              actionLabel={copy.views.meetings}
              onAction={() => setView("meetings")}
            />
          )}
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title={locale === "ko" ? "워크스페이스 상태" : "Workspace pulse"} icon={Sparkles}>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickMetrics.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border-base bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <QuickLinkButton
              label={copy.views.meetings}
              description={locale === "ko" ? "회의 저장과 프리뷰 확인" : "Save meetings and review previews"}
              onClick={() => setView("meetings")}
            />
            <QuickLinkButton
              label={copy.views.actions}
              description={locale === "ko" ? "열린 액션 상태 정리" : "Review open action status"}
              onClick={() => setView("actions")}
            />
            <QuickLinkButton
              label={copy.views.teams}
              description={locale === "ko" ? "팀/저장소 연결 관리" : "Manage teams and repo links"}
              onClick={() => setView("teams")}
            />
            <QuickLinkButton
              label={copy.views.github}
              description={locale === "ko" ? "GitHub 보드/이슈 상태 확인" : "Inspect GitHub boards and issues"}
              onClick={() => setView("github")}
            />
          </div>
        </Panel>

        <Panel title={copy.cards.linkedRepos} icon={Github}>
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
              actionLabel={copy.views.teams}
              onAction={() => setView("teams")}
            />
          )}
        </Panel>

        <CollapsiblePanel title={copy.cards.localStorage} icon={Sparkles}>
          <div className="rounded-2xl border border-border-base bg-black/20 p-4">
            <pre className="overflow-x-auto text-xs leading-6 text-text-secondary">{`data/meeting-hub/
  teams/{teamId}/
    team.json
    meetings/{date}-{slug}.md
    meetings/{date}-{slug}.json
    meetings/{date}-{slug}.raw.txt
    meetings/{date}-{slug}.source.{ext}
    actions/open-items.json
    decisions/decision-log.md
    briefs/latest-weekly-brief.md`}</pre>
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {copy.status.localFiles}
          </p>
        </CollapsiblePanel>

        <CollapsiblePanel title={copy.cards.weeklyBrief} icon={Sparkles}>
          {weeklyBriefs.length > 0 ? (
            <div className="space-y-3">
              {weeklyBriefs.map((brief) => (
                <WeeklyBriefRow key={brief.id} brief={brief} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title={copy.cards.weeklyBrief}
              message={copy.status.noWeeklyBrief}
            />
          )}
        </CollapsiblePanel>

        <CollapsiblePanel title={copy.cards.decisionLog} icon={CheckCircle2}>
          {recentDecisions.length > 0 ? (
            <div className="space-y-3">
              {recentDecisions.map((entry) => (
                <DecisionRow key={entry.id} entry={entry} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title={copy.cards.decisionLog}
              message={copy.status.noDecisionLog}
            />
          )}
        </CollapsiblePanel>
      </div>
    </div>
  );
}

function QuickLinkButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={onClick}
      className="h-auto w-full rounded-2xl border border-border-base px-4 py-4 text-left"
    >
      <div className="w-full">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-2 text-xs leading-5 text-text-secondary">{description}</p>
      </div>
    </Button>
  );
}
