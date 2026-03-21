"use client";

import { useEffect, useMemo, useState } from "react";

import { ErrorCard } from "@/components/ErrorCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { NoticeBanner } from "@/components/NoticeBanner";
import { RunHistory } from "@/components/ai-skills/RunHistory";
import { RunResultViewer } from "@/components/ai-skills/RunResultViewer";
import { SkillCard } from "@/components/ai-skills/SkillCard";
import { SkillForm } from "@/components/ai-skills/SkillForm";
import type { SkillHistoryResponse, SkillRun, SkillRunResponse, SkillTemplate } from "@/lib/types";

export function AiSkillsTab() {
  const [templates, setTemplates] = useState<SkillTemplate[]>([]);
  const [history, setHistory] = useState<SkillRun[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillTemplate | null>(null);
  const [query, setQuery] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [viewerRun, setViewerRun] = useState<SkillRun | null>(null);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    void Promise.all([loadTemplates(setTemplates, setSelectedSkill), loadHistory(setHistory)]);
  }, []);

  useEffect(() => {
    if (!history.some((run) => run.status === "queued" || run.status === "running")) {
      return;
    }

    const timer = window.setInterval(() => void loadHistory(setHistory), 2500);
    return () => window.clearInterval(timer);
  }, [history]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timer = window.setTimeout(() => setFeedbackMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const runningRun = useMemo(
    () => history.find((run) => run.skillId === selectedSkill?.id && (run.status === "queued" || run.status === "running")) ?? null,
    [history, selectedSkill?.id],
  );
  const filteredTemplates = useMemo(
    () => filterTemplates(templates, query),
    [templates, query],
  );

  return (
    <div className="space-y-5">
      {feedbackMessage ? (
        <NoticeBanner
          title="반영되었습니다"
          message={feedbackMessage}
        />
      ) : null}
      {error ? <ErrorCard title="AI Skills" message={error} actionLabel="다시 불러오기" onAction={() => void loadHistory(setHistory)} /> : null}
      <SkillForm
        skill={selectedSkill}
        values={values}
        runningRun={runningRun}
            onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
        onSubmit={() => void runSkill(selectedSkill, values, setHistory, setError, setFeedbackMessage)}
        onCancel={(runId) => void cancelRun(runId, setHistory, setFeedbackMessage)}
      />
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
              스킬 탐색
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-soft)]">
              이름, 설명, runner 기준으로 빠르게 찾을 수 있습니다.
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: youtube, notion, codex review"
            className="w-full rounded-3xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40 lg:max-w-md"
          />
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {filteredTemplates.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              selected={selectedSkill?.id === skill.id}
              onSelect={(nextSkill) => {
                setSelectedSkill(nextSkill);
                setValues({});
              }}
            />
          ))}
        </div>
        {filteredTemplates.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-[var(--color-text-soft)]">
            검색 결과가 없습니다.
          </p>
        ) : null}
      </section>
      {history.length === 0 ? (
        <EmptyStateCard
          title="아직 실행된 스킬이 없습니다."
          message="위에서 스킬을 고르고 입력값을 채운 뒤 실행하면, 여기서 실행 히스토리와 결과를 계속 이어서 확인할 수 있습니다."
        />
      ) : null}
      <RunHistory
        runs={history}
        onView={setViewerRun}
        onCancel={(runId) => void cancelRun(runId, setHistory, setFeedbackMessage)}
      />
      <RunResultViewer run={viewerRun} onClose={() => setViewerRun(null)} />
    </div>
  );
}

async function loadTemplates(
  setTemplates: (value: SkillTemplate[]) => void,
  setSelectedSkill: (value: SkillTemplate | null) => void,
) {
  const response = await fetch("/api/ai-skills/templates", { cache: "no-store" });
  const payload = (await response.json()) as { templates: SkillTemplate[] };
  setTemplates(payload.templates);
  setSelectedSkill(payload.templates[0] ?? null);
}

async function loadHistory(setHistory: (value: SkillRun[]) => void) {
  const response = await fetch("/api/ai-skills/history", { cache: "no-store" });
  const payload = (await response.json()) as SkillHistoryResponse;
  setHistory(payload.runs);
}

async function runSkill(
  skill: SkillTemplate | null,
  values: Record<string, string>,
  setHistory: (value: SkillRun[]) => void,
  setError: (value: string) => void,
  setFeedbackMessage: (value: string) => void,
) {
  if (!skill) {
    return;
  }

  const response = await fetch("/api/ai-skills/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillId: skill.id, inputs: values }),
  });
  const payload = (await response.json()) as SkillRunResponse | { error?: { message: string } };

  if (!response.ok) {
    setError("error" in payload ? payload.error?.message ?? "실행 요청에 실패했습니다." : "실행 요청에 실패했습니다.");
    return;
  }

  setError("");
  await loadHistory(setHistory);
  setFeedbackMessage(`${skill.name} 실행을 작업 큐에 추가했습니다.`);
}

async function cancelRun(
  runId: string,
  setHistory: (value: SkillRun[]) => void,
  setFeedbackMessage: (value: string) => void,
) {
  await fetch(`/api/ai-skills/cancel/${runId}`, { method: "POST" });
  await loadHistory(setHistory);
  setFeedbackMessage("선택한 스킬 실행을 취소했습니다.");
}

function filterTemplates(templates: SkillTemplate[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return templates;
  }

  return templates.filter((template) =>
    [template.name, template.description, template.runner]
      .some((value) => value.toLowerCase().includes(normalized)),
  );
}
