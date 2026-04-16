"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import type { CallRecord } from "@/lib/types/call-to-prd";
import { buildStatusLabel, getGenerationModeLabel } from "@/features/call-to-prd/components/CallToPrdMarkdown";
import { formatCallToPrdProgressMessage, getCallToPrdCopy } from "@/features/call-to-prd/copy";

interface CallToPrdIntakeQueuePanelProps {
  activeQueue: CallRecord[];
  recentQueue: CallRecord[];
  setSelectedHistory: (record: CallRecord | null) => void;
  setSelectedSaved: (saved: string | null) => void;
  handleRetryRecord: (record: CallRecord) => void;
  handleDeleteHistoryRecord: (id: string) => void;
}

export function CallToPrdIntakeQueuePanel({
  activeQueue,
  recentQueue,
  setSelectedHistory,
  setSelectedSaved,
  handleRetryRecord,
  handleDeleteHistoryRecord,
}: CallToPrdIntakeQueuePanelProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [queueOpen, setQueueOpen] = useState(false);

  if (activeQueue.length === 0 && recentQueue.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-border-base bg-bg-card p-5">
      <button
        type="button"
        onClick={() => setQueueOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{copy.intake.queueTitle}</h3>
          <p className="mt-1 text-xs leading-6 text-text-muted">{copy.intake.queueDescription}</p>
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
              <div className="rounded-2xl border border-dashed border-border-base px-4 py-4 text-sm text-text-muted">{copy.intake.noActiveQueue}</div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{copy.intake.recentComplete}</p>
            {recentQueue.length > 0 ? recentQueue.map((record) => (
              <div key={record.id} className="rounded-2xl border border-border-base bg-bg-surface px-4 py-3 transition hover:bg-bg-card">
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
                    <span className="mt-2 inline-flex rounded-full bg-cyan-900/20 px-2 py-0.5 text-[11px] text-cyan-200">
                      {getGenerationModeLabel(record.generationMode, locale)}
                    </span>
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
                      onClick={() => handleDeleteHistoryRecord(record.id)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-text-muted transition hover:bg-white/[0.08] hover:text-white"
                    >
                      {copy.common.delete}
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-border-base px-4 py-4 text-sm text-text-muted">{copy.intake.noRecentQueue}</div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
