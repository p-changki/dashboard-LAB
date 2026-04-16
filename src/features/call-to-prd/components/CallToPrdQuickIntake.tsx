"use client";

import { ArrowRight, FileAudio, FileText, Sparkles, Upload, Wand2 } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { CallToPrdIntakeQueuePanel } from "@/features/call-to-prd/components/CallToPrdIntakeQueuePanel";
import { getCallGenerationModeLabel, getCallPresetLabel, getCallToPrdCopy } from "@/features/call-to-prd/copy";
import type { ProjectSummary } from "@/lib/types";
import type { CallGenerationMode, CallRecord } from "@/lib/types/call-to-prd";

type QuickInputMode = "file" | "text";

interface CallToPrdQuickIntakeProps {
  feedbackMessage: string;
  mode: QuickInputMode;
  setMode: (value: QuickInputMode) => void;
  file: File | null;
  setFile: (value: File | null) => void;
  directText: string;
  setDirectText: (value: string) => void;
  projectPath: string;
  projects: ProjectSummary[];
  currentProjectPath: string;
  selectedProject: ProjectSummary | null;
  projectContextStatus: "idle" | "loading" | "ready" | "failed";
  projectContextSummary: string;
  projectContextSources: string[];
  projectContextError: string;
  generationMode: CallGenerationMode;
  handleProjectSelect: (path: string) => void;
  handleSubmit: () => void;
  activeQueue: CallRecord[];
  recentQueue: CallRecord[];
  setSelectedHistory: (record: CallRecord | null) => void;
  setSelectedSaved: (saved: string | null) => void;
  handleRetryRecord: (record: CallRecord) => void;
  handleDeleteHistoryRecord: (id: string) => void;
}

