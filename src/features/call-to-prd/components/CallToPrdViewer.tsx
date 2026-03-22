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
  getCallToPrdCopy,
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

  return (
    <div className="space-y-5">
      {/* 진행 상태 */}
      {current && current.status !== "failed" && (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 space-y-3">
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
          {hasSupportDocs && (
            <Step
              done={current.status === "completed"}
              active={current.status === "generating-docs"}
              label={current.docGenerationProgress ?? copy.viewer.workingDocs}
            />
          )}
          <Step done={current.status === "completed"} label={copy.viewer.completed} />
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
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div>
              <h3 className="text-lg font-semibold text-[#f0f0f0]">{copy.viewer.docResultsTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {copy.viewer.docResultsDescription}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${docResultsOpen ? "rotate-180" : ""}`} />
          </button>

          {docResultsOpen ? (
            <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {displayDocs.map((doc) => (
                    <button
                      key={doc.type}
                      type="button"
                      onClick={() => setActiveDocType(doc.type)}
                      className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                        activeDocType === doc.type
                          ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                          : "border border-white/8 bg-[#151515] text-gray-400"
                      }`}
                    >
                      {getCallDocShortLabel(doc.type, locale)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => navigator.clipboard.writeText(selectedDocContent)}
                    className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]">
                    {copy.viewer.copyCurrentDoc}
                  </button>
                  <button type="button" onClick={downloadCurrentMarkdown}
                    className="inline-flex items-center rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]">
                    <Download className="mr-1 h-4 w-4" />{copy.viewer.downloadMarkdown}
                  </button>
                </div>
              </div>

              {activeDocType === "prd" && (displayRecord?.claudePrd || displayRecord?.codexPrd) && (
                <div className="flex flex-wrap gap-2">
                  {(["merged", "claude", "codex", "diff"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPrdView(tab)}
                      className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                        prdView === tab
                          ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                          : "border border-white/8 bg-[#151515] text-gray-400"
                      }`}
                    >
                      {{ merged: copy.viewer.mergedPrd, claude: "Claude", codex: "Codex", diff: copy.viewer.diffReport }[tab]}
                    </button>
                  ))}
                </div>
              )}

              {generationWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                  {copy.viewer.warningPrefix} {generationWarnings.join(" / ")}
                </div>
              )}

              {displayRecord?.baselineTitle ? (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
                  {copy.viewer.baselinePrefix} {displayRecord.baselineTitle}
                  {displayRecord.baselineEntryName ? ` (${displayRecord.baselineEntryName})` : ""}
                </div>
              ) : null}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setDocContentOpen((currentOpen) => !currentOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#202020]"
                >
                  <div>
                    <div className="text-sm font-medium text-[#f0f0f0]">
                      {getCallDocLabel(activeDocType, locale)}
                      {activeDocType === "prd" ? ` · ${{
                        merged: copy.viewer.mergedPrd,
                        claude: "Claude",
                        codex: "Codex",
                        diff: copy.viewer.diffReport,
                      }[prdView]}` : ""}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {docContentOpen ? copy.viewer.collapseBody : copy.viewer.expandBody}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${docContentOpen ? "rotate-180" : ""}`} />
                </button>

                {docContentOpen ? (
                  <div className="max-w-none rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-7 py-7 text-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:px-8 md:py-8">
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
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div>
              <h3 className="text-lg font-semibold text-[#f0f0f0]">{copy.viewer.savedTreeTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {copy.viewer.savedTreeDescription}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${savedTreeOpen ? "rotate-180" : ""}`} />
          </button>

          {savedTreeOpen ? (
            <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
              <div className="rounded-2xl border border-white/8 bg-[#151515] p-4 font-mono text-xs text-gray-300">
                <div className="flex items-center gap-2 text-sm text-white">
                  <FolderOpen className="h-4 w-4 text-purple-400" />
                  <span>{displaySavedEntryName ?? copy.viewer.currentBundle}/</span>
                </div>

                <div className="mt-3 space-y-2 pl-4">
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
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span>{CALL_DOC_DEFINITIONS[doc.type].fileName}</span>
                    </button>
                  ))}

                  {(displayRecord?.claudePrd || displayRecord?.codexPrd || displayRecord?.diffReport) ? (
                    <div className="space-y-2 pl-4">
                      <div className="text-gray-500">{copy.viewer.artifacts}</div>
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
                          <FileText className="h-4 w-4 text-gray-500" />
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
                          <FileText className="h-4 w-4 text-gray-500" />
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
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>92-diff-report.md</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2 pl-4">
                    <div className="text-gray-500">{copy.viewer.nextActions}</div>
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
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{nextAction.fileName?.split("/").pop() ?? `${nextAction.actionType}.md`}</span>
                      </button>
                    )) : (
                      <div className="rounded-xl border border-dashed border-white/8 px-3 py-2 text-gray-500">
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
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div>
              <h3 className="text-lg font-semibold text-[#f0f0f0]">{copy.viewer.nextActionsTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {copy.viewer.nextActionsDescription}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${nextActionsOpen ? "rotate-180" : ""}`} />
          </button>

          {nextActionsOpen ? (
            <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
              <div className="grid gap-3 xl:grid-cols-3">
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
                          : "border-white/8 bg-[#151515] hover:bg-[#202020]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#f0f0f0]">{getCallNextActionLabel(actionType, locale)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                          loading
                            ? "bg-amber-900/25 text-amber-200"
                            : generated
                              ? "bg-cyan-900/25 text-cyan-200"
                              : "bg-white/8 text-gray-500"
                        }`}>
                          {loading ? copy.common.loading : generated ? copy.common.ready : copy.common.create}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-gray-500">{getCallNextActionDescription(actionType, locale)}</p>
                    </button>
                  );
                })}
              </div>

              {activeNextActionResult ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
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
                                : "border border-white/8 bg-[#151515] text-gray-400"
                            }`}
                          >
                            {getCallNextActionShortLabel(actionType, locale)}
                          </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(activeNextActionResult.markdown)}
                        className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]"
                      >
                        {copy.viewer.actionDraftCopy}
                      </button>
                      <button
                        type="button"
                        onClick={downloadNextActionMarkdown}
                        className="inline-flex items-center rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        {copy.viewer.actionDraftDownload}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setNextActionContentOpen((currentOpen) => !currentOpen)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#202020]"
                    >
                      <div>
                        <div className="text-sm font-medium text-[#f0f0f0]">{activeNextActionResult.title}</div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {nextActionContentOpen ? copy.viewer.collapseDraft : copy.viewer.expandDraft}
                        </p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${nextActionContentOpen ? "rotate-180" : ""}`} />
                    </button>

                    {nextActionContentOpen ? (
                      <div className="max-w-none rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-7 py-7 text-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:px-8 md:py-8">
                        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                          {renderedNextActionContent}
                        </ReactMarkdown>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
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
