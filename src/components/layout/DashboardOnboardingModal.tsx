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
import { Button } from "@/components/ui/Button";
import { APP_META } from "@/lib/app-meta";
import { pickLocale, type AppLocale } from "@/lib/locale";
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
  const copy = pickLocale(locale, {
    ko: {
      closeAria: "온보딩 닫기",
      badge: "시작 안내",
      title: `${APP_META.displayName} 실행 준비`,
      description:
        "자동 감지 결과를 보고, 이 컴퓨터에서 어떤 경로를 쓸지 먼저 확정합니다.",
      loadRuntimeFailed: "런타임 설정을 불러오지 못했습니다.",
      installFailed: "설치 작업을 완료하지 못했습니다.",
      installPayloadInvalid: "설치 응답 형식이 올바르지 않습니다.",
      saveFailed: "런타임 설정 저장에 실패했습니다.",
      installDoneSuffix: "완료",
      installFailSuffix: "실패",
      runtimeTitle: "런타임 감지 상태",
      runtimeDescription: "설치된 도구와 연결 가능한 경로를 자동으로 확인했습니다.",
      optionalAudio:
        "음성 전사 도구는 선택 항목으로 다룹니다. 핵심 워크스페이스 기능은 오디오 도구 없이도 시작할 수 있습니다.",
      installTitle: "필수 도구 자동 준비",
      installDescription:
        "지금 빠진 필수 도구를 한 번에 설치하거나 다운로드할 수 있습니다.",
      installButton: "필수 도구 자동 설치",
      loadingRuntime: "런타임 정보를 읽는 중입니다.",
      missingRuntime: "런타임 정보를 아직 불러오지 못했습니다.",
      sequenceTitle: "권장 사용 순서",
      sequenceItems: [
        {
          title: "1. 경로와 도구 상태부터 확인",
          description:
            "프로젝트 루트와 저장 경로를 확정한 뒤 간단 모드의 핵심 탭부터 시작합니다.",
        },
        {
          title: "2. Projects / Doc Hub에서 기준선 확인",
          description:
            "현재 프로젝트 구조와 문서를 먼저 훑은 뒤 필요한 기능으로 이동합니다.",
        },
        {
          title: "3. CS Helper, AI Skills, Call → PRD로 후속 작업 연결",
          description:
            "고객 응답 초안, 반복 스킬 실행, PRD 생성 흐름을 필요에 따라 이어서 처리합니다.",
        },
      ],
      readyTitle: "지금 바로 가능한 작업",
      readyDescription:
        "자동 감지 결과를 기준으로, 현재 이 컴퓨터에서 바로 쓸 수 있는 워크플로와 나중에 준비할 항목을 나눠 보여줍니다.",
      loadingWorkflows: "사용 가능한 워크플로를 계산하는 중입니다.",
      missingWorkflows: "워크플로 상태를 아직 계산하지 못했습니다.",
      setupBadge: "workspace setup",
      setupTitle: "기본 경로 저장",
      setupDescription:
        "자동 감지된 후보를 확인하고 필요한 경우 직접 수정해서 저장합니다.",
      redetect: "다시 감지",
      projectsRoot: "프로젝트 루트",
      dataRoot: "데이터 저장 위치",
      dataRootPlaceholder: "비워두면 ~/Documents/dashboard-lab-docs/ 에 저장",
      dataRootHelper:
        "비워두면 Documents 폴더에 자동 저장됩니다. 다른 경로를 지정하면 해당 위치에 dashboard-lab-docs 폴더가 만들어집니다.",
      openAiDescription:
        "Claude/Codex CLI가 없어도 CS Helper와 PRD 생성 fallback을 쓰려면 키를 저장하세요. 이 값은 현재 기기 로컬 상태에만 저장됩니다.",
      openAiSaved: "저장됨",
      openAiReplacePlaceholder: "새 키로 교체하려면 입력",
      keepExistingKey: "비워두면 기존 키를 유지합니다.",
      clearKeyPending: "키 제거 예정",
      clearSavedKey: "저장된 키 제거",
      saveAndStart: "저장하고 시작",
      maybeLater: "나중에 설정",
      quickJump: "바로 이동",
      readyStatus: "ready",
      inputPrefix: "입력",
      recommended: "추천",
      candidate: "후보",
    },
    en: {
      closeAria: "Close onboarding",
      badge: "Getting started",
      title: `Prepare ${APP_META.displayName}`,
      description:
        "Review the auto-detected setup first and confirm which paths this machine should use.",
      loadRuntimeFailed: "Failed to load runtime settings.",
      installFailed: "Failed to complete the install task.",
      installPayloadInvalid: "The install response format is invalid.",
      saveFailed: "Failed to save runtime settings.",
      installDoneSuffix: "done",
      installFailSuffix: "failed",
      runtimeTitle: "Runtime detection status",
      runtimeDescription: "Installed tools and available paths were checked automatically.",
      optionalAudio:
        "Voice transcription tools are optional. Core workspace flows can start without audio tooling.",
      installTitle: "Prepare required tools",
      installDescription: "Install or download the missing required tools in one step.",
      installButton: "Install required tools",
      loadingRuntime: "Loading runtime details.",
      missingRuntime: "Runtime details are not available yet.",
      sequenceTitle: "Recommended order",
      sequenceItems: [
        {
          title: "1. Confirm paths and tool status",
          description:
            "Set your project root and storage paths first, then start from the core tabs.",
        },
        {
          title: "2. Review your baseline in Projects / Doc Hub",
          description:
            "Check the current project structure and docs before moving into follow-up tools.",
        },
        {
          title: "3. Continue with CS Helper, AI Skills, and Call → PRD",
          description:
            "Draft replies, run repeatable skills, and generate PRD workflows as needed.",
        },
      ],
      readyTitle: "Ready right now",
      readyDescription:
        "Based on the detection results, this shows which workflows are immediately available and which ones need more setup.",
      loadingWorkflows: "Calculating available workflows.",
      missingWorkflows: "Workflow readiness is not available yet.",
      setupBadge: "workspace setup",
      setupTitle: "Save default paths",
      setupDescription:
        "Review the detected candidates and override them if needed before saving.",
      redetect: "Detect again",
      projectsRoot: "Projects root",
      dataRoot: "Data storage path",
      dataRootPlaceholder:
        "Leave empty to save under ~/Documents/dashboard-lab-docs/",
      dataRootHelper:
        "If empty, files are saved under Documents. If you set another path, a dashboard-lab-docs folder will be created there.",
      openAiDescription:
        "Save a key if you want CS Helper and PRD generation fallback without Claude/Codex CLI. The key is stored only on this machine.",
      openAiSaved: "Saved",
      openAiReplacePlaceholder: "Enter a new key to replace the current one",
      keepExistingKey: "Leave this empty to keep the existing key.",
      clearKeyPending: "Key will be removed",
      clearSavedKey: "Remove saved key",
      saveAndStart: "Save and start",
      maybeLater: "Maybe later",
      quickJump: "Jump in",
      readyStatus: "ready",
      inputPrefix: "Enter",
      recommended: "Recommended",
      candidate: "Candidate",
    },
  });
  const quickStarts = getQuickStarts(locale);
  const workflowActions = getWorkflowActions(locale);

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
        throw new Error(copy.loadRuntimeFailed);
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
          : copy.loadRuntimeFailed,
      );
    } finally {
      setLoading(false);
    }
  }, [copy.loadRuntimeFailed, locale]);

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
            ? payload.error?.message ?? copy.installFailed
            : copy.installFailed,
        );
      }

      if (!("summary" in payload)) {
        throw new Error(copy.installPayloadInvalid);
      }

      setSummary(payload.summary);
      setInstallFeedback(
        payload.results
          .map((result: DashboardLabRuntimeInstallResponse["results"][number]) =>
            result.status === "success"
              ? `${result.label} ${copy.installDoneSuffix}`
              : `${result.label} ${copy.installFailSuffix}`,
          )
          .join(" · "),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : copy.installFailed,
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
          payload.error?.message ?? copy.saveFailed,
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
          : copy.saveFailed,
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
        aria-label={copy.closeAria}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative mx-auto w-full max-w-6xl rounded-[30px] border border-border-base bg-bg-page shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-border-base px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {copy.description}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={copy.closeAria}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-5 px-6 py-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <section className="rounded-[26px] border border-border-base bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {copy.runtimeTitle}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {copy.runtimeDescription}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-text-muted">
                    {copy.optionalAudio}
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
                        {copy.installTitle}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {copy.installDescription}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => void handleInstallTasks(requiredInstallableTaskIds)}
                      disabled={installingTaskIds.length > 0}
                      className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                    >
                      {installingTaskIds.length > 0 ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wrench className="h-4 w-4" />
                      )}
                      {copy.installButton}
                    </Button>
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
                <div className="mt-4 rounded-2xl border border-dashed border-border-base px-4 py-6 text-sm text-text-muted">
                  {loading
                    ? copy.loadingRuntime
                    : copy.missingRuntime}
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-border-base bg-white/[0.03] p-5">
              <p className="text-sm font-semibold text-white">{copy.sequenceTitle}</p>
              <div className="mt-4 space-y-4 text-sm text-text-secondary">
                {copy.sequenceItems.map((item) => (
                  <div key={item.title}>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 leading-6">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[26px] border border-border-base bg-white/[0.03] p-5">
              <p className="text-sm font-semibold text-white">{copy.readyTitle}</p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {copy.readyDescription}
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
                        locale={locale}
                        actionLabel={workflowActions[workflow.id]?.label ?? null}
                        onOpen={() => {
                          const action = workflowActions[workflow.id];
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
                <div className="mt-4 rounded-2xl border border-dashed border-border-base px-4 py-6 text-sm text-text-muted">
                  {loading
                    ? copy.loadingWorkflows
                    : copy.missingWorkflows}
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-border-base bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3 py-1 text-xs text-emerald-200">
                    <Wrench className="h-3.5 w-3.5" />
                    {copy.setupBadge}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {copy.setupTitle}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {copy.setupDescription}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadSummary()}
                >
                  {copy.redetect}
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                <RuntimeInput
                  label={copy.projectsRoot}
                  locale={locale}
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
                  label={copy.dataRoot}
                  locale={locale}
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
                      : copy.dataRootPlaceholder
                  }
                  helperText={copy.dataRootHelper}
                />
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-disabled">
                        OpenAI API Key
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {copy.openAiDescription}
                      </p>
                    </div>
                    {summary?.integrations.openaiConfigured ? (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200">
                        {copy.openAiSaved}
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
                        ? copy.openAiReplacePlaceholder
                        : "sk-..."
                    }
                    className="mt-3 w-full rounded-2xl border border-border-base bg-black/20 px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-cyan-400/40"
                  />
                  {summary?.integrations.openaiConfigured ? (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-text-muted">
                        {copy.keepExistingKey}
                      </p>
                      <Button
                        type="button"
                        variant={clearOpenAiKey ? "destructive" : "secondary"}
                        size="sm"
                        onClick={() => {
                          setClearOpenAiKey((current) => !current);
                          setDraft((current) => ({
                            ...current,
                            openaiApiKey: "",
                          }));
                        }}
                      >
                        {clearOpenAiKey ? copy.clearKeyPending : copy.clearSavedKey}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleSave()}
                  disabled={saving || loading}
                  className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {copy.saveAndStart}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                >
                  {copy.maybeLater}
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              {quickStarts.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.tab}
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      onSelectTab(item.tab);
                      onClose();
                    }}
                    className="w-full rounded-[26px] border border-border-base bg-white/[0.03] p-5 !h-auto !justify-start !items-start text-left hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-border-base bg-white/6 px-3 py-1 text-xs text-white/70">
                        <Icon className="h-3.5 w-3.5" />
                        {copy.quickJump}
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {item.description}
                    </p>
                  </Button>
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
          <p className="mt-1 break-all text-xs leading-5 opacity-80">
            {check.detail}
          </p>
          {check.fixHint ? (
            <p className="mt-2 break-words text-xs leading-5 opacity-80">
              {check.fixHint}
            </p>
          ) : null}
          {check.remedy?.action === "manual" ? (
            <div className="mt-3 break-words rounded-xl border border-border-base bg-black/15 px-3 py-2 text-[11px] leading-5 text-white/80">
              {check.remedy.detail}
            </div>
          ) : null}
          {check.status !== "pass" && check.remedy?.action !== "manual" ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRunRemedy}
                disabled={installing}
                className="border-white/12 bg-white/8 text-white hover:bg-white/12"
              >
                {installing ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : check.remedy?.action === "open_url" ? (
                  <ExternalLink className="h-3.5 w-3.5" />
                ) : (
                  <Wrench className="h-3.5 w-3.5" />
                )}
                {check.remedy?.label}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RuntimeInput({
  label,
  locale,
  value,
  onChange,
  candidates = [],
  placeholder,
  helperText,
}: {
  label: string;
  locale: AppLocale;
  value: string;
  onChange: (value: string) => void;
  candidates?: DashboardLabRuntimeSummaryResponse["discovery"]["projectsRootCandidates"];
  placeholder?: string;
  helperText?: string;
}) {
  const copy = pickLocale(locale, {
    ko: { inputPrefix: "입력", recommended: "추천", candidate: "후보" },
    en: { inputPrefix: "Enter", recommended: "Recommended", candidate: "Candidate" },
  });

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-disabled">
        {label}
      </p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? `${copy.inputPrefix} ${label}`}
        className="mt-2 w-full rounded-2xl border border-border-base bg-black/20 px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-cyan-400/40"
      />
      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-text-muted">{helperText}</p>
      ) : null}
      {candidates.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {candidates.map((candidate) => (
            <Button
              key={candidate.path}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange(candidate.path)}
              className={candidate.selected ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100" : undefined}
            >
              {candidate.exists ? copy.recommended : copy.candidate} · {candidate.path}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WorkflowReadinessCard({
  workflow,
  locale,
  actionLabel,
  onOpen,
}: {
  workflow: DashboardLabRuntimeWorkflow;
  locale: AppLocale;
  actionLabel: string | null;
  onOpen: () => void;
}) {
  const Icon = getWorkflowIcon(workflow.id);
  const tone =
    workflow.status === "pass"
      ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-100"
      : workflow.status === "fail"
        ? "border-rose-500/20 bg-rose-950/20 text-rose-100"
        : "border-amber-500/20 bg-amber-950/20 text-amber-100";
  const copy = pickLocale(locale, {
    ko: { ready: "ready" },
    en: { ready: "ready" },
  });

  return (
    <article className={`rounded-2xl border px-4 py-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-border-base bg-black/15 p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{workflow.label}</p>
            <span className="rounded-full border border-border-base bg-black/15 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/70">
              {workflow.status === "pass" ? copy.ready : workflow.status}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 opacity-80">{workflow.detail}</p>
          {actionLabel ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onOpen}
                className="border-white/12 bg-white/8 text-white hover:bg-white/12"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                {actionLabel}
              </Button>
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

function getQuickStarts(locale: AppLocale): Array<{
  tab: DashboardTabId;
  title: string;
  description: string;
  icon: typeof Sparkles;
}> {
  return pickLocale(locale, {
    ko: [
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
    ],
    en: [
      {
        tab: "projects",
        title: "Start with Projects",
        description: "Review your local project structure and current working baseline first.",
        icon: FolderOpen,
      },
      {
        tab: "cshelper",
        title: "Open CS Helper",
        description: "Draft customer replies and internal analysis using project context.",
        icon: MessageSquare,
      },
      {
        tab: "calltoprd",
        title: "Open Call → PRD",
        description: "Turn notes or meeting content into PRDs and working docs.",
        icon: Sparkles,
      },
    ],
  });
}

function getWorkflowActions(
  locale: AppLocale,
): Partial<Record<string, { tab: DashboardTabId; label: string }>> {
  return pickLocale(locale, {
    ko: {
      workspace: { tab: "projects", label: "Projects 열기" },
      "cs-helper": { tab: "cshelper", label: "CS Helper 열기" },
      "ai-skills": { tab: "aiskills", label: "AI Skills 열기" },
      "prd-text": { tab: "calltoprd", label: "Call → PRD 열기" },
      "prd-voice": { tab: "calltoprd", label: "Call → PRD 열기" },
      "info-hub": { tab: "infohub", label: "Info Hub 열기" },
    },
    en: {
      workspace: { tab: "projects", label: "Open Projects" },
      "cs-helper": { tab: "cshelper", label: "Open CS Helper" },
      "ai-skills": { tab: "aiskills", label: "Open AI Skills" },
      "prd-text": { tab: "calltoprd", label: "Open Call → PRD" },
      "prd-voice": { tab: "calltoprd", label: "Open Call → PRD" },
      "info-hub": { tab: "infohub", label: "Open Info Hub" },
    },
  });
}
