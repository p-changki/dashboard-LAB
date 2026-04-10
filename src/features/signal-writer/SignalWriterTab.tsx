"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  ExternalLink,
  ImageIcon,
  LoaderCircle,
  Newspaper,
  PenSquare,
  Sparkles,
  Trash2,
} from "lucide-react";

import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { getSignalWriterCopy } from "@/features/signal-writer/copy";
import {
  getDefaultSignalWriterRunnerAvailability,
  recommendSignalWriterSetup,
  type SignalWriterRunnerAvailability,
} from "@/features/signal-writer/recommendations";
import {
  getDashboardLabAutoRefreshIntervalMs,
  getDailyAutoRefreshKey,
  readDashboardLabAutoRefreshMode,
  runDailyAutoRefresh,
  scheduleIdleRefresh,
  writeDashboardLabAutoRefreshMode,
} from "@/lib/client/daily-auto-refresh";
import {
  clearSignalWriterPicks,
  removeSignalWriterPick,
  readSignalWriterPicks,
  subscribeSignalWriterPicks,
} from "@/lib/info-hub/local-state";
import type {
  DashboardLabRuntimeRunnerHealthEntry,
  DashboardLabRuntimeSummaryResponse,
  SignalWriterAiRunner,
  SignalWriterActionErrorCode,
  SignalWriterApiErrorResponse,
  SignalWriterDraft,
  SignalWriterDraftMode,
  SignalWriterFactCheckContext,
  SignalWriterFactCheckResponse,
  SignalWriterFactCheckResult,
  SignalWriterFactCheckRunner,
  SignalWriterGenerateResponse,
  SignalWriterPerformanceEntry,
  SignalWriterPerformanceResponse,
  SignalWriterResearchModelResult,
  SignalWriterResearchResponse,
  SignalWriterResearchResult,
  SignalWriterSignal,
  SignalWriterSignalsResponse,
  SignalWriterTargetChannel,
  SignalWriterTrendBoard,
  SignalWriterTrendBoardDraft,
  SignalWriterTrendBoardGenerateResponse,
  SignalWriterTrendBoardId,
  SignalWriterTrendBoardResponse,
} from "@/lib/types";
import { toSignalWriterSignal } from "@/lib/signal-writer/signals";

type SignalWriterStep = "select" | "generate" | "result";
type SignalWriterEntryMode = "signal" | "board";
type SignalWriterMixSummary = {
  manualCount: number;
  autoCount: number;
};
type SignalWriterPerformanceForm = {
  postUrl: string;
  postedAt: string;
  views: string;
  likes: string;
  replies: string;
  reposts: string;
  saves: string;
  notes: string;
};
type TrendBoardReviewState = {
  included: boolean;
  reviewed: boolean;
  note: string;
};
type SignalWriterActionError = {
  code: SignalWriterActionErrorCode;
  message: string;
};
type SignalWriterRunnerHealthMap = Partial<Record<"claude" | "codex" | "gemini", DashboardLabRuntimeRunnerHealthEntry>>;

const MIN_GENERATE_DELAY_MS = 2200;
const AUTO_SIGNAL_APPEND_LIMIT = 5;
const DEFAULT_TREND_BOARD_ID: SignalWriterTrendBoardId = "github";

