"use client";

import { useState } from "react";
import { ChevronDown, CircleHelp, FileAudio, FileText, Phone, Upload } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import {
  CALL_CUSTOMER_IMPACTS,
  CALL_INPUT_KINDS,
  CALL_REPRODUCIBILITY_STATES,
  CALL_SEVERITIES,
  CALL_URGENCY_LEVELS,
  type CallCustomerImpact,
  type CallInputKind,
  type CallReproducibility,
  type CallSeverity,
  type CallUrgency,
} from "@/lib/call-to-prd/intake-config";
import {
  CALL_DOC_DEFINITIONS,
  CALL_DOC_PRESET_DEFINITIONS,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import type { ProjectSummary } from "@/lib/types";
import type {
  CallGenerationMode,
  CallDocTemplateSet,
  CallRecord,
  SavedCallBundleIndexItem,
} from "@/lib/types/call-to-prd";
import {
  buildStatusLabel,
  getGenerationModeLabel,
  getGenerationModeOptions,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";
import {
  getCallCustomerImpactLabel,
  getCallDocDescription,
  getCallDocLabel,
  getCallDocShortLabel,
  getCallInputKindLabel,
  getCallPresetDescription,
  getCallPresetLabel,
  formatCallToPrdProgressMessage,
  getCallReproducibilityLabel,
  getCallSeverityLabel,
  getCallToPrdCopy,
  getCallUrgencyLabel,
} from "@/features/call-to-prd/copy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InputMode = "file" | "text";

export interface CallToPrdIntakeProps {
  isCoreMode: boolean;
  feedbackMessage: string;

  // Input mode
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  directText: string;
  setDirectText: (text: string) => void;

  // Project
  projectPath: string;
  projectName: string;
  setProjectName: (name: string) => void;
  projectContextStatus: "idle" | "loading" | "ready" | "failed";
  projectContextSummary: string;
  projectContextSources: string[];
  projectContextError: string;
  customerName: string;
  setCustomerName: (name: string) => void;
  additionalContext: string;
  setAdditionalContext: (context: string) => void;
  projects: ProjectSummary[];
  currentProjectPath: string;
  selectedProject: ProjectSummary | null;
  handleProjectSelect: (path: string) => void;

  // Input structuring
  inputKind: CallInputKind;
  setInputKind: (kind: CallInputKind) => void;
  severity: CallSeverity;
  setSeverity: (severity: CallSeverity) => void;
  customerImpact: CallCustomerImpact;
  setCustomerImpact: (impact: CallCustomerImpact) => void;
  urgency: CallUrgency;
  setUrgency: (urgency: CallUrgency) => void;
  reproducibility: CallReproducibility;
  setReproducibility: (reproducibility: CallReproducibility) => void;
  currentWorkaround: string;
  setCurrentWorkaround: (workaround: string) => void;
  separateExternalDocs: boolean;
  setSeparateExternalDocs: (value: boolean) => void;

  // Change baseline
  needsChangeBaseline: boolean;
  baselineEntryName: string;
  setBaselineEntryName: (name: string) => void;
  savedBundles: SavedCallBundleIndexItem[];

  // Queue
  activeQueue: CallRecord[];
  recentQueue: CallRecord[];
  setSelectedHistory: (record: CallRecord | null) => void;
  setSelectedSaved: (saved: string | null) => void;
  handleRetryRecord: (record: CallRecord) => void;
  handleDeleteHistoryRecord: (id: string) => void;

  // Template sets
  availableTemplateSets: CallDocTemplateSet[];
  applyTemplateSet: (set: CallDocTemplateSet) => void;
  handleSaveTemplateSet: () => void;
  handleDeleteTemplateSet: (id: string) => void;

  // Generation config
  generationMode: CallGenerationMode;
  setGenerationMode: (mode: CallGenerationMode) => void;
  generationPreset: CallDocPreset;
  applyPreset: (preset: CallDocPreset) => void;
  selectedDocTypes: CallDocType[];
  toggleDocType: (docType: CallDocType) => void;
  setGuideOpen: (open: boolean) => void;

  // Submit
  handleSubmit: () => void;

  // Empty state
  displayRecord: CallRecord | null;
  history: CallRecord[];
  savedTotalCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CallToPrdIntake(props: CallToPrdIntakeProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const generationModeOptions = getGenerationModeOptions(locale);
  const [queueOpen, setQueueOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const {
    isCoreMode,
    feedbackMessage,
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
    projectContextStatus,
    projectContextSummary,
    projectContextSources,
    projectContextError,
    customerName,
    setCustomerName,
    additionalContext,
    setAdditionalContext,
    projects,
    currentProjectPath,
    selectedProject,
    handleProjectSelect,
    inputKind,
    setInputKind,
    severity,
    setSeverity,
    customerImpact,
    setCustomerImpact,
    urgency,
    setUrgency,
    reproducibility,
    setReproducibility,
    currentWorkaround,
    setCurrentWorkaround,
    separateExternalDocs,
    setSeparateExternalDocs,
    needsChangeBaseline,
    baselineEntryName,
    setBaselineEntryName,
    savedBundles,
    activeQueue,
    recentQueue,
    setSelectedHistory,
    setSelectedSaved,
    handleRetryRecord,
    handleDeleteHistoryRecord,
    availableTemplateSets,
    applyTemplateSet,
    handleSaveTemplateSet,
    handleDeleteTemplateSet,
    generationMode,
    setGenerationMode,
    generationPreset,
    applyPreset,
    selectedDocTypes,
    toggleDocType,
    setGuideOpen,
    handleSubmit,
    displayRecord,
    history,
    savedTotalCount,
  } = props;
  const stepLabel = locale === "ko" ? "단계" : "Step";
  const inputReady = mode === "file" ? Boolean(file) : Boolean(directText.trim());
  const canSubmit = inputReady && Boolean(projectPath) && projectContextStatus === "ready";
  const submitStatusText = canSubmit
    ? `${getGenerationModeLabel(generationMode, locale)} · ${getCallPresetLabel(generationPreset, locale)} · ${copy.intake.selectedDocs(selectedDocTypes.length)}`
    : !inputReady
      ? copy.hooks.submitMissingInput
      : !projectPath
        ? copy.hooks.projectRequired
        : projectContextError || copy.hooks.projectContextNotReady;
  const flowSteps = locale === "ko"
    ? [
        { step: "1", title: "입력", description: "녹음 파일 또는 직접 입력한 메모를 준비합니다." },
        { step: "2", title: "프로젝트/메타", description: "프로젝트와 고객 맥락, 우선순위를 맞춥니다." },
        { step: "3", title: "문서 구성", description: "생성 방식과 필요한 산출물만 고릅니다." },
        { step: "4", title: "실행", description: "문서 생성을 시작하고 큐/템플릿은 필요할 때만 확인합니다." },
      ]
    : [
        { step: "1", title: "Input", description: "Provide an audio file or paste notes directly." },
        { step: "2", title: "Project & metadata", description: "Align project, customer, and issue context." },
        { step: "3", title: "Document setup", description: "Choose the generation mode and output set." },
        { step: "4", title: "Run", description: "Start generation and open queue/templates only when needed." },
      ];
  const selectedDocLabels = selectedDocTypes.map((docType) => getCallDocShortLabel(docType, locale));
  const generationSummaryItems = [
    {
      label: locale === "ko" ? "생성 모드" : "Generation mode",
      value: getGenerationModeLabel(generationMode, locale),
      tone: "cyan" as const,
    },
    {
      label: locale === "ko" ? "프리셋" : "Preset",
      value: getCallPresetLabel(generationPreset, locale),
      tone: "purple" as const,
    },
    {
      label: locale === "ko" ? "선택 문서" : "Selected docs",
      value: copy.intake.selectedDocs(selectedDocTypes.length),
      tone: "slate" as const,
    },
  ];

  return (
    <div className="space-y-5">
      {isCoreMode ? (
        <NoticeBanner
          tone="info"
          title={copy.intake.coreModeTitle}
          message={copy.intake.coreModeMessage}
        />
      ) : null}
      {feedbackMessage ? (
        <NoticeBanner
          title={copy.intake.feedbackTitle}
          message={feedbackMessage}
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {flowSteps.map((step) => (
          <div key={step.step} className="rounded-2xl border border-border-base bg-bg-card px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200/70">{step.step} {stepLabel}</p>
            <p className="mt-2 text-sm font-medium text-text-primary">{step.title}</p>
            <p className="mt-2 text-xs leading-6 text-text-muted">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-5 rounded-3xl border border-border-base bg-bg-card p-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("file")}
            className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "file" ? "border border-purple-500/20 bg-purple-900/30 text-purple-300" : "border border-border-base bg-bg-surface text-text-muted"}`}>
            <FileAudio className="mr-2 inline h-4 w-4" />{copy.intake.fileMode}
          </button>
          <button type="button" onClick={() => setMode("text")}
            className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "text" ? "border border-purple-500/20 bg-purple-900/30 text-purple-300" : "border border-border-base bg-bg-surface text-text-muted"}`}>
            {copy.intake.textMode}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          {mode === "file" ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-bg-surface p-10 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-bg-card-hover">
              <Upload className="h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">{file ? file.name : copy.intake.filePlaceholder}</p>
              <input type="file" accept=".m4a,.mp3,.wav,.webm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <textarea
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              placeholder={copy.intake.textPlaceholder}
              className="min-h-56 w-full rounded-2xl border border-border-base bg-bg-surface p-5 text-sm leading-7 text-text-primary placeholder:text-text-disabled focus:border-purple-500/40 focus:outline-none"
              rows={8}
            />
          )}

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-bg-surface p-6 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-bg-card-hover">
            <FileText className="h-6 w-6 text-text-muted" />
            <p className="text-sm text-text-muted">
              {pdfFile ? copy.intake.pdfAttached(pdfFile.name) : copy.intake.pdfPlaceholder}
            </p>
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={copy.intake.projectNamePlaceholder} size="lg" />
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={copy.intake.customerNamePlaceholder} size="lg" />
          <Input value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder={copy.intake.additionalContextPlaceholder} size="lg" />
        </div>
      </div>

      <div className="rounded-3xl border border-border-base bg-bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{copy.intake.structuringTitle}</h3>
            <p className="mt-1 text-xs leading-6 text-text-muted">
              {copy.intake.structuringDescription}
            </p>
          </div>
          <Badge variant="info">
            {getCallInputKindLabel(inputKind, locale)}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <label className="space-y-2">
            <span className="text-xs text-text-muted">{copy.intake.inputKind}</span>
            <select
              value={inputKind}
              onChange={(event) => setInputKind(event.target.value as CallInputKind)}
              className="w-full rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_INPUT_KINDS.map((value) => (
                <option key={value} value={value}>{getCallInputKindLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-text-muted">{copy.intake.severity}</span>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as CallSeverity)}
              className="w-full rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_SEVERITIES.map((value) => (
                <option key={value} value={value}>{getCallSeverityLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-text-muted">{copy.intake.impact}</span>
            <select
              value={customerImpact}
              onChange={(event) => setCustomerImpact(event.target.value as CallCustomerImpact)}
              className="w-full rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_CUSTOMER_IMPACTS.map((value) => (
                <option key={value} value={value}>{getCallCustomerImpactLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-text-muted">{copy.intake.urgency}</span>
            <select
              value={urgency}
              onChange={(event) => setUrgency(event.target.value as CallUrgency)}
              className="w-full rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_URGENCY_LEVELS.map((value) => (
                <option key={value} value={value}>{getCallUrgencyLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-text-muted">{copy.intake.reproducibility}</span>
            <select
              value={reproducibility}
              onChange={(event) => setReproducibility(event.target.value as CallReproducibility)}
              className="w-full rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_REPRODUCIBILITY_STATES.map((value) => (
                <option key={value} value={value}>{getCallReproducibilityLabel(value, locale)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Input
            value={currentWorkaround}
            onChange={(event) => setCurrentWorkaround(event.target.value)}
            placeholder={copy.intake.workaroundPlaceholder}
          />

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border-base bg-bg-surface px-4 py-3 text-sm text-text-secondary">
            <div>
              <p className="font-medium text-text-primary">{copy.intake.externalDocsTitle}</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">{copy.intake.externalDocsDescription}</p>
            </div>
            <input
              type="checkbox"
              checked={separateExternalDocs}
              onChange={(event) => setSeparateExternalDocs(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/20 accent-purple-400"
            />
          </label>
        </div>
      </div>

      {selectedProject && (
        <div className="rounded-2xl border border-border-base bg-bg-card p-4">
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
          {selectedProject.path === currentProjectPath && (
            <p className="mt-2 text-xs font-medium text-purple-200">{copy.intake.currentWorkspaceHint}</p>
          )}
          <p className="mt-2 text-xs leading-6 text-text-secondary">
            {copy.intake.selectedProjectPrompt}
          </p>
        </div>
      )}

      {projectPath ? (
        <div className={`rounded-2xl border p-4 ${
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

          {projectContextError ? (
            <p className="mt-3 text-sm leading-6 text-rose-100">{projectContextError}</p>
          ) : null}

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
        </div>
      ) : null}

      {needsChangeBaseline ? (
        <div className="rounded-3xl border border-border-base bg-bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{copy.intake.baselineTitle}</h3>
              <p className="mt-1 text-xs leading-6 text-text-muted">
                {copy.intake.baselineDescription}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={baselineEntryName}
              onChange={(event) => setBaselineEntryName(event.target.value)}
              className="rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
            >
              <option value="">{copy.intake.baselineAutoOption}</option>
              {savedBundles.map((bundle) => (
                <option key={bundle.entryName} value={bundle.entryName}>
                  {bundle.title} · {bundle.createdAt.slice(0, 10)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setBaselineEntryName("")}
              className="rounded-xl border border-border-base bg-bg-surface px-4 py-2 text-xs text-text-secondary transition hover:bg-bg-card-hover"
            >
              {copy.intake.baselineAutoButton}
            </button>
          </div>
        </div>
      ) : null}

      {(activeQueue.length > 0 || recentQueue.length > 0) && (
        <div className="rounded-3xl border border-border-base bg-bg-card p-5">
          <button
            type="button"
            onClick={() => setQueueOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{copy.intake.queueTitle}</h3>
              <p className="mt-1 text-xs leading-6 text-text-muted">
                {copy.intake.queueDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="rounded-full bg-purple-900/20 px-2 py-0.5 text-purple-200">{copy.intake.inProgress} {activeQueue.length}</span>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-text-muted">{copy.intake.recentComplete} {recentQueue.length}</span>
              <ChevronDown className={`h-4 w-4 transition ${queueOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {queueOpen ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{copy.intake.inProgress}</p>
                {activeQueue.length > 0 ? activeQueue.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => {
                      setSelectedHistory(record);
                      setSelectedSaved(null);
                    }}
                    className="w-full rounded-2xl border border-border-base bg-bg-surface px-4 py-3 text-left transition hover:bg-bg-card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="break-words text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                      <span className="text-xs text-purple-300">{buildStatusLabel(record.status, locale)}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {formatCallToPrdProgressMessage(record.docGenerationProgress, locale) ?? buildStatusLabel(record.status, locale)}
                    </p>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border-base px-4 py-4 text-sm text-text-muted">
                    {copy.intake.noActiveQueue}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{copy.intake.recentComplete}</p>
                {recentQueue.length > 0 ? recentQueue.map((record) => (
                  <div
                    key={record.id}
                    className="w-full rounded-2xl border border-border-base bg-bg-surface px-4 py-3 transition hover:bg-bg-card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHistory(record);
                          setSelectedSaved(null);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="break-words text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                          <span className={`text-xs ${record.status === "completed" ? "text-emerald-300" : "text-rose-300"}`}>
                            {buildStatusLabel(record.status, locale)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-text-muted">{record.callDate} · {copy.common.documentCount(record.generatedDocs.length || record.selectedDocTypes.length)}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-muted">
                          <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                            {getGenerationModeLabel(record.generationMode, locale)}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        {record.status === "failed" ? (
                          <button
                            type="button"
                            onClick={() => handleRetryRecord(record)}
                            className="rounded-full border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-950/30"
                          >
                            {copy.common.retry}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDeleteHistoryRecord(record.id)}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-text-muted transition hover:bg-white/[0.08] hover:text-white"
                        >
                          {copy.common.delete}
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border-base px-4 py-4 text-sm text-text-muted">
                    {copy.intake.noRecentQueue}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-4 rounded-3xl border border-border-base bg-bg-card p-5">
        <button
          type="button"
          onClick={() => setTemplateOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-text-primary">{copy.intake.templateTitle}</h3>
            <p className="text-xs leading-6 text-text-muted">
              {copy.intake.templateDescription}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-text-muted">
              {availableTemplateSets.length}
            </span>
            <ChevronDown className={`h-4 w-4 text-text-muted transition ${templateOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {templateOpen ? (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveTemplateSet}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-text-secondarytransition-colors hover:bg-white/[0.08] hover:text-white"
              >
                {copy.intake.saveCurrentConfig}
              </button>
            </div>

            {availableTemplateSets.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {availableTemplateSets.map((templateSet) => (
                  <div key={templateSet.id} className="rounded-2xl border border-border-base bg-bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="break-words text-sm font-medium text-white">{templateSet.name}</p>
                        <p className="mt-1 text-xs leading-6 text-text-muted">
                          {templateSet.projectName ?? copy.common.allProjects} · {getGenerationModeLabel(templateSet.generationMode, locale)} · {getCallPresetLabel(templateSet.generationPreset, locale)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplateSet(templateSet.id)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-text-muted transition hover:bg-white/[0.08] hover:text-white"
                      >
                        {copy.common.delete}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {templateSet.selectedDocTypes.map((docType) => (
                        <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-text-secondary">
                          {getCallDocShortLabel(docType, locale)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => applyTemplateSet(templateSet)}
                        className="rounded-full border border-purple-500/20 bg-purple-900/20 px-4 py-2 text-xs font-medium text-purple-200 transition hover:bg-purple-900/30"
                      >
                        {copy.intake.applyThisConfig}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border-base px-4 py-4 text-sm text-text-muted">
                {copy.intake.noTemplateSets}
              </div>
            )}
          </>
        ) : null}
      </div>

      <div className="space-y-4 rounded-3xl border border-border-base bg-bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-text-primary">{copy.intake.generationTitle}</h3>
            <p className="text-xs leading-6 text-text-muted">
              {copy.intake.generationDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-text-secondarytransition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <CircleHelp className="h-4 w-4" />
            {copy.intake.viewGuide}
          </button>
        </div>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-3">
              {generationModeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGenerationMode(option.value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                    generationMode === option.value
                      ? "border-cyan-500/30 bg-cyan-950/20"
                      : "border-border-base bg-bg-surface hover:bg-bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text-primary">{option.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                      generationMode === option.value ? "bg-cyan-900/30 text-cyan-200" : "bg-white/8 text-text-muted"
                    }`}>
                      {generationMode === option.value ? copy.common.active : copy.common.available}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-text-muted">{option.description}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {(
                [
                  ...Object.entries(CALL_DOC_PRESET_DEFINITIONS).map(([preset]) => ({
                    preset: preset as Exclude<CallDocPreset, "custom">,
                    label: getCallPresetLabel(preset as Exclude<CallDocPreset, "custom">, locale),
                    description: getCallPresetDescription(preset as Exclude<CallDocPreset, "custom">, locale),
                  })),
                  {
                    preset: "custom" as const,
                    label: getCallPresetLabel("custom", locale),
                    description: getCallPresetDescription("custom", locale),
                  },
                ] satisfies Array<{ preset: CallDocPreset; label: string; description: string }>
              ).map((preset) => (
                <button
                  key={preset.preset}
                  type="button"
                  onClick={() => applyPreset(preset.preset)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                    generationPreset === preset.preset
                      ? "border-purple-500/30 bg-purple-950/20"
                      : "border-border-base bg-bg-surface hover:bg-bg-card"
                  }`}
                >
                  <div className="text-sm font-medium text-text-primary">{preset.label}</div>
                  <p className="mt-2 text-xs leading-6 text-text-muted">{preset.description}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {Object.values(CALL_DOC_DEFINITIONS).map((doc) => {
                const checked = selectedDocTypes.includes(doc.type);
                const locked = doc.type === "prd";

                return (
                  <button
                    key={doc.type}
                    type="button"
                    onClick={() => toggleDocType(doc.type)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all duration-[150ms] ${
                      checked
                        ? "border-purple-500/30 bg-purple-950/20"
                        : "border-border-base bg-bg-surface hover:bg-bg-card"
                    } ${locked ? "cursor-default" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-text-primary">{getCallDocLabel(doc.type, locale)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                        checked ? "bg-purple-900/30 text-purple-300" : "bg-white/8 text-text-muted"
                      }`}>
                        {locked ? copy.common.required : checked ? copy.common.selected : copy.common.available}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-text-muted">{getCallDocDescription(doc.type, locale)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border-base bg-bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {locale === "ko" ? "현재 구성" : "Current setup"}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
                {generationSummaryItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border-base bg-bg-page px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{item.label}</p>
                    <p
                      className={[
                        "mt-3 inline-flex rounded-full px-3 py-1 text-xs",
                        item.tone === "cyan"
                          ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                          : item.tone === "purple"
                            ? "border border-purple-400/20 bg-purple-400/10 text-purple-100"
                            : "border border-white/10 bg-white/6 text-white/70",
                      ].join(" ")}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border-base bg-bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                {locale === "ko" ? "선택 문서 목록" : "Selected docs"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedDocLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-purple-500/20 bg-purple-950/20 px-3 py-1 text-xs text-purple-200"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-border-base bg-bg-page px-4 py-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    {locale === "ko" ? "고객 문서 분리" : "Client doc split"}
                  </p>
                  <p className="mt-2 text-white">
                    {separateExternalDocs
                      ? locale === "ko"
                        ? "켜짐"
                        : "Enabled"
                      : locale === "ko"
                        ? "꺼짐"
                        : "Disabled"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-base bg-bg-page px-4 py-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    {locale === "ko" ? "비교 기준선" : "Comparison baseline"}
                  </p>
                  <p className="mt-2 break-words text-white">
                    {baselineEntryName
                      ? baselineEntryName
                      : locale === "ko"
                        ? "자동 선택"
                        : "Auto-select"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border-base bg-bg-page px-4 py-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                    {locale === "ko" ? "저장된 템플릿 세트" : "Saved template sets"}
                  </p>
                  <p className="mt-2 text-white">{availableTemplateSets.length}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span>{copy.intake.selectedDocs(selectedDocTypes.length)}</span>
              <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                {getGenerationModeLabel(generationMode, locale)}
              </span>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-text-muted">
                {getCallPresetLabel(generationPreset, locale)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-purple-500/15 bg-purple-950/15 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-white">{copy.intake.startGeneration}</p>
          <p className="mt-1 text-xs leading-6 text-text-secondary">
            {submitStatusText}
          </p>
        </div>
        <button type="button" onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-all duration-[150ms] hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600">
          <Phone className="mr-2 inline h-4 w-4" />{copy.intake.startGeneration}
        </button>
      </div>

      {!displayRecord && history.length === 0 && savedTotalCount === 0 ? (
        <EmptyStateCard
          title={copy.intake.emptyTitle}
          message={copy.intake.emptyMessage}
          actionLabel={copy.intake.emptyAction}
          onAction={() => setGuideOpen(true)}
        />
      ) : null}
    </div>
  );
}
