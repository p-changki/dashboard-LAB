"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, MessageSquare, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ErrorCard } from "@/components/ErrorCard";
import { NoticeBanner } from "@/components/NoticeBanner";
import { CsContextManager } from "@/components/cs-helper/CsContextManager";
import { CsHistory } from "@/components/cs-helper/CsHistory";
import { CsMessageInput } from "@/components/cs-helper/CsMessageInput";
import { CsResponseView } from "@/components/cs-helper/CsResponseView";
import { CsSettingsBar } from "@/components/cs-helper/CsSettingsBar";
import type {
  CsAiRunner,
  CsChannel,
  CsHistoryItem,
  CsHistoryResponse,
  CsProject,
  CsResponse,
  CsTone,
} from "@/lib/types";

const CS_QUICK_PRESETS: Array<{
  id: string;
  label: string;
  customerMessage: string;
  additionalContext: string;
}> = [
  {
    id: "delay",
    label: "일정 지연 안내",
    customerMessage: "언제 처리되는지 확인 부탁드립니다. 일정이 계속 밀리고 있어 불편합니다.",
    additionalContext: "지연 사유를 투명하게 설명하고 다음 조치 시점을 분명히 안내",
  },
  {
    id: "refund",
    label: "환불/취소 문의",
    customerMessage: "서비스를 더 이상 이용하지 않으려 합니다. 환불이나 취소 절차를 안내해 주세요.",
    additionalContext: "정책을 넘어서 단정하지 말고 확인 가능한 절차 중심으로 답변",
  },
  {
    id: "bug",
    label: "오류 신고 대응",
    customerMessage: "방금 기능을 사용했는데 오류가 발생했습니다. 어떻게 해결하면 될까요?",
    additionalContext: "사과, 재현 정보 요청, 임시 우회책, 후속 안내를 포함",
  },
  {
    id: "feature",
    label: "추가기능 요청",
    customerMessage: "현재 기능으로는 부족해서 추가 기능이 필요합니다. 검토 가능한지 궁금합니다.",
    additionalContext: "확답 대신 검토 프로세스와 필요한 추가 정보를 정리",
  },
];

