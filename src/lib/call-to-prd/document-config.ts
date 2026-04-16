export const CALL_DOC_TYPES = [
  "prd",
  "problem-statement",
  "client-brief",
  "open-questions",
  "acceptance-criteria",
  "user-flow",
  "task-breakdown",
  "change-request-diff",
  "api-contract",
  "data-schema",
  "prompt-spec",
  "evaluation-plan",
  "qa-checklist",
  "release-runbook",
] as const;

export type CallDocType = (typeof CALL_DOC_TYPES)[number];

export const CALL_DOC_PRESETS = [
  "quick",
  "core",
  "voc",
  "customer",
  "handoff",
  "change",
  "ai-review",
  "release",
  "custom",
] as const;

export type CallDocPreset = (typeof CALL_DOC_PRESETS)[number];

const LEGACY_CALL_DOC_PRESET_ALIASES = {
  "issue-analysis": "voc",
  "client-share": "customer",
  "dev-handoff": "handoff",
  "change-request": "change",
  "ai-quality": "ai-review",
} as const satisfies Record<string, Exclude<CallDocPreset, "custom">>;

export const PRIMARY_PRESETS: CallDocPreset[] = ["quick", "voc", "handoff"];
export const ADVANCED_PRESETS: CallDocPreset[] = ["customer", "core", "change", "ai-review", "release", "custom"];

export interface CallDocDefinition {
  type: CallDocType;
  label: string;
  shortLabel: string;
  description: string;
  fileName: string;
}

export const CALL_DOC_DEFINITIONS: Record<CallDocType, CallDocDefinition> = {
  prd: {
    type: "prd",
    label: "PRD",
    shortLabel: "PRD",
    description: "기능 배경, 요구사항, 우선순위, 개발 계획을 정리한 기준 문서",
    fileName: "01-prd.md",
  },
  "problem-statement": {
    type: "problem-statement",
    label: "문제정의서",
    shortLabel: "Problem",
    description: "고객 불만, 회의 이슈, 운영 문제를 현상·영향·원인 가설·대응 방향으로 정리",
    fileName: "02-problem-statement.md",
  },
  "client-brief": {
    type: "client-brief",
    label: "고객 전달용 기획안",
    shortLabel: "Client",
    description: "비개발자도 이해할 수 있게 요청 배경, 작업 범위, 진행 방식, 다음 단계를 설명",
    fileName: "03-client-brief.md",
  },
  "open-questions": {
    type: "open-questions",
    label: "미확정 사항",
    shortLabel: "미확정",
    description: "확정되지 않은 항목, 현재 가정, 고객 확인이 필요한 질문을 정리",
    fileName: "04-open-questions.md",
  },
  "acceptance-criteria": {
    type: "acceptance-criteria",
    label: "Acceptance Criteria",
    shortLabel: "AC",
    description: "요구사항별 완료 기준과 검수 포인트를 정의",
    fileName: "05-acceptance-criteria.md",
  },
  "user-flow": {
    type: "user-flow",
    label: "유저 플로우",
    shortLabel: "Flow",
    description: "핵심 사용자 흐름, 예외 흐름, 상태 변화, 시각 다이어그램을 정리",
    fileName: "06-user-flow.md",
  },
  "task-breakdown": {
    type: "task-breakdown",
    label: "개발 태스크 분해",
    shortLabel: "Tasks",
    description: "PRD를 FE/BE/API/QA 단위 작업으로 쪼개고 선후관계를 정리",
    fileName: "07-task-breakdown.md",
  },
  "change-request-diff": {
    type: "change-request-diff",
    label: "변경요청 Diff",
    shortLabel: "Diff",
    description: "현재 요청이 기존 기준 문서나 프로젝트 기준 정보 대비 무엇이 달라지는지 정리",
    fileName: "08-change-request-diff.md",
  },
  "api-contract": {
    type: "api-contract",
    label: "API 계약서",
    shortLabel: "API",
    description: "예상 API 엔드포인트, 요청/응답 형식, 에러 계약을 정리",
    fileName: "09-api-contract.md",
  },
  "data-schema": {
    type: "data-schema",
    label: "데이터 스키마",
    shortLabel: "Schema",
    description: "핵심 엔티티, 상태값, 저장 구조, 필드 정의를 정리",
    fileName: "10-data-schema.md",
  },
  "prompt-spec": {
    type: "prompt-spec",
    label: "Prompt Spec",
    shortLabel: "Prompt",
    description: "AI 또는 규칙 기반 생성 로직의 입력, 출력, 가드레일을 정리",
    fileName: "11-prompt-spec.md",
  },
  "evaluation-plan": {
    type: "evaluation-plan",
    label: "평가 계획",
    shortLabel: "Eval",
    description: "샘플셋, 평가 기준, 통과 기준, 회귀 검증 방법을 정리",
    fileName: "12-evaluation-plan.md",
  },
  "qa-checklist": {
    type: "qa-checklist",
    label: "QA 체크리스트",
    shortLabel: "QA",
    description: "출시 전 기능/예외/품질 점검 항목을 정리",
    fileName: "13-qa-checklist.md",
  },
  "release-runbook": {
    type: "release-runbook",
    label: "릴리즈 런북",
    shortLabel: "Runbook",
    description: "배포 순서, 모니터링, 장애 대응, 롤백 절차를 정리",
    fileName: "14-release-runbook.md",
  },
};

