"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderOpen,
  LoaderCircle,
  MessageSquare,
  Newspaper,
  Save,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import type { DashboardTabId } from "@/components/layout/TabNav";
import { useLocale } from "@/components/layout/LocaleProvider";
import { APP_META } from "@/lib/app-meta";
import type {
  DashboardLabRuntimeCheck,
  DashboardLabRuntimeWorkflow,
  DashboardLabRuntimeInstallResponse,
  DashboardLabRuntimeSummaryResponse,
} from "@/lib/types";

interface DashboardOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTab: (tab: DashboardTabId) => void;
}

const QUICK_STARTS: Array<{
  tab: DashboardTabId;
  title: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    tab: "projects",
    title: "프로젝트부터 확인",
    description: "내 로컬 프로젝트 구조와 현재 작업 기준선을 먼저 확인합니다.",
    icon: FolderOpen,
  },
  {
    tab: "cshelper",
    title: "CS Helper 열기",
    description: "프로젝트 컨텍스트를 기준으로 고객 응답과 내부 분석을 같이 만듭니다.",
    icon: MessageSquare,
  },
  {
    tab: "calltoprd",
    title: "Call → PRD 열기",
    description: "메모나 회의 내용을 바탕으로 PRD와 실무 문서를 생성합니다.",
    icon: Sparkles,
  },
];

type RuntimeDraft = {
  projectsRoot: string;
  dataRoot: string;
  openaiApiKey: string;
};

const EMPTY_DRAFT: RuntimeDraft = {
  projectsRoot: "",
  dataRoot: "",
  openaiApiKey: "",
};

const WORKFLOW_ACTIONS: Partial<Record<string, { tab: DashboardTabId; label: string }>> = {
  workspace: { tab: "projects", label: "Projects 열기" },
  "cs-helper": { tab: "cshelper", label: "CS Helper 열기" },
  "ai-skills": { tab: "aiskills", label: "AI Skills 열기" },
  "prd-text": { tab: "calltoprd", label: "Call → PRD 열기" },
  "prd-voice": { tab: "calltoprd", label: "Call → PRD 열기" },
  "info-hub": { tab: "infohub", label: "Info Hub 열기" },
};

