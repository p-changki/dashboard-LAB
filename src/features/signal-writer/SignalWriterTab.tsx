"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  ImageIcon,
  LoaderCircle,
  Newspaper,
  PenSquare,
  Sparkles,
} from "lucide-react";

import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { useLocale } from "@/components/layout/LocaleProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { getSignalWriterCopy } from "@/features/signal-writer/copy";
import type {
  SignalWriterDraft,
  SignalWriterDraftMode,
  SignalWriterGenerateResponse,
  SignalWriterSignal,
  SignalWriterSignalsResponse,
} from "@/lib/types";

type SignalWriterStep = "select" | "generate" | "result";

const MIN_GENERATE_DELAY_MS = 2200;

export function SignalWriterTab({ mode = "core" }: { mode?: DashboardNavigationMode }) {
  const { locale } = useLocale();
  const copy = getSignalWriterCopy(locale);
  const [signals, setSignals] = useState<SignalWriterSignal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<SignalWriterDraftMode>("viral");
  const [draft, setDraft] = useState<SignalWriterDraft | null>(null);
  const [step, setStep] = useState<SignalWriterStep>("select");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [stageIndex, setStageIndex] = useState(0);

  const selectedSignal = useMemo(
    () => signals.find((item) => item.id === selectedId) ?? null,
    [signals, selectedId],
  );

  useEffect(() => {
    void loadSignals(locale, setSignals, setSelectedId, setLoading, setError, false);
  }, [locale]);

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
    try {
      await loadSignals(locale, setSignals, setSelectedId, setLoading, setError, true);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGenerate() {
    if (!selectedSignal) {
      return;
    }

    setError("");
    setStep("generate");
    setGenerating(true);
    setDraft(null);
    const startedAt = Date.now();

    try {
      const response = await fetch("/api/signal-writer/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({ signal: selectedSignal, mode: selectedMode }),
      });

      const payload = (await response.json()) as Partial<SignalWriterGenerateResponse> & {
        error?: string;
      };

      if (!response.ok || !payload.draft) {
        throw new Error(payload.error || copy.loadError);
      }

      const remaining = MIN_GENERATE_DELAY_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }

      setStageIndex(copy.generate.stages.length - 1);
      setDraft(payload.draft);
      setStep("result");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
      setStep("select");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.025] to-amber-500/[0.06] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.title}</h2>
            <p className="text-sm leading-6 text-[var(--color-text-soft)]">{copy.description}</p>
            <p className="text-xs leading-5 text-gray-500">
              {mode === "core" ? copy.coreMode : copy.fullMode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
          >
            {refreshing || loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {copy.refresh}
          </button>
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
                  : "border-white/10 bg-white/[0.03] text-gray-500",
              ].join(" ")}
            >
              {label}
            </span>
          );
        })}
      </div>

      {error ? (
        <ErrorCard
          title="Signal Writer"
          message={error}
          actionLabel={copy.refresh}
          onAction={() => void handleRefresh()}
        />
      ) : null}

      {loading ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-[var(--color-text-soft)]">
          {copy.loading}
        </section>
      ) : null}

      {!loading && step === "select" ? (
        <div className="space-y-5">
          {signals.length === 0 ? (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-[var(--color-text-soft)]">
              {copy.empty}
            </section>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {signals.map((item) => (
                <article
                  key={item.id}
                  className={[
                    "rounded-3xl border p-5 transition",
                    selectedId === item.id
                      ? "border-amber-400/40 bg-amber-500/[0.08]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  {item.thumbnailUrl ? (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-white/8 bg-black/20">
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
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-gray-300">
                          {item.categoryLabel}
                        </span>
                        {selectedId === item.id ? (
                          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100">
                            {copy.cards.selected}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    </div>
                    <Newspaper className="mt-1 h-5 w-5 shrink-0 text-amber-200/80" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--color-text-soft)]">{item.summary}</p>
                  <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">{copy.cards.why}</p>
                    <p className="mt-2 text-sm text-white/85">{item.whyItMatters}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{copy.cards.source}: {item.sourceName}</span>
                    <span>{copy.cards.published}: {formatTimestamp(item.publishedAt, locale)}</span>
                  </div>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={[
                        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm transition",
                        selectedId === item.id
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                          : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                      ].join(" ")}
                    >
                      <PenSquare className="h-4 w-4" />
                      {copy.cta.choose}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm font-medium text-white">{copy.modes.title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">
              {copy.modes.description}
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
              {(
                ["news-brief", "insight", "opinion", "viral"] as SignalWriterDraftMode[]
              ).map((modeKey) => {
                const active = selectedMode === modeKey;
                const modeCopy = copy.modes[modeKey];

                return (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => setSelectedMode(modeKey)}
                    className={[
                      "rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-amber-400/30 bg-amber-400/10"
                        : "border-white/10 bg-black/15 hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <p
                      className={
                        active ? "text-sm font-medium text-amber-100" : "text-sm font-medium text-white"
                      }
                    >
                      {modeCopy.label}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-400">{modeCopy.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!selectedSignal}
              onClick={() => void handleGenerate()}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-gray-500"
            >
              <Sparkles className="h-4 w-4" />
              {copy.cta.generate}
            </button>
          </div>
        </div>
      ) : null}

      {step === "generate" && selectedSignal ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.generate.title}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{selectedSignal.title}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">{copy.generate.description}</p>

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
                        : "border-white/8 bg-black/15",
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
                  <span className="text-xs text-gray-500">
                    {state === "done" ? copy.generate.done : state === "current" ? copy.generate.processing : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {step === "result" && selectedSignal && draft ? (
        <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">{copy.result.title}</p>
              <h3 className="text-xl font-semibold text-white">{selectedSignal.title}</h3>
              <p className="text-sm text-[var(--color-text-soft)]">{draft.sourceModel === "openai" ? copy.result.sourceModelOpenAi : copy.result.sourceModelTemplate}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                {copy.cta.back}
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-400/15"
              >
                {copy.cta.regenerate}
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <ResultBlock title={copy.result.mode}>
              <p className="text-sm font-medium text-white/90">{copy.modes[draft.mode].label}</p>
              <p className="mt-2 text-xs leading-5 text-gray-400">
                {copy.modes[draft.mode].description}
              </p>
            </ResultBlock>

            <ResultBlock title={copy.result.angle}>
              <p className="text-sm font-medium text-white/90">{draft.angle.label}</p>
              <p className="mt-2 text-sm leading-6 text-gray-300">{draft.angle.summary}</p>
            </ResultBlock>

            <ResultBlock title={copy.result.targetAudience}>
              <p className="text-sm leading-6 text-white/90">{draft.angle.audience}</p>
            </ResultBlock>
          </div>

          <ResultBlock title={copy.result.quality}>
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                  {copy.result.qualityTotal}
                </p>
                <p className="mt-3 text-4xl font-semibold text-amber-100">{draft.quality.total}</p>
                <p className="mt-2 text-sm text-gray-300">
                  {copy.result.qualityLevels[draft.quality.level]}
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {draft.quality.dimensions.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-gray-300">
                        {item.score}/10
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-300">{item.reason}</p>
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
                <article key={item.id} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{item.intent}</p>
                      <p className="mt-2 text-sm leading-6 text-white/90">{item.text}</p>
                    </div>
                    <CopyButton value={item.text} label={copy.result.copyHook} />
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
                <article key={`${draft.id}-${index}`} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{item}</p>
                </article>
              ))}
            </div>
          </ResultBlock>

          <div className="grid gap-5 lg:grid-cols-2">
            <ResultBlock title={copy.result.hashtags}>
              <div className="flex flex-wrap gap-2">
                {draft.hashtags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs text-gray-200">
                    #{tag}
                  </span>
                ))}
              </div>
            </ResultBlock>

            <ResultBlock title={copy.result.whyNow}>
              <p className="text-sm leading-6 text-white/90">{draft.whyNow}</p>
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

          <ResultBlock title={copy.result.visuals}>
            <div className="grid gap-5 xl:grid-cols-2">
              <article className="space-y-3 rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{copy.result.sourceImage}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{copy.result.sourceImageHint}</p>
                  </div>
                  <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                </div>
                {selectedSignal.thumbnailUrl ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
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
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {copy.result.openSourceImage}
                    </a>
                  </>
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-sm text-gray-400">
                    {copy.result.noSourceImage}
                  </p>
                )}
              </article>

              <article className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{copy.result.generatedCover}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400">{copy.result.generatedCoverHint}</p>
                  </div>
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80" />
                </div>
                {draft.coverImageUrl ? (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={draft.coverImageUrl}
                        alt={`${selectedSignal.title} cover`}
                        className="h-[360px] w-full object-cover"
                      />
                    </div>
                    <div className="space-y-2 rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                        {copy.result.visualStrategy}
                      </p>
                      <p className="text-sm text-white/90">{draft.visualStrategy.badge}</p>
                      <p className="text-xs leading-5 text-gray-400">
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
    </section>
  );
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
    <article className="rounded-3xl border border-white/10 bg-black/15 p-5">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium uppercase tracking-[0.18em] text-gray-400">{title}</h4>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

async function loadSignals(
  locale: "ko" | "en",
  setSignals: (value: SignalWriterSignal[]) => void,
  setSelectedId: (value: string | null) => void,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  forceRefresh: boolean,
) {
  setLoading(true);
  setError("");

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

    setSignals(payload.items);
    setSelectedId(payload.items[0]?.id ?? null);
  } catch (nextError) {
    setError(
      nextError instanceof Error ? nextError.message : getSignalWriterCopy(locale).loadError,
    );
  } finally {
    setLoading(false);
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
