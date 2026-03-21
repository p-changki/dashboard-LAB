"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  LoaderCircle,
  MessageSquare,
  Save,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import type { DashboardTabId } from "@/components/TabNav";
import { APP_META } from "@/lib/app-meta";
import type {
  DashboardLabRuntimeCheck,
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
    tab: "calltoprd",
    title: "Call → PRD부터 시작",
    description: "통화나 메모를 올리고 PRD, 기준선 비교, 다음 액션까지 이어갑니다.",
    icon: Sparkles,
  },
  {
    tab: "cshelper",
    title: "CS Helper 열기",
    description: "프로젝트 컨텍스트를 기준으로 고객 응답과 내부 분석을 같이 만듭니다.",
    icon: MessageSquare,
  },
  {
    tab: "projects",
    title: "프로젝트 상태 보기",
    description: "현재 로컬 프로젝트 구조와 상태를 먼저 확인할 수 있습니다.",
    icon: FolderOpen,
  },
];

type RuntimeDraft = {
  projectsRoot: string;
  obsidianVault: string;
  prdSaveDir: string;
  csContextsDir: string;
};

const EMPTY_DRAFT: RuntimeDraft = {
  projectsRoot: "",
  obsidianVault: "",
  prdSaveDir: "",
  csContextsDir: "",
};

export function DashboardOnboardingModal({
  open,
  onClose,
  onSelectTab,
}: DashboardOnboardingModalProps) {
  const [summary, setSummary] =
    useState<DashboardLabRuntimeSummaryResponse | null>(null);
  const [draft, setDraft] = useState<RuntimeDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadSummary();
  }, [open]);

  async function loadSummary() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/system/runtime", { cache: "no-store" });
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
        obsidianVault:
          nextSummary.settings.paths.obsidianVault ??
          nextSummary.resolvedPaths.obsidianVault.path ??
          "",
        prdSaveDir:
          nextSummary.settings.paths.prdSaveDir ??
          nextSummary.resolvedPaths.prdSaveDir.path ??
          "",
        csContextsDir:
          nextSummary.settings.paths.csContextsDir ??
          nextSummary.resolvedPaths.csContextsDir.path ??
          "",
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "런타임 설정을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
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
        },
        body: JSON.stringify({
          paths: {
            ...draft,
            allowedRoots: [
              draft.projectsRoot,
              draft.obsidianVault,
              draft.prdSaveDir,
              draft.csContextsDir,
            ].filter(Boolean),
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

              {summary ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {summary.checks.map((check) => (
                    <RuntimeCheckCard key={check.id} check={check} />
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
                    프로젝트 루트, Vault, 저장 경로를 확정한 뒤 기능 탭으로
                    이동합니다.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-white">
                    2. Call → PRD에서 기준 문서 생성
                  </p>
                  <p className="mt-1 leading-6">
                    통화나 메모를 넣고 PRD, 실무 문서, 다음 액션까지 이어서
                    만듭니다.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-white">
                    3. CS Helper와 AI Skills로 후속 작업 연결
                  </p>
                  <p className="mt-1 leading-6">
                    고객 응답 초안, 내부 분석, 스킬 실행까지 같은 흐름 안에서
                    처리합니다.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-5">
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
                  label="Obsidian Vault"
                  value={draft.obsidianVault}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      obsidianVault: value,
                    }))
                  }
                  candidates={summary?.discovery.obsidianVaultCandidates ?? []}
                />
                <RuntimeInput
                  label="PRD 저장 경로"
                  value={draft.prdSaveDir}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      prdSaveDir: value,
                    }))
                  }
                />
                <RuntimeInput
                  label="CS 컨텍스트 경로"
                  value={draft.csContextsDir}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      csContextsDir: value,
                    }))
                  }
                />
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

function RuntimeCheckCard({ check }: { check: DashboardLabRuntimeCheck }) {
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  candidates?: DashboardLabRuntimeSummaryResponse["discovery"]["projectsRootCandidates"];
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${label} 입력`}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-400/40"
      />
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
