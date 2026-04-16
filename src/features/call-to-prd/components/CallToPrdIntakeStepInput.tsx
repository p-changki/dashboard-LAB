"use client";

import { FileAudio, FileText, Upload } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Input } from "@/components/ui/Input";
import type { ProjectSummary } from "@/lib/types";
import type { CallRecord } from "@/lib/types/call-to-prd";
import { CallToPrdIntakeQueuePanel } from "@/features/call-to-prd/components/CallToPrdIntakeQueuePanel";
import { getCallToPrdCopy } from "@/features/call-to-prd/copy";

type InputMode = "file" | "text";

interface CallToPrdIntakeStepInputProps {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  directText: string;
  setDirectText: (text: string) => void;
  projectPath: string;
  projectName: string;
  setProjectName: (name: string) => void;
  projects: ProjectSummary[];
  currentProjectPath: string;
  selectedProject: ProjectSummary | null;
  handleProjectSelect: (path: string) => void;
  projectContextStatus: "idle" | "loading" | "ready" | "failed";
  projectContextSummary: string;
  projectContextSources: string[];
  projectContextError: string;
  activeQueue: CallRecord[];
  recentQueue: CallRecord[];
  setSelectedHistory: (record: CallRecord | null) => void;
  setSelectedSaved: (saved: string | null) => void;
  handleRetryRecord: (record: CallRecord) => void;
  handleDeleteHistoryRecord: (id: string) => void;
}

export function CallToPrdIntakeStepInput({
  mode,
  setMode,
  file,
  setFile,
  pdfFile,
  setPdfFile,
  directText,
  setDirectText,
  projectPath,
  projectName,
  setProjectName,
  projects,
  currentProjectPath,
  selectedProject,
  handleProjectSelect,
  projectContextStatus,
  projectContextSummary,
  projectContextSources,
  projectContextError,
  activeQueue,
  recentQueue,
  setSelectedHistory,
  setSelectedSaved,
  handleRetryRecord,
  handleDeleteHistoryRecord,
}: CallToPrdIntakeStepInputProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);

  return (
    <div className="space-y-5">
      <section className="space-y-5 rounded-3xl border border-border-base bg-bg-card p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`rounded-full px-4 py-2 text-sm transition-all ${
              mode === "file"
                ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                : "border border-border-base bg-bg-surface text-text-muted"
            }`}
          >
            <FileAudio className="mr-2 inline h-4 w-4" />
            {copy.intake.fileMode}
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`rounded-full px-4 py-2 text-sm transition-all ${
              mode === "text"
                ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                : "border border-border-base bg-bg-surface text-text-muted"
            }`}
          >
            {copy.intake.textMode}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          {mode === "file" ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-bg-surface p-10 text-center transition-all hover:border-purple-500/30 hover:bg-bg-card-hover">
              <Upload className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">{file ? file.name : copy.intake.filePlaceholder}</p>
              <input type="file" accept=".m4a,.mp3,.wav,.webm" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <textarea
              value={directText}
              onChange={(event) => setDirectText(event.target.value)}
              placeholder={copy.intake.textPlaceholder}
              className="min-h-56 w-full rounded-2xl border border-border-base bg-bg-surface p-5 text-sm leading-7 text-text-primary placeholder:text-text-disabled focus:border-purple-500/40 focus:outline-none"
              rows={8}
            />
          )}

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-bg-surface p-6 text-center transition-all hover:border-purple-500/30 hover:bg-bg-card-hover">
            <FileText className="h-6 w-6 text-text-muted" />
            <p className="text-sm text-text-muted">
              {pdfFile ? copy.intake.pdfAttached(pdfFile.name) : copy.intake.pdfPlaceholder}
            </p>
            <input type="file" accept=".pdf" className="hidden" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <select
            value={projectPath}
            onChange={(event) => handleProjectSelect(event.target.value)}
            className="rounded-xl border border-border-base bg-bg-surface px-4 py-3 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
          >
            <option value="">{copy.intake.projectSelectPlaceholder}</option>
            {projects.map((project) => (
              <option key={project.path} value={project.path}>
                {project.path === currentProjectPath ? `${project.name} (${copy.common.currentWorkspace})` : project.name}
              </option>
            ))}
          </select>
          <Input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder={copy.intake.projectNamePlaceholder}
            size="lg"
          />
        </div>
      </section>

      {selectedProject ? (
        <section className="rounded-2xl border border-border-base bg-bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-text-primary">{selectedProject.name}</span>
            <span className="rounded-full bg-purple-900/25 px-2 py-0.5 text-[11px] text-purple-200">{selectedProject.type}</span>
            {selectedProject.techStack.slice(0, 4).map((stack) => (
              <span key={stack} className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-text-secondary">
                {stack}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">{selectedProject.path}</p>
          {selectedProject.path === currentProjectPath ? <p className="mt-2 text-xs font-medium text-purple-200">{copy.intake.currentWorkspaceHint}</p> : null}
          <p className="mt-2 text-xs leading-6 text-text-secondary">{copy.intake.selectedProjectPrompt}</p>
        </section>
      ) : null}

      {projectPath ? (
        <section className={`rounded-2xl border p-4 ${
          projectContextStatus === "ready"
            ? "border-emerald-500/20 bg-emerald-950/15"
            : projectContextStatus === "failed"
              ? "border-rose-500/20 bg-rose-950/15"
              : "border-cyan-500/20 bg-cyan-950/15"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{copy.intake.projectContextTitle}</p>
              <p className="mt-1 text-xs leading-6 text-text-secondary">{copy.intake.projectContextDescription}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] ${
              projectContextStatus === "ready"
                ? "bg-emerald-900/30 text-emerald-200"
                : projectContextStatus === "failed"
                  ? "bg-rose-900/30 text-rose-200"
                  : "bg-cyan-900/30 text-cyan-200"
            }`}>
              {{
                idle: copy.intake.projectContextLoading,
                loading: copy.intake.projectContextLoading,
                ready: copy.intake.projectContextReady,
                failed: copy.intake.projectContextFailed,
              }[projectContextStatus]}
            </span>
          </div>

          {projectContextError ? <p className="mt-3 text-sm leading-6 text-rose-100">{projectContextError}</p> : null}
          {projectContextSummary ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{copy.intake.projectContextSummary}</p>
              <p className="mt-2 text-xs leading-6 text-text-secondary">
                {projectContextSummary.slice(0, 260)}
                {projectContextSummary.length > 260 ? "..." : ""}
              </p>
            </div>
          ) : null}
          {projectContextSources.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{copy.intake.projectContextSources}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {projectContextSources.slice(0, 6).map((source) => (
                  <span key={source} className="rounded-full bg-white/8 px-2 py-1 text-[11px] text-text-secondary">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

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
