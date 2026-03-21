import type { CallNextActionType } from "@/lib/types/call-to-prd";

export const CALL_NEXT_ACTION_DEFINITIONS: Record<
  CallNextActionType,
  {
    label: string;
    shortLabel: string;
    description: string;
  }
> = {
  "pm-handoff": {
    label: "PM 다음 액션",
    shortLabel: "PM",
    description: "의사결정 정리, 오픈 이슈, 우선순위, 다음 미팅 안건을 정리합니다.",
  },
  "frontend-plan": {
    label: "프론트엔드 실행안",
    shortLabel: "FE",
    description: "화면, 컴포넌트, 상태, 예외 처리 기준으로 FE 구현 계획을 정리합니다.",
  },
  "backend-plan": {
    label: "백엔드 실행안",
    shortLabel: "BE",
    description: "API, 데이터, 비동기 처리, 실패 케이스 기준으로 BE 구현 계획을 정리합니다.",
  },
  "qa-plan": {
    label: "QA 실행안",
    shortLabel: "QA",
    description: "핵심 시나리오, 예외 케이스, 검수 순서 중심으로 QA 계획을 정리합니다.",
  },
  "cs-brief": {
    label: "CS 전달 초안",
    shortLabel: "CS",
    description: "운영팀/고객 공지에 바로 쓸 수 있는 변경 요약과 FAQ 초안을 만듭니다.",
  },
  "github-issues": {
    label: "GitHub Issue 초안",
    shortLabel: "Issues",
    description: "작업 단위별 이슈 제목, 목적, 완료 조건, 의존성을 바로 옮길 수 있게 정리합니다.",
  },
};
