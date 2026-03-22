"use client";

import { ArrowUpRight, CheckCircle2, Github, ListTodo, NotebookPen, Sparkles } from "lucide-react";

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
  DecisionRow,
  MeetingRow,
  Panel,
  WeeklyBriefRow,
} from "@/features/meeting-hub/components/MeetingHubUI";

import type { MeetingHubCopy } from "../copy";

type MeetingHubOverviewViewProps = {
  locale: AppLocale;
  copy: MeetingHubCopy;
  recentMeetings: MeetingHubMeeting[];
  recentActions: MeetingHubActionItem[];
  recentDecisions: MeetingHubDecisionEntry[];
  weeklyBriefs: MeetingHubWeeklyBrief[];
  linkedRepositories: string[];
  creatingIssueId: string | null;
  setView: (view: "teams" | "meetings") => void;
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
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
        <Panel title={copy.cards.linkedRepos} icon={Github}>
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
              actionLabel={copy.views.teams}
              onAction={() => setView("teams")}
            />
          )}
        </Panel>

        <Panel title={copy.cards.localStorage} icon={Sparkles}>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <pre className="overflow-x-auto text-xs leading-6 text-gray-300">{`data/meeting-hub/
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
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">
            {copy.status.localFiles}
          </p>
        </Panel>

        <Panel title={copy.cards.weeklyBrief} icon={Sparkles}>
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
        </Panel>

        <Panel title={copy.cards.decisionLog} icon={CheckCircle2}>
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
        </Panel>
      </div>
    </div>
  );
}
