"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Check, Sparkles, Target, X } from "lucide-react";

import {
  CALL_DOC_DEFINITIONS,
  CALL_DOC_PRESET_DEFINITIONS,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";

type GuideTab = "presets" | "docs" | "scenarios";

interface DocSelectionGuideModalProps {
  onApplyPreset: (preset: Exclude<CallDocPreset, "custom">) => void;
  onClose: () => void;
  open: boolean;
}

const GUIDE_TABS: Array<{ id: GuideTab; label: string }> = [
  { id: "presets", label: "프리셋별" },
  { id: "docs", label: "문서별" },
  { id: "scenarios", label: "추천 시나리오" },
];

const PRESET_GUIDE: Record<Exclude<CallDocPreset, "custom">, {
  summary: string;
  useWhen: string[];
  avoidWhen: string[];
}> = {
  core: {
    summary: "기획 정리와 첫 미팅 후속정리용 기본 세트입니다.",
    useWhen: [
      "고객 미팅이나 내부 회의 직후 핵심 정리와 요구사항 정돈이 먼저 필요할 때",
      "아직 API나 데이터 구조까지 깊게 확정되지 않았을 때",
      "처음 생성해보고 이후 필요한 문서만 추가로 뽑고 싶을 때",
    ],
    avoidWhen: [
      "바로 개발 전달 문서가 필요한데 API 계약이나 스키마도 같이 정리해야 할 때",
      "AI 품질 검수 기준까지 같이 정리해야 할 때",
    ],
  },
  "issue-analysis": {
    summary: "고객 불만, VOC, 내부 회의 이슈를 문제정의와 고객 공유 문서로 빠르게 정리할 때 적합합니다.",
    useWhen: [
      "고객 컴플레인을 제품 문제로 정리하고 대응 방향을 먼저 맞춰야 할 때",
      "회의에서 발견된 운영/기능 문제를 PRD와 고객 전달 문서까지 이어서 만들고 싶을 때",
      "문제 현상과 해결 방향을 내부/외부 문서로 동시에 관리해야 할 때",
    ],
    avoidWhen: [
      "이미 구현 범위가 확정돼 개발 태스크와 API 설계가 더 중요한 단계일 때",
    ],
  },
  "client-share": {
    summary: "고객에게 현재 이해한 범위와 개발 방향을 빠르게 공유할 때 적합한 세트입니다.",
    useWhen: [
      "통화나 미팅 직후 고객에게 정리본을 바로 보내고 싶을 때",
      "비개발자도 이해할 수 있는 표현으로 범위와 진행 방식을 설명해야 할 때",
      "개발 착수 전 고객과 방향을 한 번 더 맞추고 싶을 때",
    ],
    avoidWhen: [
      "바로 개발 팀이 구현을 시작해야 해서 API, 스키마, 태스크 분해까지 필요한 때",
    ],
  },
  "dev-handoff": {
    summary: "기획에서 개발 전달로 넘어가는 시점에 가장 적합한 세트입니다.",
    useWhen: [
      "프론트/백엔드가 바로 구현 범위를 잡아야 할 때",
      "업로드, 상태조회, 저장 구조 같은 계약을 같이 정리해야 할 때",
      "회의 후 개발 티켓 분해 전에 한 번에 넘길 자료가 필요할 때",
    ],
    avoidWhen: [
      "아직 요구사항 자체가 많이 흔들리는 초기 탐색 단계일 때",
    ],
  },
  "change-request": {
    summary: "운영 중 추가 요청이 들어왔을 때 변경점과 구현 작업을 함께 정리하는 세트입니다.",
    useWhen: [
      "기존 기능 위에 고객 추가 요청이 들어와 무엇이 달라지는지 먼저 정리해야 할 때",
      "변경 범위와 구현 태스크를 한 번에 정리해 바로 작업 티켓으로 넘겨야 할 때",
      "현재 프로젝트 기준 정보 대비 영향 범위를 빠르게 확인해야 할 때",
    ],
    avoidWhen: [
      "완전히 신규 기능이라 기존 기준선과의 비교가 큰 의미가 없을 때",
    ],
  },
  "ai-quality": {
    summary: "AI 생성 품질, 프롬프트, 평가 기준이 중요한 기능에 맞는 세트입니다.",
    useWhen: [
      "LLM 출력 품질을 반복 검증해야 하는 기능일 때",
      "Prompt Spec과 평가 기준 없이 실무 적용이 어려울 때",
      "샘플셋, 정답률, 회귀 검증 기준까지 같이 정의해야 할 때",
    ],
    avoidWhen: [
      "AI가 핵심이 아닌 단순 CRUD 기능일 때",
    ],
  },
  release: {
    summary: "이미 방향이 잡힌 기능을 실제 배포 직전 수준으로 점검할 때 적합합니다.",
    useWhen: [
      "QA 체크리스트와 배포 절차를 빠르게 붙이고 싶을 때",
      "운영 모니터링, 롤백 기준, 출시 전 확인 항목이 필요한 시점일 때",
    ],
    avoidWhen: [
      "아직 요구사항이 많이 바뀌는 초기 단계일 때",
      "기술 설계나 API 계약이 먼저 필요한 상황일 때",
    ],
  },
};

const DOC_GUIDE: Record<CallDocType, { useWhen: string; value: string }> = {
  prd: {
    useWhen: "항상 기본",
    value: "배경, 목표, 요구사항, 우선순위, 개발 계획의 기준 문서입니다.",
  },
  "problem-statement": {
    useWhen: "고객 불만, 회의 이슈, 운영 문제를 먼저 정의해야 할 때",
    value: "현재 현상, 영향 범위, 원인 가설, 대응 방향을 분리해 문제를 선명하게 정의합니다.",
  },
  "open-questions": {
    useWhen: "고객 재확인이 많이 필요한 초기/중간 단계",
    value: "확정되지 않은 내용과 후속 질문을 분리해 회의 혼선을 줄입니다.",
  },
  "acceptance-criteria": {
    useWhen: "개발/QA 완료 기준을 맞춰야 할 때",
    value: "REQ별 완료 기준을 정리해 구현과 검수의 기준점을 맞춥니다.",
  },
  "user-flow": {
    useWhen: "사용 흐름이나 운영 흐름이 중요한 기능일 때",
    value: "핵심 사용자 흐름과 예외 흐름을 단계별로 정리합니다.",
  },
  "client-brief": {
    useWhen: "고객이나 비개발자에게 바로 공유할 정리본이 필요할 때",
    value: "요청 배경, 작업 범위, 진행 방식, 다음 단계를 쉬운 표현으로 정리합니다.",
  },
  "task-breakdown": {
    useWhen: "문서 생성 직후 바로 개발 작업으로 분해해야 할 때",
    value: "프론트/백엔드/API/QA 태스크와 구현 순서를 정리합니다.",
  },
  "change-request-diff": {
    useWhen: "운영 중 추가요청, 스코프 조정, 변경 영향 확인이 필요할 때",
    value: "현재 기준선 대비 추가/변경/보류 범위를 비교 중심으로 정리합니다.",
  },
  "api-contract": {
    useWhen: "프론트/백엔드 동시 작업 전",
    value: "요청/응답/에러 계약을 정리해 구현 오해를 줄입니다.",
  },
  "data-schema": {
    useWhen: "상태값, 저장 구조, 엔티티 정의가 중요한 기능일 때",
    value: "필드, 상태, 저장 규칙을 정리해 데이터 설계를 고정합니다.",
  },
  "prompt-spec": {
    useWhen: "AI 생성 로직을 반복 개선해야 할 때",
    value: "입력 변수, 지시문 구조, 가드레일을 명문화합니다.",
  },
  "evaluation-plan": {
    useWhen: "품질을 정량/정성으로 평가해야 할 때",
    value: "샘플셋, 점검 기준, 회귀 테스트 방식을 정리합니다.",
  },
  "qa-checklist": {
    useWhen: "QA 또는 출시 직전 점검",
    value: "핵심 기능, 실패 케이스, 성능 점검 항목을 빠르게 확인합니다.",
  },
  "release-runbook": {
    useWhen: "배포 직전 또는 운영 준비 단계",
    value: "배포 순서, 모니터링, 장애 대응, 롤백 절차를 정리합니다.",
  },
};

const SCENARIO_GUIDE: Array<{
  title: string;
  description: string;
  preset: Exclude<CallDocPreset, "custom">;
  extras?: CallDocType[];
}> = [
  {
    title: "첫 고객 미팅 직후 핵심 정리",
    description: "요구사항은 잡혔지만 기술 설계는 아직 열려 있는 상태",
    preset: "core",
  },
  {
    title: "고객 컴플레인이나 VOC를 문제 문서로 전환",
    description: "불만 원문을 바로 문제정의, PRD, 고객 공유 문서까지 연결해야 하는 상태",
    preset: "issue-analysis",
  },
  {
    title: "개발 착수 전에 FE/BE 전달",
    description: "구현 범위와 API/데이터 계약을 같이 넘겨야 하는 상태",
    preset: "dev-handoff",
  },
  {
    title: "고객에게 방향성과 범위를 빠르게 공유",
    description: "비개발자도 이해할 수 있는 정리본으로 범위와 진행 방식을 먼저 맞춰야 하는 상태",
    preset: "client-share",
  },
  {
    title: "운영 중 고객 추가 기능 요청 대응",
    description: "기존 기준선 대비 변경점과 구현 태스크를 같이 정리해야 하는 상태",
    preset: "change-request",
  },
  {
    title: "AI 생성 품질 검수 체계 만들기",
    description: "프롬프트와 평가 기준이 없으면 기능 품질을 관리하기 어려운 상태",
    preset: "ai-quality",
  },
  {
    title: "출시 직전 QA와 운영 준비",
    description: "배포 순서, 체크리스트, 롤백 기준까지 필요한 상태",
    preset: "release",
  },
  {
    title: "개발 핸드오프 + AI 검수 기준 둘 다 필요",
    description: "AI 기능이 핵심이라 계약과 평가 기준을 동시에 잡아야 하는 상태",
    preset: "dev-handoff",
    extras: ["prompt-spec", "evaluation-plan"],
  },
];

export function DocSelectionGuideModal({ onApplyPreset, onClose, open }: DocSelectionGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>("presets");
  const presetEntries = useMemo(
    () => Object.entries(CALL_DOC_PRESET_DEFINITIONS) as Array<
      [Exclude<CallDocPreset, "custom">, (typeof CALL_DOC_PRESET_DEFINITIONS)[Exclude<CallDocPreset, "custom">]]
    >,
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/65 px-4 py-6 backdrop-blur-sm">
      <button type="button" aria-label="가이드 닫기" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#131313] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-950/30 px-3 py-1 text-xs text-purple-200">
              <BookOpenText className="h-3.5 w-3.5" />
              선택 가이드
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white">언제 어떤 문서를 선택할지 빠르게 판단하기</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              문서를 많이 뽑을수록 좋은 게 아니라, 현재 단계에 맞는 세트를 고르는 게 중요합니다.
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

        <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2 overflow-y-auto">
            {GUIDE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                  activeTab === tab.id
                    ? "border-purple-500/30 bg-purple-950/25 text-purple-200"
                    : "border-white/8 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                }`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.id ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
            {activeTab === "presets" ? (
              <div className="space-y-4">
                {presetEntries.map(([preset, definition]) => (
                  <div key={preset} className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{definition.label}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{PRESET_GUIDE[preset].summary}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPreset(preset);
                          onClose();
                        }}
                        className="rounded-full border border-purple-500/25 bg-purple-950/30 px-4 py-2 text-xs font-medium text-purple-200 transition-colors hover:bg-purple-900/40"
                      >
                        이 프리셋 적용
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {definition.docTypes.map((docType) => (
                        <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-gray-300">
                          {CALL_DOC_DEFINITIONS[docType].shortLabel}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.05] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                          <Target className="h-4 w-4" />
                          이런 경우 선택
                        </div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                          {PRESET_GUIDE[preset].useWhen.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.05] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                          <Sparkles className="h-4 w-4" />
                          지금은 보류해도 되는 경우
                        </div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                          {PRESET_GUIDE[preset].avoidWhen.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === "docs" ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {Object.values(CALL_DOC_DEFINITIONS).map((doc) => (
                  <div key={doc.type} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{doc.label}</h3>
                      <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-gray-400">
                        {DOC_GUIDE[doc.type].useWhen}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-300">{DOC_GUIDE[doc.type].value}</p>
                    <p className="mt-3 text-xs leading-6 text-gray-500">{doc.description}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === "scenarios" ? (
              <div className="space-y-4">
                {SCENARIO_GUIDE.map((scenario) => (
                  <div key={scenario.title} className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{scenario.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{scenario.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPreset(scenario.preset);
                          onClose();
                        }}
                        className="rounded-full border border-purple-500/25 bg-purple-950/30 px-4 py-2 text-xs font-medium text-purple-200 transition-colors hover:bg-purple-900/40"
                      >
                        {CALL_DOC_PRESET_DEFINITIONS[scenario.preset].label} 적용
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-300">
                      <span className="rounded-full bg-purple-950/30 px-3 py-1 text-purple-200">
                        기본 추천: {CALL_DOC_PRESET_DEFINITIONS[scenario.preset].label}
                      </span>
                      {scenario.extras?.map((docType) => (
                        <span key={docType} className="rounded-full bg-white/8 px-3 py-1 text-gray-300">
                          추가 추천: {CALL_DOC_DEFINITIONS[docType].label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 rounded-[24px] border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
                <BookOpenText className="h-4 w-4" />
                기본 흐름 정리
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                <p>1. 현재 단계에 맞는 프리셋이나 문서를 선택합니다.</p>
                <p>2. 결과 화면에서 PRD와 지원 문서를 확인합니다.</p>
                <p>3. 저장 구조에서 저장된 문서와 `next-actions`를 다시 엽니다.</p>
                <p>4. 다음 액션에서 PM / FE / BE / QA / CS 후속 문서를 이어서 생성합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
