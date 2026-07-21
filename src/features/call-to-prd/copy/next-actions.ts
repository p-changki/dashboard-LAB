import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import type { CallNextActionType } from "@/lib/types/call-to-prd";

const nextActionCopy: Record<CallNextActionType, {
  label: { ko: string; en: string };
  shortLabel: { ko: string; en: string };
  description: { ko: string; en: string };
}> = {
  "pm-handoff": {
    label: { ko: "PM 다음 액션", en: "PM Next Action" },
    shortLabel: { ko: "PM", en: "PM" },
    description: {
      ko: "의사결정 정리, 오픈 이슈, 우선순위, 다음 미팅 안건을 정리합니다.",
      en: "Summarizes decisions, open issues, priorities, and next meeting agenda.",
    },
  },
  "frontend-plan": {
    label: { ko: "프론트엔드 실행안", en: "Frontend Plan" },
    shortLabel: { ko: "FE", en: "FE" },
    description: {
      ko: "화면, 컴포넌트, 상태, 예외 처리 기준으로 FE 구현 계획을 정리합니다.",
      en: "Outlines FE implementation by screens, components, state, and edge cases.",
    },
  },
  "backend-plan": {
    label: { ko: "백엔드 실행안", en: "Backend Plan" },
    shortLabel: { ko: "BE", en: "BE" },
    description: {
      ko: "API, 데이터, 비동기 처리, 실패 케이스 기준으로 BE 구현 계획을 정리합니다.",
      en: "Outlines BE implementation by API, data, async processing, and failure paths.",
    },
  },
  "qa-plan": {
    label: { ko: "QA 실행안", en: "QA Plan" },
    shortLabel: { ko: "QA", en: "QA" },
    description: {
      ko: "핵심 시나리오, 예외 케이스, 검수 순서 중심으로 QA 계획을 정리합니다.",
      en: "Summarizes QA execution around key scenarios, edge cases, and validation order.",
    },
  },
  "cs-brief": {
    label: { ko: "CS 전달 초안", en: "CS Brief" },
    shortLabel: { ko: "CS", en: "CS" },
    description: {
      ko: "운영팀/고객 공지에 바로 쓸 수 있는 변경 요약과 FAQ 초안을 만듭니다.",
      en: "Creates a change summary and FAQ draft for operations or customer updates.",
    },
  },
  "github-issues": {
    label: { ko: "GitHub Issue 초안", en: "GitHub Issue Drafts" },
    shortLabel: { ko: "Issues", en: "Issues" },
    description: {
      ko: "작업 단위별 이슈 제목, 목적, 완료 조건, 의존성을 바로 옮길 수 있게 정리합니다.",
      en: "Prepares issue titles, purpose, done criteria, and dependencies by work item.",
    },
  },
};


export function getCallNextActionLabel(actionType: CallNextActionType, locale: AppLocale) {
  return pickLocale(locale, nextActionCopy[actionType].label);
}

export function getCallNextActionShortLabel(actionType: CallNextActionType, locale: AppLocale) {
  return pickLocale(locale, nextActionCopy[actionType].shortLabel);
}

export function getCallNextActionDescription(actionType: CallNextActionType, locale: AppLocale) {
  return pickLocale(locale, nextActionCopy[actionType].description);
}