export const CALL_DOC_PRESET_DEFINITIONS: Record<Exclude<CallDocPreset, "custom">, {
  label: string;
  description: string;
  docTypes: CallDocType[];
}> = {
  quick: {
    label: "빠른 PRD",
    description: "PRD 1장만 빠르게 생성",
    docTypes: ["prd"],
  },
  core: {
    label: "핵심 세트",
    description: "PRD, 미확정 사항, Acceptance Criteria, 유저 플로우",
    docTypes: ["prd", "open-questions", "acceptance-criteria", "user-flow"],
  },
  voc: {
    label: "VOC / 문제 분석",
    description: "PRD, 문제정의서, 고객 전달용 기획안, 미확정 사항",
    docTypes: ["prd", "problem-statement", "client-brief", "open-questions"],
  },
  customer: {
    label: "고객 공유",
    description: "PRD, 고객 전달용 기획안, 미확정 사항",
    docTypes: ["prd", "client-brief", "open-questions"],
  },
  handoff: {
    label: "개발 핸드오프",
    description: "핵심 세트 + API 계약서 + 데이터 스키마",
    docTypes: ["prd", "open-questions", "acceptance-criteria", "user-flow", "api-contract", "data-schema"],
  },
  change: {
    label: "변경 요청 대응",
    description: "PRD, 미확정 사항, 변경요청 Diff, 개발 태스크 분해",
    docTypes: ["prd", "open-questions", "change-request-diff", "task-breakdown"],
  },
  "ai-review": {
    label: "AI 검수 세트",
    description: "핵심 세트 + Prompt Spec + 평가 계획",
    docTypes: ["prd", "open-questions", "acceptance-criteria", "user-flow", "prompt-spec", "evaluation-plan"],
  },
  release: {
    label: "출시 준비",
    description: "PRD, Acceptance Criteria, QA 체크리스트, 릴리즈 런북",
    docTypes: ["prd", "acceptance-criteria", "qa-checklist", "release-runbook"],
  },
};

export function isCallDocType(value: string): value is CallDocType {
  return CALL_DOC_TYPES.includes(value as CallDocType);
}

export function isCallDocPreset(value: string): value is CallDocPreset {
  return CALL_DOC_PRESETS.includes(value as CallDocPreset);
}

export function normalizeCallDocPreset(value: string | null | undefined): CallDocPreset {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "core";
  }

  if (isCallDocPreset(trimmed)) {
    return trimmed;
  }

  if (trimmed in LEGACY_CALL_DOC_PRESET_ALIASES) {
    return LEGACY_CALL_DOC_PRESET_ALIASES[trimmed as keyof typeof LEGACY_CALL_DOC_PRESET_ALIASES];
  }

  return "core";
}

export function sortCallDocTypes(docTypes: readonly CallDocType[]): CallDocType[] {
  const seen = new Set<CallDocType>();
  const normalized = docTypes.includes("prd") ? [...docTypes] : ["prd", ...docTypes];

  return CALL_DOC_TYPES.filter((docType) => {
    if (seen.has(docType)) {
      return false;
    }
    if (normalized.includes(docType)) {
      seen.add(docType);
      return true;
    }
    return false;
  });
}

export function resolvePresetDocTypes(preset: string | null | undefined): CallDocType[] {
  const normalizedPreset = normalizeCallDocPreset(preset);

  if (normalizedPreset !== "custom") {
    return CALL_DOC_PRESET_DEFINITIONS[normalizedPreset].docTypes;
  }

  return CALL_DOC_PRESET_DEFINITIONS.core.docTypes;
}

export function normalizeSelectedDocTypes(
  selectedDocTypes: readonly string[],
  preset: string | null | undefined,
): CallDocType[] {
  const explicit = selectedDocTypes.filter(isCallDocType);

  if (explicit.length > 0) {
    return sortCallDocTypes(explicit);
  }

  return sortCallDocTypes(resolvePresetDocTypes(preset));
}

export function buildGeneratedDocTitle(type: CallDocType, projectName?: string | null): string {
  const label = CALL_DOC_DEFINITIONS[type].label;
  return projectName?.trim() ? `${projectName} - ${label}` : label;
}