export function SignalWriterTab({ mode = "core" }: { mode?: DashboardNavigationMode }) {
  const { locale } = useLocale();
  const copy = getSignalWriterCopy(locale);
  const [entryMode, setEntryMode] = useState<SignalWriterEntryMode>("signal");
  const [signals, setSignals] = useState<SignalWriterSignal[]>([]);
  const [signalMix, setSignalMix] = useState<SignalWriterMixSummary>({ manualCount: 0, autoCount: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<SignalWriterTrendBoardId>(DEFAULT_TREND_BOARD_ID);
  const [boardCache, setBoardCache] = useState<Partial<Record<SignalWriterTrendBoardId, SignalWriterTrendBoard>>>({});
  const [selectedChannel, setSelectedChannel] = useState<SignalWriterTargetChannel>("threads");
  const [selectedMode, setSelectedMode] = useState<SignalWriterDraftMode>("viral");
  const [selectedRunner, setSelectedRunner] = useState<SignalWriterAiRunner>("auto");
  const [runnerAvailability, setRunnerAvailability] = useState<SignalWriterRunnerAvailability>(
    getDefaultSignalWriterRunnerAvailability(),
  );
  const [runnerHealth, setRunnerHealth] = useState<SignalWriterRunnerHealthMap>({});
  const [draft, setDraft] = useState<SignalWriterDraft | null>(null);
  const [step, setStep] = useState<SignalWriterStep>("select");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState<SignalWriterActionError | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [performanceForm, setPerformanceForm] = useState<SignalWriterPerformanceForm>(
    createDefaultPerformanceForm(),
  );
  const [performanceEntry, setPerformanceEntry] = useState<SignalWriterPerformanceEntry | null>(null);
  const [performanceCount, setPerformanceCount] = useState(0);
  const [performanceSaving, setPerformanceSaving] = useState(false);
  const [performanceError, setPerformanceError] = useState("");
  const [researchCache, setResearchCache] = useState<Record<string, SignalWriterResearchResult>>({});
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [selectedFactCheckRunner, setSelectedFactCheckRunner] = useState<SignalWriterFactCheckRunner>("claude");
  const [factCheckCache, setFactCheckCache] = useState<Record<string, SignalWriterFactCheckResult>>({});
  const [factCheckLoading, setFactCheckLoading] = useState(false);
  const [factCheckError, setFactCheckError] = useState("");
  const [boardDraft, setBoardDraft] = useState<SignalWriterTrendBoardDraft | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState("");
  const [boardReviewState, setBoardReviewState] = useState<Record<string, TrendBoardReviewState>>({});
  const [boardOrder, setBoardOrder] = useState<string[]>([]);
  const [generatedBoard, setGeneratedBoard] = useState<SignalWriterTrendBoard | null>(null);
  const [autoRefreshMode, setAutoRefreshMode] = useState(() =>
    readDashboardLabAutoRefreshMode(),
  );

  const selectedSignal = useMemo(
    () => signals.find((item) => item.id === selectedId) ?? null,
    [signals, selectedId],
  );
  const selectedBoard = useMemo(
    () => boardCache[selectedBoardId] ?? null,
    [boardCache, selectedBoardId],
  );
  const preparedBoard = useMemo(
    () => buildPreparedTrendBoard(selectedBoard, boardReviewState, boardOrder),
    [boardOrder, boardReviewState, selectedBoard],
  );
  const boardIncludedCount = useMemo(
    () => preparedBoard?.items.length ?? 0,
    [preparedBoard],
  );
  const boardTotalCount = selectedBoard?.items.length ?? 0;
  const boardReviewedIncludedCount = useMemo(
    () =>
      selectedBoard
        ? selectedBoard.items.filter((item) => {
            const review = getTrendBoardReviewState(boardReviewState, item.id);
            return review.included && review.reviewed;
          }).length
        : 0,
    [boardReviewState, selectedBoard],
  );
  const boardReadyToGenerate = boardIncludedCount > 0 && boardReviewedIncludedCount === boardIncludedCount;
  const boardExcludedCount = Math.max(boardTotalCount - boardIncludedCount, 0);
  const autoRefreshIntervalMs = getDashboardLabAutoRefreshIntervalMs(autoRefreshMode);
  const selectedResearch = useMemo(
    () => (selectedSignal ? researchCache[getResearchCacheKey(selectedSignal.id, selectedChannel)] ?? null : null),
    [researchCache, selectedChannel, selectedSignal],
  );
  const selectedFactCheck = useMemo(
    () => (draft ? factCheckCache[getFactCheckCacheKey(draft.id, selectedFactCheckRunner)] ?? null : null),
    [draft, factCheckCache, selectedFactCheckRunner],
  );
  const recommendation = useMemo(
    () =>
      selectedSignal
        ? recommendSignalWriterSetup(selectedSignal, locale, runnerAvailability, selectedChannel)
        : null,
    [locale, runnerAvailability, selectedChannel, selectedSignal],
  );

  useEffect(() => {
    void loadSignals(locale, setSignals, setSignalMix, setSelectedId, setLoading, setError, false);
  }, [locale]);

  useEffect(() => {
    writeDashboardLabAutoRefreshMode(autoRefreshMode);
  }, [autoRefreshMode]);

  useEffect(() => {
    setBoardCache({});
    setBoardDraft(null);
    setBoardError("");
    setBoardReviewState({});
    setBoardOrder([]);
    setGeneratedBoard(null);
  }, [locale]);

  useEffect(() => {
    setBoardReviewState((current) => syncTrendBoardReviewState(selectedBoard, current));
    setBoardOrder((current) => syncTrendBoardOrder(selectedBoard, current));
  }, [selectedBoard]);

  useEffect(() => {
    if (entryMode !== "board" && boardCache[selectedBoardId]) {
      return;
    }

    if (entryMode === "board" && !boardCache[selectedBoardId]) {
      void loadTrendBoard(
        locale,
        selectedBoardId,
        setBoardCache,
        setBoardLoading,
        setBoardError,
        false,
      );
    }
  }, [boardCache, entryMode, locale, selectedBoardId]);

  useEffect(() => {
    return subscribeSignalWriterPicks(() => {
      void loadSignals(
        locale,
        setSignals,
        setSignalMix,
        setSelectedId,
        setLoading,
        setError,
        false,
      );
    });
  }, [locale]);

  useEffect(() => {
    async function runSignalWriterBackgroundRefresh() {
      await loadSignals(
        locale,
        setSignals,
        setSignalMix,
        setSelectedId,
        setLoading,
        setError,
        true,
        { background: true },
      );

      if (entryMode === "board") {
        await loadTrendBoard(
          locale,
          selectedBoardId,
          setBoardCache,
          setBoardLoading,
          setBoardError,
          true,
          { background: true },
        );
      }
    }

    const cancelIdleRefresh = scheduleIdleRefresh(() => {
      void runDailyAutoRefresh(
        getDailyAutoRefreshKey("signal-writer", locale),
        runSignalWriterBackgroundRefresh,
        autoRefreshIntervalMs,
      );
    });

    const intervalId =
      autoRefreshMode === "realtime"
        ? window.setInterval(() => {
            void runDailyAutoRefresh(
              getDailyAutoRefreshKey("signal-writer", locale),
              runSignalWriterBackgroundRefresh,
              autoRefreshIntervalMs,
            );
          }, autoRefreshIntervalMs)
        : null;

    return () => {
      cancelIdleRefresh();
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [autoRefreshIntervalMs, autoRefreshMode, entryMode, locale, selectedBoardId]);

  useEffect(() => {
    void loadRunnerAvailability(locale, setRunnerAvailability, setRunnerHealth);
  }, [locale]);

  useEffect(() => {
    setResearchError("");
  }, [selectedId]);

  useEffect(() => {
    setFactCheckError("");
  }, [draft?.id, selectedId]);

  useEffect(() => {
    setSelectedFactCheckRunner((current) =>
      getPreferredFactCheckRunner(current, draft?.sourceModel ?? null, runnerAvailability),
    );
  }, [draft?.id, draft?.sourceModel, runnerAvailability]);

  useEffect(() => {
    if (step !== "generate" || !generating) {
      return;
    }

    setStageIndex(0);
    const timer = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, copy.generate.stages.length - 1));
    }, 550);

    return () => window.clearInterval(timer);
  }, [copy.generate.stages.length, generating, step]);

  async function handleRefresh() {
    setRefreshing(true);
    setActionError(null);
    try {
      if (entryMode === "board") {
        await loadTrendBoard(
          locale,
          selectedBoardId,
          setBoardCache,
          setBoardLoading,
          setBoardError,
          true,
        );
      } else {
        await loadSignals(
          locale,
          setSignals,
          setSignalMix,
          setSelectedId,
          setLoading,
          setError,
          true,
        );
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGenerate(
    preferredHook?: string,
    factCheckContext?: SignalWriterFactCheckContext,
    overrideRunner?: SignalWriterAiRunner,
  ) {
    if (!selectedSignal) {
      return;
    }

    const effectiveRunner = overrideRunner ?? selectedRunner;
    if (overrideRunner) {
      setSelectedRunner(overrideRunner);
    }
    setError("");
    setActionError(null);
    setFactCheckError("");
    setStep("generate");
    setGenerating(true);
    setDraft(null);
    setBoardDraft(null);
    const startedAt = Date.now();

    try {
      const response = await fetch("/api/signal-writer/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({
          signal: selectedSignal,
          channel: selectedChannel,
          mode: selectedMode,
          runner: effectiveRunner,
          preferredHook,
          researchContext: selectedResearch
            ? {
                summary: selectedResearch.synthesis.summary,
                whyNow: selectedResearch.synthesis.whyNow,
                bestHook: selectedResearch.synthesis.bestHook,
                bestQuestion: selectedResearch.synthesis.bestQuestion,
                primaryAngle: selectedResearch.synthesis.primaryAngle,
                keyPoints: selectedResearch.synthesis.keyPoints,
                watchouts: selectedResearch.synthesis.watchouts,
              }
            : undefined,
          factCheckContext,
        }),
      });

      const payload = (await response.json()) as Partial<SignalWriterGenerateResponse> & SignalWriterApiErrorResponse;

      if (!response.ok || !payload.draft) {
        const message = payload.error || copy.loadError;
        if (payload.errorCode) {
          setActionError({
            code: payload.errorCode,
            message,
          });
          setStep("select");
          return;
        }

        throw new Error(message);
      }

      const remaining = MIN_GENERATE_DELAY_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }

      setStageIndex(copy.generate.stages.length - 1);
      setPerformanceForm(createDefaultPerformanceForm());
      setPerformanceEntry(null);
      setPerformanceCount(0);
      setPerformanceError("");
      setActionError(null);
      setDraft(payload.draft);
      setStep("result");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
      setStep("select");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateBoard(overrideRunner?: SignalWriterAiRunner) {
    if (!preparedBoard || preparedBoard.items.length === 0 || !boardReadyToGenerate) {
      return;
    }

    const effectiveRunner = overrideRunner ?? selectedRunner;
    if (overrideRunner) {
      setSelectedRunner(overrideRunner);
    }
    setError("");
    setActionError(null);
    setBoardError("");
    setStep("generate");
    setGenerating(true);
    setDraft(null);
    setBoardDraft(null);
    const startedAt = Date.now();

    try {
      const response = await fetch("/api/signal-writer/boards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({
          board: preparedBoard,
          channel: selectedChannel,
          runner: effectiveRunner,
        }),
      });

      const payload = (await response.json()) as Partial<SignalWriterTrendBoardGenerateResponse> & SignalWriterApiErrorResponse;

      if (!response.ok || !payload.draft) {
        const message = payload.error || copy.boards.loadError;
        if (payload.errorCode) {
          setActionError({
            code: payload.errorCode,
            message,
          });
          setStep("select");
          return;
        }

        throw new Error(message);
      }

      const remaining = MIN_GENERATE_DELAY_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }

      setStageIndex(copy.generate.stages.length - 1);
      setGeneratedBoard(preparedBoard);
      setActionError(null);
      setBoardDraft(payload.draft);
      setStep("result");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.boards.loadError);
      setStep("select");
    } finally {
      setGenerating(false);
    }
  }

  function handleRetryCurrentAction(overrideRunner?: SignalWriterAiRunner) {
    if (entryMode === "board") {
      void handleGenerateBoard(overrideRunner);
      return;
    }

    void handleGenerate(undefined, undefined, overrideRunner);
  }

  async function handleSavePerformance() {
    if (!draft?.jsonPath) {
      return;
    }

    setPerformanceSaving(true);
    setPerformanceError("");

    try {
      const response = await fetch("/api/signal-writer/performance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({
          jsonPath: draft.jsonPath,
          draftId: draft.id,
          signalId: draft.signalId,
          channel: draft.channel,
          hook: draft.hook,
          postUrl: performanceForm.postUrl,
          postedAt: toPostedAtIso(performanceForm.postedAt),
          views: toMetricNumber(performanceForm.views),
          likes: toMetricNumber(performanceForm.likes),
          replies: toMetricNumber(performanceForm.replies),
          reposts: toMetricNumber(performanceForm.reposts),
          saves: toMetricNumber(performanceForm.saves),
          notes: performanceForm.notes,
        }),
      });

      const payload = (await response.json()) as Partial<SignalWriterPerformanceResponse> & {
        error?: string;
      };

      if (!response.ok || !payload.entry || typeof payload.totalEntries !== "number") {
        throw new Error(payload.error || copy.result.performance.saveError);
      }

      setPerformanceEntry(payload.entry);
      setPerformanceCount(payload.totalEntries);
    } catch (nextError) {
      setPerformanceError(
        nextError instanceof Error ? nextError.message : copy.result.performance.saveError,
      );
    } finally {
      setPerformanceSaving(false);
    }
  }

  async function handleRunResearch() {
    if (!selectedSignal) {
      return;
    }

    setResearchLoading(true);
    setResearchError("");

    try {
      const response = await fetch("/api/signal-writer/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({
          signal: selectedSignal,
          channel: selectedChannel,
        }),
      });

      const payload = (await response.json()) as Partial<SignalWriterResearchResponse> & {
        error?: string;
      };

      if (!response.ok || !payload.research) {
        throw new Error(payload.error || copy.loadError);
      }

      setResearchCache((current) => ({
        ...current,
        [getResearchCacheKey(payload.research!.signalId, payload.research!.channel)]: payload.research!,
      }));
    } catch (nextError) {
      setResearchError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setResearchLoading(false);
    }
  }

  async function handleRunFactCheck() {
    if (!selectedSignal || !draft) {
      return;
    }

    setFactCheckLoading(true);
    setFactCheckError("");

    try {
      const response = await fetch("/api/signal-writer/fact-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({
          signal: selectedSignal,
          draft: {
            id: draft.id,
            signalId: draft.signalId,
            title: draft.title,
            channel: draft.channel,
            mode: draft.mode,
            hook: draft.hook,
            shortPost: draft.shortPost,
            threadPosts: draft.threadPosts,
            firstComment: draft.firstComment,
            followUpReplies: draft.followUpReplies,
            hashtags: draft.hashtags,
            whyNow: draft.whyNow,
          },
          runner: selectedFactCheckRunner,
        }),
      });

      const payload = (await response.json()) as Partial<SignalWriterFactCheckResponse> & {
        error?: string;
      };

      if (!response.ok || !payload.factCheck) {
        throw new Error(payload.error || copy.loadError);
      }

      setFactCheckCache((current) => ({
        ...current,
        [getFactCheckCacheKey(payload.factCheck!.draftId, payload.factCheck!.runner)]: payload.factCheck!,
      }));
    } catch (nextError) {
      setFactCheckError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setFactCheckLoading(false);
    }
  }

  function handleRegenerateFromFactCheck(result: SignalWriterFactCheckResult) {
    void handleGenerate(undefined, {
      summary: result.summary,
      rewriteBrief: result.rewriteBrief,
      findings: result.findings,
    });
  }

  function applyResearchRecommendation(research: SignalWriterResearchResult) {
    setSelectedMode(research.synthesis.recommendedMode);
    setSelectedRunner(research.synthesis.recommendedRunner);
  }

  function handleRemovePickedSignal(signalId: string) {
    removeSignalWriterPick(signalId);
  }

  function handleClearPickedSignals() {
    clearSignalWriterPicks();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-border-base bg-gradient-to-br from-white/[0.05] via-white/[0.025] to-amber-500/[0.06] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.title}</h2>
            <p className="text-sm leading-6 text-text-secondary">{copy.description}</p>
            <p className="text-xs leading-5 text-text-muted">
              {mode === "core" ? copy.coreMode : copy.fullMode}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant={autoRefreshMode === "realtime" ? "info" : "neutral"}
                size="sm"
                dot={autoRefreshMode === "realtime"}
              >
                {autoRefreshMode === "realtime"
                  ? copy.autoRefresh.realtimeBadge
                  : copy.autoRefresh.standardBadge}
              </Badge>
              <p className="text-xs leading-5 text-text-muted">
                {autoRefreshMode === "realtime"
                  ? copy.autoRefresh.realtimeDescription
                  : copy.autoRefresh.standardDescription}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={autoRefreshMode === "realtime" ? "primary" : "secondary"}
              onClick={() =>
                setAutoRefreshMode((current) =>
                  current === "realtime" ? "standard" : "realtime",
                )
              }
            >
              {autoRefreshMode === "realtime"
                ? copy.autoRefresh.switchToStandard
                : copy.autoRefresh.switchToRealtime}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleRefresh()}
            >
              {refreshing || loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {copy.refresh}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[copy.pages.select, copy.pages.generate, copy.pages.result].map((label, index) => {
          const active =
            (step === "select" && index === 0) ||
            (step === "generate" && index === 1) ||
            (step === "result" && index === 2);

          return (
            <span
              key={label}
              className={[
                "rounded-full border px-4 py-2 text-sm",
                active
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                  : "border-border-base bg-white/[0.03] text-text-muted",
              ].join(" ")}
            >
              {label}
            </span>
          );
        })}
      </div>

      {actionError ? (
        <SignalWriterActionErrorBanner
          error={actionError}
          copy={copy.actionError}
          canUseClaude={runnerAvailability.claude}
          onRetry={() => handleRetryCurrentAction()}
          onSwitchToClaude={() => handleRetryCurrentAction("claude")}
          onSwitchToTemplate={() => handleRetryCurrentAction("template")}
        />
      ) : error ? (
        <ErrorCard
          title="Signal Writer"
          message={error}
          actionLabel={copy.refresh}
          onAction={() => void handleRefresh()}
        />
      ) : null}

      {loading ? (
        <section className="rounded-3xl border border-border-base bg-white/[0.03] p-6 text-sm text-text-secondary">
          {copy.loading}
        </section>
      ) : null}

      {!loading && step === "select" ? (
        <div className="space-y-5">
          <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">{copy.entryModes.title}</p>
                <p className="text-sm leading-6 text-text-secondary">{copy.entryModes.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["signal", copy.entryModes.signal],
                  ["board", copy.entryModes.board],
                ] as const).map(([modeKey, label]) => {
                  const active = entryMode === modeKey;

                  return (
                    <Button
                      key={modeKey}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEntryMode(modeKey);
                        setActionError(null);
                        setError("");
                        setStep("select");
                      }}
                      className={[
                        "rounded-2xl border px-4 py-3 h-auto justify-start",
                        active
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                          : "border-border-base bg-black/15 text-white hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </section>

          {entryMode === "signal" ? (
            <div className="space-y-5">
          {signals.length > 0 ? (
            <section className="flex flex-col gap-3 rounded-2xl border border-border-base bg-black/15 px-4 py-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
              <p>
                {signalMix.manualCount > 0
                  ? signalMix.autoCount > 0
                    ? copy.selection.mixed(signalMix.manualCount, signalMix.autoCount)
                    : copy.selection.manual(signalMix.manualCount)
                  : copy.selection.auto(signalMix.autoCount || signals.length)}
              </p>
              {signalMix.manualCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearPickedSignals}
                  className="rounded-full border border-border-base bg-white/5 px-3 text-white/80 hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                  {copy.selection.clearManual}
                </Button>
              ) : null}
            </section>
          ) : null}

          {signals.length === 0 ? (
            <section className="rounded-3xl border border-border-base bg-white/[0.03] p-6 text-sm text-text-secondary">
              {copy.empty}
            </section>
          ) : (
            <>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                <div className="grid gap-4 xl:grid-cols-2">
                  {signals.map((item) => (
                    <article
                      key={item.id}
                      className={[
                        "rounded-3xl border p-5 transition",
                        selectedId === item.id
                          ? "border-amber-400/40 bg-amber-500/[0.08]"
                          : "border-border-base bg-white/[0.03] hover:bg-white/[0.05]",
                      ].join(" ")}
                    >
                      {item.thumbnailUrl ? (
                        <div className="mb-4 overflow-hidden rounded-2xl border border-border-base bg-black/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="h-48 w-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : null}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="neutral" size="sm">{item.categoryLabel}</Badge>
                            <Badge variant="neutral" size="sm">
                              {item.selectionSource === "manual"
                                ? copy.selection.manualBadge
                                : copy.selection.autoBadge}
                            </Badge>
                            {selectedId === item.id ? (
                              <Badge variant="warning" size="sm">{copy.cards.selected}</Badge>
                            ) : null}
                          </div>
                          <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                        </div>
                        <Newspaper className="mt-1 h-5 w-5 shrink-0 text-amber-200/80" />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-text-secondary">{item.summary}</p>
                      <div className="mt-4 rounded-2xl border border-border-base bg-black/15 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.cards.why}</p>
                        <p className="mt-2 text-sm text-white/85">{item.whyItMatters}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-muted">
                        <span>{copy.cards.source}: {item.sourceName}</span>
                        <span>{copy.cards.published}: {formatTimestamp(item.publishedAt, locale)}</span>
                      </div>
                      <div className="mt-5">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setSelectedId((current) => (current === item.id ? null : item.id))}
                            className={[
                              "rounded-2xl border px-4",
                              selectedId === item.id
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                                : "border-border-base bg-white/5 text-white hover:bg-white/10",
                            ].join(" ")}
                          >
                            <PenSquare className="h-4 w-4" />
                            {selectedId === item.id ? copy.cta.unselect : copy.cta.choose}
                          </Button>
                          {item.selectionSource === "manual" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePickedSignal(item.id)}
                              className="rounded-2xl border border-border-base bg-white/5 px-3 text-white/75 hover:bg-white/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              {copy.selection.removeManual}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5 xl:sticky xl:top-24">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{copy.setup.title}</p>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.setup.description}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        selectedSignal
                          ? "border-emerald-500/20 bg-emerald-900/30 text-emerald-300"
                          : "border-border-base bg-white/6 text-white/60"
                      }`}
                    >
                      {selectedSignal ? copy.setup.ready : copy.setup.pending}
                    </span>
                  </div>

                  {selectedSignal ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.setup.signal}</p>
                            <p className="mt-3 text-sm font-medium text-white">{selectedSignal.title}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              selectedSignal.selectionSource === "manual"
                                ? handleRemovePickedSignal(selectedSignal.id)
                                : setSelectedId(null)
                            }
                            className="shrink-0 rounded-full border border-border-base bg-white/6 px-3 text-white/75 hover:bg-white/10"
                          >
                            {selectedSignal.selectionSource === "manual"
                              ? copy.selection.removeManual
                              : copy.cta.unselect}
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                          <span>{selectedSignal.sourceName}</span>
                          <span>{formatTimestamp(selectedSignal.publishedAt, locale)}</span>
                          <span>
                            {selectedSignal.selectionSource === "manual"
                              ? copy.selection.manualBadge
                              : copy.selection.autoBadge}
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <SignalSetupMetric
                          label={copy.setup.channel}
                          value={copy.channels[selectedChannel].label}
                          description={copy.channels[selectedChannel].description}
                        />
                        <SignalSetupMetric
                          label={copy.setup.mode}
                          value={copy.modes[selectedMode].label}
                          description={copy.modes[selectedMode].description}
                        />
	                        <SignalSetupMetric
	                          label={copy.setup.runner}
	                          value={copy.runners[selectedRunner].label}
	                          description={copy.runners[selectedRunner].description}
	                        />
	                      </div>
	                    </div>
	                  ) : (
	                    <div className="mt-4 rounded-2xl border border-border-base bg-black/15 px-4 py-4">
	                      <p className="text-sm font-medium text-white">{copy.setup.emptyTitle}</p>
	                      <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.setup.emptyMessage}</p>
	                    </div>
	                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!selectedSignal}
                    onClick={() => void handleGenerate()}
                    className="mt-5 w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-medium text-amber-100 hover:bg-amber-400/15 disabled:border-border-base disabled:bg-white/[0.03] disabled:text-text-muted h-auto"
                  >
                    <Sparkles className="h-4 w-4" />
                    {copy.cta.generate}
                  </Button>
                </section>
              </div>

              {recommendation ? (
                <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-white">{copy.recommendation.title}</p>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          {recommendation.reason}
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <SignalSetupMetric
                          label={copy.recommendation.mode}
                          value={copy.modes[recommendation.mode].label}
                        />
                        <SignalSetupMetric
                          label={copy.recommendation.runner}
                          value={copy.runners[recommendation.runner].label}
                        />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                          {copy.recommendation.criteria}
                        </p>
                        <ul className="mt-2 space-y-2">
                          {recommendation.criteria.map((item) => (
                            <li key={item} className="text-sm leading-6 text-white/85">
                              - {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedMode(recommendation.mode);
                        setSelectedRunner(recommendation.runner);
                      }}
                      className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
                    >
                      {copy.recommendation.apply}
                    </Button>
                  </div>
                </section>
              ) : null}

              {selectedSignal ? (
                <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white">{copy.research.title}</p>
                      <p className="text-sm leading-6 text-text-secondary">{copy.research.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void handleRunResearch()}
                        disabled={researchLoading}
                        className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
                      >
                        {researchLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {selectedResearch ? copy.research.rerun : copy.research.run}
                      </Button>
                    </div>
                  </div>

                  {researchError ? (
                    <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {researchError}
                    </div>
                  ) : null}

                  {!selectedResearch && !researchLoading ? (
                    <div className="mt-4 rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                      <p className="text-sm font-medium text-white">{copy.research.emptyTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.research.emptyMessage}</p>
                    </div>
                  ) : null}

                  {researchLoading ? (
                    <div className="mt-4 rounded-2xl border border-border-base bg-black/15 px-4 py-4 text-sm text-text-secondary">
                      {copy.research.running}
                    </div>
                  ) : null}

                  {selectedResearch ? (
                    <div className="mt-4 space-y-5">
                      <div className="grid gap-3 md:grid-cols-5">
                        <ResearchScoreCard label={copy.research.overall} value={selectedResearch.scores.overall} accent="amber" />
                        <ResearchScoreCard label={copy.research.heat} value={selectedResearch.scores.heat} accent="rose" />
                        <ResearchScoreCard label={copy.research.novelty} value={selectedResearch.scores.novelty} accent="violet" />
                        <ResearchScoreCard label={copy.research.debate} value={selectedResearch.scores.debate} accent="cyan" />
                        <ResearchScoreCard label={copy.research.practical} value={selectedResearch.scores.practical} accent="emerald" />
                      </div>

                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div className="space-y-4 rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.research.summary}</p>
                            <p className="mt-2 text-sm leading-6 text-white/85">{selectedResearch.synthesis.summary}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.research.whyNow}</p>
                            <p className="mt-2 text-sm leading-6 text-white/85">{selectedResearch.synthesis.whyNow}</p>
                          </div>
                          {selectedResearch.sourceContext ? (
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.research.sourceContext}</p>
                              <p className="mt-2 text-sm leading-6 text-white/85">{selectedResearch.sourceContext.label}</p>
                              <p className="mt-2 text-sm leading-6 text-text-secondary">{selectedResearch.sourceContext.summary}</p>
                              <ListBlock title={copy.research.sourceDetails} items={selectedResearch.sourceContext.details} />
                            </div>
                          ) : null}
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.research.bestHook}</p>
                            <p className="mt-2 text-sm leading-6 text-white">{selectedResearch.synthesis.bestHook}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.research.bestQuestion}</p>
                            <p className="mt-2 text-sm leading-6 text-white/85">{selectedResearch.synthesis.bestQuestion}</p>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-2">
                            <ListBlock title={copy.research.keyPoints} items={selectedResearch.synthesis.keyPoints} />
                            <ListBlock title={copy.research.watchouts} items={selectedResearch.synthesis.watchouts} />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.research.angles}</p>
                              <p className="mt-2 text-sm text-white">
                                {selectedResearch.synthesis.primaryAngle.label}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-text-secondary">
                                {selectedResearch.synthesis.primaryAngle.summary}
                              </p>
                              <p className="mt-2 text-xs text-text-muted">
                                {selectedResearch.synthesis.primaryAngle.audience}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => applyResearchRecommendation(selectedResearch)}
                              className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
                            >
                              {copy.research.apply}
                            </Button>
                          </div>
                          <div className="mt-4 grid gap-4 xl:grid-cols-2">
                            <ResearchModelPanel
                              title={copy.research.claude}
                              result={selectedResearch.claude}
                              copy={copy.research}
                            />
                            <ResearchModelPanel
                              title={copy.research.codex}
                              result={selectedResearch.codex}
                              copy={copy.research}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
                <p className="text-sm font-medium text-white">{copy.channels.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {copy.channels.description}
                </p>
                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  {(["threads", "x", "linkedin"] as SignalWriterTargetChannel[]).map((channelKey) => {
                    const active = selectedChannel === channelKey;
                    const channelCopy = copy.channels[channelKey];

                    return (
                      <Button
                        key={channelKey}
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedChannel(channelKey)}
                        className={[
                          "rounded-2xl border p-4 text-left h-auto flex-col items-start",
                          active
                            ? "border-amber-400/30 bg-amber-400/10"
                            : "border-border-base bg-black/15 hover:bg-white/[0.04]",
                        ].join(" ")}
                      >
                        <p className={active ? "text-sm font-medium text-amber-100" : "text-sm font-medium text-white"}>
                          {channelCopy.label}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-text-muted">{channelCopy.description}</p>
                      </Button>
                    );
                  })}
                </div>
              </section>

              <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]">
                <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
                  <p className="text-sm font-medium text-white">{copy.modes.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {copy.modes.description}
                  </p>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2 2xl:grid-cols-1">
                    {(
                      ["news-brief", "insight", "opinion", "viral"] as SignalWriterDraftMode[]
                    ).map((modeKey) => {
                      const active = selectedMode === modeKey;
                      const modeCopy = copy.modes[modeKey];

                      return (
                        <Button
                          key={modeKey}
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedMode(modeKey)}
                          className={[
                            "rounded-2xl border p-4 text-left h-auto flex-col items-start",
                            active
                              ? "border-amber-400/30 bg-amber-400/10"
                              : "border-border-base bg-black/15 hover:bg-white/[0.04]",
                          ].join(" ")}
                        >
                          <p
                            className={
                              active ? "text-sm font-medium text-amber-100" : "text-sm font-medium text-white"
                            }
                          >
                            <span>{modeCopy.label}</span>
                          </p>
                          {recommendation?.mode === modeKey ? (
                            <Badge variant="warning" size="sm" className="mt-2">
                              {copy.runners.recommended}
                            </Badge>
                          ) : null}
                          <p className="mt-2 text-xs leading-5 text-text-muted">{modeCopy.description}</p>
                        </Button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
                  <p className="text-sm font-medium text-white">{copy.runners.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {copy.runners.description}
                  </p>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {(
                      ["auto", "claude", "codex", "gemini", "openai", "template"] as SignalWriterAiRunner[]
                    ).map((runnerKey) => {
                      const active = selectedRunner === runnerKey;
                      const runnerCopy = copy.runners[runnerKey];
                      const available = runnerAvailability[runnerKey];
                      const health = runnerKey === "codex" ? runnerHealth.codex ?? null : null;

                      return (
                        <Button
                          key={runnerKey}
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedRunner(runnerKey)}
                          className={[
                            "rounded-2xl border p-4 text-left h-auto flex-col items-start",
                            active
                              ? "border-amber-400/30 bg-amber-400/10"
                              : "border-border-base bg-black/15 hover:bg-white/[0.04]",
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={active ? "text-sm font-medium text-amber-100" : "text-sm font-medium text-white"}>
                              {runnerCopy.label}
                            </p>
                            {recommendation?.runner === runnerKey ? (
                              <Badge variant="warning" size="sm">{copy.runners.recommended}</Badge>
                            ) : null}
                            {health?.status === "warn" ? (
                              <Badge variant="warning" size="sm">{copy.runners.healthWarn}</Badge>
                            ) : null}
                            {health?.status === "fail" ? (
                              <Badge variant="error" size="sm">{copy.runners.healthFail}</Badge>
                            ) : null}
                            {active ? (
                              <Badge variant="neutral" size="sm">{copy.runners.selected}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-text-muted">{runnerCopy.description}</p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                            {available ? copy.runners.available : copy.runners.unavailable}
                          </p>
                        </Button>
                      );
                    })}
                  </div>
                  {selectedRunner === "codex" && runnerHealth.codex && runnerHealth.codex.status !== "pass" ? (
                    <div
                      className={[
                        "mt-4 rounded-2xl border px-4 py-4",
                        runnerHealth.codex.status === "fail"
                          ? "border-rose-500/30 bg-rose-950/30"
                          : "border-amber-400/20 bg-amber-400/10",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{copy.runners.healthTitle}</p>
                        <Badge
                          variant={runnerHealth.codex.status === "fail" ? "error" : "warning"}
                          size="sm"
                        >
                          {runnerHealth.codex.status === "fail"
                            ? copy.runners.healthFail
                            : copy.runners.healthWarn}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text-secondary">{runnerHealth.codex.detail}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
                        <span>{copy.runners.healthRecentIssues}: {runnerHealth.codex.recentIssueCount}</span>
                        {runnerHealth.codex.lastIssueAt ? (
                          <span>
                            {copy.runners.healthLastIssue}: {formatTimestamp(runnerHealth.codex.lastIssueAt, locale)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
	              </div>
	            </>
	          )}
	          </div>
	        ) : (
          <TrendBoardSelectionView
              board={selectedBoard}
              boardError={boardError}
              boardLoading={boardLoading}
              copy={copy}
              generating={generating}
              locale={locale}
              onGenerate={() => void handleGenerateBoard()}
              onMarkAllReviewed={() =>
                setBoardReviewState((current) =>
                  markIncludedTrendBoardItemsReviewed(selectedBoard, current),
                )
              }
              onResetReview={() =>
                setBoardReviewState((current) =>
                  resetTrendBoardReviewState(selectedBoard, current),
                )
              }
              onSelectBoard={(boardId) => {
                setSelectedBoardId(boardId);
                setBoardError("");
                setGeneratedBoard(null);
              }}
              onMoveItem={(itemId, direction) =>
                setBoardOrder((current) => moveTrendBoardItem(current, itemId, direction))
              }
              onNoteChange={(itemId, value) =>
                setBoardReviewState((current) => ({
                  ...current,
                  [itemId]: {
                    ...getTrendBoardReviewState(current, itemId),
                    note: value,
                  },
                }))
              }
              onToggleIncluded={(itemId, nextValue) =>
                setBoardReviewState((current) => ({
                  ...current,
                  [itemId]: {
                    ...getTrendBoardReviewState(current, itemId),
                    included: nextValue,
                    reviewed: nextValue ? getTrendBoardReviewState(current, itemId).reviewed : false,
                  },
                }))
              }
              onToggleReviewed={(itemId, nextValue) =>
                setBoardReviewState((current) => ({
                  ...current,
                  [itemId]: {
                    ...getTrendBoardReviewState(current, itemId),
                    reviewed: nextValue,
                  },
                }))
              }
              preparedBoard={preparedBoard}
              refreshing={refreshing}
              reviewExcludedCount={boardExcludedCount}
              reviewIncludedCount={boardIncludedCount}
              reviewOrder={boardOrder}
              reviewReady={boardReadyToGenerate}
              reviewReviewedCount={boardReviewedIncludedCount}
              reviewState={boardReviewState}
              selectedBoardId={selectedBoardId}
              selectedChannel={selectedChannel}
              selectedRunner={selectedRunner}
            />
          )}
        </div>
      ) : null}

      {step === "generate" && entryMode === "signal" && selectedSignal ? (
        <section className="rounded-3xl border border-border-base bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.generate.title}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{selectedSignal.title}</h3>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{copy.generate.description}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.result.channel}</p>
              <p className="mt-2 text-sm font-medium text-white">{copy.channels[selectedChannel].label}</p>
            </div>
            <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.result.mode}</p>
              <p className="mt-2 text-sm font-medium text-white">{copy.modes[selectedMode].label}</p>
            </div>
            <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.result.runner}</p>
              <p className="mt-2 text-sm font-medium text-white">{copy.runners[selectedRunner].label}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {copy.generate.stages.map((stage, index) => {
              const state =
                index < stageIndex ? "done" : index === stageIndex ? "current" : "pending";

              return (
                <div
                  key={stage}
                  className={[
                    "flex items-center gap-3 rounded-2xl border px-4 py-3",
                    state === "done"
                      ? "border-emerald-500/20 bg-emerald-500/10"
                      : state === "current"
                        ? "border-amber-400/20 bg-amber-400/10"
                        : "border-border-base bg-black/15",
                  ].join(" ")}
                >
                  {state === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  ) : state === "current" ? (
                    <LoaderCircle className="h-5 w-5 animate-spin text-amber-200" />
                  ) : (
                    <span className="inline-block h-5 w-5 rounded-full border border-white/15" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-white">{stage}</p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {state === "done" ? copy.generate.done : state === "current" ? copy.generate.processing : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === "generate" && entryMode === "board" && selectedBoard ? (
        <section className="rounded-3xl border border-border-base bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.boards.title}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{selectedBoard.label}</h3>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{copy.boards.generatingDescription}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.boards.board}</p>
              <p className="mt-2 text-sm font-medium text-white">{selectedBoard.label}</p>
            </div>
            <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.result.channel}</p>
              <p className="mt-2 text-sm font-medium text-white">{copy.channels[selectedChannel].label}</p>
            </div>
            <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.result.runner}</p>
              <p className="mt-2 text-sm font-medium text-white">{copy.runners[selectedRunner].label}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {copy.generate.stages.map((stage, index) => {
              const state =
                index < stageIndex ? "done" : index === stageIndex ? "current" : "pending";

              return (
                <div
                  key={`board-${stage}`}
                  className={[
                    "flex items-center gap-3 rounded-2xl border px-4 py-3",
                    state === "done"
                      ? "border-emerald-500/20 bg-emerald-500/10"
                      : state === "current"
                        ? "border-amber-400/20 bg-amber-400/10"
                        : "border-border-base bg-black/15",
                  ].join(" ")}
                >
                  {state === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  ) : state === "current" ? (
                    <LoaderCircle className="h-5 w-5 animate-spin text-amber-200" />
                  ) : (
                    <span className="inline-block h-5 w-5 rounded-full border border-white/15" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-white">{stage}</p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {state === "done" ? copy.generate.done : state === "current" ? copy.generate.processing : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === "result" && entryMode === "signal" && selectedSignal && draft ? (
        <section className="space-y-5 rounded-3xl border border-border-base bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.result.title}</p>
              <h3 className="text-xl font-semibold text-white">{selectedSignal.title}</h3>
              <p className="text-sm text-text-secondary">
                {copy.result.sourceModels[draft.sourceModel]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("select")}
              >
                {copy.cta.back}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleGenerate()}
                className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
              >
                {copy.cta.regenerate}
              </Button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-5">
            <ResultBlock title={copy.result.channel}>
              <p className="text-sm font-medium text-white/90">{copy.channels[draft.channel].label}</p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                {copy.channels[draft.channel].description}
              </p>
            </ResultBlock>

            <ResultBlock title={copy.result.mode}>
              <p className="text-sm font-medium text-white/90">{copy.modes[draft.mode].label}</p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                {copy.modes[draft.mode].description}
              </p>
            </ResultBlock>

            <ResultBlock title={copy.result.runner}>
              <p className="text-sm font-medium text-white/90">
                {copy.result.sourceModels[draft.sourceModel]}
              </p>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                {copy.runners[draft.sourceModel].description}
              </p>
            </ResultBlock>

            <ResultBlock title={copy.result.angle}>
              <p className="text-sm font-medium text-white/90">{draft.angle.label}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{draft.angle.summary}</p>
            </ResultBlock>

            <ResultBlock title={copy.result.targetAudience}>
              <p className="text-sm leading-6 text-white/90">{draft.angle.audience}</p>
            </ResultBlock>
          </div>

          <ResultBlock title={copy.result.source}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-white/90">{selectedSignal.sourceName}</p>
                <p className="text-xs text-text-muted">
                  {copy.result.publishedAt}: {formatTimestamp(selectedSignal.publishedAt, locale)}
                </p>
                <p className="break-all text-xs text-text-muted">
                  {copy.result.sourceLink}: {selectedSignal.link}
                </p>
              </div>
              <a
                href={selectedSignal.link}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-base bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                {copy.result.openOriginal}
              </a>
            </div>
          </ResultBlock>

          <ResultBlock title={copy.factCheck.title}>
            <div className="space-y-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <p className="text-sm leading-6 text-text-secondary">{copy.factCheck.description}</p>
                </div>
                <div className="rounded-2xl border border-border-base bg-black/15 p-4 xl:min-w-[320px]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.factCheck.runner}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(["claude", "codex", "gemini", "openai"] as SignalWriterFactCheckRunner[]).map((runnerKey) => {
                      const active = selectedFactCheckRunner === runnerKey;
                      const available = runnerAvailability[runnerKey];

                      return (
                        <Button
                          key={runnerKey}
                          type="button"
                          variant="ghost"
                          disabled={!available || factCheckLoading}
                          onClick={() => setSelectedFactCheckRunner(runnerKey)}
                          className={[
                            "rounded-2xl border p-3 text-left h-auto flex-col items-start",
                            active
                              ? "border-amber-400/30 bg-amber-400/10"
                              : "border-border-base bg-white/[0.03] hover:bg-white/[0.04]",
                            !available ? "opacity-50" : "",
                          ].join(" ")}
                        >
                          <p className={active ? "text-sm font-medium text-amber-100" : "text-sm font-medium text-white"}>
                            {copy.runners[runnerKey].label}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-text-muted">
                            {available ? copy.runners.available : copy.runners.unavailable}
                          </p>
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={factCheckLoading || !runnerAvailability[selectedFactCheckRunner]}
                    onClick={() => void handleRunFactCheck()}
                    className="mt-4 w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
                  >
                    {factCheckLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {selectedFactCheck ? copy.factCheck.rerun : copy.factCheck.run}
                  </Button>
                </div>
              </div>

              {factCheckError ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {factCheckError}
                </div>
              ) : null}

              {!selectedFactCheck && !factCheckLoading ? (
                <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                  <p className="text-sm font-medium text-white">{copy.factCheck.emptyTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.factCheck.emptyMessage}</p>
                </div>
              ) : null}

              {factCheckLoading ? (
                <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-4 text-sm text-text-secondary">
                  {copy.factCheck.running}
                </div>
              ) : null}

              {selectedFactCheck ? (
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                    <article className="rounded-2xl border border-border-base bg-black/15 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.factCheck.verdict}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Badge
                          variant={selectedFactCheck.verdict === "pass" ? "neutral" : "warning"}
                          size="sm"
                        >
                          {{
                            pass: copy.factCheck.pass,
                            mixed: copy.factCheck.mixed,
                            fail: copy.factCheck.fail,
                          }[selectedFactCheck.verdict]}
                        </Badge>
                        <span className="text-sm text-text-secondary">
                          {copy.factCheck.confidence}: {selectedFactCheck.confidence}%
                        </span>
                      </div>
                    </article>

                    <article className="rounded-2xl border border-border-base bg-black/15 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.factCheck.summary}</p>
                      <p className="mt-3 text-sm leading-6 text-white/90">{selectedFactCheck.summary}</p>
                      {selectedFactCheck.sourceContext ? (
                        <div className="mt-4">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.factCheck.sourceContext}</p>
                          <p className="mt-2 text-sm text-white/90">{selectedFactCheck.sourceContext.label}</p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">{selectedFactCheck.sourceContext.summary}</p>
                        </div>
                      ) : null}
                    </article>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.factCheck.findings}</p>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      {selectedFactCheck.findings.length > 0 ? selectedFactCheck.findings.map((finding, index) => (
                        <FactCheckFindingCard
                          key={`${selectedFactCheck.draftId}-${selectedFactCheck.runner}-${index}`}
                          finding={finding}
                          copy={copy.factCheck}
                        />
                      )) : (
                        <article className="rounded-2xl border border-border-base bg-black/15 p-4 text-sm leading-6 text-text-secondary">
                          {copy.factCheck.pass}
                        </article>
                      )}
                    </div>
                  </div>

                  <article className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.factCheck.rewriteBrief}</p>
                    <p className="mt-3 text-sm leading-6 text-white/90">{selectedFactCheck.rewriteBrief}</p>
                  </article>

                  {selectedFactCheck.verdict !== "pass" || selectedFactCheck.findings.some((item) => item.status !== "supported") ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={generating}
                        onClick={() => handleRegenerateFromFactCheck(selectedFactCheck)}
                        className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
                      >
                        {copy.cta.regenerateWithFactCheck}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </ResultBlock>

          <ResultBlock title={copy.result.quality}>
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  {copy.result.qualityTotal}
                </p>
                <p className="mt-3 text-4xl font-semibold text-amber-100">{draft.quality.total}</p>
                <p className="mt-2 text-sm text-text-secondary">
                  {copy.result.qualityLevels[draft.quality.level]}
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {draft.quality.dimensions.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border-base bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <span className="rounded-full border border-border-base px-2.5 py-1 text-xs text-text-secondary">
                        {item.score}/10
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">{item.reason}</p>
                  </article>
                ))}
              </div>
            </div>
          </ResultBlock>

          <ResultBlock title={copy.result.hook}>
            <p className="text-sm leading-6 text-white/90">{draft.hook}</p>
          </ResultBlock>

          <ResultBlock title={copy.result.hookVariants}>
            <div className="grid gap-3 lg:grid-cols-3">
              {draft.hookVariants.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border-base bg-black/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{item.intent}</p>
                      <p className="mt-2 text-sm leading-6 text-white/90">{item.text}</p>
                    </div>
                    <CopyButton value={item.text} label={copy.result.copyHook} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {normalizeSignalWriterText(item.text) === normalizeSignalWriterText(draft.hook) ? (
                      <Badge variant="warning" size="sm">{copy.result.currentHook}</Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={generating}
                        onClick={() => void handleGenerate(item.text)}
                        className="rounded-full border border-border-base bg-white/5 px-3 text-white/85 hover:bg-white/10"
                      >
                        {copy.result.rewriteFromHook}
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </ResultBlock>

          <ResultBlock
            title={copy.result.shortPost}
            action={<CopyButton value={draft.shortPost} label={copy.result.copyShort} />}
          >
            <pre className="whitespace-pre-wrap text-sm leading-6 text-white/90">{draft.shortPost}</pre>
          </ResultBlock>

          <ResultBlock
            title={copy.result.thread}
            action={
              <CopyButton
                value={draft.threadPosts.join("\n\n")}
                label={copy.result.copyThread}
              />
            }
          >
            <div className="space-y-3">
              {draft.threadPosts.map((item, index) => (
                <article key={`${draft.id}-${index}`} className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{item}</p>
                </article>
              ))}
            </div>
          </ResultBlock>

          <div className="grid gap-5 lg:grid-cols-2">
            <ResultBlock title={copy.result.hashtags}>
              <div className="flex flex-wrap gap-2">
                {draft.hashtags.map((tag) => (
                  <Badge key={tag} variant="neutral">#{tag}</Badge>
                ))}
              </div>
            </ResultBlock>

            <ResultBlock title={copy.result.whyNow}>
              <p className="text-sm leading-6 text-white/90">{draft.whyNow}</p>
            </ResultBlock>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ResultBlock title={copy.result.timing}>
              <div className="space-y-3">
                <article className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                    {copy.result.primaryWindow}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {draft.timingRecommendation.primaryWindow.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {draft.timingRecommendation.primaryWindow.description}
                  </p>
                </article>
                {draft.timingRecommendation.secondaryWindow ? (
                  <article className="rounded-2xl border border-border-base bg-black/15 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                      {copy.result.secondaryWindow}
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {draft.timingRecommendation.secondaryWindow.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {draft.timingRecommendation.secondaryWindow.description}
                    </p>
                  </article>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <Badge variant={draft.timingRecommendation.basis === "history" ? "warning" : "neutral"} size="sm">
                    {copy.result.timingBasis[draft.timingRecommendation.basis]}
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-white/90">{draft.timingRecommendation.reason}</p>
              </div>
            </ResultBlock>

            <ResultBlock title={copy.result.replyKit}>
              <div className="space-y-4">
                <article className="rounded-2xl border border-border-base bg-black/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                        {copy.result.firstComment}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">
                        {draft.firstComment}
                      </p>
                    </div>
                    <CopyButton value={draft.firstComment} label={copy.result.copyComment} />
                  </div>
                </article>
                <article className="rounded-2xl border border-border-base bg-black/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                      {copy.result.followUpReplies}
                    </p>
                    <CopyButton
                      value={draft.followUpReplies.join("\n\n")}
                      label={copy.result.copyReplies}
                    />
                  </div>
                  <div className="mt-3 space-y-3">
                    {draft.followUpReplies.map((item, index) => (
                      <div
                        key={`${draft.id}-follow-up-${index}`}
                        className="rounded-2xl border border-border-base bg-white/[0.03] px-4 py-3"
                      >
                        <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{item}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </ResultBlock>
          </div>

          <ResultBlock title={copy.result.postingTips}>
            <ul className="space-y-2">
              {draft.postingTips.map((tip) => (
                <li key={tip} className="text-sm leading-6 text-white/90">
                  - {tip}
                </li>
              ))}
            </ul>
          </ResultBlock>

          <ResultBlock title={copy.result.performance.title}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                <p className="text-sm leading-6 text-text-secondary">
                  {copy.result.performance.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                  <span>{copy.result.performance.currentHook}: {draft.hook}</span>
                  {performanceCount > 0 ? (
                    <span>{copy.result.performance.savedCount(performanceCount)}</span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
                    {copy.result.performance.postUrl}
                  </span>
                  <input
                    value={performanceForm.postUrl}
                    onChange={(event) =>
                      setPerformanceForm((current) => ({ ...current, postUrl: event.target.value }))
                    }
                    placeholder={copy.result.performance.postUrlPlaceholder}
                    className="w-full rounded-2xl border border-border-base bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-text-muted/70 focus:border-amber-400/30"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
                    {copy.result.performance.postedAt}
                  </span>
                  <input
                    type="datetime-local"
                    value={performanceForm.postedAt}
                    onChange={(event) =>
                      setPerformanceForm((current) => ({ ...current, postedAt: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-border-base bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-text-muted/70 focus:border-amber-400/30"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
                    {copy.result.performance.notes}
                  </span>
                  <input
                    value={performanceForm.notes}
                    onChange={(event) =>
                      setPerformanceForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder={copy.result.performance.notesPlaceholder}
                    className="w-full rounded-2xl border border-border-base bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-text-muted/70 focus:border-amber-400/30"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {([
                  ["views", copy.result.performance.views],
                  ["likes", copy.result.performance.likes],
                  ["replies", copy.result.performance.replies],
                  ["reposts", copy.result.performance.reposts],
                  ["saves", copy.result.performance.saves],
                ] as const).map(([field, label]) => (
                  <label key={field} className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-text-muted">{label}</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={performanceForm[field]}
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-border-base bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-text-muted/70 focus:border-amber-400/30"
                    />
                  </label>
                ))}
              </div>

              {performanceError ? (
                <p className="text-sm text-rose-300">{performanceError}</p>
              ) : null}

              {performanceEntry ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                  <p className="text-sm font-medium text-emerald-100">
                    {copy.result.performance.latestSaved}
                  </p>
                  <div className="mt-3 grid gap-3 text-sm text-emerald-50/90 md:grid-cols-2 xl:grid-cols-3">
                    {performanceEntry.postedAt ? (
                      <span>{copy.result.performance.postedAt}: {formatTimestamp(performanceEntry.postedAt, locale)}</span>
                    ) : null}
                    <span>{copy.result.performance.views}: {performanceEntry.views}</span>
                    <span>{copy.result.performance.likes}: {performanceEntry.likes}</span>
                    <span>{copy.result.performance.replies}: {performanceEntry.replies}</span>
                    <span>{copy.result.performance.reposts}: {performanceEntry.reposts}</span>
                    <span>{copy.result.performance.saves}: {performanceEntry.saves}</span>
                    <span>{formatTimestamp(performanceEntry.capturedAt, locale)}</span>
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleSavePerformance()}
                disabled={performanceSaving || !draft.jsonPath}
                className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 text-amber-100 hover:bg-amber-400/15 disabled:border-border-base disabled:bg-white/[0.03] disabled:text-text-muted"
              >
                {performanceSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {performanceSaving
                  ? copy.result.performance.saving
                  : copy.result.performance.save}
              </Button>
            </div>
          </ResultBlock>

          <ResultBlock title={copy.result.visuals}>
            <div className="grid gap-5 xl:grid-cols-2">
              <article className="space-y-3 rounded-2xl border border-border-base bg-black/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{copy.result.sourceImage}</p>
                    <p className="mt-1 text-xs leading-5 text-text-muted">{copy.result.sourceImageHint}</p>
                  </div>
                  <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                </div>
                {selectedSignal.thumbnailUrl ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-border-base bg-black/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedSignal.thumbnailUrl}
                        alt={selectedSignal.title}
                        className="h-[360px] w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <a
                      href={selectedSignal.thumbnailUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 rounded-2xl border border-border-base bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {copy.result.openSourceImage}
                    </a>
                  </>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border-base bg-black/10 px-4 py-6 text-sm text-text-muted">
                    {copy.result.noSourceImage}
                  </p>
                )}
              </article>

              <article className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{copy.result.generatedCover}</p>
                    <p className="mt-1 text-xs leading-5 text-text-muted">{copy.result.generatedCoverHint}</p>
                  </div>
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" />
                </div>
                {draft.coverImageUrl ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-border-base bg-black/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={draft.coverImageUrl}
                        alt={`${selectedSignal.title} cover`}
                        className="h-[360px] w-full object-cover"
                      />
                    </div>
                    <div className="space-y-2 rounded-2xl border border-border-base bg-black/15 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                        {copy.result.visualStrategy}
                      </p>
                      <p className="text-sm text-white/90">{draft.visualStrategy.badge}</p>
                      <p className="text-xs leading-5 text-text-muted">
                        {draft.visualStrategy.headline}
                      </p>
                    </div>
                    <a
                      href={draft.coverImageUrl}
                      download={`${selectedSignal.id}-signal-cover.png`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-400/15"
                    >
                      <Download className="h-4 w-4" />
                      {copy.result.downloadCover}
                    </a>
                  </>
                ) : null}
              </article>
            </div>
          </ResultBlock>

          {(draft.markdownPath || draft.jsonPath) ? (
            <ResultBlock title={copy.result.saved}>
              <div className="space-y-1 text-sm text-white/80">
                {draft.markdownPath ? <p>{draft.markdownPath}</p> : null}
                {draft.jsonPath ? <p>{draft.jsonPath}</p> : null}
              </div>
            </ResultBlock>
          ) : null}
        </section>
      ) : null}

      {step === "result" && entryMode === "board" && selectedBoard && boardDraft ? (
        <TrendBoardResultView
          board={generatedBoard ?? selectedBoard}
          copy={copy}
          draft={boardDraft}
          locale={locale}
          onBack={() => setStep("select")}
          onRegenerate={() => void handleGenerateBoard()}
        />
      ) : null}
    </section>
  );
}

function TrendBoardSelectionView({
  board,
  boardError,
  boardLoading,
  copy,
  generating,
  locale,
  onGenerate,
  onMarkAllReviewed,
  onMoveItem,
  onNoteChange,
  onResetReview,
  onSelectBoard,
  onToggleIncluded,
  onToggleReviewed,
  preparedBoard,
  refreshing,
  reviewExcludedCount,
  reviewIncludedCount,
  reviewOrder,
  reviewReady,
  reviewReviewedCount,
  reviewState,
  selectedBoardId,
  selectedChannel,
  selectedRunner,
}: {
  board: SignalWriterTrendBoard | null;
  boardError: string;
  boardLoading: boolean;
  copy: ReturnType<typeof getSignalWriterCopy>;
  generating: boolean;
  locale: "ko" | "en";
  onGenerate: () => void;
  onMarkAllReviewed: () => void;
  onMoveItem: (itemId: string, direction: "up" | "down") => void;
  onNoteChange: (itemId: string, value: string) => void;
  onResetReview: () => void;
  onSelectBoard: (boardId: SignalWriterTrendBoardId) => void;
  onToggleIncluded: (itemId: string, nextValue: boolean) => void;
  onToggleReviewed: (itemId: string, nextValue: boolean) => void;
  preparedBoard: SignalWriterTrendBoard | null;
  refreshing: boolean;
  reviewExcludedCount: number;
  reviewIncludedCount: number;
  reviewOrder: string[];
  reviewReady: boolean;
  reviewReviewedCount: number;
  reviewState: Record<string, TrendBoardReviewState>;
  selectedBoardId: SignalWriterTrendBoardId;
  selectedChannel: SignalWriterTargetChannel;
  selectedRunner: SignalWriterAiRunner;
}) {
  const presets: SignalWriterTrendBoardId[] = ["github", "npm", "frontend", "backend", "fullstack", "skills"];
  const orderedItems = useMemo(() => {
    if (!board) {
      return [];
    }

    const byId = new Map(board.items.map((item) => [item.id, item]));
    const resolvedOrder = reviewOrder.length > 0 ? reviewOrder : board.items.map((item) => item.id);
    return resolvedOrder
      .map((itemId) => byId.get(itemId))
      .filter((item): item is SignalWriterTrendBoard["items"][number] => Boolean(item));
  }, [board, reviewOrder]);

  return (
    <>
      <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-white">{copy.boards.title}</p>
          <p className="text-sm leading-6 text-text-secondary">{copy.boards.description}</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {presets.map((boardId) => {
            const active = boardId === selectedBoardId;
            return (
              <Button
                key={boardId}
                type="button"
                variant="ghost"
                onClick={() => onSelectBoard(boardId)}
                className={[
                  "rounded-2xl border p-4 text-left h-auto flex-col items-start",
                  active
                    ? "border-amber-400/30 bg-amber-400/10"
                    : "border-border-base bg-black/15 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <p className={active ? "text-sm font-medium text-amber-100" : "text-sm font-medium text-white"}>
                  {formatTrendBoardPresetLabel(boardId, locale)}
                </p>
              </Button>
            );
          })}
        </div>
      </section>

      {boardError ? (
        <ErrorCard
          title={copy.boards.title}
          message={boardError}
        />
      ) : null}

      {boardLoading ? (
        <section className="rounded-3xl border border-border-base bg-white/[0.03] p-6 text-sm text-text-secondary">
          {copy.boards.loading}
        </section>
      ) : null}

      {!boardLoading && board ? (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <section className="space-y-4">
              <div className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">{copy.boards.current}</p>
                    <h3 className="text-xl font-semibold text-white">{board.label}</h3>
                    <p className="text-sm leading-6 text-text-secondary">{board.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="warning" size="sm">{copy.boards.count(board.items.length)}</Badge>
                    {refreshing ? <Badge variant="neutral" size="sm">{copy.refresh}</Badge> : null}
                  </div>
                </div>
              </div>

              <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5">
                <p className="text-sm font-medium text-white">{copy.boards.evidence}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.boards.reviewerMessage}</p>
                <div className="mt-4 space-y-3">
                  {orderedItems.map((item, index) => (
                    <article key={item.id} className="rounded-2xl border border-border-base bg-black/15 p-4">
                      {(() => {
                        const review = getTrendBoardReviewState(reviewState, item.id);
                        return (
                          <>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="warning" size="sm">#{index + 1}</Badge>
                                  <Badge variant="neutral" size="sm">{item.categoryLabel}</Badge>
                                  <Badge variant="neutral" size="sm">{item.sourceName}</Badge>
                                  {review.included ? (
                                    review.reviewed ? (
                                      <Badge variant="success" size="sm">{copy.boards.reviewed}</Badge>
                                    ) : (
                                      <Badge variant="warning" size="sm">{copy.boards.reviewPending}</Badge>
                                    )
                                  ) : (
                                    <Badge variant="neutral" size="sm">{copy.boards.excluded}</Badge>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                                  <p className="mt-2 text-sm leading-6 text-text-secondary">{item.summary}</p>
                                </div>
                              </div>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-2 rounded-2xl border border-border-base bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                              >
                                <ExternalLink className="h-4 w-4" />
                                {copy.boards.sourceLink}
                              </a>
                            </div>
                            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                              <div className="rounded-2xl border border-border-base bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.boards.facts}</p>
                                <ul className="mt-3 space-y-2">
                                  {item.facts.map((fact) => (
                                    <li key={fact} className="text-sm leading-6 text-white/90">
                                      - {fact}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="space-y-4">
                                <div className="rounded-2xl border border-border-base bg-white/[0.03] p-4">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.boards.sourceContext}</p>
                                  {item.sourceContext ? (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-sm font-medium text-white">{item.sourceContext.label}</p>
                                      <p className="text-sm leading-6 text-text-secondary">{item.sourceContext.summary}</p>
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {item.sourceContext.author ? (
                                          <Badge variant="neutral" size="sm">{item.sourceContext.author}</Badge>
                                        ) : null}
                                        {item.sourceContext.publishedAt ? (
                                          <Badge variant="neutral" size="sm">
                                            {formatTimestamp(item.sourceContext.publishedAt, locale)}
                                          </Badge>
                                        ) : (
                                          <Badge variant="neutral" size="sm">
                                            {formatTimestamp(item.publishedAt, locale)}
                                          </Badge>
                                        )}
                                        {item.sourceContext.topics.slice(0, 3).map((topic) => (
                                          <Badge key={topic} variant="neutral" size="sm">{topic}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-3 text-sm leading-6 text-text-secondary">
                                      {item.sourceName} · {formatTimestamp(item.publishedAt, locale)}
                                    </p>
                                  )}
                                </div>
                                {item.sourceContext?.details.length ? (
                                  <div className="rounded-2xl border border-border-base bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                                      {copy.boards.sourceDetails}
                                    </p>
                                    <ul className="mt-3 space-y-2">
                                      {item.sourceContext.details.map((detail) => (
                                        <li key={detail} className="text-sm leading-6 text-white/85">
                                          - {detail}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-4 rounded-2xl border border-border-base bg-white/[0.03] p-4">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                                {copy.boards.reviewNote}
                              </p>
                              <textarea
                                value={review.note}
                                onChange={(event) => onNoteChange(item.id, event.target.value)}
                                placeholder={copy.boards.reviewNotePlaceholder}
                                className="mt-3 min-h-24 w-full rounded-2xl border border-border-base bg-black/15 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-text-muted focus:border-amber-400/30"
                              />
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <div className="inline-flex items-center gap-2 rounded-2xl border border-border-base bg-white/[0.03] px-2 py-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === 0}
                                  onClick={() => onMoveItem(item.id, "up")}
                                  className="h-8 w-8 rounded-xl"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={index === orderedItems.length - 1}
                                  onClick={() => onMoveItem(item.id, "down")}
                                  className="h-8 w-8 rounded-xl"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                              <label className="inline-flex items-center gap-2 rounded-2xl border border-border-base bg-white/[0.03] px-4 py-2 text-sm text-white/90">
                                <input
                                  type="checkbox"
                                  checked={review.included}
                                  onChange={(event) => onToggleIncluded(item.id, event.target.checked)}
                                  className="h-4 w-4 rounded border-white/20 bg-black/20 accent-amber-300"
                                />
                                {copy.boards.include}
                              </label>
                              <label className="inline-flex items-center gap-2 rounded-2xl border border-border-base bg-white/[0.03] px-4 py-2 text-sm text-white/90">
                                <input
                                  type="checkbox"
                                  checked={review.reviewed}
                                  disabled={!review.included}
                                  onChange={(event) => onToggleReviewed(item.id, event.target.checked)}
                                  className="h-4 w-4 rounded border-white/20 bg-black/20 accent-emerald-300 disabled:opacity-40"
                                />
                                {copy.boards.reviewed}
                              </label>
                            </div>
                          </>
                        );
                      })()}
                    </article>
                  ))}
                </div>
              </section>
            </section>

            <section className="rounded-3xl border border-border-base bg-white/[0.03] p-5 xl:sticky xl:top-24">
              <div>
                <p className="text-sm font-medium text-white">{copy.setup.title}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.setup.description}</p>
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.boards.board}</p>
                  <p className="mt-3 text-sm font-medium text-white">{board.label}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{board.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <SignalSetupMetric
                    label={copy.setup.channel}
                    value={copy.channels[selectedChannel].label}
                    description={copy.channels[selectedChannel].description}
                  />
                  <SignalSetupMetric
                    label={copy.setup.runner}
                    value={copy.runners[selectedRunner].label}
                    description={copy.runners[selectedRunner].description}
                  />
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-4">
                  <p className="text-sm font-medium text-white">{copy.boards.reviewerTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.boards.reviewerMessage}</p>
                </div>
                <div className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{copy.boards.reviewStatus}</p>
                  <p className="mt-3 text-sm font-medium text-white">
                    {copy.boards.reviewProgress(reviewReviewedCount, reviewIncludedCount, board.items.length)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {reviewExcludedCount > 0
                      ? copy.boards.excludedSummary(reviewExcludedCount)
                      : copy.boards.readySummary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={onMarkAllReviewed}>
                      <CheckCircle2 className="h-4 w-4" />
                      {copy.boards.markAllReviewed}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onResetReview}>
                      {copy.boards.resetReview}
                    </Button>
                  </div>
                </div>
                {!reviewReady ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-4">
                    <p className="text-sm leading-6 text-text-secondary">{copy.boards.reviewRequired}</p>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={generating || !preparedBoard || preparedBoard.items.length === 0 || !reviewReady}
                onClick={onGenerate}
                className="mt-5 w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-medium text-amber-100 hover:bg-amber-400/15 disabled:border-border-base disabled:bg-white/[0.03] disabled:text-text-muted h-auto"
              >
                <Sparkles className="h-4 w-4" />
                {copy.boards.generate}
              </Button>
            </section>
          </div>
        </>
      ) : null}

      {!boardLoading && !board && !boardError ? (
        <section className="rounded-3xl border border-border-base bg-white/[0.03] p-6">
          <p className="text-sm font-medium text-white">{copy.boards.emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.boards.emptyMessage}</p>
        </section>
      ) : null}
    </>
  );
}

function TrendBoardResultView({
  board,
  copy,
  draft,
  locale,
  onBack,
  onRegenerate,
}: {
  board: SignalWriterTrendBoard;
  copy: ReturnType<typeof getSignalWriterCopy>;
  draft: SignalWriterTrendBoardDraft;
  locale: "ko" | "en";
  onBack: () => void;
  onRegenerate: () => void;
}) {
  return (
    <section className="space-y-5 rounded-3xl border border-border-base bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.boards.resultTitle}</p>
          <h3 className="text-xl font-semibold text-white">{draft.title}</h3>
          <p className="text-sm text-text-secondary">{copy.result.sourceModels[draft.sourceModel]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onBack}>
            {copy.cta.back}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onRegenerate}
            className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
          >
            {copy.cta.regenerate}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ResultBlock title={copy.boards.board}>
          <p className="text-sm font-medium text-white/90">{board.label}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{board.description}</p>
        </ResultBlock>
        <ResultBlock title={copy.result.channel}>
          <p className="text-sm font-medium text-white/90">{copy.channels[draft.channel].label}</p>
          <p className="mt-2 text-xs leading-5 text-text-muted">{copy.channels[draft.channel].description}</p>
        </ResultBlock>
        <ResultBlock title={copy.boards.generatedWith}>
          <p className="text-sm font-medium text-white/90">{copy.result.sourceModels[draft.sourceModel]}</p>
          <p className="mt-2 text-xs leading-5 text-text-muted">{formatTimestamp(draft.generatedAt, locale)}</p>
        </ResultBlock>
      </div>

      <ResultBlock title={copy.boards.boardSummary}>
        <p className="text-sm leading-6 text-white/90">{draft.boardSummary}</p>
      </ResultBlock>

      <ResultBlock title={copy.result.hook}>
        <p className="text-sm leading-6 text-white/90">{draft.hook}</p>
      </ResultBlock>

      <ResultBlock
        title={copy.result.shortPost}
        action={<CopyButton value={draft.shortPost} label={copy.result.copyShort} />}
      >
        <pre className="whitespace-pre-wrap text-sm leading-6 text-white/90">{draft.shortPost}</pre>
      </ResultBlock>

      <ResultBlock
        title={copy.result.thread}
        action={<CopyButton value={draft.threadPosts.join("\n\n")} label={copy.result.copyThread} />}
      >
        <div className="space-y-3">
          {draft.threadPosts.map((item, index) => (
            <article key={`${draft.id}-${index}`} className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{item}</p>
            </article>
          ))}
        </div>
      </ResultBlock>

      <div className="grid gap-5 lg:grid-cols-2">
        <ResultBlock title={copy.result.replyKit}>
          <div className="space-y-4">
            <article className="rounded-2xl border border-border-base bg-black/15 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                    {copy.result.firstComment}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{draft.firstComment}</p>
                </div>
                <CopyButton value={draft.firstComment} label={copy.result.copyComment} />
              </div>
            </article>
            <article className="rounded-2xl border border-border-base bg-black/15 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                  {copy.result.followUpReplies}
                </p>
                <CopyButton value={draft.followUpReplies.join("\n\n")} label={copy.result.copyReplies} />
              </div>
              <div className="mt-3 space-y-3">
                {draft.followUpReplies.map((item, index) => (
                  <div key={`${draft.id}-reply-${index}`} className="rounded-2xl border border-border-base bg-white/[0.03] px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{item}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </ResultBlock>

        <div className="space-y-5">
          <ResultBlock title={copy.result.hashtags}>
            <div className="flex flex-wrap gap-2">
              {draft.hashtags.map((tag) => (
                <Badge key={tag} variant="neutral">#{tag}</Badge>
              ))}
            </div>
          </ResultBlock>

          <ResultBlock title={copy.result.whyNow}>
            <p className="text-sm leading-6 text-white/90">{draft.whyNow}</p>
          </ResultBlock>

          <ResultBlock title={copy.result.postingTips}>
            <ul className="space-y-2">
              {draft.postingTips.map((tip) => (
                <li key={tip} className="text-sm leading-6 text-white/90">
                  - {tip}
                </li>
              ))}
            </ul>
          </ResultBlock>
        </div>
      </div>

      <ResultBlock title={copy.boards.evidencePack}>
        <div className="space-y-3">
          {board.items.map((item) => (
            <article key={`${board.id}-${item.id}`} className="rounded-2xl border border-border-base bg-black/15 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="warning" size="sm">#{item.rank}</Badge>
                    <Badge variant="neutral" size="sm">{item.categoryLabel}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{item.summary}</p>
                  <ul className="mt-3 space-y-2">
                    {item.facts.map((fact) => (
                      <li key={fact} className="text-sm leading-6 text-white/85">
                        - {fact}
                      </li>
                    ))}
                  </ul>
                  {item.reviewNote ? (
                    <div className="mt-4 rounded-2xl border border-border-base bg-white/[0.03] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
                        {copy.boards.reviewNote}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/85">{item.reviewNote}</p>
                    </div>
                  ) : null}
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border-base bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  {copy.boards.sourceLink}
                </a>
              </div>
            </article>
          ))}
        </div>
      </ResultBlock>
    </section>
  );
}

async function loadRunnerAvailability(
  locale: "ko" | "en",
  setRunnerAvailability: (value: SignalWriterRunnerAvailability) => void,
  setRunnerHealth: (value: SignalWriterRunnerHealthMap) => void,
) {
  try {
    const response = await fetch("/api/system/runtime", {
      cache: "no-store",
      headers: {
        "x-dashboard-locale": locale,
      },
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as Partial<DashboardLabRuntimeSummaryResponse>;
    const checks = new Map((payload.checks ?? []).map((item) => [item.id, item.status]));
    const codexHealth = payload.runnerHealth?.codex;

    setRunnerAvailability({
      auto: true,
      claude: checks.get("claude") === "pass",
      codex: checks.get("codex") === "pass",
      gemini: checks.get("gemini") === "pass",
      openai: Boolean(payload.integrations?.openaiConfigured),
      template: true,
    });
    setRunnerHealth(codexHealth ? { codex: codexHealth } : {});
  } catch {
    // Keep default availability when runtime diagnostics are unavailable.
  }
}

function ResultBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-border-base bg-black/15 p-5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium uppercase tracking-[0.18em] text-text-muted">{title}</h4>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function SignalWriterActionErrorBanner({
  error,
  copy,
  canUseClaude,
  onRetry,
  onSwitchToClaude,
  onSwitchToTemplate,
}: {
  error: SignalWriterActionError;
  copy: {
    title: string;
    description: string;
    retry: string;
    switchClaude: string;
    switchTemplate: string;
  };
  canUseClaude: boolean;
  onRetry: () => void;
  onSwitchToClaude: () => void;
  onSwitchToTemplate: () => void;
}) {
  return (
    <section className="rounded-3xl border border-amber-400/30 bg-amber-500/[0.08] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning" size="sm">Codex</Badge>
            <p className="text-sm font-medium text-amber-100">{copy.title}</p>
          </div>
          <p className="text-sm leading-6 text-white/90">{error.message}</p>
          <p className="text-sm leading-6 text-text-secondary">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onRetry}
            className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-amber-100 hover:bg-amber-400/15"
          >
            {copy.retry}
          </Button>
          {canUseClaude ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onSwitchToClaude}
              className="rounded-2xl border border-border-base bg-white/5 px-4 text-white/90 hover:bg-white/10"
            >
              {copy.switchClaude}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={onSwitchToTemplate}
            className="rounded-2xl border border-border-base bg-white/5 px-4 text-white/90 hover:bg-white/10"
          >
            {copy.switchTemplate}
          </Button>
        </div>
      </div>
    </section>
  );
}

function SignalSetupMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <article className="rounded-2xl border border-border-base bg-black/15 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
      {description ? <p className="mt-2 text-xs leading-5 text-text-muted">{description}</p> : null}
    </article>
  );
}

function ResearchScoreCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "rose" | "violet" | "cyan" | "emerald";
}) {
  const accentClass = {
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-100",
    violet: "border-violet-400/20 bg-violet-400/10 text-violet-100",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  }[accent];

  return (
    <article className={`rounded-2xl border px-4 py-3 ${accentClass}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-current/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-current">{value}</p>
    </article>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.length > 0 ? items.map((item) => (
          <li key={item} className="text-sm leading-6 text-white/85">- {item}</li>
        )) : (
          <li className="text-sm leading-6 text-text-muted">-</li>
        )}
      </ul>
    </div>
  );
}

function ResearchModelPanel({
  title,
  result,
  copy,
}: {
  title: string;
  result: SignalWriterResearchModelResult;
  copy: {
    hooks: string;
    angles: string;
    questions: string;
    watchouts: string;
    fallback: string;
    unavailable: string;
    failed: string;
  };
}) {
  const statusLabel = {
    completed: result.runner === "template" ? copy.fallback : result.runner === "claude" ? "Claude" : "Codex",
    fallback: copy.fallback,
    unavailable: copy.unavailable,
    failed: copy.failed,
  }[result.status];

  return (
    <article className="rounded-2xl border border-border-base bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white">{title}</p>
        <Badge variant={result.status === "completed" ? "neutral" : "warning"} size="sm">
          {statusLabel}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{result.summary}</p>
      <div className="mt-3 grid gap-3">
        <ListBlock title={copy.hooks} items={result.hooks} />
        <ListBlock
          title={copy.angles}
          items={result.angles.map((item) => `${item.label}: ${item.summary}`)}
        />
        <ListBlock title={copy.questions} items={result.questions} />
        <ListBlock title={copy.watchouts} items={result.watchouts} />
      </div>
    </article>
  );
}

function FactCheckFindingCard({
  finding,
  copy,
}: {
  finding: SignalWriterFactCheckResult["findings"][number];
  copy: {
    supported: string;
    uncertain: string;
    incorrect: string;
  };
}) {
  const toneClass = {
    supported: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    uncertain: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    incorrect: "border-rose-500/20 bg-rose-500/10 text-rose-100",
  }[finding.status];

  return (
    <article className="rounded-2xl border border-border-base bg-black/15 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-6 text-white">{finding.claim}</p>
        <Badge variant="neutral" size="sm" className={toneClass}>
          {{
            supported: copy.supported,
            uncertain: copy.uncertain,
            incorrect: copy.incorrect,
          }[finding.status]}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{finding.reason}</p>
      <p className="mt-3 text-sm leading-6 text-white/90">{finding.suggestedFix}</p>
    </article>
  );
}

function getFactCheckCacheKey(draftId: string, runner: SignalWriterFactCheckRunner) {
  return `${draftId}:${runner}`;
}

function getPreferredFactCheckRunner(
  currentRunner: SignalWriterFactCheckRunner,
  preferredRunner: SignalWriterAiRunner | null,
  runnerAvailability: SignalWriterRunnerAvailability,
): SignalWriterFactCheckRunner {
  const availableRunners = (["claude", "codex", "gemini", "openai"] as SignalWriterFactCheckRunner[])
    .filter((runner) => runnerAvailability[runner]);

  if (availableRunners.length === 0) {
    return currentRunner;
  }

  if (runnerAvailability[currentRunner]) {
    return currentRunner;
  }

  if (
    preferredRunner &&
    preferredRunner !== "auto" &&
    preferredRunner !== "template" &&
    runnerAvailability[preferredRunner]
  ) {
    return preferredRunner;
  }

  return availableRunners[0];
}

async function loadSignals(
  locale: "ko" | "en",
  setSignals: (value: SignalWriterSignal[]) => void,
  setSignalMix: (value: SignalWriterMixSummary) => void,
  setSelectedId: Dispatch<SetStateAction<string | null>>,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  forceRefresh: boolean,
  options?: { background?: boolean },
) {
  if (!options?.background) {
    setLoading(true);
    setError("");
  }

  try {
    const response = await fetch(`/api/signal-writer/signals${forceRefresh ? "?refresh=1" : ""}`, {
      cache: "no-store",
      headers: {
        "x-dashboard-locale": locale,
      },
    });

    const payload = (await response.json()) as Partial<SignalWriterSignalsResponse> & {
      error?: string;
    };

    if (!response.ok || !Array.isArray(payload.items)) {
      throw new Error(payload.error || getSignalWriterCopy(locale).loadError);
    }

    const autoSignals = payload.items;

    const pickedSignals = Object.values(readSignalWriterPicks())
      .sort((left, right) => {
        const leftTimestamp = Date.parse(left.pickedAt);
        const rightTimestamp = Date.parse(right.pickedAt);
        return (Number.isNaN(rightTimestamp) ? 0 : rightTimestamp)
          - (Number.isNaN(leftTimestamp) ? 0 : leftTimestamp);
      })
      .map((entry) => {
        const manualSignal = toSignalWriterSignal(entry.feedItem, locale, "manual");
        const matchedAutoSignal = autoSignals.find(
          (item) =>
            item.id === manualSignal.id ||
            normalizeSignalWriterText(item.link || item.title) ===
              normalizeSignalWriterText(manualSignal.link || manualSignal.title),
        );

        return matchedAutoSignal
          ? {
              ...manualSignal,
              score: matchedAutoSignal.score,
              performanceSummary: matchedAutoSignal.performanceSummary,
            }
          : manualSignal;
      });

    const { items: nextSignals, summary } = buildSignalPool(pickedSignals, autoSignals);

    setSignals(nextSignals);
    setSignalMix(summary);
    setSelectedId((current) =>
      nextSignals.some((item) => item.id === current) ? current : nextSignals[0]?.id ?? null,
    );
  } catch (nextError) {
    if (!options?.background) {
      setError(
        nextError instanceof Error ? nextError.message : getSignalWriterCopy(locale).loadError,
      );
    }
  } finally {
    if (!options?.background) {
      setLoading(false);
    }
  }
}

async function loadTrendBoard(
  locale: "ko" | "en",
  boardId: SignalWriterTrendBoardId,
  setBoardCache: Dispatch<SetStateAction<Partial<Record<SignalWriterTrendBoardId, SignalWriterTrendBoard>>>>,
  setBoardLoading: (value: boolean) => void,
  setBoardError: (value: string) => void,
  forceRefresh: boolean,
  options?: { background?: boolean },
) {
  if (!options?.background) {
    setBoardLoading(true);
    setBoardError("");
  }

  try {
    const query = new URLSearchParams({
      board: boardId,
      limit: "10",
      ...(forceRefresh ? { refresh: "1" } : {}),
    });
    const response = await fetch(`/api/signal-writer/boards?${query.toString()}`, {
      cache: "no-store",
      headers: {
        "x-dashboard-locale": locale,
      },
    });

    const payload = (await response.json()) as Partial<SignalWriterTrendBoardResponse> & {
      error?: string;
    };

    if (!response.ok || !payload.board) {
      throw new Error(payload.error || getSignalWriterCopy(locale).boards.loadError);
    }

    if (!forceRefresh && payload.board.items.length === 0) {
      await loadTrendBoard(
        locale,
        boardId,
        setBoardCache,
        setBoardLoading,
        setBoardError,
        true,
        options,
      );
      return;
    }

    setBoardCache((current) => ({
      ...current,
      [boardId]: payload.board!,
    }));
  } catch (error) {
    if (!options?.background) {
      setBoardError(
        error instanceof Error ? error.message : getSignalWriterCopy(locale).boards.loadError,
      );
    }
  } finally {
    if (!options?.background) {
      setBoardLoading(false);
    }
  }
}

function buildSignalPool(
  pickedSignals: SignalWriterSignal[],
  autoSignals: SignalWriterSignal[],
): { items: SignalWriterSignal[]; summary: SignalWriterMixSummary } {
  if (pickedSignals.length === 0) {
    return {
      items: autoSignals,
      summary: {
        manualCount: 0,
        autoCount: autoSignals.length,
      },
    };
  }

  const seen = new Set(
    pickedSignals.map((item) => normalizeSignalWriterText(item.link || item.title)),
  );
  const autoAppend = autoSignals
    .filter((item) => {
      const key = normalizeSignalWriterText(item.link || item.title);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, AUTO_SIGNAL_APPEND_LIMIT);

  return {
    items: [...pickedSignals, ...autoAppend],
    summary: {
      manualCount: pickedSignals.length,
      autoCount: autoAppend.length,
    },
  };
}

function buildPreparedTrendBoard(
  board: SignalWriterTrendBoard | null,
  reviewState: Record<string, TrendBoardReviewState>,
  order: string[],
) {
  if (!board) {
    return null;
  }

  const byId = new Map(board.items.map((item) => [item.id, item]));
  const resolvedOrder = order.length > 0 ? order : board.items.map((item) => item.id);
  const orderedItems = resolvedOrder
    .map((itemId) => byId.get(itemId))
    .filter((item): item is SignalWriterTrendBoard["items"][number] => Boolean(item));

  return {
    ...board,
    items: orderedItems
      .filter((item) => getTrendBoardReviewState(reviewState, item.id).included)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        reviewNote: getTrendBoardReviewState(reviewState, item.id).note || undefined,
      })),
  };
}

function syncTrendBoardReviewState(
  board: SignalWriterTrendBoard | null,
  current: Record<string, TrendBoardReviewState>,
) {
  if (!board) {
    return {};
  }

  return Object.fromEntries(
    board.items.map((item) => [item.id, getTrendBoardReviewState(current, item.id)]),
  );
}

function syncTrendBoardOrder(board: SignalWriterTrendBoard | null, current: string[]) {
  if (!board) {
    return [];
  }

  const existing = current.filter((itemId) => board.items.some((item) => item.id === itemId));
  const missing = board.items.map((item) => item.id).filter((itemId) => !existing.includes(itemId));
  return [...existing, ...missing];
}

function getTrendBoardReviewState(
  reviewState: Record<string, TrendBoardReviewState>,
  itemId: string,
): TrendBoardReviewState {
  return reviewState[itemId] ?? { included: true, reviewed: false, note: "" };
}

function markIncludedTrendBoardItemsReviewed(
  board: SignalWriterTrendBoard | null,
  current: Record<string, TrendBoardReviewState>,
) {
  if (!board) {
    return current;
  }

  const next = { ...current };
  for (const item of board.items) {
    const review = getTrendBoardReviewState(next, item.id);
    if (review.included) {
      next[item.id] = { ...review, reviewed: true };
    }
  }

  return next;
}

function moveTrendBoardItem(current: string[], itemId: string, direction: "up" | "down") {
  const index = current.indexOf(itemId);
  if (index === -1) {
    return current;
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= current.length) {
    return current;
  }

  const next = [...current];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function resetTrendBoardReviewState(
  board: SignalWriterTrendBoard | null,
  current: Record<string, TrendBoardReviewState>,
) {
  if (!board) {
    return current;
  }

  const next = { ...current };
  for (const item of board.items) {
    next[item.id] = { included: true, reviewed: false, note: "" };
  }

  return next;
}

function createDefaultPerformanceForm(): SignalWriterPerformanceForm {
  return {
    postUrl: "",
    postedAt: "",
    views: "",
    likes: "",
    replies: "",
    reposts: "",
    saves: "",
    notes: "",
  };
}

function toMetricNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toPostedAtIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function getResearchCacheKey(signalId: string, channel: SignalWriterTargetChannel) {
  return `${signalId}:${channel}`;
}

function normalizeSignalWriterText(value: string) {
  return value.trim().toLowerCase();
}

function formatTrendBoardPresetLabel(boardId: SignalWriterTrendBoardId, locale: "ko" | "en") {
  if (locale === "en") {
    switch (boardId) {
      case "github":
        return "GitHub";
      case "npm":
        return "npm";
      case "frontend":
        return "Frontend";
      case "backend":
        return "Backend";
      case "fullstack":
        return "Fullstack";
      case "skills":
        return "Skills";
    }
  }

  switch (boardId) {
    case "github":
      return "GitHub 트렌딩";
    case "npm":
      return "npm 급상승";
    case "frontend":
      return "프런트엔드";
    case "backend":
      return "백엔드";
    case "fullstack":
      return "풀스택";
    case "skills":
      return "AI 스킬/툴";
  }
}

function formatTimestamp(value: string, locale: "ko" | "en") {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
