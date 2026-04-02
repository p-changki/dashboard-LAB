"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, MessageSquare, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { useLocale } from "@/components/layout/LocaleProvider";
import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { getCsHelperCopy } from "@/features/cs-helper/copy";
import { CsContextManager } from "@/features/cs-helper/components/CsContextManager";
import { CsHistory } from "@/features/cs-helper/components/CsHistory";
import { CsMessageInput } from "@/features/cs-helper/components/CsMessageInput";
import { CsResponseView } from "@/features/cs-helper/components/CsResponseView";
import { CsSettingsBar } from "@/features/cs-helper/components/CsSettingsBar";
import type { CsAiRunner, CsChannel, CsHistoryItem, CsHistoryResponse, CsInputMode, CsProject, CsResponse, CsTone } from "@/lib/types";

interface CsTabProps {
  mode?: DashboardNavigationMode;
}

export function CsTab({ mode = "advanced" }: CsTabProps) {
  const { locale } = useLocale();
  const copy = getCsHelperCopy(locale);
  const [projects, setProjects] = useState<CsProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [runner, setRunner] = useState<CsAiRunner>("claude");
  const [channel, setChannel] = useState<CsChannel>("kakao");
  const [tone, setTone] = useState<CsTone>("friendly");
  const [inputMode, setInputMode] = useState<CsInputMode>("customer");
  const [customerMessage, setCustomerMessage] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [includeAnalysis, setIncludeAnalysis] = useState(false);
  const [response, setResponse] = useState<CsResponse | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<"reply" | "analysis">("reply");
  const [history, setHistory] = useState<CsHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingLoading, setAnalyzingLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const latestProjectIdRef = useRef("");

  useEffect(() => {
    latestProjectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    void loadProjects(setProjects, setProjectId, locale, latestProjectIdRef.current);
    void loadHistory(setHistory, locale);
  }, [locale]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timer = window.setTimeout(() => setFeedbackMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects],
  );
  const projectNameMap = useMemo(
    () =>
      Object.fromEntries(
        projects.map((project) => [project.id, project.name]),
      ) as Record<string, string>,
    [projects],
  );
  const canSubmit = Boolean(projectId && customerMessage.trim());
  const isCoreMode = mode === "core";
  const showResultTabs = Boolean(response);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border-base bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.16),_transparent_42%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">CS Helper</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{copy.heroTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
          {copy.heroDescription}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {copy.cards.map((item) => (
            <article key={item.label} className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-text-secondary">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      {isCoreMode ? (
        <NoticeBanner
          tone="info"
          title={copy.coreModeTitle}
          message={copy.coreModeMessage}
        />
      ) : null}
      {feedbackMessage ? (
        <NoticeBanner
          title={copy.appliedTitle}
          message={feedbackMessage}
        />
      ) : null}
      {error ? <ErrorCard title="CS Helper" message={error} /> : null}
      <CsSettingsBar
        projects={projects}
        projectId={projectId}
        runner={runner}
        channel={channel}
        tone={tone}
        onProjectChange={setProjectId}
        onRunnerChange={setRunner}
        onChannelChange={setChannel}
        onToneChange={setTone}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{copy.setupTitle}</p>
              <p className="mt-1 text-xs leading-6 text-text-muted">{copy.setupDescription}</p>
            </div>
            {selectedProject?.hasContext ? (
              <Badge variant="success">{copy.contextReady}</Badge>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SetupMetric label={copy.settings.project} value={selectedProject?.name ?? copy.projectRequired} />
            <SetupMetric label={copy.settings.ai} value={runner} />
            <SetupMetric label={copy.settings.channel} value={copy.getChannelLabel(channel)} />
            <SetupMetric label={copy.settings.tone} value={copy.getToneLabel(tone)} />
            <SetupMetric label={copy.input.modeLabel} value={copy.getInputModeLabel(inputMode)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="info">{selectedProject?.name ?? copy.projectRequired}</Badge>
            <Badge variant="neutral">{copy.getChannelLabel(channel)}</Badge>
            <Badge variant="neutral">{copy.getToneLabel(tone)}</Badge>
            <Badge variant="neutral">{runner}</Badge>
            <Badge variant="neutral">{copy.getInputModeLabel(inputMode)}</Badge>
          </div>
          <div className="mt-4 rounded-2xl border border-border-base bg-black/15 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{copy.contextInfoTitle}</p>
            <p className="mt-3 break-words text-sm leading-7 text-white/75">
              {selectedProject?.contextSummary ?? copy.selectedContextEmpty}
            </p>
            {selectedProject?.warning ? (
              <p className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-900/20 px-3 py-3 text-xs leading-6 text-amber-100">
                {selectedProject.warning}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              {copy.workspaceDescription}
            </p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{copy.quickPresetTitle}</p>
                <p className="mt-1 text-xs leading-6 text-text-muted">
                  {copy.quickPresetDescription}
                </p>
              </div>
              <Badge variant="neutral" size="sm">{copy.presetCount(copy.presets.length)}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {copy.presets.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setInputMode("customer");
                    setCustomerMessage(preset.customerMessage);
                    setAdditionalContext(preset.additionalContext);
                    setError("");
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </section>

          <CsMessageInput
            projectName={selectedProject?.name ?? null}
            channelLabel={copy.getChannelLabel(channel)}
            toneLabel={copy.getToneLabel(tone)}
            inputMode={inputMode}
            customerMessage={customerMessage}
            additionalContext={additionalContext}
            includeAnalysis={includeAnalysis}
            warning={selectedProject?.warning ?? null}
            loading={loading}
            canSubmit={canSubmit}
            copy={copy.input}
            onInputModeChange={setInputMode}
            onCustomerMessageChange={setCustomerMessage}
            onAdditionalContextChange={setAdditionalContext}
            onIncludeAnalysisChange={setIncludeAnalysis}
            onClear={() => {
              setInputMode("customer");
              setCustomerMessage("");
              setAdditionalContext("");
              setIncludeAnalysis(false);
              setResponse(null);
              setAnalysis(null);
              setActiveResultTab("reply");
              setError("");
            }}
            onSubmit={() => void generateResponse()}
          />
        </div>
      </div>

      <div className="space-y-6">
        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{copy.resultWorkspaceTitle}</p>
              <p className="mt-1 text-xs leading-6 text-text-muted">
                {copy.resultWorkspaceDescription}
              </p>
            </div>
            {response ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-border-base bg-white/6 px-3 py-1 text-white/75">
                  <MessageSquare className="h-4 w-4" />
                  {copy.replyReady}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                  analysis
                    ? "border-emerald-500/20 bg-emerald-900/30 text-emerald-300"
                    : analyzingLoading
                      ? "border-amber-500/20 bg-amber-900/30 text-amber-200"
                      : "border-border-base bg-white/6 text-white/60"
                }`}>
                  <Sparkles className="h-4 w-4" />
                  {analysis ? copy.analysisReady : analyzingLoading ? copy.analysisLoading : copy.analysisEmpty}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {showResultTabs ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={activeResultTab === "reply" ? "secondary" : "ghost"}
                onClick={() => setActiveResultTab("reply")}
                className={activeResultTab === "reply" ? "border-purple-500/20 bg-purple-900/30 text-purple-300" : undefined}
              >
                <MessageSquare className="h-4 w-4" />
                {copy.replyTab}
              </Button>
              <Button
                type="button"
                variant={activeResultTab === "analysis" ? "secondary" : "ghost"}
                onClick={() => setActiveResultTab("analysis")}
                className={activeResultTab === "analysis" ? "border-purple-500/20 bg-purple-900/30 text-purple-300" : undefined}
              >
                <ClipboardList className="h-4 w-4" />
                {copy.analysisTab}
              </Button>
            </div>

            {activeResultTab === "reply" ? (
              <CsResponseView
                response={response}
                loading={loading}
                copy={copy.response}
                onRegenerate={(options) => void regenerateResponse(options)}
              />
            ) : analyzingLoading ? (
              <section className="panel p-6">
                <p className="animate-pulse text-sm text-text-muted">{copy.analysisPanelLoading}</p>
              </section>
            ) : analysis ? (
              <section className="rounded-2xl border border-border-base bg-bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{copy.analysisPanelTitle}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void generateAnalysis()}
                  >
                    {copy.analysisRegenerate}
                  </Button>
                </div>
                <div className="prose prose-invert mt-4 max-w-none text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                </div>
              </section>
            ) : (
              <EmptyStateCard
                title={copy.analysisPanelTitle}
                message={copy.analysisHint}
                actionLabel={copy.analysisGenerate}
                onAction={() => void generateAnalysis()}
              />
            )}
          </>
        ) : (
          <CsResponseView
            response={response}
            loading={loading}
            copy={copy.response}
            onRegenerate={(options) => void regenerateResponse(options)}
          />
        )}

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <CsHistory
            items={history}
            projectNameMap={projectNameMap}
            copy={copy.history}
            onSelect={restoreFromHistory}
          />
          <CsContextManager
            projects={projects}
            copy={copy.context}
            onInit={(projectName) => void initContext(projectName, setProjects, setProjectId, locale)}
          />
        </div>
      </div>
    </div>
  );

  async function generateResponse() {
    try {
      setLoading(true);
      setAnalyzingLoading(includeAnalysis);
      setError("");
      setActiveResultTab("reply");
      setAnalysis(null);
      const generated = await postCsResponse("/api/cs-helper/generate", {
        projectId,
        runner,
        channel,
        tone,
        inputMode,
        customerMessage,
        additionalContext,
        includeAnalysis,
      }, locale, copy.errors.requestFailed);
      setResponse(generated);
      setAnalysis(generated.analysis ?? null);
      await loadHistory(setHistory, locale);
      setFeedbackMessage(includeAnalysis ? copy.feedback.responseCreatedWithAnalysis : copy.feedback.responseCreated);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.responseFailed);
    } finally {
      setLoading(false);
      setAnalyzingLoading(false);
    }
  }

  async function generateAnalysis() {
    if (!customerMessage.trim()) return;
    try {
      setAnalyzingLoading(true);
      setError("");
      const res = await fetch("/api/cs-helper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dashboard-locale": locale },
        body: JSON.stringify({ projectId, runner, channel, tone, inputMode, customerMessage, additionalContext, includeAnalysis: true }),
      });
      const data = await res.json() as { analysis?: string; error?: { message?: string } };
      if (!res.ok) {
        throw new Error(data.error?.message ?? copy.errors.analysisFailed);
      }
      if (data.analysis) setAnalysis(data.analysis);
      setFeedbackMessage(copy.feedback.analysisRegenerated);
    } catch (err) {
      setAnalysis(err instanceof Error ? err.message : copy.errors.analysisFailed);
    } finally {
      setAnalyzingLoading(false);
    }
  }

  async function regenerateResponse(options: { tone?: CsTone; runner?: CsAiRunner }) {
    if (!response) {
      return;
    }

    try {
      setLoading(true);
      setAnalyzingLoading(includeAnalysis);
      setError("");
      const regenerated = await postCsResponse("/api/cs-helper/regenerate", {
        originalId: response.id,
        includeAnalysis,
        ...options,
      }, locale, copy.errors.requestFailed);
      setResponse(regenerated);
      setAnalysis(regenerated.analysis ?? null);
      await loadHistory(setHistory, locale);
      setFeedbackMessage(includeAnalysis ? copy.feedback.responseRegeneratedWithAnalysis : copy.feedback.responseRegenerated);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.regenerateFailed);
    } finally {
      setLoading(false);
      setAnalyzingLoading(false);
    }
  }

  function restoreFromHistory(item: CsHistoryItem) {
    setProjectId(item.projectId);
    setRunner(item.runner);
    setChannel(item.channel);
    setTone(item.tone);
    setInputMode(item.inputMode ?? "customer");
    setCustomerMessage(item.customerMessage);
    setAdditionalContext(item.additionalContext);
    setIncludeAnalysis(item.includeAnalysis);
    setAnalysis(item.analysis ?? null);
    setActiveResultTab("reply");
    setError("");
    setFeedbackMessage(copy.feedback.historyRestored);
    setResponse({
      id: item.id,
      reply: item.reply,
      analysis: item.analysis ?? null,
      runner: item.runner,
      projectId: item.projectId,
      channel: item.channel,
      tone: item.tone,
      inputMode: item.inputMode ?? "customer",
      customerMessage: item.customerMessage,
      additionalContext: item.additionalContext,
      createdAt: item.createdAt,
      includeAnalysis: item.includeAnalysis,
      promptUsed: "",
    });
  }
}

function SetupMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-3 break-words text-sm font-medium text-white">{value}</p>
    </article>
  );
}

async function loadProjects(
  setProjects: (value: CsProject[]) => void,
  setProjectId: (value: string) => void,
  locale: "ko" | "en",
  preferredProjectId?: string,
) {
  const response = await fetch("/api/cs-helper/projects", {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });
  const payload = (await response.json()) as { projects: CsProject[] };
  setProjects(payload.projects);
  const nextProjectId = payload.projects.some((project) => project.id === preferredProjectId)
    ? preferredProjectId ?? ""
    : payload.projects[0]?.id ?? "";
  setProjectId(nextProjectId);
}

async function loadHistory(setHistory: (value: CsHistoryItem[]) => void, locale: "ko" | "en") {
  const response = await fetch("/api/cs-helper/history", {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });
  const payload = (await response.json()) as CsHistoryResponse;
  setHistory(payload.items);
}

async function initContext(
  projectName: string,
  setProjects: (value: CsProject[]) => void,
  setProjectId: (value: string) => void,
  locale: "ko" | "en",
) {
  await fetch("/api/cs-helper/context/init", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-dashboard-locale": locale },
    body: JSON.stringify({ projectName }),
  });
  await loadProjects(setProjects, setProjectId, locale);
}

async function postCsResponse(url: string, payload: object, locale: "ko" | "en", fallback: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-dashboard-locale": locale },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as CsResponse | { error?: { message: string } };

  if (!response.ok) {
    throw new Error("error" in data ? data.error?.message ?? fallback : fallback);
  }

  return data as CsResponse;
}
