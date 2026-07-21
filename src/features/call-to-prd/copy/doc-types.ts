import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import type { CallDocType } from "@/lib/call-to-prd/document-config";
import { getCallDocTypeLabel } from "@/lib/call-to-prd/doc-labels";

const docCopy: Record<CallDocType, {
  shortLabel: { ko: string; en: string };
  description: { ko: string; en: string };
}> = {
  prd: {
    shortLabel: { ko: "PRD", en: "PRD" },
    description: {
      ko: "기능 배경, 요구사항, 우선순위, 개발 계획을 정리한 기준 문서",
      en: "Core document for background, requirements, priorities, and delivery plan.",
    },
  },
  "problem-statement": {
    shortLabel: { ko: "Problem", en: "Problem" },
    description: {
      ko: "고객 불만, 회의 이슈, 운영 문제를 현상·영향·원인 가설·대응 방향으로 정리",
      en: "Defines symptoms, impact, hypotheses, and response direction for issues.",
    },
  },
  "client-brief": {
    shortLabel: { ko: "Client", en: "Client" },
    description: {
      ko: "비개발자도 이해할 수 있게 요청 배경, 작업 범위, 진행 방식, 다음 단계를 설명",
      en: "Summarizes scope, approach, and next steps in client-friendly language.",
    },
  },
  "open-questions": {
    shortLabel: { ko: "미확정", en: "Open" },
    description: {
      ko: "확정되지 않은 항목, 현재 가정, 고객 확인이 필요한 질문을 정리",
      en: "Tracks unresolved assumptions and questions requiring confirmation.",
    },
  },
  "acceptance-criteria": {
    shortLabel: { ko: "AC", en: "AC" },
    description: {
      ko: "요구사항별 완료 기준과 검수 포인트를 정의",
      en: "Defines completion criteria and QA checkpoints for each requirement.",
    },
  },
  "user-flow": {
    shortLabel: { ko: "Flow", en: "Flow" },
    description: {
      ko: "핵심 사용자 흐름, 예외 흐름, 상태 변화, 시각 다이어그램을 정리",
      en: "Captures main flows, edge cases, state changes, and diagrams.",
    },
  },
  "task-breakdown": {
    shortLabel: { ko: "Tasks", en: "Tasks" },
    description: {
      ko: "PRD를 FE/BE/API/QA 단위 작업으로 쪼개고 선후관계를 정리",
      en: "Breaks the work into FE/BE/API/QA tasks and sequencing.",
    },
  },
  "change-request-diff": {
    shortLabel: { ko: "Diff", en: "Diff" },
    description: {
      ko: "현재 요청이 기존 기준 문서나 프로젝트 기준 정보 대비 무엇이 달라지는지 정리",
      en: "Highlights what changed from the previous baseline or project context.",
    },
  },
  "api-contract": {
    shortLabel: { ko: "API", en: "API" },
    description: {
      ko: "예상 API 엔드포인트, 요청/응답 형식, 에러 계약을 정리",
      en: "Documents endpoints, request/response shape, and error contracts.",
    },
  },
  "data-schema": {
    shortLabel: { ko: "Schema", en: "Schema" },
    description: {
      ko: "핵심 엔티티, 상태값, 저장 구조, 필드 정의를 정리",
      en: "Defines entities, statuses, storage rules, and key fields.",
    },
  },
  "prompt-spec": {
    shortLabel: { ko: "Prompt", en: "Prompt" },
    description: {
      ko: "AI 또는 규칙 기반 생성 로직의 입력, 출력, 가드레일을 정리",
      en: "Defines inputs, outputs, and guardrails for AI or rule-based generation.",
    },
  },
  "evaluation-plan": {
    shortLabel: { ko: "Eval", en: "Eval" },
    description: {
      ko: "샘플셋, 평가 기준, 통과 기준, 회귀 검증 방법을 정리",
      en: "Defines samples, evaluation metrics, pass criteria, and regression checks.",
    },
  },
  "qa-checklist": {
    shortLabel: { ko: "QA", en: "QA" },
    description: {
      ko: "출시 전 기능/예외/품질 점검 항목을 정리",
      en: "Lists release-readiness checks for features, edge cases, and quality.",
    },
  },
  "release-runbook": {
    shortLabel: { ko: "Runbook", en: "Runbook" },
    description: {
      ko: "배포 순서, 모니터링, 장애 대응, 롤백 절차를 정리",
      en: "Documents deployment steps, monitoring, incident response, and rollback.",
    },
  },
};


export function getCallDocLabel(docType: CallDocType, locale: AppLocale) {
  return getCallDocTypeLabel(docType, locale);
}

export function getCallDocShortLabel(docType: CallDocType, locale: AppLocale) {
  return pickLocale(locale, docCopy[docType].shortLabel);
}

export function getCallDocDescription(docType: CallDocType, locale: AppLocale) {
  return pickLocale(locale, docCopy[docType].description);
}

