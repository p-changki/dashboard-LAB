"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, MessageSquare, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
import type { CsAiRunner, CsChannel, CsHistoryItem, CsHistoryResponse, CsProject, CsResponse, CsTone } from "@/lib/types";

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

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.16),_transparent_42%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">CS Helper</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{copy.heroTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-soft)]">
          {copy.heroDescription}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {copy.cards.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-[var(--color-text-soft)]">{item.description}</p>
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
      <section className="panel p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
            {selectedProject?.name ?? copy.projectRequired}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
            {copy.getChannelLabel(channel)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
            {copy.getToneLabel(tone)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
            {runner}
          </span>
          {selectedProject?.hasContext ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-300">
              {copy.contextReady}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-soft)]">
          {copy.workspaceDescription}
        </p>
        {selectedProject ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{copy.contextInfoTitle}</p>
            <p className="mt-2 text-sm text-white/75">{selectedProject.contextSummary}</p>
          </div>
        ) : null}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{copy.quickPresetTitle}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {copy.quickPresetDescription}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {copy.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setCustomerMessage(preset.customerMessage);
                    setAdditionalContext(preset.additionalContext);
                    setError("");
                  }}
                  className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white/75 transition hover:bg-white/10"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <CsMessageInput
            projectName={selectedProject?.name ?? null}
            channelLabel={copy.getChannelLabel(channel)}
            toneLabel={copy.getToneLabel(tone)}
            customerMessage={customerMessage}
            additionalContext={additionalContext}
            includeAnalysis={includeAnalysis}
            warning={selectedProject?.warning ?? null}
            loading={loading}
            canSubmit={canSubmit}
            copy={copy.input}
            onCustomerMessageChange={setCustomerMessage}
            onAdditionalContextChange={setAdditionalContext}
            onIncludeAnalysisChange={setIncludeAnalysis}
            onClear={() => {
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
          {response ? (
            <section className="panel p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-white/75">
                  <MessageSquare className="h-4 w-4" />
                  {copy.replyReady}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                  analysis
                    ? "border-emerald-500/20 bg-emerald-900/30 text-emerald-300"
                    : analyzingLoading
                      ? "border-amber-500/20 bg-amber-900/30 text-amber-200"
                      : "border-white/10 bg-white/6 text-white/60"
                }`}>
                  <Sparkles className="h-4 w-4" />
                  {analysis ? copy.analysisReady : analyzingLoading ? copy.analysisLoading : copy.analysisEmpty}
                </span>
              </div>
            </section>
          ) : null}
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveResultTab("reply")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${activeResultTab === "reply" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
              <MessageSquare className="h-4 w-4" />{copy.replyTab}
            </button>
            <button type="button" onClick={() => setActiveResultTab("analysis")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${activeResultTab === "analysis" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
              <ClipboardList className="h-4 w-4" />{copy.analysisTab}
            </button>
          </div>

          {activeResultTab === "reply" ? (
            <CsResponseView
              response={response}
              loading={loading}
              copy={copy.response}
              onRegenerate={(options) => void regenerateResponse(options)}
            />
          ) : (
            <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-6">
              {analyzingLoading ? (
                <p className="text-sm text-gray-400 animate-pulse">{copy.analysisPanelLoading}</p>
              ) : analysis ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{copy.analysisPanelTitle}</p>
                    <button
                      type="button"
                      onClick={() => void generateAnalysis()}
                      className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white/75 transition hover:bg-white/10"
                    >
                      {copy.analysisRegenerate}
                    </button>
                  </div>
                  <div className="prose prose-invert mt-4 max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">{copy.analysisHint}</p>
                  {response ? (
                    <button
                      type="button"
                      onClick={() => void generateAnalysis()}
                      className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white/75 transition hover:bg-white/10"
                    >
                      {copy.analysisGenerate}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-6">
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
        body: JSON.stringify({ projectId, runner, channel, tone, customerMessage, additionalContext, includeAnalysis: true }),
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
      customerMessage: item.customerMessage,
      additionalContext: item.additionalContext,
      createdAt: item.createdAt,
      includeAnalysis: item.includeAnalysis,
      promptUsed: "",
    });
  }
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
