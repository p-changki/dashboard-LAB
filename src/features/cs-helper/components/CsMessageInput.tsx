"use client";

import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import type { CsInputMode } from "@/lib/types";

interface CsMessageInputProps {
  projectName: string | null;
  channelLabel: string;
  toneLabel: string;
  inputMode: CsInputMode;
  customerMessage: string;
  additionalContext: string;
  includeAnalysis: boolean;
  warning: string | null;
  loading: boolean;
  canSubmit: boolean;
  copy: {
    title: string;
    modeLabel: string;
    modes: {
      customer: {
        label: string;
        description: string;
      };
      summary: {
        label: string;
        description: string;
      };
    };
    basedOn: string;
    projectUnselected: string;
    summarySuffix: string;
    clear: string;
    customerPlaceholder: string;
    summaryPlaceholder: string;
    customerTitle: string;
    summaryTitle: string;
    additionalPlaceholder: string;
    includeAnalysisTitle: string;
    includeAnalysisMessage: string;
    historyNotice: string;
    submit: string;
    submitting: string;
    submittingWithAnalysis: string;
  };
  onInputModeChange: (value: CsInputMode) => void;
  onCustomerMessageChange: (value: string) => void;
  onAdditionalContextChange: (value: string) => void;
  onIncludeAnalysisChange: (value: boolean) => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function CsMessageInput({
  projectName,
  channelLabel,
  toneLabel,
  inputMode,
  customerMessage,
  additionalContext,
  includeAnalysis,
  warning,
  loading,
  canSubmit,
  copy,
  onInputModeChange,
  onCustomerMessageChange,
  onAdditionalContextChange,
  onIncludeAnalysisChange,
  onClear,
  onSubmit,
}: CsMessageInputProps) {
  const currentInputCopy = inputMode === "customer" ? copy.modes.customer : copy.modes.summary;
  const currentPlaceholder =
    inputMode === "customer" ? copy.customerPlaceholder : copy.summaryPlaceholder;
  const currentTitle = inputMode === "customer" ? copy.customerTitle : copy.summaryTitle;

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
            {copy.title}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="info">{projectName ?? copy.projectUnselected}</Badge>
            <Badge variant="neutral">{channelLabel}</Badge>
            <Badge variant="neutral">{toneLabel}</Badge>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            {projectName ? `${projectName} ${copy.basedOn}` : copy.projectUnselected} · {copy.summarySuffix}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          className="rounded-full border border-border-base bg-white/6 px-4 py-2 text-xs text-white/75 transition hover:bg-white/10 disabled:opacity-40"
        >
          {copy.clear}
        </button>
      </div>
      {warning ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {warning}
        </div>
      ) : null}
      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{copy.modeLabel}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(["customer", "summary"] as CsInputMode[]).map((mode) => {
            const modeCopy = copy.modes[mode];
            const active = inputMode === mode;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onInputModeChange(mode)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-cyan-300/30 bg-cyan-300/10"
                    : "border-border-base bg-black/15 hover:bg-white/[0.04]"
                }`}
              >
                <p className={active ? "text-sm font-medium text-cyan-100" : "text-sm font-medium text-white"}>
                  {modeCopy.label}
                </p>
                <p className="mt-2 text-xs leading-6 text-text-secondary">{modeCopy.description}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-border-base bg-black/15 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{currentTitle}</p>
        <p className="mt-2 text-xs leading-6 text-text-secondary">{currentInputCopy.description}</p>
      </div>
      <textarea
        value={customerMessage}
        onChange={(event) => onCustomerMessageChange(event.target.value)}
        placeholder={currentPlaceholder}
        className="mt-4 min-h-40 w-full rounded-3xl border border-border-base bg-black/15 px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
      />
      <div className="mt-2 text-right text-xs text-text-muted">
        {customerMessage.trim().length} / 2000
      </div>
      <Input
        variant="ghost"
        size="lg"
        value={additionalContext}
        onChange={(event) => onAdditionalContextChange(event.target.value)}
        placeholder={copy.additionalPlaceholder}
        className="mt-4 rounded-2xl"
      />
      <div className="mt-2 text-right text-xs text-text-muted">
        {additionalContext.trim().length} / 1000
      </div>
      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border-base bg-black/15 px-4 py-3 text-sm text-white/80">
        <div>
          <p className="font-medium text-white">{copy.includeAnalysisTitle}</p>
          <p className="mt-1 text-xs text-text-muted">
            {copy.includeAnalysisMessage}
          </p>
        </div>
        <input
          type="checkbox"
          checked={includeAnalysis}
          onChange={(event) => onIncludeAnalysisChange(event.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/20 accent-cyan-300"
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs leading-6 text-text-muted">
          {copy.historyNotice}
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !canSubmit}
          className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-medium text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (includeAnalysis ? copy.submittingWithAnalysis : copy.submitting) : copy.submit}
        </button>
      </div>
    </section>
  );
}
