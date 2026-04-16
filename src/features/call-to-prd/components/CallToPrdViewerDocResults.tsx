"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLocale } from "@/components/layout/LocaleProvider";
import { markdownComponents } from "@/features/call-to-prd/components/CallToPrdMarkdown";
import { CallToPrdViewerCard } from "@/features/call-to-prd/components/CallToPrdViewerCard";
import {
  formatCallToPrdWarningMessage,
  getCallDocLabel,
  getCallDocShortLabel,
  getCallToPrdCopy,
} from "@/features/call-to-prd/copy";
import type { CallDocType } from "@/lib/call-to-prd/document-config";
import { splitMarkdownIntoSections } from "@/lib/call-to-prd/prd-markdown-formatter";
import type { GeneratedDoc, CallRecord } from "@/lib/types/call-to-prd";

interface CallToPrdViewerDocResultsProps {
  displayDocs: GeneratedDoc[];
  displayRecord: CallRecord | null;
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
  downloadCurrentMarkdown: () => void;
  regenerateSection: (sectionId: string, hint?: string) => Promise<void>;
}

export function CallToPrdViewerDocResults({
  displayDocs,
  displayRecord,
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
  downloadCurrentMarkdown,
  regenerateSection,
}: CallToPrdViewerDocResultsProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const docSections = useMemo(
    () => splitMarkdownIntoSections(selectedDocContent),
    [selectedDocContent],
  );
  const canRegenerateSections = Boolean(displayRecord?.savedEntryName)
    && (activeDocType !== "prd" || prdView === "merged");

  if (displayDocs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setDocResultsOpen((currentOpen) => !currentOpen)}
        className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
      >
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{copy.viewer.docResultsTitle}</h3>
          <p className="mt-1 text-xs leading-5 text-text-muted">{copy.viewer.docResultsDescription}</p>
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
                      {{
                        merged: copy.viewer.mergedPrd,
                        claude: "Claude",
                        codex: "Codex",
                        diff: copy.viewer.diffReport,
                      }[tab]}
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
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(selectedDocContent)}
                  className="rounded-xl border border-border-base bg-bg-page px-4 py-2 text-sm text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover"
                >
                  {copy.viewer.copyCurrentDoc}
                </button>
                <button
                  type="button"
                  onClick={downloadCurrentMarkdown}
                  className="inline-flex items-center rounded-xl border border-border-base bg-bg-page px-4 py-2 text-sm text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover"
                >
                  <Download className="mr-1 h-4 w-4" />
                  {copy.viewer.downloadMarkdown}
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
                  {activeDocType === "prd"
                    ? ` · ${{
                        merged: copy.viewer.mergedPrd,
                        claude: "Claude",
                        codex: "Codex",
                        diff: copy.viewer.diffReport,
                      }[prdView]}`
                    : ""}
                </div>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  {docContentOpen ? copy.viewer.collapseBody : copy.viewer.expandBody}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${docContentOpen ? "rotate-180" : ""}`} />
            </button>

            {docContentOpen ? (
              docSections.length > 1 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border-base bg-bg-surface px-4 py-3 text-sm leading-6 text-text-secondary">
                    <p className="font-medium text-white">{copy.viewer.sectionCardsTitle}</p>
                    <p className="mt-1 text-xs leading-6 text-text-muted">{copy.viewer.sectionCardsDescription}</p>
                  </div>
                  {docSections.map((section) => (
                    <CallToPrdViewerCard
                      key={section.id}
                      section={section}
                      loading={regeneratingSectionId === section.id}
                      canRegenerate={canRegenerateSections}
                      onRegenerate={async (hint) => {
                        setRegeneratingSectionId(section.id);
                        await regenerateSection(section.id, hint);
                        setRegeneratingSectionId(null);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="max-w-none rounded-[28px] border border-border-base bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-6 py-6 text-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:px-8 md:py-8">
                  <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                    {renderedDocContent}
                  </ReactMarkdown>
                </div>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
