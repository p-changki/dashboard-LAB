"use client";

import { useMemo, useState } from "react";
import {
  Github,
  LayoutGrid,
  ListTodo,
  LoaderCircle,
  NotebookPen,
  Users,
} from "lucide-react";

import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { useLocale } from "@/components/layout/LocaleProvider";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { getMeetingHubTemplateDefinitions } from "@/lib/meeting-hub/templates";
import { MetricCard } from "@/features/meeting-hub/components/MeetingHubUI";

import { getMeetingHubCopy, type MeetingHubView } from "./copy";
import { useMeetingHubData } from "./hooks/useMeetingHubData";
import { useMeetingHubDrafts } from "./hooks/useMeetingHubDrafts";
import { useMeetingHubMutations } from "./hooks/useMeetingHubMutations";
import { MeetingHubActionsView } from "./views/MeetingHubActionsView";
import { MeetingHubGithubView } from "./views/MeetingHubGithubView";
import { MeetingHubMeetingsView } from "./views/MeetingHubMeetingsView";
import { MeetingHubOverviewView } from "./views/MeetingHubOverviewView";
import { MeetingHubTeamsView } from "./views/MeetingHubTeamsView";

export function MeetingHubTab({ mode }: { mode: DashboardNavigationMode }) {
  const { locale } = useLocale();
  const copy = getMeetingHubCopy(locale);
  const [view, setView] = useState<MeetingHubView>("overview");
  const [success, setSuccess] = useState<string | null>(null);

  const {
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
  } = useMeetingHubDrafts();

  const {
    overview,
    summary,
    githubOverview,
    loading,
    summaryLoading,
    githubLoading,
    error,
    displayLoadError,
    setError,
    loadOverview,
    loadSummary,
    loadGithubOverview,
    applySummary,
    linkedRepositories,
  } = useMeetingHubData({
    loadErrorMessage: copy.loadError,
    view,
    hydrateMeetingDefaults,
  });

  const {
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
  } = useMeetingHubMutations({
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
  });

  const meetingTemplates = useMemo(
    () => getMeetingHubTemplateDefinitions(locale),
    [locale],
  );

  const recentMeetings = overview?.recentMeetings ?? [];
  const recentActions = overview?.recentActions ?? [];
  const recentDecisions = overview?.decisionLog ?? [];
  const weeklyBriefs = overview?.weeklyBriefs ?? [];
  const teamOptions = summary?.teams ?? overview?.teams ?? [];
  const fullMeetings = summary?.meetings ?? [];
  const fullActions = summary?.actions ?? [];
  const stats = summary?.stats ?? overview?.stats ?? {
    totalTeams: 0,
    totalMeetings: 0,
    openActionItems: 0,
    linkedRepositories: 0,
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.025] to-cyan-500/[0.06] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{copy.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.title}</h2>
            <p className="text-sm leading-6 text-[var(--color-text-soft)]">{copy.description}</p>
            <p className="text-xs leading-5 text-gray-500">
              {mode === "core" ? copy.simpleMode : copy.fullMode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void (summary ? loadSummary() : loadOverview())}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
            {copy.refresh}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copy.metrics.teams} value={stats.totalTeams} icon={Users} />
        <MetricCard label={copy.metrics.meetings} value={stats.totalMeetings} icon={NotebookPen} />
        <MetricCard label={copy.metrics.actions} value={stats.openActionItems} icon={ListTodo} />
        <MetricCard label={copy.metrics.repos} value={stats.linkedRepositories} icon={Github} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["overview", "teams", "meetings", "actions", "github"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={[
              "rounded-full border px-4 py-2 text-sm transition",
              view === item
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            {copy.views[item]}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorCard
          title="Meeting Hub"
          message={displayLoadError ?? copy.loadError}
          actionLabel={copy.refresh}
          onAction={() => void (summary ? loadSummary() : loadOverview())}
        />
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      {loading && !overview ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-[var(--color-text-soft)]">
          {copy.loading}
        </section>
      ) : null}

      {!loading && overview ? (
        <>
          {view === "overview" ? (
            <MeetingHubOverviewView
              locale={locale}
              copy={copy}
              recentMeetings={recentMeetings}
              recentActions={recentActions}
              recentDecisions={recentDecisions}
              weeklyBriefs={weeklyBriefs}
              linkedRepositories={linkedRepositories}
              creatingIssueId={creatingIssueId}
              setView={setView}
              onCreateIssue={(item) => void handleCreateGithubIssue(item)}
            />
          ) : null}

          {view === "teams" ? (
            <MeetingHubTeamsView
              copy={copy}
              teamDraft={teamDraft}
              setTeamDraft={setTeamDraft}
              teamOptions={teamOptions}
              savingTeam={savingTeam}
              onCreateTeam={() => void handleCreateTeam()}
            />
          ) : null}

          {view === "meetings" ? (
            <MeetingHubMeetingsView
              locale={locale}
              copy={copy}
              meetingDraft={meetingDraft}
              setMeetingDraft={setMeetingDraft}
              meetingAudioFile={meetingAudioFile}
              setMeetingAudioFile={setMeetingAudioFile}
              processedPreview={processedPreview}
              setMeetingInputMode={setMeetingInputMode}
              selectMeetingTeam={selectMeetingTeam}
              teamOptions={teamOptions}
              meetingTemplates={meetingTemplates}
              summaryLoading={summaryLoading}
              fullMeetings={fullMeetings}
              savingMeeting={savingMeeting}
              uploadingMeeting={uploadingMeeting}
              processingMeeting={processingMeeting}
              onApplyMeetingTemplate={applyMeetingTemplate}
              onProcessMeetingPreview={() => void handleProcessMeetingPreview()}
              onSaveMeeting={() =>
                void (meetingDraft.inputMode === "audio"
                  ? handleUploadMeeting()
                  : handleCreateMeeting())
              }
            />
          ) : null}

          {view === "actions" ? (
            <MeetingHubActionsView
              locale={locale}
              copy={copy}
              summaryLoading={summaryLoading}
              fullActions={fullActions}
              creatingIssueId={creatingIssueId}
              onCreateIssue={(item) => void handleCreateGithubIssue(item)}
              onStatusChange={(actionId, status) =>
                void handleUpdateActionStatus(actionId, status)
              }
            />
          ) : null}

          {view === "github" ? (
            <MeetingHubGithubView
              locale={locale}
              copy={copy}
              linkedRepositories={linkedRepositories}
              githubOverview={githubOverview}
              githubLoading={githubLoading}
              syncingGithubActions={syncingGithubActions}
              onSyncGithubActions={() => void handleSyncGithubActions()}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
