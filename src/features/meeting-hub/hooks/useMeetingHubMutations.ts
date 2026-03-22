"use client";

import { useState } from "react";

import type {
  CreateMeetingHubMeetingInput,
  CreateMeetingHubTeamInput,
  MeetingHubActionItem,
  MeetingHubActionStatus,
  MeetingHubProcessedMeeting,
  MeetingHubSummaryResponse,
} from "@/lib/types";

import type { MeetingHubCopy, MeetingHubView } from "../copy";
import type { MeetingDraft, TeamDraft } from "../state";
import { parseMembers, splitCommaValues } from "../utils";

type UseMeetingHubMutationsParams = {
  copy: MeetingHubCopy;
  view: MeetingHubView;
  teamDraft: TeamDraft;
  meetingDraft: MeetingDraft;
  meetingAudioFile: File | null;
  applySummary: (summary: MeetingHubSummaryResponse) => void;
  loadGithubOverview: () => Promise<void>;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  setView: (value: MeetingHubView) => void;
  setProcessedPreview: (value: MeetingHubProcessedMeeting | null) => void;
  setMeetingAudioFile: (value: File | null) => void;
  resetTeamDraft: () => void;
  resetMeetingDraft: () => void;
};

export function useMeetingHubMutations({
  copy,
  view,
  teamDraft,
  meetingDraft,
  meetingAudioFile,
  applySummary,
  loadGithubOverview,
  setError,
  setSuccess,
  setView,
  setProcessedPreview,
  setMeetingAudioFile,
  resetTeamDraft,
  resetMeetingDraft,
}: UseMeetingHubMutationsParams) {
  const [savingTeam, setSavingTeam] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [uploadingMeeting, setUploadingMeeting] = useState(false);
  const [processingMeeting, setProcessingMeeting] = useState(false);
  const [syncingGithubActions, setSyncingGithubActions] = useState(false);
  const [creatingIssueId, setCreatingIssueId] = useState<string | null>(null);

  async function handleCreateTeam() {
    setSavingTeam(true);
    setError(null);
    setSuccess(null);

    const payload: CreateMeetingHubTeamInput = {
      name: teamDraft.name,
      description: teamDraft.description,
      members: parseMembers(teamDraft.membersText),
      connectedProjectIds: splitCommaValues(teamDraft.connectedProjectsText),
      defaultRepository: teamDraft.defaultRepository || null,
    };

    try {
      const response = await fetch("/api/meeting-hub/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? copy.loadError : copy.loadError,
        );
      }

      applySummary(result.summary);
      resetTeamDraft();
      setSuccess(copy.notices.teamSaved);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleCreateMeeting() {
    setSavingMeeting(true);
    setError(null);
    setSuccess(null);

    const payload: CreateMeetingHubMeetingInput = {
      teamId: meetingDraft.teamId,
      title: meetingDraft.title,
      type: meetingDraft.type,
      date: meetingDraft.date,
      participants: splitCommaValues(meetingDraft.participantsText),
      linkedProjectIds: splitCommaValues(meetingDraft.linkedProjectsText),
      linkedRepository: meetingDraft.linkedRepository || null,
      notes: meetingDraft.notes,
      useAi: meetingDraft.useAi,
      runner: meetingDraft.runner,
    };

    try {
      const response = await fetch("/api/meeting-hub/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? copy.loadError : copy.loadError,
        );
      }

      applySummary(result.summary);
      resetMeetingDraft();
      setProcessedPreview(null);
      setSuccess(copy.notices.meetingSaved);
      setView("overview");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setSavingMeeting(false);
    }
  }

  async function handleUploadMeeting() {
    if (!meetingAudioFile) {
      setError(copy.meetingForm.noAudioSelected);
      return;
    }

    setUploadingMeeting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("file", meetingAudioFile);
      formData.set("teamId", meetingDraft.teamId);
      formData.set("title", meetingDraft.title);
      formData.set("type", meetingDraft.type);
      formData.set("date", meetingDraft.date);
      formData.set("participants", meetingDraft.participantsText);
      formData.set("linkedProjects", meetingDraft.linkedProjectsText);
      formData.set("linkedRepository", meetingDraft.linkedRepository);
      formData.set("notes", meetingDraft.notes);
      formData.set("useAi", String(meetingDraft.useAi));
      formData.set("runner", meetingDraft.runner);

      const response = await fetch("/api/meeting-hub/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? copy.loadError : copy.loadError,
        );
      }

      applySummary(result.summary);
      resetMeetingDraft();
      setMeetingAudioFile(null);
      setProcessedPreview(null);
      setSuccess(copy.notices.meetingUploaded);
      setView("overview");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setUploadingMeeting(false);
    }
  }

  async function handleProcessMeetingPreview() {
    setProcessingMeeting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/meeting-hub/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: meetingDraft.teamId || "preview",
          title: meetingDraft.title,
          type: meetingDraft.type,
          date: meetingDraft.date,
          participants: splitCommaValues(meetingDraft.participantsText),
          linkedRepository: meetingDraft.linkedRepository || null,
          notes: meetingDraft.notes,
          runner: meetingDraft.runner,
        }),
      });

      const result = (await response.json()) as
        | { processed: MeetingHubProcessedMeeting }
        | { error?: { message?: string } };

      if (!response.ok || !("processed" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? copy.loadError : copy.loadError,
        );
      }

      setProcessedPreview(result.processed);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setProcessingMeeting(false);
    }
  }

  async function handleCreateGithubIssue(item: MeetingHubActionItem) {
    if (!item.repository) {
      return;
    }

    setCreatingIssueId(item.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/meeting-hub/github/issues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: item.id,
          repo: item.repository,
          title: item.title,
          body: `## Context\n- Imported from Meeting Hub\n- Action Item: ${item.sourceLine}\n`,
        }),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? copy.loadError : copy.loadError,
        );
      }

      applySummary(result.summary);
      setSuccess(copy.github.issueCreated);
      if (view === "github") {
        await loadGithubOverview();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setCreatingIssueId(null);
    }
  }

  async function handleUpdateActionStatus(
    actionId: string,
    status: MeetingHubActionStatus,
  ) {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/meeting-hub/actions/${encodeURIComponent(actionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? copy.loadError : copy.loadError,
        );
      }

      applySummary(result.summary);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    }
  }

  async function handleSyncGithubActions() {
    setSyncingGithubActions(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/meeting-hub/github/sync", {
        method: "POST",
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse; syncedCount: number }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? copy.loadError : copy.loadError,
        );
      }

      applySummary(result.summary);
      setSuccess(copy.github.syncDone);
      if (view === "github") {
        await loadGithubOverview();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setSyncingGithubActions(false);
    }
  }

  return {
    savingTeam,
    savingMeeting,
    uploadingMeeting,
    processingMeeting,
    syncingGithubActions,
    creatingIssueId,
    handleCreateTeam,
    handleCreateMeeting,
    handleUploadMeeting,
    handleProcessMeetingPreview,
    handleCreateGithubIssue,
    handleUpdateActionStatus,
    handleSyncGithubActions,
  };
}
