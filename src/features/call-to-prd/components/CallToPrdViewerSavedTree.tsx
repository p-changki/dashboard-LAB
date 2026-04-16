"use client";

import { ChevronDown, FileText, FolderOpen } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { CALL_DOC_DEFINITIONS, type CallDocType } from "@/lib/call-to-prd/document-config";
import type { CallNextActionResponse, CallNextActionType, CallRecord, GeneratedDoc } from "@/lib/types/call-to-prd";
import { getCallToPrdCopy } from "@/features/call-to-prd/copy";

interface CallToPrdViewerSavedTreeProps {
  displaySavedEntryName: string | null;
  displayDocs: GeneratedDoc[];
  displayRecord: CallRecord | null;
  nextActionList: CallNextActionResponse[];
  savedTreeOpen: boolean;
  setSavedTreeOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setDocResultsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setDocContentOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setActiveDocType: (docType: CallDocType) => void;
  setPrdView: (view: "merged" | "claude" | "codex" | "diff") => void;
  setNextActionsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setNextActionContentOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setActiveNextAction: (action: CallNextActionType) => void;
}

export function CallToPrdViewerSavedTree({
  displaySavedEntryName,
  displayDocs,
  displayRecord,
  nextActionList,
  savedTreeOpen,
  setSavedTreeOpen,
  setDocResultsOpen,
  setDocContentOpen,
  setActiveDocType,
  setPrdView,
  setNextActionsOpen,
  setNextActionContentOpen,
  setActiveNextAction,
}: CallToPrdViewerSavedTreeProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);

  if (!displaySavedEntryName && nextActionList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setSavedTreeOpen((currentOpen) => !currentOpen)}
        className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
      >
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{copy.viewer.savedTreeTitle}</h3>
          <p className="mt-1 text-xs leading-5 text-text-muted">{copy.viewer.savedTreeDescription}</p>
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
                      <ArtifactButton
                        fileName="90-claude-prd.md"
                        onClick={() => {
                          setDocResultsOpen(true);
                          setDocContentOpen(true);
                          setActiveDocType("prd");
                          setPrdView("claude");
                        }}
                      />
                    ) : null}
                    {displayRecord?.codexPrd ? (
                      <ArtifactButton
                        fileName="91-codex-prd.md"
                        onClick={() => {
                          setDocResultsOpen(true);
                          setDocContentOpen(true);
                          setActiveDocType("prd");
                          setPrdView("codex");
                        }}
                      />
                    ) : null}
                    {displayRecord?.diffReport ? (
                      <ArtifactButton
                        fileName="92-diff-report.md"
                        onClick={() => {
                          setDocResultsOpen(true);
                          setDocContentOpen(true);
                          setActiveDocType("prd");
                          setPrdView("diff");
                        }}
                      />
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
  );
}

function ArtifactButton({
  fileName,
  onClick,
}: {
  fileName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
    >
      <FileText className="h-4 w-4 text-text-muted" />
      <span>{fileName}</span>
    </button>
  );
}
