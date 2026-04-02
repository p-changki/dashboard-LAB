"use client";

import { ChevronDown, Download, FileText, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLocale } from "@/components/layout/LocaleProvider";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { CALL_DOC_DEFINITIONS, type CallDocType } from "@/lib/call-to-prd/document-config";
import type {
  CallNextActionResponse,
  CallNextActionType,
  CallRecord,
  GeneratedDoc,
} from "@/lib/types/call-to-prd";
import {
  Step,
  buildStatusLabel,
  markdownComponents,
  buildGenerationStepLabel,
  formatCallToPrdFailureMessage,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";
import {
  getCallDocLabel,
  getCallDocShortLabel,
  getCallNextActionDescription,
  getCallNextActionLabel,
  getCallNextActionShortLabel,
  formatCallToPrdProgressMessage,
  getCallToPrdCopy,
  formatCallToPrdWarningMessage,
} from "@/features/call-to-prd/copy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallToPrdViewerProps {
  // Current record
  current: CallRecord | null;
  displayRecord: CallRecord | null;
  hasSupportDocs: boolean;

  // Doc results
  displayDocs: GeneratedDoc[];
  activeDocType: CallDocType;
  setActiveDocType: (docType: CallDocType) => void;
  prdView: "merged" | "claude" | "codex" | "diff";
  setPrdView: (view: "merged" | "claude" | "codex" | "diff") => void;
  selectedDocContent: string;
  renderedDocContent: string;
  generationWarnings: string[];

  // Collapsible state
  docResultsOpen: boolean;
  setDocResultsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  docContentOpen: boolean;
  setDocContentOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  savedTreeOpen: boolean;
  setSavedTreeOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  nextActionsOpen: boolean;
  setNextActionsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  nextActionContentOpen: boolean;
  setNextActionContentOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Saved tree
  displaySavedEntryName: string | null;

  // Next actions
  availableNextActions: Array<[CallNextActionType, { label: string; shortLabel: string; description: string }]>;
  nextActionLoading: CallNextActionType | null;
  nextActionResults: Partial<Record<CallNextActionType, CallNextActionResponse>>;
  activeNextAction: CallNextActionType | null;
  setActiveNextAction: (action: CallNextActionType) => void;
  activeNextActionResult: CallNextActionResponse | null;
  nextActionList: CallNextActionResponse[];
  renderedNextActionContent: string;

  // Handlers
  handleRetryRecord: (record: CallRecord) => void;
  handleGenerateNextAction: (actionType: CallNextActionType) => void;
  downloadCurrentMarkdown: () => void;
  downloadNextActionMarkdown: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CallToPrdViewer(props: CallToPrdViewerProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const {
    current,
    displayRecord,
    hasSupportDocs,
    displayDocs,
    activeDocType,
    setActiveDocType,
    prdView,
    setPrdView,
    selectedDocContent,
    renderedDocContent,
    generationWarnings,
    docResultsOpen,
    setDocResultsOpen,
    docContentOpen,
    setDocContentOpen,
    savedTreeOpen,
    setSavedTreeOpen,
    nextActionsOpen,
    setNextActionsOpen,
    nextActionContentOpen,
    setNextActionContentOpen,
    displaySavedEntryName,
    availableNextActions,
    nextActionLoading,
    nextActionResults,
    activeNextAction,
    setActiveNextAction,
    activeNextActionResult,
    nextActionList,
    renderedNextActionContent,
    handleRetryRecord,
    handleGenerateNextAction,
    downloadCurrentMarkdown,
    downloadNextActionMarkdown,
  } = props;
  const currentStatusLabel = current ? buildStatusLabel(current.status, locale) : "";
  const currentProgressLabel =
    current ? formatCallToPrdProgressMessage(current.docGenerationProgress, locale) : null;
  const currentStatusClassName =
    current?.status === "completed"
      ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-200"
      : current?.status === "failed"
        ? "border-rose-500/20 bg-rose-950/20 text-rose-200"
        : "border-cyan-500/20 bg-cyan-950/20 text-cyan-200";

  return (
    <div className="space-y-5">
      {/* 진행 상태 */}
      {current && current.status !== "failed" && (
        <div className="rounded-3xl border border-border-base bg-bg-card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {current?.status === "completed"
                  ? copy.viewer.completed
                  : currentProgressLabel ?? buildGenerationStepLabel(current.generationMode, locale)}
              </p>
              <p className="mt-1 text-xs leading-6 text-text-muted">
                {buildGenerationStepLabel(current.generationMode, locale)}
              </p>
            </div>
            <span className={["rounded-full border px-3 py-1 text-xs", currentStatusClassName].join(" ")}>
              {currentStatusLabel}
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            <Step done={true} label={copy.viewer.uploadDone} />
            <Step done={!["uploading"].includes(current.status)} active={current.status === "transcribing"} label={copy.viewer.audioToText} />
            <Step done={!["uploading", "transcribing"].includes(current.status)} active={current.status === "extracting-pdf"} label={copy.viewer.pdfExtract} />
            <Step done={!["uploading", "transcribing", "extracting-pdf"].includes(current.status)} active={current.status === "analyzing-pdf"} label={copy.viewer.pdfAnalyze} />
            <Step
              done={!["uploading", "transcribing", "extracting-pdf", "analyzing-pdf"].includes(current.status)}
              active={current.status === "analyzing"}
              label={buildGenerationStepLabel(current.generationMode, locale)}
            />
            {current.generationMode === "dual" ? (
              <Step done={!["uploading", "transcribing", "extracting-pdf", "analyzing-pdf", "analyzing"].includes(current.status)} active={current.status === "merging"} label={copy.viewer.dualMerge} />
            ) : null}
            {hasSupportDocs ? (
              <Step
                done={current.status === "completed"}
                active={current.status === "generating-docs"}
                label={formatCallToPrdProgressMessage(current.docGenerationProgress, locale) ?? copy.viewer.workingDocs}
              />
            ) : null}
            <Step done={current.status === "completed"} label={copy.viewer.completed} />
          </div>
        </div>
      )}

      {current?.status === "failed" && (
        <ErrorCard
          title={copy.viewer.failedTitle}
          message={formatCallToPrdFailureMessage(current.error, locale)}
          actionLabel={copy.common.retry}
          onAction={() => handleRetryRecord(current)}
        />
      )}

      {/* 문서 결과 */}
      {displayDocs.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setDocResultsOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
          >
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{copy.viewer.docResultsTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                {copy.viewer.docResultsDescription}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${docResultsOpen ? "rotate-180" : ""}`} />
          </button>

          {docResultsOpen ? (
            <div className="grid gap-4 rounded-2xl border border-border-base bg-bg-card p-5 2xl:grid-cols-[minmax(280px,0.74fr)_minmax(0,1.26fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-base bg-bg-surface p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.viewer.docResultsTitle}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {displayDocs.map((doc) => (
                      <button
                        key={doc.type}
                        type="button"
                        onClick={() => setActiveDocType(doc.type)}
                        className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                          activeDocType === doc.type
                            ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                            : "border border-border-base bg-bg-page text-text-muted"
                        }`}
                      >
                        {getCallDocShortLabel(doc.type, locale)}
                      </button>
                    ))}
                  </div>
                  {activeDocType === "prd" && (displayRecord?.claudePrd || displayRecord?.codexPrd) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["merged", "claude", "codex", "diff"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setPrdView(tab)}
                          className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                            prdView === tab
                              ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                              : "border border-border-base bg-bg-page text-text-muted"
                          }`}
                        >
                          {{ merged: copy.viewer.mergedPrd, claude: "Claude", codex: "Codex", diff: copy.viewer.diffReport }[tab]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border-base bg-bg-surface p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{getCallDocLabel(activeDocType, locale)}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {activeDocType === "prd"
                      ? ({
                          merged: copy.viewer.mergedPrd,
                          claude: "Claude",
                          codex: "Codex",
                          diff: copy.viewer.diffReport,
                        }[prdView])
                      : getCallDocLabel(activeDocType, locale)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigator.clipboard.writeText(selectedDocContent)}
                      className="rounded-xl border border-border-base bg-bg-page px-4 py-2 text-sm text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover">
                      {copy.viewer.copyCurrentDoc}
                    </button>
                    <button type="button" onClick={downloadCurrentMarkdown}
                      className="inline-flex items-center rounded-xl border border-border-base bg-bg-page px-4 py-2 text-sm text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover">
                      <Download className="mr-1 h-4 w-4" />{copy.viewer.downloadMarkdown}
                    </button>
                  </div>
                </div>

                {generationWarnings.length > 0 ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-sm leading-6 text-amber-200">
                    {copy.viewer.warningPrefix} {generationWarnings.map((warning) => formatCallToPrdWarningMessage(warning, locale)).join(" / ")}
                  </div>
                ) : null}

                {displayRecord?.baselineTitle ? (
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm leading-6 text-cyan-100">
                    {copy.viewer.baselinePrefix} {displayRecord.baselineTitle}
                    {displayRecord.baselineEntryName ? ` (${displayRecord.baselineEntryName})` : ""}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setDocContentOpen((currentOpen) => !currentOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-surface px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {getCallDocLabel(activeDocType, locale)}
                      {activeDocType === "prd" ? ` · ${{
                        merged: copy.viewer.mergedPrd,
                        claude: "Claude",
                        codex: "Codex",
                        diff: copy.viewer.diffReport,
                      }[prdView]}` : ""}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-text-muted">
                      {docContentOpen ? copy.viewer.collapseBody : copy.viewer.expandBody}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${docContentOpen ? "rotate-180" : ""}`} />
                </button>

                {docContentOpen ? (
                  <div className="max-w-none rounded-[28px] border border-border-base bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-6 py-6 text-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:px-8 md:py-8">
                    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                      {renderedDocContent}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {(displaySavedEntryName || nextActionList.length > 0) ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSavedTreeOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
          >
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{copy.viewer.savedTreeTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                {copy.viewer.savedTreeDescription}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${savedTreeOpen ? "rotate-180" : ""}`} />
          </button>

          {savedTreeOpen ? (
            <div className="rounded-2xl border border-border-base bg-bg-card p-5">
              <div className="rounded-2xl border border-border-base bg-bg-surface p-4 font-mono text-xs text-text-secondary">
                <div className="flex items-center gap-2 text-sm text-white">
                  <FolderOpen className="h-4 w-4 text-purple-400" />
                  <span>{displaySavedEntryName ?? copy.viewer.currentBundle}/</span>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-text-muted">{copy.viewer.docResultsTitle}</div>
                    {displayDocs.map((doc) => (
                      <button
                        key={`tree-doc-${doc.type}`}
                        type="button"
                        onClick={() => {
                          setDocResultsOpen(true);
                          setDocContentOpen(true);
                          setActiveDocType(doc.type);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                      >
                        <FileText className="h-4 w-4 text-text-muted" />
                        <span>{CALL_DOC_DEFINITIONS[doc.type].fileName}</span>
                      </button>
                    ))}

                    {(displayRecord?.claudePrd || displayRecord?.codexPrd || displayRecord?.diffReport) ? (
                      <div className="space-y-2 pt-2">
                        <div className="text-text-muted">{copy.viewer.artifacts}</div>
                        {displayRecord?.claudePrd ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDocResultsOpen(true);
                              setDocContentOpen(true);
                              setActiveDocType("prd");
                              setPrdView("claude");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                          >
                            <FileText className="h-4 w-4 text-text-muted" />
                            <span>90-claude-prd.md</span>
                          </button>
                        ) : null}
                        {displayRecord?.codexPrd ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDocResultsOpen(true);
                              setDocContentOpen(true);
                              setActiveDocType("prd");
                              setPrdView("codex");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                          >
                            <FileText className="h-4 w-4 text-text-muted" />
                            <span>91-codex-prd.md</span>
                          </button>
                        ) : null}
                        {displayRecord?.diffReport ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDocResultsOpen(true);
                              setDocContentOpen(true);
                              setActiveDocType("prd");
                              setPrdView("diff");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                          >
                            <FileText className="h-4 w-4 text-text-muted" />
                            <span>92-diff-report.md</span>
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="text-text-muted">{copy.viewer.nextActions}</div>
                    {nextActionList.length > 0 ? nextActionList.map((nextAction) => (
                      <button
                        key={`tree-next-${nextAction.actionType}`}
                        type="button"
                        onClick={() => {
                          setNextActionsOpen(true);
                          setNextActionContentOpen(true);
                          setActiveNextAction(nextAction.actionType);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                      >
                        <FileText className="h-4 w-4 text-text-muted" />
                        <span>{nextAction.fileName?.split("/").pop() ?? `${nextAction.actionType}.md`}</span>
                      </button>
                    )) : (
                      <div className="rounded-xl border border-dashed border-border-base px-3 py-2 text-text-muted">
                        {copy.viewer.noSavedNextActions}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {displayRecord?.prdMarkdown ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setNextActionsOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
          >
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{copy.viewer.nextActionsTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                {copy.viewer.nextActionsDescription}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${nextActionsOpen ? "rotate-180" : ""}`} />
          </button>

          {nextActionsOpen ? (
            <div className="grid gap-4 rounded-2xl border border-border-base bg-bg-card p-5 2xl:grid-cols-[minmax(280px,0.74fr)_minmax(0,1.26fr)]">
              <div className="space-y-4">
                <div className="grid gap-3">
                  {availableNextActions.map(([actionType]) => {
                    const generated = Boolean(nextActionResults[actionType]);
                    const loading = nextActionLoading === actionType;

                    return (
                      <button
                        key={actionType}
                        type="button"
                        onClick={() => void handleGenerateNextAction(actionType)}
                        disabled={Boolean(nextActionLoading)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                          activeNextAction === actionType
                            ? "border-cyan-500/30 bg-cyan-950/20"
                            : "border-border-base bg-bg-surface hover:bg-bg-card"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-text-primary">{getCallNextActionLabel(actionType, locale)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                            loading
                              ? "bg-amber-900/25 text-amber-200"
                              : generated
                                ? "bg-cyan-900/25 text-cyan-200"
                                : "bg-white/8 text-text-muted"
                          }`}>
                            {loading ? copy.common.loading : generated ? copy.common.ready : copy.common.create}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-6 text-text-muted">{getCallNextActionDescription(actionType, locale)}</p>
                      </button>
                    );
                  })}
                </div>

                {activeNextActionResult ? (
                  <div className="rounded-2xl border border-border-base bg-bg-surface p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.viewer.nextActionsTitle}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableNextActions
                        .filter(([actionType]) => Boolean(nextActionResults[actionType]))
                        .map(([actionType]) => (
                          <button
                            key={actionType}
                            type="button"
                            onClick={() => setActiveNextAction(actionType)}
                            className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                              activeNextAction === actionType
                                ? "border border-cyan-500/20 bg-cyan-900/30 text-cyan-200"
                                : "border border-border-base bg-bg-page text-text-muted"
                            }`}
                          >
                            {getCallNextActionShortLabel(actionType, locale)}
                          </button>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(activeNextActionResult.markdown)}
                        className="rounded-xl border border-border-base bg-bg-page px-4 py-2 text-sm text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover"
                      >
                        {copy.viewer.actionDraftCopy}
                      </button>
                      <button
                        type="button"
                        onClick={downloadNextActionMarkdown}
                        className="inline-flex items-center rounded-xl border border-border-base bg-bg-page px-4 py-2 text-sm text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        {copy.viewer.actionDraftDownload}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {activeNextActionResult ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setNextActionContentOpen((currentOpen) => !currentOpen)}
                    className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-surface px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card"
                  >
                    <div>
                      <div className="text-sm font-medium text-text-primary">{activeNextActionResult.title}</div>
                      <p className="mt-1 text-xs leading-5 text-text-muted">
                        {nextActionContentOpen ? copy.viewer.collapseDraft : copy.viewer.expandDraft}
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${nextActionContentOpen ? "rotate-180" : ""}`} />
                  </button>

                  {nextActionContentOpen ? (
                    <div className="max-w-none rounded-[28px] border border-border-base bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-6 py-6 text-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:px-8 md:py-8">
                      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                        {renderedNextActionContent}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-base px-4 py-4 text-sm text-text-muted">
                  {copy.viewer.noActionDraftYet}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
