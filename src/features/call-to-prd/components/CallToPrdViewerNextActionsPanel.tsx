"use client";

import { ChevronDown, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLocale } from "@/components/layout/LocaleProvider";
import { markdownComponents } from "@/features/call-to-prd/components/CallToPrdMarkdown";
import {
  getCallNextActionDescription,
  getCallNextActionLabel,
  getCallNextActionShortLabel,
  getCallToPrdCopy,
} from "@/features/call-to-prd/copy";
import type { CallNextActionResponse, CallNextActionType, CallRecord } from "@/lib/types/call-to-prd";

interface CallToPrdViewerNextActionsPanelProps {
  displayRecord: CallRecord | null;
  availableNextActions: Array<[CallNextActionType, { label: string; shortLabel: string; description: string }]>;
  nextActionLoading: CallNextActionType | null;
  nextActionResults: Partial<Record<CallNextActionType, CallNextActionResponse>>;
  activeNextAction: CallNextActionType | null;
  setActiveNextAction: (action: CallNextActionType) => void;
  activeNextActionResult: CallNextActionResponse | null;
  renderedNextActionContent: string;
  nextActionsOpen: boolean;
  setNextActionsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  nextActionContentOpen: boolean;
  setNextActionContentOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onGenerateNextAction: (actionType: CallNextActionType) => void;
  downloadNextActionMarkdown: () => void;
}

export function CallToPrdViewerNextActionsPanel({
  displayRecord,
  availableNextActions,
  nextActionLoading,
  nextActionResults,
  activeNextAction,
  setActiveNextAction,
  activeNextActionResult,
  renderedNextActionContent,
  nextActionsOpen,
  setNextActionsOpen,
  nextActionContentOpen,
  setNextActionContentOpen,
  onGenerateNextAction,
  downloadNextActionMarkdown,
}: CallToPrdViewerNextActionsPanelProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);

  if (!displayRecord?.prdMarkdown) {
    return null;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setNextActionsOpen((currentOpen) => !currentOpen)}
        className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
      >
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{copy.viewer.nextActionsTitle}</h3>
          <p className="mt-1 text-xs leading-5 text-text-muted">{copy.viewer.nextActionsDescription}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${nextActionsOpen ? "rotate-180" : ""}`} />
      </button>

      {nextActionsOpen ? (
        <div className="grid gap-4 rounded-2xl border border-border-base bg-bg-card p-5 2xl:grid-cols-[minmax(280px,0.74fr)_minmax(0,1.26fr)]">
          <div className="space-y-4">
            <div className="grid gap-3">
              {availableNextActions.map(([actionType]) => (
                <NextActionTriggerCard
                  key={actionType}
                  actionType={actionType}
                  generated={Boolean(nextActionResults[actionType])}
                  loading={nextActionLoading === actionType}
                  disabled={Boolean(nextActionLoading)}
                  active={activeNextAction === actionType}
                  onClick={() => onGenerateNextAction(actionType)}
                />
              ))}
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
  );
}

function NextActionTriggerCard({
  actionType,
  generated,
  loading,
  disabled,
  active,
  onClick,
}: {
  actionType: CallNextActionType;
  generated: boolean;
  loading: boolean;
  disabled: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
        active
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
}