export function CallToPrdQuickIntake({
  feedbackMessage,
  mode,
  setMode,
  file,
  setFile,
  directText,
  setDirectText,
  projectPath,
  projects,
  currentProjectPath,
  selectedProject,
  projectContextStatus,
  projectContextSummary,
  projectContextSources,
  projectContextError,
  generationMode,
  handleProjectSelect,
  handleSubmit,
  activeQueue,
  recentQueue,
  setSelectedHistory,
  setSelectedSaved,
  handleRetryRecord,
  handleDeleteHistoryRecord,
}: CallToPrdQuickIntakeProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const hasInput = Boolean(file) || Boolean(directText.trim());
  const canSubmit = hasInput && Boolean(projectPath) && projectContextStatus === "ready";
  const projectStatusLabel = !projectPath
    ? copy.intake.quickProjectOptional
    : projectContextStatus === "ready"
      ? copy.intake.projectContextReady
      : projectContextStatus === "failed"
        ? copy.intake.projectContextFailed
        : copy.intake.projectContextLoading;
  const projectStatusVariant = !projectPath
    ? "warning"
    : projectContextStatus === "ready"
      ? "success"
      : projectContextStatus === "failed"
        ? "error"
        : "warning";

  return (
    <div className="space-y-5">
      {feedbackMessage ? (
        <NoticeBanner
          tone="success"
          title={copy.intake.feedbackTitle}
          message={feedbackMessage}
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="rounded-[28px] border border-border-base bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
          <Badge variant="info" size="sm">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.intake.quickBadge}
          </Badge>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{copy.intake.quickTitle}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">{copy.intake.quickDescription}</p>

          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("text")}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  mode === "text"
                    ? "border border-cyan-400/30 bg-cyan-400/[0.12] text-white"
                    : "border border-border-base bg-black/10 text-text-secondary hover:bg-white/[0.04]"
                }`}
              >
                <FileText className="mr-2 inline h-4 w-4" />
                {copy.intake.textMode}
              </button>
              <button
                type="button"
                onClick={() => setMode("file")}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  mode === "file"
                    ? "border border-cyan-400/30 bg-cyan-400/[0.12] text-white"
                    : "border border-border-base bg-black/10 text-text-secondary hover:bg-white/[0.04]"
                }`}
              >
                <FileAudio className="mr-2 inline h-4 w-4" />
                {copy.intake.fileMode}
              </button>
            </div>

            {mode === "file" ? (
              <label className="flex min-h-[172px] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/12 bg-black/20 p-8 text-center transition-all hover:border-cyan-400/30 hover:bg-white/[0.04]">
                <Upload className="h-8 w-8 text-text-muted" />
                <div className="space-y-1">
                  <p className="text-sm text-white">{file ? file.name : copy.intake.filePlaceholder}</p>
                  <p className="text-xs leading-6 text-text-muted">{copy.intake.quickVoiceHint}</p>
                </div>
                <input
                  type="file"
                  accept=".m4a,.mp3,.wav,.webm"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <>
                <label className="block text-xs font-medium uppercase tracking-[0.18em] text-cyan-200/80">
                  {copy.intake.quickTopicLabel}
                </label>
                <textarea
                  value={directText}
                  onChange={(event) => setDirectText(event.target.value)}
                  rows={6}
                  placeholder={copy.intake.quickTopicPlaceholder}
                  className="min-h-[172px] w-full rounded-3xl border border-border-base bg-black/20 px-5 py-4 text-sm leading-7 text-white outline-none transition-colors duration-[150ms] placeholder:text-text-muted focus:border-cyan-400/40 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-page)]"
                />
                <p className="text-sm leading-6 text-text-muted">{copy.intake.quickTopicHint}</p>
              </>
            )}

            {file ? (
              <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] px-4 py-3 text-sm leading-6 text-cyan-100">
                {copy.intake.quickVoiceSelected(file.name)}
                {directText.trim() ? ` ${copy.intake.quickInputPriorityHint}` : ""}
              </div>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-3xl border border-border-base bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.intake.quickProjectLabel}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.intake.quickProjectDescription}</p>
              <select
                value={projectPath}
                onChange={(event) => handleProjectSelect(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-purple-500/30"
              >
                <option value="">{copy.intake.quickProjectPlaceholder}</option>
                {projects.map((project) => (
                  <option key={project.path} value={project.path}>
                    {project.path === currentProjectPath
                      ? `${project.name} (${copy.common.currentWorkspace})`
                      : project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{copy.intake.quickProjectStatus}</p>
              <p className="mt-2 text-sm font-medium text-white">
                {selectedProject?.name ?? copy.intake.quickProjectOptional}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {selectedProject?.path === currentProjectPath
                  ? copy.intake.quickCurrentWorkspace
                  : projectStatusLabel}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-border-base bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={projectStatusVariant} size="sm">
                {projectStatusLabel}
              </Badge>
              {projectContextSources.slice(0, 2).map((source) => (
                <span key={source} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-text-secondary">
                  {source}
                </span>
              ))}
            </div>
            {projectContextError ? (
              <p className="mt-3 text-sm leading-6 text-rose-100">{projectContextError}</p>
            ) : null}
            {projectContextSummary ? (
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                {projectContextSummary.slice(0, 220)}
                {projectContextSummary.length > 220 ? "..." : ""}
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-text-muted">{copy.intake.quickContextHint}</p>
            )}
          </div>
        </div>

        <aside className="rounded-[28px] border border-border-base bg-white/[0.03] p-6">
          <Badge variant="claude" size="sm">
            <Wand2 className="h-3.5 w-3.5" />
            {copy.intake.quickOutputBadge}
          </Badge>
          <h4 className="mt-4 text-lg font-semibold text-white">{copy.intake.quickOutputTitle}</h4>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-border-base bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.intake.quickPresetTitle}</p>
              <p className="mt-2 text-sm font-medium text-white">{getCallPresetLabel("quick", locale)}</p>
            </div>
            <div className="rounded-2xl border border-border-base bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.intake.quickModeTitle}</p>
              <p className="mt-2 text-sm font-medium text-white">{getCallGenerationModeLabel(generationMode, locale)}</p>
            </div>
            <div className="rounded-2xl border border-border-base bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.intake.quickDeliverableTitle}</p>
              <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-white">
                <FileText className="h-4 w-4 text-cyan-200" />
                <span>{copy.intake.quickDeliverableValue}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-text-muted"
          >
            {copy.intake.quickSubmit}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-sm leading-6 text-text-muted">{copy.intake.quickSubmitHint}</p>
        </aside>
      </section>

      <CallToPrdIntakeQueuePanel
        activeQueue={activeQueue}
        recentQueue={recentQueue}
        setSelectedHistory={setSelectedHistory}
        setSelectedSaved={setSelectedSaved}
        handleRetryRecord={handleRetryRecord}
        handleDeleteHistoryRecord={handleDeleteHistoryRecord}
      />
    </div>
  );
}
