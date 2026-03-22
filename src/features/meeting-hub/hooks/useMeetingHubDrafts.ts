"use client";

import { useCallback, useMemo, useState } from "react";

import type { MeetingHubProcessedMeeting, MeetingHubTeam } from "@/lib/types";

import { createEmptyMeetingDraft, EMPTY_TEAM_DRAFT, type MeetingDraft, type TeamDraft } from "../state";
import type { MeetingHubTemplateDefinition } from "@/lib/meeting-hub/templates";

export function useMeetingHubDrafts() {
  const [teamDraft, setTeamDraft] = useState<TeamDraft>(EMPTY_TEAM_DRAFT);
  const [meetingDraft, setMeetingDraft] = useState<MeetingDraft>(createEmptyMeetingDraft);
  const [meetingAudioFile, setMeetingAudioFile] = useState<File | null>(null);
  const [processedPreview, setProcessedPreview] =
    useState<MeetingHubProcessedMeeting | null>(null);

  const hydrateMeetingDefaults = useCallback((teams: MeetingHubTeam[]) => {
    setMeetingDraft((current) => ({
      ...current,
      teamId: current.teamId || teams[0]?.id || "",
      linkedRepository:
        current.linkedRepository || teams[0]?.defaultRepository || "",
    }));
  }, []);

  const teamOptions = useMemo(
    () => (teams: MeetingHubTeam[]) => teams.map((team) => ({ value: team.id, label: team.name })),
    [],
  );

  const resetTeamDraft = useCallback(() => {
    setTeamDraft(EMPTY_TEAM_DRAFT);
  }, []);

  const resetMeetingDraft = useCallback(() => {
    setMeetingDraft((current) => ({
      ...createEmptyMeetingDraft(),
      date: current.date,
      teamId: current.teamId,
      linkedRepository: current.linkedRepository,
    }));
    setMeetingAudioFile(null);
    setProcessedPreview(null);
  }, []);

  const applyMeetingTemplate = useCallback((template: MeetingHubTemplateDefinition) => {
    setMeetingDraft((current) => ({
      ...current,
      type: template.type,
      title: current.title.trim() ? current.title : template.defaultTitle,
      notes: template.notes,
    }));
    setProcessedPreview(null);
  }, []);

  const selectMeetingTeam = useCallback((teamId: string, teams: MeetingHubTeam[]) => {
    const selectedTeam = teams.find((team) => team.id === teamId) ?? null;

    setMeetingDraft((current) => ({
      ...current,
      teamId,
      linkedRepository: selectedTeam?.defaultRepository || "",
    }));
  }, []);

  const setMeetingInputMode = useCallback((inputMode: MeetingDraft["inputMode"]) => {
    setMeetingDraft((current) => ({
      ...current,
      inputMode,
    }));

    if (inputMode === "text") {
      setMeetingAudioFile(null);
    }
  }, []);

  return {
    teamDraft,
    setTeamDraft,
    resetTeamDraft,
    meetingDraft,
    setMeetingDraft,
    resetMeetingDraft,
    meetingAudioFile,
    setMeetingAudioFile,
    processedPreview,
    setProcessedPreview,
    hydrateMeetingDefaults,
    applyMeetingTemplate,
    selectMeetingTeam,
    setMeetingInputMode,
    buildTeamOptions: teamOptions,
  };
}
