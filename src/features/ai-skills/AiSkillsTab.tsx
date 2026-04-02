"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { getAiSkillsCopy } from "@/features/ai-skills/copy";
import { RunHistory } from "@/features/ai-skills/components/RunHistory";
import { RunResultViewer } from "@/features/ai-skills/components/RunResultViewer";
import type { AppLocale } from "@/lib/locale";
import { SkillCard } from "@/features/ai-skills/components/SkillCard";
import { SkillForm } from "@/features/ai-skills/components/SkillForm";
import type { SkillHistoryResponse, SkillRun, SkillRunResponse, SkillTemplate } from "@/lib/types";

interface AiSkillsTabProps {
  mode?: DashboardNavigationMode;
}

export function AiSkillsTab({ mode = "advanced" }: AiSkillsTabProps) {
  const { locale } = useLocale();
  const copy = getAiSkillsCopy(locale);
  const [templates, setTemplates] = useState<SkillTemplate[]>([]);
  const [history, setHistory] = useState<SkillRun[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillTemplate | null>(null);
  const [query, setQuery] = useState("");
  const [runnerFilter, setRunnerFilter] = useState<SkillTemplate["runner"] | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<SkillTemplate["category"] | "all">("all");
  const [values, setValues] = useState<Record<string, string>>({});
  const [viewerRun, setViewerRun] = useState<SkillRun | null>(null);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    void Promise.all([loadTemplates(locale, setTemplates, setSelectedSkill), loadHistory(locale, setHistory)]);
  }, [locale]);

  useEffect(() => {
    if (!history.some((run) => run.status === "queued" || run.status === "running")) {
      return;
    }

    const timer = window.setInterval(() => void loadHistory(locale, setHistory), 2500);
    return () => window.clearInterval(timer);
  }, [history, locale]);

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
    () => filterTemplates(templates, query, runnerFilter, categoryFilter),
    [templates, query, runnerFilter, categoryFilter],
  );
  const runnerOptions = useMemo(
    () => Array.from(new Set(templates.map((template) => template.runner))),
    [templates],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category))),
    [templates],
  );
  const selectedSkillRunCount = useMemo(
    () => history.filter((run) => run.skillId === selectedSkill?.id).length,
    [history, selectedSkill?.id],
  );
  const isCoreMode = mode === "core";

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border-base bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_45%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">AI Skills</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{copy.heroTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
          {copy.heroDescription}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {copy.tracks.map((item) => (
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
          title={copy.feedbackTitle}
          message={feedbackMessage}
        />
      ) : null}
      {error ? <ErrorCard title="AI Skills" message={error} actionLabel={copy.reload} onAction={() => void loadHistory(locale, setHistory)} /> : null}
      <section className="panel p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_320px]">
          <div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
                  {copy.searchTitle}
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  {copy.searchDescription}
                </p>
              </div>
              <Input
                type="search"
                variant="ghost"
                size="lg"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="rounded-3xl lg:max-w-md"
              />
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={runnerFilter === "all"}
                  label={locale === "ko" ? "전체 러너" : "All runners"}
                  onClick={() => setRunnerFilter("all")}
                />
                {runnerOptions.map((runner) => (
                  <FilterChip
                    key={runner}
                    active={runnerFilter === runner}
                    label={runner}
                    onClick={() => setRunnerFilter(runner)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={categoryFilter === "all"}
                  label={locale === "ko" ? "전체 카테고리" : "All categories"}
                  onClick={() => setCategoryFilter("all")}
                />
                {categoryOptions.map((category) => (
                  <FilterChip
                    key={category}
                    active={categoryFilter === category}
                    label={copy.categories[category]}
                    onClick={() => setCategoryFilter(category)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <Badge variant="neutral">{copy.resultsCount(filteredTemplates.length)}</Badge>
                {selectedSkill ? (
                  <Badge variant="info">
                    {locale === "ko" ? "선택됨" : "Selected"} · {selectedSkill.name}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
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
              <p className="mt-6 rounded-2xl border border-border-base bg-white/5 px-4 py-5 text-sm text-text-secondary">
                {copy.noResults}
              </p>
            ) : null}
          </div>
          <aside className="rounded-3xl border border-border-base bg-black/15 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
              {locale === "ko" ? "현재 선택" : "Current selection"}
            </p>
            {selectedSkill ? (
              <>
                <p className="mt-3 break-words text-lg font-semibold text-white">{selectedSkill.name}</p>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{selectedSkill.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="info">{selectedSkill.runner}</Badge>
                  <Badge variant="neutral">{copy.categories[selectedSkill.category]}</Badge>
                  <Badge variant="neutral">
                    {locale === "ko" ? `${selectedSkill.inputs.length}개 입력` : `${selectedSkill.inputs.length} inputs`}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3">
                  <SelectionMetaCard
                    label={copy.historyTitle}
                    value={copy.resultsCount(selectedSkillRunCount)}
                  />
                  <SelectionMetaCard
                    label={copy.formTitle}
                    value={runningRun ? copy.status[runningRun.status] : copy.run}
                  />
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                {locale === "ko"
                  ? "왼쪽에서 스킬을 고르면 입력 폼과 실행 상태가 아래에 이어집니다."
                  : "Select a skill on the left to continue into the form and run state below."}
              </p>
            )}
          </aside>
        </div>
      </section>
      <SkillForm
        skill={selectedSkill}
        values={values}
        runningRun={runningRun}
        onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
        onSubmit={() => void runSkill(locale, copy, selectedSkill, values, setHistory, setError, setFeedbackMessage)}
        onCancel={(runId) => void cancelRun(locale, copy, runId, setHistory, setFeedbackMessage)}
      />
      {history.length === 0 ? (
        <EmptyStateCard
          title={copy.emptyTitle}
          message={copy.emptyMessage}
        />
      ) : null}
      <RunHistory
        runs={history}
        onView={setViewerRun}
        onCancel={(runId) => void cancelRun(locale, copy, runId, setHistory, setFeedbackMessage)}
      />
      <RunResultViewer run={viewerRun} onClose={() => setViewerRun(null)} />
    </div>
  );
}

async function loadTemplates(
  locale: AppLocale,
  setTemplates: (value: SkillTemplate[]) => void,
  setSelectedSkill: (value: SkillTemplate | null) => void,
) {
  const response = await fetch("/api/ai-skills/templates", {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });
  const payload = (await response.json()) as { templates: SkillTemplate[] };
  setTemplates(payload.templates);
  setSelectedSkill(payload.templates[0] ?? null);
}

async function loadHistory(
  locale: AppLocale,
  setHistory: (value: SkillRun[]) => void,
) {
  const response = await fetch("/api/ai-skills/history", {
    cache: "no-store",
    headers: { "x-dashboard-locale": locale },
  });
  const payload = (await response.json()) as SkillHistoryResponse;
  setHistory(payload.runs);
}

async function runSkill(
  locale: AppLocale,
  copy: ReturnType<typeof getAiSkillsCopy>,
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
    headers: { "Content-Type": "application/json", "x-dashboard-locale": locale },
    body: JSON.stringify({ skillId: skill.id, inputs: values }),
  });
  const payload = (await response.json()) as SkillRunResponse | { error?: { message: string } };

  if (!response.ok) {
    setError("error" in payload ? payload.error?.message ?? copy.runRequestFailed : copy.runRequestFailed);
    return;
  }

  setError("");
  await loadHistory(locale, setHistory);
  setFeedbackMessage(copy.queueAdded(skill.name));
}

async function cancelRun(
  locale: AppLocale,
  copy: ReturnType<typeof getAiSkillsCopy>,
  runId: string,
  setHistory: (value: SkillRun[]) => void,
  setFeedbackMessage: (value: string) => void,
) {
  await fetch(`/api/ai-skills/cancel/${runId}`, {
    method: "POST",
    headers: { "x-dashboard-locale": locale },
  });
  await loadHistory(locale, setHistory);
  setFeedbackMessage(copy.cancelSuccess);
}

function filterTemplates(
  templates: SkillTemplate[],
  query: string,
  runnerFilter: SkillTemplate["runner"] | "all",
  categoryFilter: SkillTemplate["category"] | "all",
) {
  const normalized = query.trim().toLowerCase();

  return templates.filter((template) => {
    const matchesQuery = !normalized
      || [template.name, template.description, template.runner]
        .some((value) => value.toLowerCase().includes(normalized));
    const matchesRunner = runnerFilter === "all" || template.runner === runnerFilter;
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;

    return matchesQuery && matchesRunner && matchesCategory;
  });
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={[
        "rounded-full border px-3",
        active
          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
          : "border-border-base bg-white/6 text-white/70 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Button>
  );
}

function SelectionMetaCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border-base bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