export function CsTab() {
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

  useEffect(() => {
    void loadProjects(setProjects, setProjectId);
    void loadHistory(setHistory);
  }, []);

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

  return (
    <div className="space-y-5">
      {feedbackMessage ? (
        <NoticeBanner
          title="반영되었습니다"
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
            {selectedProject?.name ?? "프로젝트 선택 필요"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
            {channel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
            {tone}
          </span>
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
            {runner}
          </span>
          {selectedProject?.hasContext ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-300">
              컨텍스트 준비됨
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-soft)]">
          고객 메시지를 입력하면 응답을 생성하고, 내부 분석은 필요할 때만 함께 생성할 수 있습니다. 히스토리를 선택하면 당시 설정과 메시지가 같이 복원됩니다.
        </p>
        {selectedProject ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">현재 프로젝트 기준 정보</p>
            <p className="mt-2 text-sm text-white/75">{selectedProject.contextSummary}</p>
          </div>
        ) : null}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">빠른 응답 프리셋</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  자주 오는 문의는 프리셋으로 초안을 넣고 바로 수정할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {CS_QUICK_PRESETS.map((preset) => (
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
            channelLabel={channel}
            toneLabel={tone}
            customerMessage={customerMessage}
            additionalContext={additionalContext}
            includeAnalysis={includeAnalysis}
            warning={selectedProject?.warning ?? null}
            loading={loading}
            canSubmit={canSubmit}
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
                  고객 응답 준비됨
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                  analysis
                    ? "border-emerald-500/20 bg-emerald-900/30 text-emerald-300"
                    : analyzingLoading
                      ? "border-amber-500/20 bg-amber-900/30 text-amber-200"
                      : "border-white/10 bg-white/6 text-white/60"
                }`}>
                  <Sparkles className="h-4 w-4" />
                  {analysis ? "내부 분석 준비됨" : analyzingLoading ? "내부 분석 생성 중" : "내부 분석 없음"}
                </span>
              </div>
            </section>
          ) : null}
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveResultTab("reply")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${activeResultTab === "reply" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
              <MessageSquare className="h-4 w-4" />고객 응답
            </button>
            <button type="button" onClick={() => setActiveResultTab("analysis")}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${activeResultTab === "analysis" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
              <ClipboardList className="h-4 w-4" />내부 분석
            </button>
          </div>

          {activeResultTab === "reply" ? (
            <CsResponseView
              response={response}
              loading={loading}
              onRegenerate={(options) => void regenerateResponse(options)}
            />
          ) : (
            <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-6">
              {analyzingLoading ? (
                <p className="text-sm text-gray-400 animate-pulse">내부 분석 생성 중...</p>
              ) : analysis ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">내부 분석</p>
                    <button
                      type="button"
                      onClick={() => void generateAnalysis()}
                      className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white/75 transition hover:bg-white/10"
                    >
                      분석 다시 생성
                    </button>
                  </div>
                  <div className="prose prose-invert mt-4 max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">답변 생성 시 내부 분석을 함께 켜지 않았다면, 필요할 때 여기서 별도로 생성할 수 있습니다.</p>
                  {response ? (
                    <button
                      type="button"
                      onClick={() => void generateAnalysis()}
                      className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white/75 transition hover:bg-white/10"
                    >
                      내부 분석 생성
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
            onSelect={restoreFromHistory}
          />
          <CsContextManager
            projects={projects}
            onInit={(projectName) => void initContext(projectName, setProjects, setProjectId)}
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
      });
      setResponse(generated);
      setAnalysis(generated.analysis ?? null);
      await loadHistory(setHistory);
      setFeedbackMessage(includeAnalysis ? "고객 응답과 내부 분석을 생성했습니다." : "고객 응답을 생성했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "응답 생성에 실패했습니다.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, runner, channel, tone, customerMessage, additionalContext, includeAnalysis: true }),
      });
      const data = await res.json();
      if (data.analysis) setAnalysis(data.analysis);
      setFeedbackMessage("내부 분석을 다시 생성했습니다.");
    } catch {
      setAnalysis("분석 생성에 실패했습니다.");
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
      });
      setResponse(regenerated);
      setAnalysis(regenerated.analysis ?? null);
      await loadHistory(setHistory);
      setFeedbackMessage(includeAnalysis ? "설정을 반영해 CS 응답과 내부 분석을 다시 생성했습니다." : "설정을 반영해 CS 응답을 다시 생성했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "재생성에 실패했습니다.");
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
    setFeedbackMessage("히스토리 기록을 현재 작업 화면으로 복원했습니다.");
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
) {
  const response = await fetch("/api/cs-helper/projects", { cache: "no-store" });
  const payload = (await response.json()) as { projects: CsProject[] };
  setProjects(payload.projects);
  setProjectId(payload.projects[0]?.id ?? "");
}

async function loadHistory(setHistory: (value: CsHistoryItem[]) => void) {
  const response = await fetch("/api/cs-helper/history", { cache: "no-store" });
  const payload = (await response.json()) as CsHistoryResponse;
  setHistory(payload.items);
}

async function initContext(
  projectName: string,
  setProjects: (value: CsProject[]) => void,
  setProjectId: (value: string) => void,
) {
  await fetch("/api/cs-helper/context/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName }),
  });
  await loadProjects(setProjects, setProjectId);
}

async function postCsResponse(url: string, payload: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as CsResponse | { error?: { message: string } };

  if (!response.ok) {
    throw new Error("error" in data ? data.error?.message ?? "요청 처리에 실패했습니다." : "요청 처리에 실패했습니다.");
  }

  return data as CsResponse;
}
