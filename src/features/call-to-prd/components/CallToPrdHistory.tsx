"use client";

import { ChevronDown, FolderOpen, Phone } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
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

  return (
    <div className="space-y-5">
      {/* 히스토리 (현재 세션) */}
      {history.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[#f0f0f0]">{copy.history.currentSession}</h3>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-gray-400">{history.length}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen ? history.map((record) => (
            <div
              key={record.id}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-[150ms] ${selectedHistory?.id === record.id ? "border-purple-500/40 bg-purple-950/20" : "border-white/8 bg-[#1e1e1e] hover:bg-[#242424]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedHistory(record); setSelectedSaved(null); onNavigateToViewer(); }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="truncate text-sm font-medium text-[#f0f0f0]">{record.projectName ?? copy.history.projectUnset}</span>
                      {record.customerName && <span className="truncate text-sm text-gray-400">· {record.customerName}</span>}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${record.status === "completed" ? "bg-green-900/30 text-green-300" : record.status === "failed" ? "bg-red-900/30 text-red-300" : "bg-amber-900/30 text-amber-300"}`}>
                      {buildStatusLabel(record.status, locale)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{record.callDate} · {record.fileName}</span>
                    <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                      {getGenerationModeLabel(record.generationMode, locale)}
                    </span>
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">
                      {getCallPresetLabel(record.generationPreset, locale)}
                    </span>
                    <span>{copy.common.documentCount(record.generatedDocs.length || record.selectedDocTypes.length)}</span>
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
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    {copy.common.delete}
                  </button>
                </div>
              </div>
            </div>
          )) : null}
        </div>
      )}

      {/* 저장된 문서 번들 */}
      {(savedTotalCount > 0 || savedQuery.trim()) && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSavedOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[#f0f0f0]">{copy.history.savedDocs}</h3>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-gray-400">{savedTotalCount}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${savedOpen ? "rotate-180" : ""}`} />
          </button>
          {savedOpen ? (
            <div className="space-y-3">
              <input
                value={savedQuery}
                onChange={(event) => handleSavedQueryChange(event.target.value)}
                placeholder={copy.history.searchSaved}
                className="w-full max-w-xs rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
              />
              {savedBundles.length > 0 ? (
            <div className="space-y-3">
              {savedBundles.map((bundle) => (
                <div
                  key={bundle.entryName}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-[150ms] ${selectedSaved === bundle.entryName ? "border-purple-500/40 bg-purple-950/20" : "border-white/8 bg-[#1e1e1e] hover:bg-[#242424]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setSelectedHistory(null);
                        setSelectedSaved(bundle.entryName);
                        try {
                          const res = await fetch(`/api/call-to-prd/saved/${encodeURIComponent(bundle.entryName)}`);
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
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-4 w-4 text-purple-400" />
                        <span className="truncate text-sm font-medium text-[#f0f0f0]">{bundle.title}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{bundle.createdAt.slice(0, 10)}</span>
                        <span>{copy.common.documentCount(bundle.docCount)}</span>
                        <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                          {getGenerationModeLabel(bundle.generationMode, locale)}
                        </span>
                        {bundle.kind === "legacy" && <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">{copy.history.legacy}</span>}
                        {bundle.baselineTitle ? <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">{copy.history.hasBaseline}</span> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">{bundle.preview}</p>
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{bundle.size}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteSavedBundle(bundle.entryName);
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        {copy.common.delete}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {savedTotalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {copy.history.page(savedPage, savedTotalPages)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSavedPage((currentPage) => Math.max(currentPage - 1, 1))}
                      disabled={savedPage <= 1}
                      className="rounded-xl border border-white/8 bg-[#151515] px-3 py-2 text-xs text-gray-300 transition-all duration-[150ms] hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copy.history.prev}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavedPage((currentPage) => Math.min(currentPage + 1, savedTotalPages))}
                      disabled={savedPage >= savedTotalPages}
                      className="rounded-xl border border-white/8 bg-[#151515] px-3 py-2 text-xs text-gray-300 transition-all duration-[150ms] hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copy.history.next}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 text-sm text-gray-400">
              {copy.history.noSearchResult}
            </div>
          )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
