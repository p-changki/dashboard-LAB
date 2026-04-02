"use client";

import type { Dispatch, SetStateAction } from "react";
import { LayoutGrid, LoaderCircle, NotebookPen, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import type { AppLocale } from "@/lib/locale";
import type {
  MeetingHubAiRunner,
  MeetingHubMeeting,
  MeetingHubMeetingType,
  MeetingHubProcessedMeeting,
  MeetingHubTeam,
} from "@/lib/types";
import {
  Field,
  InfoBlock,
  MeetingRow,
  Panel,
  SelectField,
  TextAreaField,
} from "@/features/meeting-hub/components/MeetingHubUI";
import type { MeetingHubTemplateDefinition } from "@/lib/meeting-hub/templates";

import type { MeetingHubCopy } from "../copy";
import { MEETING_TYPES, type MeetingDraft } from "../state";
import { formatMeetingType, formatRunner } from "../utils";

type MeetingHubMeetingsViewProps = {
  locale: AppLocale;
  copy: MeetingHubCopy;
  meetingDraft: MeetingDraft;
  setMeetingDraft: Dispatch<SetStateAction<MeetingDraft>>;
  meetingAudioFile: File | null;
  setMeetingAudioFile: (file: File | null) => void;
  processedPreview: MeetingHubProcessedMeeting | null;
  setMeetingInputMode: (mode: MeetingDraft["inputMode"]) => void;
  selectMeetingTeam: (teamId: string, teams: MeetingHubTeam[]) => void;
  teamOptions: MeetingHubTeam[];
  meetingTemplates: MeetingHubTemplateDefinition[];
  summaryLoading: boolean;
  fullMeetings: MeetingHubMeeting[];
  savingMeeting: boolean;
  uploadingMeeting: boolean;
  processingMeeting: boolean;
  onApplyMeetingTemplate: (template: MeetingHubTemplateDefinition) => void;
  onProcessMeetingPreview: () => void;
  onSaveMeeting: () => void;
};

export function MeetingHubMeetingsView({
  locale,
  copy,
  meetingDraft,
  setMeetingDraft,
  meetingAudioFile,
  setMeetingAudioFile,
  processedPreview,
  setMeetingInputMode,
  selectMeetingTeam,
  teamOptions,
  meetingTemplates,
  summaryLoading,
  fullMeetings,
  savingMeeting,
  uploadingMeeting,
  processingMeeting,
  onApplyMeetingTemplate,
  onProcessMeetingPreview,
  onSaveMeeting,
}: MeetingHubMeetingsViewProps) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(320px,0.84fr)_minmax(0,1.16fr)]">
      <Panel title={copy.meetingForm.title} icon={NotebookPen}>
        <div className="grid gap-4">
          <div className="rounded-3xl border border-border-base bg-black/20 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label={copy.meetingForm.team}
                placeholder={copy.meetingForm.selectTeam}
                value={meetingDraft.teamId}
                onChange={(value) => selectMeetingTeam(value, teamOptions)}
                options={teamOptions.map((team) => ({ value: team.id, label: team.name }))}
              />
              <Field
                label={copy.meetingForm.titleLabel}
                value={meetingDraft.title}
                onChange={(value) => setMeetingDraft((current) => ({ ...current, title: value }))}
              />
              <SelectField
                label={copy.meetingForm.type}
                placeholder={copy.meetingForm.selectType}
                value={meetingDraft.type}
                onChange={(value) =>
                  setMeetingDraft((current) => ({ ...current, type: value as MeetingHubMeetingType }))
                }
                options={MEETING_TYPES.map((type) => ({
                  value: type,
                  label: formatMeetingType(locale, type),
                }))}
              />
              <Field
                label={copy.meetingForm.date}
                type="date"
                value={meetingDraft.date}
                onChange={(value) => setMeetingDraft((current) => ({ ...current, date: value }))}
              />
            </div>
          </div>
          <div className="rounded-3xl border border-border-base bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{copy.cards.templates}</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">{copy.template.replaceNotice}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {meetingTemplates.map((template) => (
                <Button
                  key={template.type}
                  variant="ghost"
                  size="lg"
                  onClick={() => onApplyMeetingTemplate(template)}
                  className={[
                    "h-auto w-full rounded-2xl border p-4 text-left",
                    meetingDraft.type === template.type
                      ? "border-cyan-400/30 bg-cyan-400/10"
                      : "border-border-base bg-white/[0.03]",
                  ].join(" ")}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{template.label}</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">
                        {template.description}
                      </p>
                    </div>
                    <Badge variant="neutral" size="sm">{copy.template.apply}</Badge>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border-base bg-black/20 p-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium text-white">{copy.meetingForm.inputMode}</span>
              <div className="flex flex-wrap gap-2">
                {([
                  ["text", copy.meetingForm.textMode],
                  ["audio", copy.meetingForm.audioMode],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMeetingInputMode(value)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm transition",
                      meetingDraft.inputMode === value
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "border-border-base bg-white/[0.03] text-text-muted hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={copy.meetingForm.participants}
              hint={copy.meetingForm.participantsHint}
              value={meetingDraft.participantsText}
              onChange={(value) =>
                setMeetingDraft((current) => ({ ...current, participantsText: value }))
              }
            />
            <Field
              label={copy.meetingForm.projects}
              value={meetingDraft.linkedProjectsText}
              onChange={(value) =>
                setMeetingDraft((current) => ({ ...current, linkedProjectsText: value }))
              }
            />
          </div>
          <Field
            label={copy.meetingForm.repository}
            value={meetingDraft.linkedRepository}
            onChange={(value) =>
              setMeetingDraft((current) => ({ ...current, linkedRepository: value }))
            }
          />
          {meetingDraft.inputMode === "audio" ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium text-white">{copy.meetingForm.audioFile}</span>
              <input
                type="file"
                accept=".m4a,.mp3,.wav,.webm,.aac,.flac,.ogg,audio/*"
                onChange={(event) => setMeetingAudioFile(event.target.files?.[0] ?? null)}
                className="rounded-2xl border border-border-base bg-black/20 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan-100"
              />
              <span className="text-xs leading-5 text-text-muted">{copy.meetingForm.audioHint}</span>
              <span className="text-xs leading-5 text-white/70">
                {meetingAudioFile?.name ?? copy.meetingForm.noAudioSelected}
              </span>
            </label>
          ) : null}
          <TextAreaField
            label={
              meetingDraft.inputMode === "audio"
                ? copy.meetingForm.notesAudio
                : copy.meetingForm.notes
            }
            hint={
              meetingDraft.inputMode === "audio"
                ? copy.meetingForm.notesAudioHint
                : copy.meetingForm.notesHint
            }
            value={meetingDraft.notes}
            onChange={(value) => setMeetingDraft((current) => ({ ...current, notes: value }))}
            rows={meetingDraft.inputMode === "audio" ? 5 : 10}
          />
          <label className="flex items-start gap-3 rounded-2xl border border-border-base bg-black/20 px-4 py-4">
            <input
              type="checkbox"
              checked={meetingDraft.useAi}
              onChange={(event) =>
                setMeetingDraft((current) => ({ ...current, useAi: event.target.checked }))
              }
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400"
            />
            <div>
              <p className="text-sm font-medium text-white">{copy.meetingForm.useAi}</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                {meetingDraft.useAi ? copy.meetingForm.saveModeAuto : copy.meetingForm.saveModeRule}
              </p>
            </div>
          </label>
          <SelectField
            label={copy.meetingForm.runner}
            placeholder={copy.meetingForm.selectRunner}
            value={meetingDraft.runner}
            onChange={(value) =>
              setMeetingDraft((current) => ({ ...current, runner: value as MeetingHubAiRunner }))
            }
            options={[
              { value: "auto", label: formatRunner(locale, "auto") },
              { value: "claude", label: formatRunner(locale, "claude") },
              { value: "codex", label: formatRunner(locale, "codex") },
              { value: "gemini", label: formatRunner(locale, "gemini") },
              { value: "openai", label: formatRunner(locale, "openai") },
              { value: "rule", label: formatRunner(locale, "rule") },
            ]}
          />
          <button
            type="button"
            onClick={onProcessMeetingPreview}
            disabled={
              processingMeeting ||
              meetingDraft.inputMode === "audio" ||
              !meetingDraft.notes.trim()
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border-base bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processingMeeting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {copy.meetingForm.preview}
          </button>
          {meetingDraft.inputMode === "text" && processedPreview ? (
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-950/10 p-4">
              <p className="text-sm font-semibold text-white">{copy.meetingForm.previewTitle}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-text-secondary">
                <InfoBlock
                  label={copy.labels.summary}
                  value={processedPreview.summary || copy.status.noSummary}
                />
                <InfoBlock
                  label={copy.labels.decisions}
                  value={processedPreview.decisions.join(" | ") || copy.status.none}
                />
                <InfoBlock
                  label={copy.labels.actions}
                  value={
                    processedPreview.actionItems.map((item) => item.title).join(" | ") ||
                    copy.status.none
                  }
                />
              </div>
            </div>
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSaveMeeting}
              disabled={
                savingMeeting ||
                uploadingMeeting ||
                teamOptions.length === 0 ||
                (meetingDraft.inputMode === "audio" && !meetingAudioFile)
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingMeeting || uploadingMeeting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <NotebookPen className="h-4 w-4" />
              )}
              {meetingDraft.inputMode === "audio"
                ? copy.meetingForm.submitAudio
                : copy.meetingForm.submit}
            </button>
          </div>
        </div>
      </Panel>

      <Panel title={copy.cards.recentMeetings} icon={LayoutGrid}>
        {summaryLoading && fullMeetings.length === 0 ? (
          <div className="rounded-2xl border border-border-base bg-black/20 px-4 py-5 text-sm text-text-secondary">
            {copy.loading}
          </div>
        ) : fullMeetings.length > 0 ? (
          <div className="space-y-3">
            {fullMeetings.map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} locale={locale} detailed />
            ))}
          </div>
        ) : (
          <EmptyStateCard
            title={copy.empty.meetingsTitle}
            message={copy.empty.meetingsMessage}
          />
        )}
      </Panel>
    </div>
  );
}
