"use client";

import { CallToPrdNextActionsBar } from "@/features/call-to-prd/components/CallToPrdNextActionsBar";
import { CallToPrdViewerDocResults } from "@/features/call-to-prd/components/CallToPrdViewerDocResults";
import { CallToPrdViewerNextActionsPanel } from "@/features/call-to-prd/components/CallToPrdViewerNextActionsPanel";
import { CallToPrdViewerSavedTree } from "@/features/call-to-prd/components/CallToPrdViewerSavedTree";
import { CallToPrdViewerStatusPanel } from "@/features/call-to-prd/components/CallToPrdViewerStatusPanel";
import type { CallDocType } from "@/lib/call-to-prd/document-config";
import type {
  CallNextActionResponse,
  CallNextActionType,
  CallRecord,
  GeneratedDoc,
} from "@/lib/types/call-to-prd";

export interface CallToPrdViewerProps {
  current: CallRecord | null;
  displayRecord: CallRecord | null;
  hasSupportDocs: boolean;
  displayDocs: GeneratedDoc[];
  activeDocType: CallDocType;
  setActiveDocType: (docType: CallDocType) => void;
  prdView: "merged" | "claude" | "codex" | "diff";
  setPrdView: (view: "merged" | "claude" | "codex" | "diff") => void;
  selectedDocContent: string;
  renderedDocContent: string;
  generationWarnings: string[];
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
  displaySavedEntryName: string | null;
  availableNextActions: Array<[CallNextActionType, { label: string; shortLabel: string; description: string }]>;
  nextActionLoading: CallNextActionType | null;
  nextActionResults: Partial<Record<CallNextActionType, CallNextActionResponse>>;
  activeNextAction: CallNextActionType | null;
  setActiveNextAction: (action: CallNextActionType) => void;
  activeNextActionResult: CallNextActionResponse | null;
  nextActionList: CallNextActionResponse[];
  renderedNextActionContent: string;
  handleRetryRecord: (record: CallRecord) => void;
  handleGenerateNextAction: (actionType: CallNextActionType) => void;
  regenerateSection: (sectionId: string, hint?: string) => Promise<void>;
  exportToObsidian: () => Promise<void>;
  copyGithubIssueDraft: () => Promise<void>;
  downloadCurrentMarkdown: () => void;
  downloadNextActionMarkdown: () => void;
}

export function CallToPrdViewer({
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
  regenerateSection,
  exportToObsidian,
  copyGithubIssueDraft,
  downloadCurrentMarkdown,
  downloadNextActionMarkdown,
}: CallToPrdViewerProps) {
  const openNextAction = (actionType: CallNextActionType) => {
    setNextActionsOpen(true);
    setNextActionContentOpen(true);
    setActiveNextAction(actionType);
  };

  const generateNextActionFromBar = (actionType: CallNextActionType) => {
    openNextAction(actionType);
    handleGenerateNextAction(actionType);
  };

  return (
    <div className="space-y-5">
      <CallToPrdViewerStatusPanel
        current={current}
        hasSupportDocs={hasSupportDocs}
        onRetryRecord={handleRetryRecord}
      />

      <CallToPrdNextActionsBar
        displayRecord={displayRecord}
        nextActionLoading={nextActionLoading}
        nextActionResults={nextActionResults}
        onGenerateNextAction={generateNextActionFromBar}
        onOpenNextAction={openNextAction}
        onExportToObsidian={exportToObsidian}
        onCopyGithubIssueDraft={copyGithubIssueDraft}
      />

      <CallToPrdViewerDocResults
        displayDocs={displayDocs}
        displayRecord={displayRecord}
        activeDocType={activeDocType}
        setActiveDocType={setActiveDocType}
        prdView={prdView}
        setPrdView={setPrdView}
        selectedDocContent={selectedDocContent}
        renderedDocContent={renderedDocContent}
        generationWarnings={generationWarnings}
        docResultsOpen={docResultsOpen}
        setDocResultsOpen={setDocResultsOpen}
        docContentOpen={docContentOpen}
        setDocContentOpen={setDocContentOpen}
        downloadCurrentMarkdown={downloadCurrentMarkdown}
        regenerateSection={regenerateSection}
      />

      <CallToPrdViewerSavedTree
        displaySavedEntryName={displaySavedEntryName}
        displayDocs={displayDocs}
        displayRecord={displayRecord}
        nextActionList={nextActionList}
        savedTreeOpen={savedTreeOpen}
        setSavedTreeOpen={setSavedTreeOpen}
        setDocResultsOpen={setDocResultsOpen}
        setDocContentOpen={setDocContentOpen}
        setActiveDocType={setActiveDocType}
        setPrdView={setPrdView}
        setNextActionsOpen={setNextActionsOpen}
        setNextActionContentOpen={setNextActionContentOpen}
        setActiveNextAction={setActiveNextAction}
      />

      <CallToPrdViewerNextActionsPanel
        displayRecord={displayRecord}
        availableNextActions={availableNextActions}
        nextActionLoading={nextActionLoading}
        nextActionResults={nextActionResults}
        activeNextAction={activeNextAction}
        setActiveNextAction={setActiveNextAction}
        activeNextActionResult={activeNextActionResult}
        renderedNextActionContent={renderedNextActionContent}
        nextActionsOpen={nextActionsOpen}
        setNextActionsOpen={setNextActionsOpen}
        nextActionContentOpen={nextActionContentOpen}
        setNextActionContentOpen={setNextActionContentOpen}
        onGenerateNextAction={generateNextActionFromBar}
        downloadNextActionMarkdown={downloadNextActionMarkdown}
      />
    </div>
  );
}
