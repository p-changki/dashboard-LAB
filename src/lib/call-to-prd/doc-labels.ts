import type { CallDocType } from "@/lib/call-to-prd/document-config";
import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";

/**
 * Single source of truth for the 14 call-to-PRD document-type labels.
 *
 * Previously duplicated between src/lib/call-to-prd/messages.ts (server) and
 * src/features/call-to-prd/copy.ts (UI); both now read from here so the two
 * sides cannot drift.
 */
export const CALL_DOC_LABELS: Record<CallDocType, { ko: string; en: string }> = {
  prd: { ko: "PRD", en: "PRD" },
  "problem-statement": { ko: "문제정의서", en: "Problem Statement" },
  "client-brief": { ko: "고객 전달용 기획안", en: "Client Brief" },
  "open-questions": { ko: "미확정 사항", en: "Open Questions" },
  "acceptance-criteria": { ko: "Acceptance Criteria", en: "Acceptance Criteria" },
  "user-flow": { ko: "유저 플로우", en: "User Flow" },
  "task-breakdown": { ko: "개발 태스크 분해", en: "Task Breakdown" },
  "change-request-diff": { ko: "변경요청 Diff", en: "Change Request Diff" },
  "api-contract": { ko: "API 계약서", en: "API Contract" },
  "data-schema": { ko: "데이터 스키마", en: "Data Schema" },
  "prompt-spec": { ko: "Prompt Spec", en: "Prompt Spec" },
  "evaluation-plan": { ko: "평가 계획", en: "Evaluation Plan" },
  "qa-checklist": { ko: "QA 체크리스트", en: "QA Checklist" },
  "release-runbook": { ko: "릴리즈 런북", en: "Release Runbook" },
};

export function getCallDocTypeLabel(docType: CallDocType, locale: AppLocale) {
  return pickLocale(locale, CALL_DOC_LABELS[docType]);
}
