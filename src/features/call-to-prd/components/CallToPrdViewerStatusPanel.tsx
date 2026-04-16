"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { ErrorCard } from "@/components/ui/ErrorCard";
import type { CallRecord } from "@/lib/types/call-to-prd";
import {
  Step,
  buildGenerationStepLabel,
  buildStatusLabel,
  formatCallToPrdFailureMessage,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";
import { formatCallToPrdProgressMessage, getCallToPrdCopy } from "@/features/call-to-prd/copy";

interface CallToPrdViewerStatusPanelProps {
  current: CallRecord | null;
  hasSupportDocs: boolean;
  onRetryRecord: (record: CallRecord) => void;
}

export function CallToPrdViewerStatusPanel({
  current,
  hasSupportDocs,
  onRetryRecord,
}: CallToPrdViewerStatusPanelProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);

  if (!current) {
    return null;
  }

  if (current.status === "failed") {
    return (
      <ErrorCard
        title={copy.viewer.failedTitle}
        message={formatCallToPrdFailureMessage(current.error, locale)}
        actionLabel={copy.common.retry}
        onAction={() => onRetryRecord(current)}
      />
    );
  }

  const currentStatusLabel = buildStatusLabel(current.status, locale);
  const currentProgressLabel = formatCallToPrdProgressMessage(current.docGenerationProgress, locale);
  const currentStatusClassName =
    current.status === "completed"
      ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-200"
      : "border-cyan-500/20 bg-cyan-950/20 text-cyan-200";

  return (
    <div className="rounded-3xl border border-border-base bg-bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {current.status === "completed"
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
        <Step
          done={!["uploading"].includes(current.status)}
          active={current.status === "transcribing"}
          label={copy.viewer.audioToText}
        />
        <Step
          done={!["uploading", "transcribing"].includes(current.status)}
          active={current.status === "extracting-pdf"}
          label={copy.viewer.pdfExtract}
        />
        <Step
          done={!["uploading", "transcribing", "extracting-pdf"].includes(current.status)}
          active={current.status === "analyzing-pdf"}
          label={copy.viewer.pdfAnalyze}
        />
        <Step
          done={!["uploading", "transcribing", "extracting-pdf", "analyzing-pdf"].includes(current.status)}
          active={current.status === "analyzing"}
          label={buildGenerationStepLabel(current.generationMode, locale)}
        />
        {current.generationMode === "dual" ? (
          <Step
            done={!["uploading", "transcribing", "extracting-pdf", "analyzing-pdf", "analyzing"].includes(current.status)}
            active={current.status === "merging"}
            label={copy.viewer.dualMerge}
          />
        ) : null}
        {hasSupportDocs ? (
          <Step
            done={current.status === "completed"}
            active={current.status === "generating-docs"}
            label={currentProgressLabel ?? copy.viewer.workingDocs}
          />
        ) : null}
        <Step done={current.status === "completed"} label={copy.viewer.completed} />
      </div>
    </div>
  );
}
