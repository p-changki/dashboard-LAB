"use client";

import { CircleHelp, FileAudio, FileText, Phone, Upload } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
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

      {/* 입력 모드 토글 */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("file")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "file" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          <FileAudio className="mr-2 inline h-4 w-4" />{copy.intake.fileMode}
        </button>
        <button type="button" onClick={() => setMode("text")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "text" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          {copy.intake.textMode}
        </button>
      </div>

      {/* 파일 업로드 또는 텍스트 입력 */}
      {mode === "file" ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-[#1e1e1e] p-10 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-[#242424]">
          <Upload className="h-8 w-8 text-gray-500" />
          <p className="text-sm text-gray-400">{file ? file.name : copy.intake.filePlaceholder}</p>
          <input type="file" accept=".m4a,.mp3,.wav,.webm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      ) : (
        <textarea
          value={directText}
          onChange={(e) => setDirectText(e.target.value)}
          placeholder={copy.intake.textPlaceholder}
          className="w-full rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
          rows={8}
        />
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-[#1e1e1e] p-6 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-[#242424]">
        <FileText className="h-6 w-6 text-gray-500" />
        <p className="text-sm text-gray-400">
          {pdfFile ? copy.intake.pdfAttached(pdfFile.name) : copy.intake.pdfPlaceholder}
        </p>
        <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
      </label>

      {/* 메타 정보 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select
          value={projectPath}
          onChange={(event) => handleProjectSelect(event.target.value)}
          className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
        >
          <option value="">{copy.intake.projectSelectPlaceholder}</option>
          {projects.map((project) => (
            <option key={project.path} value={project.path}>
              {project.path === currentProjectPath ? `${project.name} (${copy.common.currentWorkspace})` : project.name}
            </option>
          ))}
        </select>
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={copy.intake.projectNamePlaceholder} className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={copy.intake.customerNamePlaceholder} className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
        <input value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder={copy.intake.additionalContextPlaceholder} className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
      </div>

      <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#f0f0f0]">{copy.intake.structuringTitle}</h3>
            <p className="mt-1 text-xs leading-6 text-gray-500">
              {copy.intake.structuringDescription}
            </p>
          </div>
          <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-[11px] text-cyan-200">
            {getCallInputKindLabel(inputKind, locale)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2">
            <span className="text-xs text-gray-500">{copy.intake.inputKind}</span>
            <select
              value={inputKind}
              onChange={(event) => setInputKind(event.target.value as CallInputKind)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_INPUT_KINDS.map((value) => (
                <option key={value} value={value}>{getCallInputKindLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">{copy.intake.severity}</span>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as CallSeverity)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_SEVERITIES.map((value) => (
                <option key={value} value={value}>{getCallSeverityLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">{copy.intake.impact}</span>
            <select
              value={customerImpact}
              onChange={(event) => setCustomerImpact(event.target.value as CallCustomerImpact)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_CUSTOMER_IMPACTS.map((value) => (
                <option key={value} value={value}>{getCallCustomerImpactLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">{copy.intake.urgency}</span>
            <select
              value={urgency}
              onChange={(event) => setUrgency(event.target.value as CallUrgency)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_URGENCY_LEVELS.map((value) => (
                <option key={value} value={value}>{getCallUrgencyLabel(value, locale)}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">{copy.intake.reproducibility}</span>
            <select
              value={reproducibility}
              onChange={(event) => setReproducibility(event.target.value as CallReproducibility)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_REPRODUCIBILITY_STATES.map((value) => (
                <option key={value} value={value}>{getCallReproducibilityLabel(value, locale)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <input
            value={currentWorkaround}
            onChange={(event) => setCurrentWorkaround(event.target.value)}
            placeholder={copy.intake.workaroundPlaceholder}
            className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
          />

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#151515] px-4 py-3 text-sm text-gray-300">
            <div>
              <p className="font-medium text-[#f0f0f0]">{copy.intake.externalDocsTitle}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{copy.intake.externalDocsDescription}</p>
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
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#f0f0f0]">{selectedProject.name}</span>
            <span className="rounded-full bg-purple-900/25 px-2 py-0.5 text-[11px] text-purple-200">{selectedProject.type}</span>
            {selectedProject.techStack.slice(0, 4).map((stack) => (
              <span key={stack} className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-gray-300">
                {stack}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">{selectedProject.path}</p>
          {selectedProject.path === currentProjectPath && (
            <p className="mt-2 text-xs font-medium text-purple-200">{copy.intake.currentWorkspaceHint}</p>
          )}
          <p className="mt-2 text-xs leading-6 text-gray-400">
            {copy.intake.selectedProjectPrompt}
          </p>
        </div>
      )}

      {needsChangeBaseline ? (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">{copy.intake.baselineTitle}</h3>
              <p className="mt-1 text-xs leading-6 text-gray-500">
                {copy.intake.baselineDescription}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={baselineEntryName}
              onChange={(event) => setBaselineEntryName(event.target.value)}
              className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
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
              className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-xs text-gray-300 transition hover:bg-[#242424]"
            >
              {copy.intake.baselineAutoButton}
            </button>
          </div>
        </div>
      ) : null}

      {(activeQueue.length > 0 || recentQueue.length > 0) && (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">{copy.intake.queueTitle}</h3>
              <p className="mt-1 text-xs leading-6 text-gray-500">
                {copy.intake.queueDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-purple-900/20 px-2 py-0.5 text-purple-200">{copy.intake.inProgress} {activeQueue.length}</span>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">{copy.intake.recentComplete} {recentQueue.length}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{copy.intake.inProgress}</p>
              {activeQueue.length > 0 ? activeQueue.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    setSelectedHistory(record);
                    setSelectedSaved(null);
                  }}
                  className="w-full rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 text-left transition hover:bg-[#202020]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                    <span className="text-xs text-purple-300">{buildStatusLabel(record.status, locale)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {record.docGenerationProgress ?? buildStatusLabel(record.status, locale)}
                  </p>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
                  {copy.intake.noActiveQueue}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{copy.intake.recentComplete}</p>
              {recentQueue.length > 0 ? recentQueue.map((record) => (
                <div
                  key={record.id}
                  className="w-full rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 transition hover:bg-[#202020]"
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
                        <span className="truncate text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                        <span className={`text-xs ${record.status === "completed" ? "text-emerald-300" : "text-rose-300"}`}>
                          {buildStatusLabel(record.status, locale)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{record.callDate} · {copy.common.documentCount(record.generatedDocs.length || record.selectedDocTypes.length)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
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
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        {copy.common.delete}
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
                  {copy.intake.noRecentQueue}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#f0f0f0]">{copy.intake.templateTitle}</h3>
            <p className="text-xs leading-6 text-gray-500">
              {copy.intake.templateDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveTemplateSet}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            {copy.intake.saveCurrentConfig}
          </button>
        </div>

        {availableTemplateSets.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {availableTemplateSets.map((templateSet) => (
              <div key={templateSet.id} className="rounded-2xl border border-white/8 bg-[#151515] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{templateSet.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {templateSet.projectName ?? copy.common.allProjects} · {getGenerationModeLabel(templateSet.generationMode, locale)} · {getCallPresetLabel(templateSet.generationPreset, locale)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplateSet(templateSet.id)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {copy.common.delete}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {templateSet.selectedDocTypes.map((docType) => (
                    <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-gray-300">
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
          <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
            {copy.intake.noTemplateSets}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#f0f0f0]">{copy.intake.generationTitle}</h3>
            <p className="text-xs leading-6 text-gray-500">
              {copy.intake.generationDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <CircleHelp className="h-4 w-4" />
            {copy.intake.viewGuide}
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {generationModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGenerationMode(option.value)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                generationMode === option.value
                  ? "border-cyan-500/30 bg-cyan-950/20"
                  : "border-white/8 bg-[#151515] hover:bg-[#202020]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#f0f0f0]">{option.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  generationMode === option.value ? "bg-cyan-900/30 text-cyan-200" : "bg-white/8 text-gray-500"
                }`}>
                  {generationMode === option.value ? copy.common.active : copy.common.available}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-gray-500">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
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
                  : "border-white/8 bg-[#151515] hover:bg-[#202020]"
              }`}
            >
              <div className="text-sm font-medium text-[#f0f0f0]">{preset.label}</div>
              <p className="mt-2 text-xs leading-6 text-gray-500">{preset.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                    : "border-white/8 bg-[#151515] hover:bg-[#202020]"
                } ${locked ? "cursor-default" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#f0f0f0]">{getCallDocLabel(doc.type, locale)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                    checked ? "bg-purple-900/30 text-purple-300" : "bg-white/8 text-gray-500"
                  }`}>
                    {locked ? copy.common.required : checked ? copy.common.selected : copy.common.available}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-gray-500">{getCallDocDescription(doc.type, locale)}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{copy.intake.selectedDocs(selectedDocTypes.length)}</span>
          <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
            {getGenerationModeLabel(generationMode, locale)}
          </span>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">
            {getCallPresetLabel(generationPreset, locale)}
          </span>
        </div>
      </div>

      <button type="button" onClick={handleSubmit}
        disabled={mode === "file" ? !file : !directText.trim()}
        className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-all duration-[150ms] hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600">
        <Phone className="mr-2 inline h-4 w-4" />{copy.intake.startGeneration}
      </button>

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
