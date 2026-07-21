import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import type { CallDocPreset } from "@/lib/call-to-prd/document-config";

const presetCopy: Record<CallDocPreset, {
  label: { ko: string; en: string };
  description: { ko: string; en: string };
}> = {
  quick: {
    label: { ko: "빠른 PRD", en: "Quick PRD" },
    description: {
      ko: "주제 한 줄로 PRD 1장만 빠르게 생성",
      en: "Generate a single PRD fast from a one-line topic.",
    },
  },
  core: {
    label: { ko: "핵심 세트", en: "Core Set" },
    description: {
      ko: "PRD, 미확정 사항, Acceptance Criteria, 유저 플로우",
      en: "PRD, open questions, acceptance criteria, and user flow.",
    },
  },
  voc: {
    label: { ko: "VOC / 문제 분석", en: "VOC / Issue Analysis" },
    description: {
      ko: "PRD, 문제정의서, 고객 전달용 기획안, 미확정 사항",
      en: "PRD, problem statement, client brief, and open questions.",
    },
  },
  customer: {
    label: { ko: "고객 공유", en: "Client Share" },
    description: {
      ko: "PRD, 고객 전달용 기획안, 미확정 사항",
      en: "PRD, client brief, and open questions.",
    },
  },
  handoff: {
    label: { ko: "개발 핸드오프", en: "Dev Handoff" },
    description: {
      ko: "핵심 세트 + API 계약서 + 데이터 스키마",
      en: "Core set plus API contract and data schema.",
    },
  },
  change: {
    label: { ko: "변경 요청 대응", en: "Change Request" },
    description: {
      ko: "PRD, 미확정 사항, 변경요청 Diff, 개발 태스크 분해",
      en: "PRD, open questions, diff, and task breakdown.",
    },
  },
  "ai-review": {
    label: { ko: "AI 검수 세트", en: "AI Quality Set" },
    description: {
      ko: "핵심 세트 + Prompt Spec + 평가 계획",
      en: "Core set plus prompt spec and evaluation plan.",
    },
  },
  release: {
    label: { ko: "출시 준비", en: "Release Prep" },
    description: {
      ko: "PRD, Acceptance Criteria, QA 체크리스트, 릴리즈 런북",
      en: "PRD, acceptance criteria, QA checklist, and release runbook.",
    },
  },
  custom: {
    label: { ko: "커스텀", en: "Custom" },
    description: {
      ko: "아래 체크박스로 필요한 문서만 선택",
      en: "Select only the documents you need below.",
    },
  },
};


export function getCallPresetLabel(preset: CallDocPreset, locale: AppLocale) {
  return pickLocale(locale, presetCopy[preset].label);
}

export function getCallPresetDescription(preset: CallDocPreset, locale: AppLocale) {
  return pickLocale(locale, presetCopy[preset].description);
}