export function DashboardOnboardingModal({
  open,
  onClose,
  onSelectTab,
}: DashboardOnboardingModalProps) {
  const { locale } = useLocale();
  const [summary, setSummary] =
    useState<DashboardLabRuntimeSummaryResponse | null>(null);
  const [draft, setDraft] = useState<RuntimeDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [installingTaskIds, setInstallingTaskIds] = useState<string[]>([]);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [clearOpenAiKey, setClearOpenAiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/system/runtime", {
        cache: "no-store",
        headers: {
          "x-dashboard-locale": locale,
        },
      });
      if (!response.ok) {
        throw new Error("런타임 설정을 불러오지 못했습니다.");
      }

      const nextSummary =
        (await response.json()) as DashboardLabRuntimeSummaryResponse;
      setSummary(nextSummary);
      setDraft({
        projectsRoot:
          nextSummary.settings.paths.projectsRoot ??
          nextSummary.resolvedPaths.projectsRoot.path ??
          "",
        dataRoot: nextSummary.settings.paths.dataRoot ?? "",
        openaiApiKey: "",
      });
      setClearOpenAiKey(false);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "런타임 설정을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadSummary();
  }, [open, loadSummary]);

  async function handleInstallTasks(taskIds: string[]) {
    const uniqueTaskIds = [...new Set(taskIds.filter(Boolean))];
    if (uniqueTaskIds.length === 0) {
      return;
    }

    setInstallingTaskIds(uniqueTaskIds);
    setError(null);
    setInstallFeedback(null);

    try {
      const response = await fetch("/api/system/runtime/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({ taskIds: uniqueTaskIds }),
      });

      const payload = (await response.json()) as
        | DashboardLabRuntimeInstallResponse
        | { error?: { message?: string } };

      if (!response.ok) {
        throw new Error(
          "error" in payload
            ? payload.error?.message ?? "설치 작업을 완료하지 못했습니다."
            : "설치 작업을 완료하지 못했습니다.",
        );
      }

      if (!("summary" in payload)) {
        throw new Error("설치 응답 형식이 올바르지 않습니다.");
      }

      setSummary(payload.summary);
      setInstallFeedback(
        payload.results
          .map((result: DashboardLabRuntimeInstallResponse["results"][number]) =>
            result.status === "success"
              ? `${result.label} 완료`
              : `${result.label} 실패`,
          )
          .join(" · "),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "설치 작업을 완료하지 못했습니다.",
      );
    } finally {
      setInstallingTaskIds([]);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/system/runtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({
          paths: {
            projectsRoot: draft.projectsRoot,
            dataRoot: draft.dataRoot || null,
            prdSaveDir: summary?.settings.paths.prdSaveDir ?? null,
            csContextsDir: summary?.settings.paths.csContextsDir ?? null,
            allowedRoots: [
              ...(summary?.settings.paths.allowedRoots ?? []),
              draft.projectsRoot,
            ].filter(Boolean),
          },
          secrets: {
            openaiApiKey: draft.openaiApiKey,
            clearOpenaiApiKey: clearOpenAiKey,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as {
          error?: { message?: string };
        };
        throw new Error(
          payload.error?.message ?? "런타임 설정 저장에 실패했습니다.",
        );
      }

      const nextSummary =
        (await response.json()) as DashboardLabRuntimeSummaryResponse;
      setSummary(nextSummary);
      onClose();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "런타임 설정 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  const requiredInstallableTaskIds =
    summary?.checks
      .filter(
        (check) =>
          check.required &&
          check.status !== "pass" &&
          check.remedy?.action === "run" &&
          Boolean(check.remedy.taskId),
      )
      .map((check) => check.remedy?.taskId ?? "")
      .filter(Boolean) ?? [];

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/65 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="온보딩 닫기"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative mx-auto w-full max-w-6xl rounded-[30px] border border-white/10 bg-[#131313] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              시작 안내
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white">
              {APP_META.displayName} 실행 준비
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              자동 감지 결과를 보고, 이 컴퓨터에서 어떤 경로를 쓸지 먼저
              확정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <section className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    런타임 감지 상태
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">
                    설치된 도구와 연결 가능한 경로를 자동으로 확인했습니다.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    음성 전사 도구는 선택 항목으로 다룹니다. 핵심 워크스페이스 기능은 오디오 도구 없이도 시작할 수 있습니다.
                  </p>
                </div>
                {loading ? (
                  <LoaderCircle className="h-5 w-5 animate-spin text-cyan-300" />
                ) : null}
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              {installFeedback ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
                  {installFeedback}
                </div>
              ) : null}

              {summary && requiredInstallableTaskIds.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-950/10 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        필수 도구 자동 준비
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">
                        지금 빠진 필수 도구를 한 번에 설치하거나 다운로드할 수 있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleInstallTasks(requiredInstallableTaskIds)}
                      disabled={installingTaskIds.length > 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {installingTaskIds.length > 0 ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wrench className="h-4 w-4" />
                      )}
                      필수 도구 자동 설치
                    </button>
                  </div>
                </div>
              ) : null}

              {summary ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {summary.checks.map((check) => (
                    <RuntimeCheckCard
                      key={check.id}
                      check={check}
                      installing={installingTaskIds.includes(check.remedy?.taskId ?? "")}
                      onRunRemedy={() => {
                        if (check.remedy?.action === "run" && check.remedy.taskId) {
                          void handleInstallTasks([check.remedy.taskId]);
                          return;
                        }

                        if (check.remedy?.action === "open_url" && check.remedy.url) {
                          window.open(check.remedy.url, "_blank", "noopener,noreferrer");
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-gray-400">
                  {loading
                    ? "런타임 정보를 읽는 중입니다."
                    : "런타임 정보를 아직 불러오지 못했습니다."}
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm font-semibold text-white">권장 사용 순서</p>
              <div className="mt-4 space-y-4 text-sm text-[var(--color-text-soft)]">
                <div>
                  <p className="font-medium text-white">
                    1. 경로와 도구 상태부터 확인
                  </p>
                  <p className="mt-1 leading-6">
                    프로젝트 루트와 저장 경로를 확정한 뒤 간단 모드의 핵심 탭부터 시작합니다.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-white">
                    2. Projects / Doc Hub에서 기준선 확인
                  </p>
                  <p className="mt-1 leading-6">
                    현재 프로젝트 구조와 문서를 먼저 훑은 뒤 필요한 기능으로 이동합니다.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-white">
                    3. CS Helper, AI Skills, Call → PRD로 후속 작업 연결
                  </p>
                  <p className="mt-1 leading-6">
                    고객 응답 초안, 반복 스킬 실행, PRD 생성 흐름을 필요에 따라 이어서 처리합니다.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-sm font-semibold text-white">지금 바로 가능한 작업</p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">
                자동 감지 결과를 기준으로, 현재 이 컴퓨터에서 바로 쓸 수 있는 워크플로와 나중에 준비할 항목을 나눠 보여줍니다.
              </p>

              {summary ? (
                <div className="mt-4 grid gap-3">
                  {summary.workflows
                    .slice()
                    .sort((left, right) => {
                      if (left.status === right.status) {
                        return left.label.localeCompare(right.label);
                      }

                      return left.status === "pass" ? -1 : 1;
                    })
                    .map((workflow) => (
                      <WorkflowReadinessCard
                        key={workflow.id}
                        workflow={workflow}
                        onOpen={() => {
                          const action = WORKFLOW_ACTIONS[workflow.id];
                          if (!action) {
                            return;
                          }

                          onSelectTab(action.tab);
                          onClose();
                        }}
                      />
                    ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-gray-400">
                  {loading
                    ? "사용 가능한 워크플로를 계산하는 중입니다."
                    : "워크플로 상태를 아직 계산하지 못했습니다."}
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3 py-1 text-xs text-emerald-200">
                    <Wrench className="h-3.5 w-3.5" />
                    workspace setup
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    기본 경로 저장
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">
                    자동 감지된 후보를 확인하고 필요한 경우 직접 수정해서
                    저장합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadSummary()}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 transition hover:bg-white/10"
                >
                  다시 감지
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <RuntimeInput
                  label="프로젝트 루트"
                  value={draft.projectsRoot}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      projectsRoot: value,
                    }))
                  }
                  candidates={summary?.discovery.projectsRootCandidates ?? []}
                />
                <RuntimeInput
                  label="데이터 저장 위치"
                  value={draft.dataRoot}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      dataRoot: value,
                    }))
                  }
                  placeholder={
                    draft.dataRoot
                      ? `${draft.dataRoot}/dashboard-lab-docs/`
                      : "비워두면 ~/Documents/dashboard-lab-docs/ 에 저장"
                  }
                  helperText="비워두면 Documents 폴더에 자동 저장됩니다. 다른 경로를 지정하면 해당 위치에 dashboard-lab-docs 폴더가 만들어집니다."
                />
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
                        OpenAI API Key
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">
                        Claude/Codex CLI가 없어도 CS Helper와 PRD 생성 fallback을
                        쓰려면 키를 저장하세요. 이 값은 현재 기기 로컬 상태에만
                        저장됩니다.
                      </p>
                    </div>
                    {summary?.integrations.openaiConfigured ? (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200">
                        저장됨
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="password"
                    value={draft.openaiApiKey}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        openaiApiKey: event.target.value,
                      }));
                      if (clearOpenAiKey) {
                        setClearOpenAiKey(false);
                      }
                    }}
                    placeholder={
                      summary?.integrations.openaiConfigured
                        ? "새 키로 교체하려면 입력"
                        : "sk-..."
                    }
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40"
                  />
                  {summary?.integrations.openaiConfigured ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-400">
                        비워두면 기존 키를 유지합니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setClearOpenAiKey((current) => !current);
                          setDraft((current) => ({
                            ...current,
                            openaiApiKey: "",
                          }));
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          clearOpenAiKey
                            ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        {clearOpenAiKey ? "키 제거 예정" : "저장된 키 제거"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  저장하고 시작
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10"
                >
                  나중에 설정
                </button>
              </div>
            </section>

            <section className="space-y-3">
              {QUICK_STARTS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.tab);
                      onClose();
                    }}
                    className="w-full rounded-[26px] border border-white/8 bg-white/[0.03] p-5 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
                        <Icon className="h-3.5 w-3.5" />
                        바로 이동
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuntimeCheckCard({
  check,
  installing,
  onRunRemedy,
}: {
  check: DashboardLabRuntimeCheck;
  installing: boolean;
  onRunRemedy: () => void;
}) {
  const tone =
    check.status === "pass"
      ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-100"
      : check.status === "fail"
        ? "border-rose-500/20 bg-rose-950/20 text-rose-100"
        : "border-amber-500/20 bg-amber-950/20 text-amber-100";

  const Icon =
    check.status === "pass"
      ? CheckCircle2
      : check.status === "fail"
        ? AlertTriangle
        : AlertTriangle;

  return (
    <article className={`rounded-2xl border px-4 py-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{check.label}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{check.detail}</p>
          {check.fixHint ? (
            <p className="mt-2 text-xs leading-5 opacity-80">{check.fixHint}</p>
          ) : null}
          {check.remedy?.action === "manual" ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-[11px] leading-5 text-white/80">
              {check.remedy.detail}
            </div>
          ) : null}
          {check.status !== "pass" && check.remedy?.action !== "manual" ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRunRemedy}
                disabled={installing}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {installing ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : check.remedy?.action === "open_url" ? (
                  <ExternalLink className="h-3.5 w-3.5" />
                ) : (
                  <Wrench className="h-3.5 w-3.5" />
                )}
                {check.remedy?.label}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RuntimeInput({
  label,
  value,
  onChange,
  candidates = [],
  placeholder,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  candidates?: DashboardLabRuntimeSummaryResponse["discovery"]["projectsRootCandidates"];
  placeholder?: string;
  helperText?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? `${label} 입력`}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40"
      />
      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-gray-500">{helperText}</p>
      ) : null}
      {candidates.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {candidates.map((candidate) => (
            <button
              key={candidate.path}
              type="button"
              onClick={() => onChange(candidate.path)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition",
                candidate.selected
                  ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10",
              ].join(" ")}
            >
              {candidate.exists ? "추천" : "후보"} · {candidate.path}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WorkflowReadinessCard({
  workflow,
  onOpen,
}: {
  workflow: DashboardLabRuntimeWorkflow;
  onOpen: () => void;
}) {
  const Icon = getWorkflowIcon(workflow.id);
  const tone =
    workflow.status === "pass"
      ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-100"
      : workflow.status === "fail"
        ? "border-rose-500/20 bg-rose-950/20 text-rose-100"
        : "border-amber-500/20 bg-amber-950/20 text-amber-100";
  const action = WORKFLOW_ACTIONS[workflow.id];

  return (
    <article className={`rounded-2xl border px-4 py-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{workflow.label}</p>
            <span className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/70">
              {workflow.status === "pass" ? "ready" : workflow.status}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 opacity-80">{workflow.detail}</p>
          {action ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/12"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                {action.label}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function getWorkflowIcon(workflowId: string) {
  switch (workflowId) {
    case "workspace":
      return FolderOpen;
    case "cs-helper":
      return MessageSquare;
    case "ai-skills":
      return Bot;
    case "prd-text":
    case "prd-voice":
      return FileText;
    case "info-hub":
      return Newspaper;
    default:
      return Sparkles;
  }
}
