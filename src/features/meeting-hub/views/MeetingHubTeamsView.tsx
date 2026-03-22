"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Users } from "lucide-react";

import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import type { MeetingHubTeam } from "@/lib/types";
import { Field, InfoBlock, Panel, TextAreaField } from "@/features/meeting-hub/components/MeetingHubUI";

import type { MeetingHubCopy } from "../copy";
import type { TeamDraft } from "../state";

type MeetingHubTeamsViewProps = {
  copy: MeetingHubCopy;
  teamDraft: TeamDraft;
  setTeamDraft: Dispatch<SetStateAction<TeamDraft>>;
  teamOptions: MeetingHubTeam[];
  savingTeam: boolean;
  onCreateTeam: () => void;
};

export function MeetingHubTeamsView({
  copy,
  teamDraft,
  setTeamDraft,
  teamOptions,
  savingTeam,
  onCreateTeam,
}: MeetingHubTeamsViewProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel title={copy.teamForm.title} icon={Plus}>
        <div className="grid gap-4">
          <Field
            label={copy.teamForm.name}
            value={teamDraft.name}
            onChange={(value) => setTeamDraft((current) => ({ ...current, name: value }))}
          />
          <TextAreaField
            label={copy.teamForm.description}
            value={teamDraft.description}
            onChange={(value) => setTeamDraft((current) => ({ ...current, description: value }))}
            rows={3}
          />
          <TextAreaField
            label={copy.teamForm.members}
            hint={copy.teamForm.membersHint}
            value={teamDraft.membersText}
            onChange={(value) => setTeamDraft((current) => ({ ...current, membersText: value }))}
            rows={4}
          />
          <Field
            label={copy.teamForm.projects}
            hint={copy.teamForm.projectsHint}
            value={teamDraft.connectedProjectsText}
            onChange={(value) =>
              setTeamDraft((current) => ({ ...current, connectedProjectsText: value }))
            }
          />
          <Field
            label={copy.teamForm.repository}
            hint={copy.teamForm.repositoryHint}
            value={teamDraft.defaultRepository}
            onChange={(value) =>
              setTeamDraft((current) => ({ ...current, defaultRepository: value }))
            }
          />
          <button
            type="button"
            onClick={onCreateTeam}
            disabled={savingTeam}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {copy.teamForm.submit}
          </button>
        </div>
      </Panel>

      <Panel title={copy.views.teams} icon={Users}>
        {teamOptions.length > 0 ? (
          <div className="space-y-3">
            {teamOptions.map((team) => (
              <div
                key={team.id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">{team.name}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">
                      {team.description || copy.status.none}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
                    {copy.labels.membersCount(team.members.length)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InfoBlock
                    label={copy.teamForm.projects}
                    value={team.connectedProjectIds.join(", ") || copy.status.none}
                  />
                  <InfoBlock
                    label={copy.teamForm.repository}
                    value={team.defaultRepository || copy.status.none}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateCard
            title={copy.empty.teamsTitle}
            message={copy.empty.teamsMessage}
          />
        )}
      </Panel>
    </div>
  );
}
