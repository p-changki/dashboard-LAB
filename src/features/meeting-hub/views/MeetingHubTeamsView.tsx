"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  const draftMembers = useMemo(
    () =>
      teamDraft.membersText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    [teamDraft.membersText],
  );
  const draftProjects = useMemo(
    () =>
      teamDraft.connectedProjectsText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [teamDraft.connectedProjectsText],
  );
  const linkedRepoCount = useMemo(
    () => teamOptions.filter((team) => team.defaultRepository).length,
    [teamOptions],
  );
  const connectedProjectCount = useMemo(
    () => new Set(teamOptions.flatMap((team) => team.connectedProjectIds)).size,
    [teamOptions],
  );

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(320px,0.84fr)_minmax(0,1.16fr)]">
      <Panel title={copy.teamForm.title} icon={Plus}>
        <div className="space-y-4">
          <div className="grid gap-4 rounded-3xl border border-border-base bg-black/15 p-4">
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
          </div>

          <div className="grid gap-4 rounded-3xl border border-border-base bg-black/15 p-4">
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
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{copy.views.teams}</p>
            <p className="mt-3 break-words text-base font-semibold text-white">
              {teamDraft.name.trim() || copy.teamForm.name}
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-cyan-50/80">
              {teamDraft.description.trim() || copy.empty.teamsMessage}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoBlock
                label={copy.teamForm.members}
                value={copy.labels.membersCount(draftMembers.length)}
              />
              <InfoBlock
                label={copy.teamForm.projects}
                value={draftProjects.length ? `${draftProjects.length}` : copy.status.none}
              />
              <InfoBlock
                label={copy.teamForm.repository}
                value={teamDraft.defaultRepository.trim() || copy.status.none}
              />
            </div>
            {draftMembers.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {draftMembers.slice(0, 6).map((member) => (
                  <Badge key={member} variant="neutral" size="sm">{member}</Badge>
                ))}
                {draftMembers.length > 6 ? (
                  <Badge variant="neutral" size="sm">+{draftMembers.length - 6}</Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          <Button
            variant="secondary"
            size="lg"
            onClick={onCreateTeam}
            disabled={savingTeam}
            className="rounded-2xl border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
          >
            <Plus className="h-4 w-4" />
            {copy.teamForm.submit}
          </Button>
        </div>
      </Panel>

      <Panel title={copy.views.teams} icon={Users}>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <InfoBlock label={copy.views.teams} value={`${teamOptions.length}`} />
          <InfoBlock label={copy.teamForm.repository} value={`${linkedRepoCount}`} />
          <InfoBlock label={copy.teamForm.projects} value={`${connectedProjectCount}`} />
        </div>
        {teamOptions.length > 0 ? (
          <div className="space-y-3">
            {teamOptions.map((team) => (
              <div
                key={team.id}
                className="rounded-3xl border border-border-base bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-semibold text-white">{team.name}</p>
                    <p className="mt-1 break-words text-sm leading-6 text-text-secondary">
                      {team.description || copy.status.none}
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm">{copy.labels.membersCount(team.members.length)}</Badge>
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
                {team.members.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {team.members.slice(0, 6).map((member) => (
                      <Badge key={member.id} variant="neutral" size="sm">
                        {member.name}
                        {member.role ? ` · ${member.role}` : ""}
                      </Badge>
                    ))}
                    {team.members.length > 6 ? (
                      <Badge variant="neutral" size="sm">+{team.members.length - 6}</Badge>
                    ) : null}
                  </div>
                ) : null}
                {team.connectedProjectIds.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {team.connectedProjectIds.map((projectId) => (
                      <Badge key={`${team.id}-${projectId}`} variant="info" size="sm">{projectId}</Badge>
                    ))}
                  </div>
                ) : null}
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
