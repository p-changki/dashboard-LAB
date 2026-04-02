"use client";

import { useMemo } from "react";
import { ChevronDown, FolderOpen, Phone } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Input } from "@/components/ui/Input";
import type {
  CallRecord,
  SavedCallBundleDetail,
  SavedCallBundleIndexItem,
} from "@/lib/types/call-to-prd";
import {
  buildStatusLabel,
  getGenerationModeLabel,
  hydrateRecordFromSavedBundle,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";
import { Badge } from "@/components/ui/Badge";
import { getCallPresetLabel, getCallToPrdCopy } from "@/features/call-to-prd/copy";
import type { CallDocType } from "@/lib/call-to-prd/document-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallToPrdHistoryProps {
  // Session history
  history: CallRecord[];
  selectedHistory: CallRecord | null;
  setSelectedHistory: (record: CallRecord | null) => void;
  setSelectedSaved: (saved: string | null) => void;
  handleRetryRecord: (record: CallRecord) => void;
  handleDeleteHistoryRecord: (id: string) => void;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Saved bundles
  savedBundles: SavedCallBundleIndexItem[];
  savedQuery: string;
  handleSavedQueryChange: (query: string) => void;
  savedPage: number;
  setSavedPage: (page: number | ((prev: number) => number)) => void;
  savedTotalCount: number;
  savedTotalPages: number;
  selectedSaved: string | null;
  savedOpen: boolean;
  setSavedOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // Handlers for loading saved bundles
  setCurrent: (record: CallRecord | null) => void;
  setActiveDocType: (docType: CallDocType) => void;

  // Navigation
  onNavigateToViewer: () => void;

  // Delete saved
  handleDeleteSavedBundle: (entryName: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CallToPrdHistory(props: CallToPrdHistoryProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const {
    history,
    selectedHistory,
    setSelectedHistory,
    setSelectedSaved,
    handleRetryRecord,
    handleDeleteHistoryRecord,
    historyOpen,
    setHistoryOpen,
    savedBundles,
    savedQuery,
    handleSavedQueryChange,
    savedPage,
    setSavedPage,
    savedTotalCount,
    savedTotalPages,
    selectedSaved,
    savedOpen,
    setSavedOpen,
    setCurrent,
    setActiveDocType,
    onNavigateToViewer,
    handleDeleteSavedBundle,
  } = props;
  const historyStats = useMemo(
    () => ({
      queuedOrRunning: history.filter((record) => record.status !== "completed" && record.status !== "failed")
        .length,
      completed: history.filter((record) => record.status === "completed").length,
      failed: history.filter((record) => record.status === "failed").length,
    }),
    [history],
  );
  const savedStats = useMemo(
    () => ({
      baseline: savedBundles.filter((bundle) => Boolean(bundle.baselineTitle)).length,
      legacy: savedBundles.filter((bundle) => bundle.kind === "legacy").length,
    }),
    [savedBundles],
  );

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      {/* 히스토리 (현재 세션) */}
      {history.length > 0 && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-text-primary">{copy.history.currentSession}</h3>
              <Badge>{history.length}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen ? (
            <div className="space-y-4 rounded-3xl border border-border-base bg-bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <HistoryMetricCard label={copy.intake.inProgress} value={historyStats.queuedOrRunning} tone="amber" />
                <HistoryMetricCard label={copy.viewer.completed} value={historyStats.completed} tone="emerald" />
                <HistoryMetricCard label={copy.viewer.failedTitle} value={historyStats.failed} tone="rose" />
              </div>
              <div className="space-y-3">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-[150ms] ${selectedHistory?.id === record.id ? "border-purple-500/40 bg-purple-950/20" : "border-border-base bg-bg-surface hover:bg-bg-card"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHistory(record);
                          setSelectedSaved(null);
                          onNavigateToViewer();
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-3">
                              <Phone className="h-4 w-4 text-text-muted" />
                              <span className="break-words text-sm font-medium text-text-primary">
                                {record.projectName ?? copy.history.projectUnset}
                              </span>
                              {record.customerName ? (
                                <span className="break-words text-sm text-text-muted">
                                  · {record.customerName}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 break-words text-xs leading-5 text-text-muted">
                              {record.callDate} · {record.fileName}
                            </p>
                          </div>
                          <Badge variant={record.status === "completed" ? "success" : record.status === "failed" ? "error" : "warning"} size="lg">
                            {buildStatusLabel(record.status, locale)}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <Badge variant="info">
                            {getGenerationModeLabel(record.generationMode, locale)}
                          </Badge>
                          <Badge>
                            {getCallPresetLabel(record.generationPreset, locale)}
                          </Badge>
                          <Badge>
                            {copy.common.documentCount(record.generatedDocs.length || record.selectedDocTypes.length)}
                          </Badge>
                          {selectedHistory?.id === record.id ? (
                            <Badge variant="claude">
                              {locale === "ko" ? "현재 선택" : "Selected"}
                            </Badge>
                          ) : null}
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
                          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-text-muted transition hover:bg-white/[0.08] hover:text-white"
                        >
                          {copy.common.delete}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* 저장된 문서 번들 */}
      {(savedTotalCount > 0 || savedQuery.trim()) && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setSavedOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-4 py-3 text-left transition-all duration-[150ms] hover:bg-bg-card-hover"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-text-primary">{copy.history.savedDocs}</h3>
              <Badge>{savedTotalCount}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-[150ms] ${savedOpen ? "rotate-180" : ""}`} />
          </button>
          {savedOpen ? (
            <div className="space-y-4 rounded-3xl border border-border-base bg-bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <HistoryMetricCard label={copy.history.savedDocs} value={savedTotalCount} tone="slate" />
                <HistoryMetricCard label={copy.history.hasBaseline} value={savedStats.baseline} tone="cyan" />
                <HistoryMetricCard label={copy.history.legacy} value={savedStats.legacy} tone="purple" />
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Input
                  value={savedQuery}
                  onChange={(event) => handleSavedQueryChange(event.target.value)}
                  placeholder={copy.history.searchSaved}
                  className="lg:max-w-sm"
                />
                {savedTotalPages > 1 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {copy.history.page(savedPage, savedTotalPages)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSavedPage((currentPage) => Math.max(currentPage - 1, 1))}
                      disabled={savedPage <= 1}
                      className="rounded-xl border border-border-base bg-bg-surface px-3 py-2 text-xs text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copy.history.prev}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavedPage((currentPage) => Math.min(currentPage + 1, savedTotalPages))}
                      disabled={savedPage >= savedTotalPages}
                      className="rounded-xl border border-border-base bg-bg-surface px-3 py-2 text-xs text-text-secondary transition-all duration-[150ms] hover:bg-bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copy.history.next}
                    </button>
                  </div>
                ) : null}
              </div>
              {savedBundles.length > 0 ? (
                <div className="space-y-3">
                  {savedBundles.map((bundle) => (
                    <div
                      key={bundle.entryName}
                      className={`w-full rounded-2xl border p-4 text-left transition-all duration-[150ms] ${selectedSaved === bundle.entryName ? "border-purple-500/40 bg-purple-950/20" : "border-border-base bg-bg-surface hover:bg-bg-card"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedHistory(null);
                            setSelectedSaved(bundle.entryName);
                            try {
                              const res = await fetch(`/api/call-to-prd/saved/${encodeURIComponent(bundle.entryName)}`, {
                                headers: { "x-dashboard-locale": locale },
                              });
                              if (!res.ok) {
                                return;
                              }
                              const detail: SavedCallBundleDetail = await res.json();
                              setCurrent(hydrateRecordFromSavedBundle(detail, bundle.size));
                              setActiveDocType("prd");
                              onNavigateToViewer();
                            } catch {
                              /* ignore */
                            }
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <FolderOpen className="h-4 w-4 text-purple-400" />
                            <span className="break-words text-sm font-medium text-text-primary">{bundle.title}</span>
                            {selectedSaved === bundle.entryName ? (
                              <Badge variant="claude">
                                {locale === "ko" ? "현재 선택" : "Selected"}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                            <span>{bundle.createdAt.slice(0, 10)}</span>
                            <Badge>
                              {copy.common.documentCount(bundle.docCount)}
                            </Badge>
                            <Badge variant="info">
                              {getGenerationModeLabel(bundle.generationMode, locale)}
                            </Badge>
                            {bundle.kind === "legacy" ? (
                              <Badge>{copy.history.legacy}</Badge>
                            ) : null}
                            {bundle.baselineTitle ? (
                              <Badge variant="info">{copy.history.hasBaseline}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 break-words text-xs leading-5 text-text-muted">{bundle.preview}</p>
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-muted">{bundle.size}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteSavedBundle(bundle.entryName);
                            }}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-text-muted transition hover:bg-white/[0.08] hover:text-white"
                          >
                            {copy.common.delete}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border-base bg-bg-surface p-5 text-sm text-text-muted">
                  {copy.history.noSearchResult}
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function HistoryMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose" | "slate" | "cyan" | "purple";
}) {
  const toneClassName = {
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-100",
    slate: "border-white/10 bg-white/5 text-white/70",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={["mt-3 inline-flex rounded-full px-3 py-1 text-xs", toneClassName].join(" ")}>{value}</p>
    </div>
  );
}
