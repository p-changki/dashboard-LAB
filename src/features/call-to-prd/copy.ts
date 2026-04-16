import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import type { CallDocPreset, CallDocType } from "@/lib/call-to-prd/document-config";
import type {
  CallCustomerImpact,
  CallInputKind,
  CallReproducibility,
  CallSeverity,
  CallUrgency,
} from "@/lib/call-to-prd/intake-config";
import type {
  CallGenerationMode,
  CallNextActionType,
  CallRecord,
} from "@/lib/types/call-to-prd";
import {
  formatKnownCallToPrdRuntimeMessage,
  getCallToPrdApiError as getSharedCallToPrdApiError,
} from "@/lib/call-to-prd/messages";

const inputKindLabels: Record<CallInputKind, { ko: string; en: string }> = {
  meeting: { ko: "회의 메모", en: "Meeting notes" },
  complaint: { ko: "고객 불만 / VOC", en: "Customer complaint / VOC" },
  incident: { ko: "운영 이슈 / 장애", en: "Operational issue / incident" },
  "change-request": { ko: "변경 요청", en: "Change request" },
  "new-feature": { ko: "신규 기능 요청", en: "New feature request" },
};

const severityLabels: Record<CallSeverity, { ko: string; en: string }> = {
  low: { ko: "낮음", en: "Low" },
  medium: { ko: "보통", en: "Medium" },
  high: { ko: "높음", en: "High" },
  critical: { ko: "치명적", en: "Critical" },
};

const customerImpactLabels: Record<CallCustomerImpact, { ko: string; en: string }> = {
  unknown: { ko: "아직 모름", en: "Unknown" },
  single: { ko: "소수 고객", en: "Single customer" },
  multiple: { ko: "여러 고객", en: "Multiple customers" },
  broad: { ko: "핵심 고객군 / 광범위", en: "Broad / key segment" },
};

const urgencyLabels: Record<CallUrgency, { ko: string; en: string }> = {
  low: { ko: "낮음", en: "Low" },
  medium: { ko: "보통", en: "Medium" },
  high: { ko: "높음", en: "High" },
  asap: { ko: "즉시 대응", en: "ASAP" },
};

const reproducibilityLabels: Record<CallReproducibility, { ko: string; en: string }> = {
  unknown: { ko: "아직 모름", en: "Unknown" },
  confirmed: { ko: "재현됨", en: "Confirmed" },
  intermittent: { ko: "간헐 재현", en: "Intermittent" },
  "not-reproduced": { ko: "아직 재현 안 됨", en: "Not reproduced yet" },
};

const docCopy: Record<CallDocType, {
  label: { ko: string; en: string };
  shortLabel: { ko: string; en: string };
  description: { ko: string; en: string };
}> = {
  prd: {
    label: { ko: "PRD", en: "PRD" },
    shortLabel: { ko: "PRD", en: "PRD" },
    description: {
      ko: "기능 배경, 요구사항, 우선순위, 개발 계획을 정리한 기준 문서",
      en: "Core document for background, requirements, priorities, and delivery plan.",
    },
  },
  "problem-statement": {
    label: { ko: "문제정의서", en: "Problem Statement" },
    shortLabel: { ko: "Problem", en: "Problem" },
    description: {
      ko: "고객 불만, 회의 이슈, 운영 문제를 현상·영향·원인 가설·대응 방향으로 정리",
      en: "Defines symptoms, impact, hypotheses, and response direction for issues.",
    },
  },
  "client-brief": {
    label: { ko: "고객 전달용 기획안", en: "Client Brief" },
    shortLabel: { ko: "Client", en: "Client" },
    description: {
      ko: "비개발자도 이해할 수 있게 요청 배경, 작업 범위, 진행 방식, 다음 단계를 설명",
      en: "Summarizes scope, approach, and next steps in client-friendly language.",
    },
  },
  "open-questions": {
    label: { ko: "미확정 사항", en: "Open Questions" },
    shortLabel: { ko: "미확정", en: "Open" },
    description: {
      ko: "확정되지 않은 항목, 현재 가정, 고객 확인이 필요한 질문을 정리",
      en: "Tracks unresolved assumptions and questions requiring confirmation.",
    },
  },
  "acceptance-criteria": {
    label: { ko: "Acceptance Criteria", en: "Acceptance Criteria" },
    shortLabel: { ko: "AC", en: "AC" },
    description: {
      ko: "요구사항별 완료 기준과 검수 포인트를 정의",
      en: "Defines completion criteria and QA checkpoints for each requirement.",
    },
  },
  "user-flow": {
    label: { ko: "유저 플로우", en: "User Flow" },
    shortLabel: { ko: "Flow", en: "Flow" },
    description: {
      ko: "핵심 사용자 흐름, 예외 흐름, 상태 변화, 시각 다이어그램을 정리",
      en: "Captures main flows, edge cases, state changes, and diagrams.",
    },
  },
  "task-breakdown": {
    label: { ko: "개발 태스크 분해", en: "Task Breakdown" },
    shortLabel: { ko: "Tasks", en: "Tasks" },
    description: {
      ko: "PRD를 FE/BE/API/QA 단위 작업으로 쪼개고 선후관계를 정리",
      en: "Breaks the work into FE/BE/API/QA tasks and sequencing.",
    },
  },
  "change-request-diff": {
    label: { ko: "변경요청 Diff", en: "Change Request Diff" },
    shortLabel: { ko: "Diff", en: "Diff" },
    description: {
      ko: "현재 요청이 기존 기준 문서나 프로젝트 기준 정보 대비 무엇이 달라지는지 정리",
      en: "Highlights what changed from the previous baseline or project context.",
    },
  },
  "api-contract": {
    label: { ko: "API 계약서", en: "API Contract" },
    shortLabel: { ko: "API", en: "API" },
    description: {
      ko: "예상 API 엔드포인트, 요청/응답 형식, 에러 계약을 정리",
      en: "Documents endpoints, request/response shape, and error contracts.",
    },
  },
  "data-schema": {
    label: { ko: "데이터 스키마", en: "Data Schema" },
    shortLabel: { ko: "Schema", en: "Schema" },
    description: {
      ko: "핵심 엔티티, 상태값, 저장 구조, 필드 정의를 정리",
      en: "Defines entities, statuses, storage rules, and key fields.",
    },
  },
  "prompt-spec": {
    label: { ko: "Prompt Spec", en: "Prompt Spec" },
    shortLabel: { ko: "Prompt", en: "Prompt" },
    description: {
      ko: "AI 또는 규칙 기반 생성 로직의 입력, 출력, 가드레일을 정리",
      en: "Defines inputs, outputs, and guardrails for AI or rule-based generation.",
    },
  },
  "evaluation-plan": {
    label: { ko: "평가 계획", en: "Evaluation Plan" },
    shortLabel: { ko: "Eval", en: "Eval" },
    description: {
      ko: "샘플셋, 평가 기준, 통과 기준, 회귀 검증 방법을 정리",
      en: "Defines samples, evaluation metrics, pass criteria, and regression checks.",
    },
  },
  "qa-checklist": {
    label: { ko: "QA 체크리스트", en: "QA Checklist" },
    shortLabel: { ko: "QA", en: "QA" },
    description: {
      ko: "출시 전 기능/예외/품질 점검 항목을 정리",
      en: "Lists release-readiness checks for features, edge cases, and quality.",
    },
  },
  "release-runbook": {
    label: { ko: "릴리즈 런북", en: "Release Runbook" },
    shortLabel: { ko: "Runbook", en: "Runbook" },
    description: {
      ko: "배포 순서, 모니터링, 장애 대응, 롤백 절차를 정리",
      en: "Documents deployment steps, monitoring, incident response, and rollback.",
    },
  },
};

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

const generationModeCopy: Record<CallGenerationMode, {
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  stepLabel: { ko: string; en: string };
}> = {
  claude: {
    label: { ko: "Claude 단일", en: "Claude only" },
    description: {
      ko: "기본 추천. 가장 비용이 안정적입니다.",
      en: "Default recommendation with the most predictable cost.",
    },
    stepLabel: { ko: "PRD 생성 (Claude 단일)", en: "Generate PRD (Claude only)" },
  },
  codex: {
    label: { ko: "Codex 단일", en: "Codex only" },
    description: {
      ko: "Codex CLI가 준비된 경우에만 사용합니다.",
      en: "Use only when Codex CLI is available.",
    },
    stepLabel: { ko: "PRD 생성 (Codex 단일)", en: "Generate PRD (Codex only)" },
  },
  dual: {
    label: { ko: "Dual AI", en: "Dual AI" },
    description: {
      ko: "Claude + Codex 생성 후 머지합니다. 비용이 가장 큽니다.",
      en: "Generates with Claude and Codex, then merges them. Highest cost.",
    },
    stepLabel: { ko: "PRD 생성 (Claude + Codex 병렬)", en: "Generate PRD (Claude + Codex in parallel)" },
  },
  openai: {
    label: { ko: "OpenAI API", en: "OpenAI API" },
    description: {
      ko: "CLI 없이 API key만으로 문서를 생성합니다.",
      en: "Generates docs with an API key only, without a CLI.",
    },
    stepLabel: { ko: "PRD 생성 (OpenAI API)", en: "Generate PRD (OpenAI API)" },
  },
};

const statusCopy: Record<CallRecord["status"], { ko: string; en: string }> = {
  uploading: { ko: "업로드 준비 중", en: "Preparing upload" },
  transcribing: { ko: "음성 텍스트 변환 중", en: "Transcribing audio" },
  "extracting-pdf": { ko: "PDF 텍스트 추출 중", en: "Extracting PDF text" },
  "analyzing-pdf": { ko: "PDF 구조 분석 중", en: "Analyzing PDF structure" },
  analyzing: { ko: "PRD 생성 중", en: "Generating PRD" },
  merging: { ko: "Dual-AI 머지 중", en: "Merging dual-AI output" },
  "generating-docs": { ko: "실무 문서 생성 중", en: "Generating working docs" },
  completed: { ko: "완료", en: "Completed" },
  failed: { ko: "실패", en: "Failed" },
};

const tabCopy = {
  ko: {
    heroEyebrow: "Call → PRD",
    heroTitle: "회의, 고객 이슈, 운영 메모를 실행 문서로 바꾸는 워크플로",
    heroDescription:
      "녹음 파일이 없어도 바로 쓸 수 있습니다. 통화 전사본, 회의 메모, 고객 불만, 운영 이슈를 붙여넣거나 파일로 올리면 PRD와 후속 실행 문서 초안까지 한 번에 이어서 만듭니다.",
    cards: [
      {
        label: "입력",
        title: "녹음 파일 또는 텍스트 메모",
        description: "통화 전사, 회의 정리, 고객 이슈 설명을 그대로 넣고 프로젝트 맥락만 함께 고르면 됩니다.",
      },
      {
        label: "생성",
        title: "PRD와 실무 문서 초안",
        description: "문제 정의, change request, 공유 문서, 내부 정리 문서를 프리셋으로 한 번에 만들 수 있습니다.",
      },
      {
        label: "후속 액션",
        title: "PM, FE, BE, QA, CS 초안 연결",
        description: "생성된 PRD를 바탕으로 각 역할별 다음 액션 문서를 이어서 만들 수 있습니다.",
      },
    ],
    tabs: {
      intake: "새 문서",
      viewer: "결과 뷰어",
      history: "히스토리",
    },
    intakeModes: {
      quick: {
        label: "빠른 작성",
        description: "주제 한 줄로 PRD 1장",
      },
      pro: {
        label: "정밀 모드",
        description: "메타데이터와 문서 세트까지 설정",
      },
    },
    recentTemplatesEyebrow: "최근 템플릿",
    recentTemplatesTitle: "반복 작업은 템플릿으로 바로 이어갑니다",
    recentTemplatesDescription: "최근 저장한 템플릿 3개를 바로 불러와 Pro 모드 문서 구성을 복원합니다.",
    recentTemplateApply: "템플릿 열기",
    recentTemplateMenu: "템플릿 메뉴",
    recentTemplateUpdated: (value: string) => `최근 사용 ${value}`,
  },
  en: {
    heroEyebrow: "Call → PRD",
    heroTitle: "Turn calls, customer issues, and working notes into execution documents",
    heroDescription:
      "You can start without an audio file. Paste a transcript, meeting note, customer complaint, or ops issue, then generate a PRD and follow-up working docs in one flow.",
    cards: [
      {
        label: "Input",
        title: "Audio file or text notes",
        description: "Drop in a transcript, meeting recap, or customer issue and pair it with project context.",
      },
      {
        label: "Output",
        title: "PRD and working doc drafts",
        description: "Generate problem framing, change requests, share docs, and internal work docs from presets.",
      },
      {
        label: "Next action",
        title: "PM, FE, BE, QA, and CS follow-ups",
        description: "Continue from the generated PRD into role-specific next action drafts.",
      },
    ],
    tabs: {
      intake: "New Doc",
      viewer: "Viewer",
      history: "History",
    },
    intakeModes: {
      quick: {
        label: "Quick",
        description: "One-line topic to one PRD",
      },
      pro: {
        label: "Pro",
        description: "Configure metadata and doc sets",
      },
    },
    recentTemplatesEyebrow: "Recent templates",
    recentTemplatesTitle: "Resume repeated work from a saved template",
    recentTemplatesDescription: "Load the three most recent template sets and reopen the Pro-mode doc setup immediately.",
    recentTemplateApply: "Open template",
    recentTemplateMenu: "Template menu",
    recentTemplateUpdated: (value: string) => `Used ${value}`,
  },
};

const baseCopy = {
  ko: {
    common: {
      none: "없음",
      custom: "커스텀",
      allProjects: "모든 프로젝트",
      retry: "재시도",
      delete: "삭제",
      copy: "복사",
      download: "다운로드",
      loading: "생성 중",
      ready: "준비됨",
      create: "생성",
      required: "필수",
      selected: "선택됨",
      available: "선택 가능",
      active: "사용 중",
      currentWorkspace: "현재 작업중",
      documentCount: (count: number) => `${count}개 문서`,
    },
    intake: {
      coreModeTitle: "간단 모드 안내",
      coreModeMessage:
        "처음에는 텍스트 직접 입력으로 시작하는 편이 가장 단순합니다. 회의 메모나 고객 이슈 설명을 붙여넣고 프로젝트만 선택한 뒤 문서 생성 시작을 누르면 됩니다.",
      feedbackTitle: "반영되었습니다",
      quickBadge: "빠른 작성",
      quickTitle: "한 줄 입력으로 PRD 1장을 바로 만듭니다.",
      quickDescription:
        "회의 메모, 고객 요청, 운영 이슈를 한두 문장으로 적으면 PRD 초안을 먼저 만듭니다. 세부 메타데이터와 추가 문서가 필요하면 정밀 모드로 전환하면 됩니다.",
      quickTopicLabel: "주제 / 요청 요약",
      quickTopicPlaceholder: "예: 결제 실패 VOC를 정리해서 원인 가설과 대응 방향이 포함된 PRD 초안을 만들어줘",
      quickTopicHint: "통화 전체를 붙일 필요는 없습니다. 지금 정리하고 싶은 이슈나 목표만 한 줄로 적어도 시작할 수 있습니다.",
      quickProjectLabel: "프로젝트 기준선",
      quickProjectDescription: "프로젝트는 선택 사항이지만, 선택하면 실제 코드베이스와 문서를 읽어 PRD 문맥을 보강합니다.",
      quickProjectPlaceholder: "프로젝트 선택 안 함 (현재 워크스페이스 우선)",
      quickProjectStatus: "현재 기준선",
      quickProjectOptional: "프로젝트 미선택",
      quickCurrentWorkspace: "현재 작업중인 워크스페이스를 자동 기준선으로 사용합니다.",
      quickContextHint: "프로젝트를 선택하면 읽은 기준 파일과 요약이 여기에 표시됩니다.",
      quickOutputBadge: "생성 결과",
      quickOutputTitle: "Quick 모드는 PRD 1장에 집중합니다.",
      quickPresetTitle: "프리셋",
      quickModeTitle: "생성 엔진",
      quickDeliverableTitle: "산출물",
      quickDeliverableValue: "PRD 1장",
      quickSubmit: "빠르게 PRD 생성",
      quickSubmitHint: "현재 AI 모드는 유지한 채 Quick preset과 PRD 단일 출력만 적용합니다.",
      fileMode: "녹음 파일",
      textMode: "내용 직접 입력",
      filePlaceholder: "녹음 파일을 드래그하거나 클릭 (.m4a .mp3 .wav .webm, 최대 50MB)",
      textPlaceholder: "고객 불만, 회의 메모, 통화 내용, 운영 이슈를 여기에 붙여넣기...",
      pdfPlaceholder: "참고 PDF 첨부 (워크북/양식, 선택, 최대 20MB)",
      pdfAttached: (name: string) => `첨부 PDF: ${name}`,
      projectSelectPlaceholder: "로컬 프로젝트 선택 (필수)",
      projectNamePlaceholder: "프로젝트명 (표시용)",
      customerNamePlaceholder: "고객명 (선택)",
      additionalContextPlaceholder: "추가 맥락 (선택)",
      projectContextTitle: "프로젝트 컨텍스트 확인",
      projectContextDescription: "선택한 프로젝트를 실제로 읽어 PRD 생성 기준선으로 사용합니다.",
      projectContextReady: "프로젝트 기준선 준비 완료",
      projectContextLoading: "프로젝트 컨텍스트를 스캔하는 중입니다.",
      projectContextFailed: "프로젝트 컨텍스트를 준비하지 못했습니다.",
      projectContextSources: "읽은 기준 파일",
      projectContextSummary: "요약 미리보기",
      structuringTitle: "입력 구조화",
      structuringDescription:
        "입력 유형과 문제 강도를 같이 주면 문제정의서, PRD, 고객 공유 문서의 톤과 우선순위 판단이 더 안정적으로 나옵니다.",
      inputKind: "입력 유형",
      severity: "심각도",
      impact: "영향 범위",
      urgency: "긴급도",
      reproducibility: "재현 상태",
      workaroundPlaceholder: "현재 우회책 또는 임시 대응이 있으면 입력",
      externalDocsTitle: "고객 공유 문서 분리",
      externalDocsDescription: "켜면 고객 전달용 문서에서 내부 메모와 원인 가설을 제외합니다.",
      selectedProjectPrompt:
        "선택한 프로젝트의 문서, 설정, 핵심 엔트리포인트를 실제로 읽어 문서 생성 프롬프트에 기준선으로 반영합니다.",
      currentWorkspaceHint: "현재 이 워크스페이스를 기준으로 문서를 생성합니다.",
      baselineTitle: "변경 비교 기준 문서",
      baselineDescription:
        "선택하면 해당 저장 문서를 기준선으로 비교하고, 비워두면 같은 프로젝트의 최신 저장 문서를 자동 선택합니다.",
      baselineAutoOption: "자동 선택 (같은 프로젝트 최신 저장 문서)",
      baselineAutoButton: "자동 기준선 사용",
      queueTitle: "작업 큐",
      queueDescription: "현재 생성 중인 작업과 최근 완료 작업을 한 화면에서 확인합니다.",
      inProgress: "진행중",
      recentComplete: "최근 완료",
      noActiveQueue: "진행 중인 작업이 없습니다.",
      noRecentQueue: "최근 완료 작업이 없습니다.",
      templateTitle: "프로젝트 템플릿 세트",
      templateDescription: "현재 문서 조합을 프로젝트별 템플릿으로 저장해 반복 요청에 재사용할 수 있습니다.",
      saveCurrentConfig: "현재 구성 저장",
      noTemplateSets: "저장된 템플릿 세트가 없습니다. 자주 쓰는 문서 구성을 저장해 두면 운영 기능 추가나 AI 검수 요청에 바로 재사용할 수 있습니다.",
      applyThisConfig: "이 구성 적용",
      primaryPresetsTitle: "기본 프리셋",
      advancedPresetsTitle: "고급 프리셋",
      advancedPresetsShow: "고급 프리셋 보기",
      advancedPresetsHide: "고급 프리셋 숨기기",
      wizardBack: "이전",
      wizardNext: "다음",
      wizardStepLabel: "단계",
      wizardSteps: [
        { title: "입력 소스", description: "음성 파일, PDF, 직접 입력 메모와 프로젝트 기준선을 준비합니다." },
        { title: "문서 구성", description: "프리셋과 문서 조합을 정하고 템플릿 세트를 바로 적용합니다." },
        { title: "세부 맥락", description: "프리셋에 따라 필요한 메타데이터만 좁혀서 확인합니다." },
      ],
      generationTitle: "문서 생성 구성",
      generationDescription:
        "내부는 문서별로 따로 생성하고, 여기서는 프리셋으로 한 번에 선택하거나 필요한 문서만 커스텀으로 고를 수 있습니다.",
      viewGuide: "선택 가이드 보기",
      selectedDocs: (count: number) => `선택 문서 ${count}개`,
      startGeneration: "문서 생성 시작",
      emptyTitle: "첫 문서 번들을 아직 만들지 않았습니다.",
      emptyMessage:
        "녹음 파일, 회의 메모, 고객 불만 내용을 넣고 문서 구성을 고르면, PRD와 문제정의서, 고객 공유 문서, 저장 구조, 다음 액션까지 한 흐름으로 이어집니다.",
      emptyAction: "선택 가이드 보기",
    },
    viewer: {
      uploadDone: "파일 업로드 완료",
      audioToText: "음성→텍스트 변환",
      pdfExtract: "PDF 텍스트 추출",
      pdfAnalyze: "PDF 구조 분석",
      dualMerge: "Dual-AI 머지",
      workingDocs: "실무 문서 생성",
      completed: "완료",
      failedTitle: "문서 생성이 중단되었습니다",
      docResultsTitle: "문서 결과",
      docResultsDescription: "PRD와 생성된 지원 문서를 문서별로 열고, 현재 본문은 필요할 때만 펼쳐서 볼 수 있습니다.",
      copyCurrentDoc: "현재 문서 복사",
      downloadMarkdown: ".md 다운로드",
      mergedPrd: "통합 PRD",
      diffReport: "차이점",
      warningPrefix: "일부 문서는 생성되지 않았습니다:",
      baselinePrefix: "변경 비교 기준 문서:",
      collapseBody: "본문을 접습니다.",
      expandBody: "본문을 펼쳐서 전체 내용을 확인합니다.",
      sectionCardsTitle: "섹션 카드",
      sectionCardsDescription: "각 섹션을 카드 단위로 검토하고 필요한 부분만 다시 생성할 수 있습니다.",
      regenerateSection: "다시 생성",
      regenerateSectionHint: "힌트 추가 (선택)",
      regenerateSectionPlaceholder: "예: 고객 영향과 운영 롤백 기준을 더 구체적으로 써줘",
      regenerateSectionSubmit: "이 섹션 다시 생성",
      regenerateSectionCancel: "취소",
      regenerateUnavailable: "통합 PRD 또는 저장된 지원 문서에서만 섹션 재생성을 지원합니다.",
      savedTreeTitle: "저장 구조",
      savedTreeDescription: "저장된 PRD 번들 아래 문서와 `next-actions` 파일을 트리처럼 다시 열어볼 수 있습니다.",
      currentBundle: "현재 PRD 번들",
      artifacts: "artifacts/",
      nextActions: "next-actions/",
      noSavedNextActions: "아직 저장된 다음 액션이 없습니다.",
      nextActionsTitle: "다음 액션",
      nextActionsDescription: "PRD를 바탕으로 PM / FE / BE / QA / CS / GitHub Issue 초안을 이어서 생성합니다.",
      quickActionsEyebrow: "바로 이어서",
      quickActionsTitle: "결과를 다음 작업으로 바로 넘기기",
      quickActionsDescription: "가장 많이 쓰는 후속 흐름을 위로 올렸습니다. PM/FE 초안은 바로 열고, Obsidian과 GitHub 이슈 초안은 한 번에 보냅니다.",
      quickActionGenerate: "생성",
      quickActionOpen: "열기",
      quickActionReady: "이미 초안이 준비되어 있습니다.",
      quickActionGenerateHint: "현재 PRD로 새 초안을 만듭니다.",
      obsidianCardTitle: "옵시디언 노트로 보내기",
      obsidianCardDescription: "통합 PRD를 Obsidian vault의 Inbox 또는 vault 루트에 바로 저장합니다.",
      obsidianCardCta: "Obsidian 저장",
      obsidianSetupCta: "vault 경로 설정",
      obsidianSetupHint: "runtime settings 파일에 `paths.obsidianVault`를 설정하면 export를 활성화할 수 있습니다.",
      obsidianTargetLabel: "저장 위치:",
      githubIssueCardTitle: "GitHub Issue 초안 복사",
      githubIssueCardDescription: "PRD를 요약해서 이슈 본문 형식으로 클립보드에 복사합니다.",
      githubIssueCardHint: "gh CLI 없이 복사만 수행합니다.",
      githubIssueCardCta: "이슈 초안 복사",
      actionDraftCopy: "초안 복사",
      actionDraftDownload: "초안 다운로드",
      collapseDraft: "초안 본문을 접습니다.",
      expandDraft: "초안 본문을 펼쳐서 전체 내용을 확인합니다.",
      noActionDraftYet: "역할별 버튼을 누르면 현재 PRD와 지원 문서를 바탕으로 다음 액션 초안을 생성합니다.",
      noClaudeResult: "(Claude 결과 없음)",
      noCodexResult: "(Codex 결과 없음)",
      noDiffResult: "(차이점 리포트 없음)",
      noProjectContextWarning: "legacy bundle / no project context",
    },
    history: {
      currentSession: "현재 세션",
      savedDocs: "저장된 문서",
      searchSaved: "저장된 문서 검색",
      legacy: "legacy",
      hasBaseline: "기준선 있음",
      noSearchResult: "검색 결과가 없습니다.",
      page: (current: number, total: number) => `${current} / ${total} 페이지`,
      prev: "이전",
      next: "다음",
      projectUnset: "프로젝트 미지정",
    },
    guide: {
      closeAria: "가이드 닫기",
      badge: "선택 가이드",
      title: "언제 어떤 문서를 선택할지 빠르게 판단하기",
      description: "문서를 많이 뽑을수록 좋은 게 아니라, 현재 단계에 맞는 세트를 고르는 게 중요합니다.",
      tabs: {
        presets: "프리셋별",
        docs: "문서별",
        scenarios: "추천 시나리오",
      },
      applyPreset: "이 프리셋 적용",
      chooseWhen: "이런 경우 선택",
      skipWhen: "지금은 보류해도 되는 경우",
      useLabel: "기본 추천",
      extraLabel: "추가 추천",
      flowTitle: "기본 흐름 정리",
      flowSteps: [
        "1. 현재 단계에 맞는 프리셋이나 문서를 선택합니다.",
        "2. 결과 화면에서 PRD와 지원 문서를 확인합니다.",
        "3. 저장 구조에서 저장된 문서와 `next-actions`를 다시 엽니다.",
        "4. 다음 액션에서 PM / FE / BE / QA / CS 후속 문서를 이어서 생성합니다.",
      ],
    },
    hooks: {
      submitStarted: "문서 생성 작업이 시작되었습니다. 완료되면 저장 구조와 다음 액션에서 이어서 사용할 수 있습니다.",
      submitMissingInput: "녹음 파일을 올리거나 텍스트 메모를 입력한 뒤 다시 시도해 주세요.",
      projectRequired: "프로젝트를 선택하고 컨텍스트 준비가 완료된 뒤 다시 시도해 주세요.",
      projectContextNotReady: "프로젝트 컨텍스트가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.",
      submitFailed: "문서 생성을 시작하지 못했습니다. 입력값과 로컬 실행 환경을 확인한 뒤 다시 시도해 주세요.",
      nextActionSaved: (title: string) => `${title} 초안을 저장 구조 아래 next-actions에 저장했습니다.`,
      nextActionCreated: (title: string) => `${title} 초안을 생성했습니다.`,
      nextActionFailed: "다음 액션 초안 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      obsidianExported: (filePath: string | null) => filePath ? `옵시디언 노트를 저장했습니다: ${filePath}` : "옵시디언 노트를 저장했습니다.",
      obsidianExportFailed: "옵시디언 export에 실패했습니다. vault 경로 설정과 쓰기 권한을 확인해 주세요.",
      githubIssueCopied: "GitHub Issue 초안을 클립보드에 복사했습니다.",
      githubIssueCopyFailed: "GitHub Issue 초안 복사에 실패했습니다. 다시 시도해 주세요.",
      saveTemplateTitle: "템플릿 세트 저장",
      saveTemplateMessage: "현재 문서 구성과 생성 모드를 템플릿 세트로 저장합니다.",
      saveTemplatePlaceholder: "템플릿 세트 이름을 입력하세요.",
      saveTemplateInitial: (projectName?: string) => (projectName ? `${projectName} 기본 세트` : "내 템플릿"),
      saveLabel: "저장",
      templateSaved: "현재 문서 구성을 템플릿 세트로 저장했습니다.",
      templateDeleted: "템플릿 세트를 삭제했습니다.",
      deleteTemplateTitle: "템플릿 세트 삭제",
      deleteTemplateMessage: "이 템플릿 세트를 삭제할까요?",
      deleteSavedBundleTitle: "저장된 문서 삭제",
      deleteSavedBundleMessage: "저장된 문서 번들과 next-actions를 함께 삭제할까요?",
      savedBundleDeleted: "저장된 문서를 삭제했습니다.",
      deleteHistoryTitle: "현재 세션 기록 삭제",
      deleteHistoryMessage: "현재 세션 기록을 삭제할까요?",
      historyDeleted: "현재 세션 기록을 삭제했습니다.",
      retryTextRestored: "입력값을 복원했습니다. 내용 확인 후 다시 문서 생성을 시작하세요.",
      retrySettingsRestored: "설정값을 복원했습니다. 원본 오디오/PDF 파일은 다시 첨부한 뒤 재시도하세요.",
      deleteFailed: "삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      sectionRegenerated: (title: string) => `${title} 섹션을 다시 생성했습니다.`,
      sectionRegenerateFailed: "섹션 다시 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    },
  },
  en: {
    common: {
      none: "None",
      custom: "Custom",
      allProjects: "All projects",
      retry: "Retry",
      delete: "Delete",
      copy: "Copy",
      download: "Download",
      loading: "Generating",
      ready: "Ready",
      create: "Generate",
      required: "Required",
      selected: "Selected",
      available: "Available",
      active: "Active",
      currentWorkspace: "Current workspace",
      documentCount: (count: number) => `${count} docs`,
    },
    intake: {
      coreModeTitle: "Simple mode tip",
      coreModeMessage:
        "Starting with direct text input is the simplest path. Paste meeting notes or a customer issue, choose a project, and start generating docs.",
      feedbackTitle: "Applied",
      quickBadge: "Quick mode",
      quickTitle: "Turn a one-line topic into a PRD immediately.",
      quickDescription:
        "Write one or two sentences about the meeting note, customer request, or ops issue and start with a PRD draft first. Switch to Pro mode when you need metadata and extra working docs.",
      quickTopicLabel: "Topic / request summary",
      quickTopicPlaceholder: "Example: Draft a PRD for payment-failure VOC with root-cause hypotheses and response direction",
      quickTopicHint: "You do not need the full transcript. A short topic or issue summary is enough to start.",
      quickProjectLabel: "Project baseline",
      quickProjectDescription: "Project selection is optional, but when selected the actual codebase and docs are used as the PRD baseline.",
      quickProjectPlaceholder: "No project selected (prefer current workspace)",
      quickProjectStatus: "Current baseline",
      quickProjectOptional: "No project selected",
      quickCurrentWorkspace: "The current workspace is being used as the automatic baseline.",
      quickContextHint: "When a project is selected, the scanned baseline files and summary appear here.",
      quickOutputBadge: "Output",
      quickOutputTitle: "Quick mode focuses on a single PRD.",
      quickPresetTitle: "Preset",
      quickModeTitle: "Generation engine",
      quickDeliverableTitle: "Deliverable",
      quickDeliverableValue: "One PRD",
      quickSubmit: "Generate PRD quickly",
      quickSubmitHint: "Keeps your current AI mode and applies only the Quick preset with PRD output.",
      fileMode: "Audio file",
      textMode: "Direct text",
      filePlaceholder: "Drag or click to upload audio (.m4a .mp3 .wav .webm, up to 50MB)",
      textPlaceholder: "Paste customer complaints, meeting notes, call content, or ops issues here...",
      pdfPlaceholder: "Attach reference PDF (optional, up to 20MB)",
      pdfAttached: (name: string) => `Attached PDF: ${name}`,
      projectSelectPlaceholder: "Select a local project (required)",
      projectNamePlaceholder: "Project name (display only)",
      customerNamePlaceholder: "Customer name (optional)",
      additionalContextPlaceholder: "Additional context (optional)",
      projectContextTitle: "Project context check",
      projectContextDescription: "The selected project is scanned and used as the PRD baseline.",
      projectContextReady: "Project baseline is ready",
      projectContextLoading: "Scanning the selected project context.",
      projectContextFailed: "Failed to prepare the project context.",
      projectContextSources: "Files used as baseline",
      projectContextSummary: "Summary preview",
      structuringTitle: "Input structure",
      structuringDescription:
        "Providing issue type and severity helps the system produce more stable tone and prioritization across problem statements, PRDs, and client docs.",
      inputKind: "Input type",
      severity: "Severity",
      impact: "Customer impact",
      urgency: "Urgency",
      reproducibility: "Reproducibility",
      workaroundPlaceholder: "Current workaround or temporary response",
      externalDocsTitle: "Separate client-facing docs",
      externalDocsDescription: "When enabled, client-facing docs omit internal notes and root-cause hypotheses.",
      selectedProjectPrompt:
        "The selected project's docs, config, and key entrypoints are read and used as the generation baseline.",
      currentWorkspaceHint: "Documents will be generated against the current workspace.",
      baselineTitle: "Baseline document for comparison",
      baselineDescription:
        "Choose a saved document as the comparison baseline, or leave it blank to auto-pick the latest doc from the same project.",
      baselineAutoOption: "Auto-select latest saved doc for this project",
      baselineAutoButton: "Use auto baseline",
      queueTitle: "Work queue",
      queueDescription: "See active generation jobs and recently completed jobs in one place.",
      inProgress: "In progress",
      recentComplete: "Recent complete",
      noActiveQueue: "No active jobs.",
      noRecentQueue: "No recently completed jobs.",
      templateTitle: "Project template sets",
      templateDescription: "Save the current doc mix as a reusable template set for repeated requests.",
      saveCurrentConfig: "Save current setup",
      noTemplateSets: "No saved template sets yet. Save a document mix to reuse it for recurring ops or AI QA requests.",
      applyThisConfig: "Apply this setup",
      primaryPresetsTitle: "Primary presets",
      advancedPresetsTitle: "Advanced presets",
      advancedPresetsShow: "Show advanced presets",
      advancedPresetsHide: "Hide advanced presets",
      wizardBack: "Back",
      wizardNext: "Next",
      wizardStepLabel: "Step",
      wizardSteps: [
        { title: "Input source", description: "Prepare audio, PDF, direct notes, and the project baseline." },
        { title: "Document setup", description: "Choose presets, doc mix, and reusable template sets." },
        { title: "Detail context", description: "Review only the metadata fields that matter for the selected preset." },
      ],
      generationTitle: "Generation setup",
      generationDescription:
        "Docs are generated individually behind the scenes. Here you can use presets or pick only the docs you need.",
      viewGuide: "Open selection guide",
      selectedDocs: (count: number) => `${count} selected docs`,
      startGeneration: "Start generating docs",
      emptyTitle: "No document bundle has been created yet.",
      emptyMessage:
        "Add an audio file, meeting note, or customer complaint, choose the docs you need, and continue through PRD, supporting docs, saved structure, and next actions in one flow.",
      emptyAction: "Open selection guide",
    },
    viewer: {
      uploadDone: "Upload complete",
      audioToText: "Audio to text",
      pdfExtract: "Extract PDF text",
      pdfAnalyze: "Analyze PDF structure",
      dualMerge: "Dual-AI merge",
      workingDocs: "Generate working docs",
      completed: "Completed",
      failedTitle: "Document generation stopped",
      docResultsTitle: "Document results",
      docResultsDescription: "Browse the PRD and generated support docs by type, and expand the body only when needed.",
      copyCurrentDoc: "Copy current doc",
      downloadMarkdown: "Download .md",
      mergedPrd: "Merged PRD",
      diffReport: "Diff",
      warningPrefix: "Some docs were not generated:",
      baselinePrefix: "Comparison baseline:",
      collapseBody: "Collapse body.",
      expandBody: "Expand to inspect the full body.",
      sectionCardsTitle: "Section cards",
      sectionCardsDescription: "Review sections as cards and regenerate only the part that needs refinement.",
      regenerateSection: "Regenerate",
      regenerateSectionHint: "Add a hint (optional)",
      regenerateSectionPlaceholder: "Example: Expand customer impact and rollback criteria",
      regenerateSectionSubmit: "Regenerate this section",
      regenerateSectionCancel: "Cancel",
      regenerateUnavailable: "Section regeneration is available only for the merged PRD or saved support docs.",
      savedTreeTitle: "Saved structure",
      savedTreeDescription: "Reopen generated docs and `next-actions` files from the saved PRD bundle as a tree.",
      currentBundle: "Current PRD bundle",
      artifacts: "artifacts/",
      nextActions: "next-actions/",
      noSavedNextActions: "No saved next-action drafts yet.",
      nextActionsTitle: "Next actions",
      nextActionsDescription: "Generate PM / FE / BE / QA / CS / GitHub Issue follow-up drafts from the PRD.",
      quickActionsEyebrow: "Continue fast",
      quickActionsTitle: "Push the result into the next workflow",
      quickActionsDescription: "The most common follow-ups are pinned here. Open PM/FE drafts immediately, then send the PRD to Obsidian or copy an issue draft in one click.",
      quickActionGenerate: "Generate",
      quickActionOpen: "Open",
      quickActionReady: "A draft is already ready.",
      quickActionGenerateHint: "Create a fresh draft from the current PRD.",
      obsidianCardTitle: "Send to Obsidian",
      obsidianCardDescription: "Save the merged PRD directly into the Obsidian vault Inbox or the vault root.",
      obsidianCardCta: "Save to Obsidian",
      obsidianSetupCta: "Set vault path",
      obsidianSetupHint: "Set `paths.obsidianVault` in the runtime settings file to enable export.",
      obsidianTargetLabel: "Target:",
      githubIssueCardTitle: "Copy GitHub issue draft",
      githubIssueCardDescription: "Summarize the PRD into an issue-body format and copy it to the clipboard.",
      githubIssueCardHint: "This copies only. It does not call `gh`.",
      githubIssueCardCta: "Copy issue draft",
      actionDraftCopy: "Copy draft",
      actionDraftDownload: "Download draft",
      collapseDraft: "Collapse draft body.",
      expandDraft: "Expand to inspect the full draft.",
      noActionDraftYet: "Choose a role to generate a next-action draft from the current PRD and support docs.",
      noClaudeResult: "(No Claude result)",
      noCodexResult: "(No Codex result)",
      noDiffResult: "(No diff report)",
      noProjectContextWarning: "legacy bundle / no project context",
    },
    history: {
      currentSession: "Current session",
      savedDocs: "Saved docs",
      searchSaved: "Search saved docs",
      legacy: "legacy",
      hasBaseline: "Has baseline",
      noSearchResult: "No results found.",
      page: (current: number, total: number) => `Page ${current} / ${total}`,
      prev: "Previous",
      next: "Next",
      projectUnset: "No project selected",
    },
    guide: {
      closeAria: "Close guide",
      badge: "Selection guide",
      title: "Decide quickly which docs to generate",
      description: "More documents are not always better. The important part is choosing the set that matches the current stage.",
      tabs: {
        presets: "By preset",
        docs: "By doc",
        scenarios: "Suggested scenarios",
      },
      applyPreset: "Apply this preset",
      chooseWhen: "Choose in these cases",
      skipWhen: "Skip for now when",
      useLabel: "Recommended",
      extraLabel: "Extra",
      flowTitle: "Default flow",
      flowSteps: [
        "1. Choose the preset or documents that match the current stage.",
        "2. Review the PRD and support docs in the result view.",
        "3. Reopen saved docs and `next-actions` from the saved structure.",
        "4. Continue with PM / FE / BE / QA / CS follow-up drafts from next actions.",
      ],
    },
    hooks: {
      submitStarted: "Document generation started. Once it finishes, continue from the saved structure and next actions.",
      submitMissingInput: "Upload an audio file or enter text notes, then try again.",
      projectRequired: "Select a project and wait for project context to be ready before trying again.",
      projectContextNotReady: "Project context is not ready yet. Please try again shortly.",
      submitFailed: "Could not start document generation. Check the input and local runtime, then try again.",
      nextActionSaved: (title: string) => `Saved the ${title} draft under next-actions in the bundle.`,
      nextActionCreated: (title: string) => `Generated the ${title} draft.`,
      nextActionFailed: "Failed to generate the next-action draft. Please try again shortly.",
      obsidianExported: (filePath: string | null) => filePath ? `Saved the Obsidian note: ${filePath}` : "Saved the Obsidian note.",
      obsidianExportFailed: "Failed to export to Obsidian. Check the vault path and write permissions.",
      githubIssueCopied: "Copied the GitHub issue draft to the clipboard.",
      githubIssueCopyFailed: "Failed to copy the GitHub issue draft. Please try again.",
      saveTemplateTitle: "Save template set",
      saveTemplateMessage: "Save the current doc mix and generation mode as a reusable template set.",
      saveTemplatePlaceholder: "Enter a template set name.",
      saveTemplateInitial: (projectName?: string) => (projectName ? `${projectName} default set` : "My template"),
      saveLabel: "Save",
      templateSaved: "Saved the current doc setup as a template set.",
      templateDeleted: "Deleted the template set.",
      deleteTemplateTitle: "Delete template set",
      deleteTemplateMessage: "Delete this template set?",
      deleteSavedBundleTitle: "Delete saved bundle",
      deleteSavedBundleMessage: "Delete the saved document bundle together with its next-actions?",
      savedBundleDeleted: "Deleted the saved documents.",
      deleteHistoryTitle: "Delete session record",
      deleteHistoryMessage: "Delete this current session record?",
      historyDeleted: "Deleted the current session record.",
      retryTextRestored: "Restored the input text. Review it and start document generation again.",
      retrySettingsRestored: "Restored the settings. Reattach the original audio/PDF files before retrying.",
      deleteFailed: "Something went wrong while deleting. Please try again shortly.",
      sectionRegenerated: (title: string) => `Regenerated the ${title} section.`,
      sectionRegenerateFailed: "Failed to regenerate the section. Please try again shortly.",
    },
  },
} as const;

const presetGuide = {
  ko: {
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
    voc: {
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
    customer: {
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
    handoff: {
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
    change: {
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
    "ai-review": {
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
  },
  en: {
    core: {
      summary: "Best default set for initial planning and post-meeting follow-up.",
      useWhen: [
        "You need to align the core summary and requirements after a client or internal meeting.",
        "The API and data model are not fully fixed yet.",
        "You want to generate once, then add only the extra docs you need.",
      ],
      avoidWhen: [
        "You already need developer handoff docs with API contracts and schemas.",
        "You also need AI quality criteria and evaluation guidance right away.",
      ],
    },
    voc: {
      summary: "Useful when turning complaints, VOC, or internal issues into a clear problem statement and share doc.",
      useWhen: [
        "You need to frame a customer complaint as a product problem before agreeing on a response.",
        "You want to continue from an operational issue into a PRD and a client-facing summary.",
        "You need both internal and external docs for the same issue.",
      ],
      avoidWhen: [
        "Implementation scope is already fixed and dev task breakdown matters more than analysis.",
      ],
    },
    customer: {
      summary: "Best when you need to quickly share the current understanding and direction with a client.",
      useWhen: [
        "You want to send a summary right after a call or meeting.",
        "You need non-technical language to explain scope and delivery direction.",
        "You want to realign with the client before development starts.",
      ],
      avoidWhen: [
        "The dev team needs implementation docs, APIs, schemas, and task breakdown immediately.",
      ],
    },
    handoff: {
      summary: "Best set when moving from planning into direct implementation.",
      useWhen: [
        "Frontend and backend need to define execution scope right away.",
        "You need to align on contracts such as upload, status polling, and storage layout.",
        "You need a single handoff package before ticket breakdown.",
      ],
      avoidWhen: [
        "Requirements are still highly unstable and exploratory.",
      ],
    },
    change: {
      summary: "Best for incremental requests where the delta from the current baseline matters.",
      useWhen: [
        "An additional request landed on top of an existing feature and you need to map what changed.",
        "You need both scope diff and implementation tasks in one pass.",
        "You want to check impact against the current project baseline quickly.",
      ],
      avoidWhen: [
        "This is a brand-new feature and baseline comparison adds little value.",
      ],
    },
    "ai-review": {
      summary: "Best for features where AI quality, prompts, and evaluation criteria are critical.",
      useWhen: [
        "You need repeatable validation of LLM output quality.",
        "Prompt specs and evaluation criteria are required for real usage.",
        "You need sample sets, target accuracy, and regression checks.",
      ],
      avoidWhen: [
        "The feature is simple CRUD and AI is not central to the scope.",
      ],
    },
    release: {
      summary: "Best for release-stage work where direction is already fixed and readiness matters.",
      useWhen: [
        "You want to add a QA checklist and release procedure quickly.",
        "You need monitoring, rollback criteria, and pre-launch checks.",
      ],
      avoidWhen: [
        "Requirements are still changing frequently.",
        "You still need to settle technical design or API contracts first.",
      ],
    },
  },
} as const;

const docGuideCopy = {
  ko: {
    prd: { useWhen: "항상 기본", value: "배경, 목표, 요구사항, 우선순위, 개발 계획의 기준 문서입니다." },
    "problem-statement": { useWhen: "고객 불만, 회의 이슈, 운영 문제를 먼저 정의해야 할 때", value: "현재 현상, 영향 범위, 원인 가설, 대응 방향을 분리해 문제를 선명하게 정의합니다." },
    "open-questions": { useWhen: "고객 재확인이 많이 필요한 초기/중간 단계", value: "확정되지 않은 내용과 후속 질문을 분리해 회의 혼선을 줄입니다." },
    "acceptance-criteria": { useWhen: "개발/QA 완료 기준을 맞춰야 할 때", value: "REQ별 완료 기준을 정리해 구현과 검수의 기준점을 맞춥니다." },
    "user-flow": { useWhen: "사용 흐름이나 운영 흐름이 중요한 기능일 때", value: "핵심 사용자 흐름과 예외 흐름을 단계별로 정리합니다." },
    "client-brief": { useWhen: "고객이나 비개발자에게 바로 공유할 정리본이 필요할 때", value: "요청 배경, 작업 범위, 진행 방식, 다음 단계를 쉬운 표현으로 정리합니다." },
    "task-breakdown": { useWhen: "문서 생성 직후 바로 개발 작업으로 분해해야 할 때", value: "프론트/백엔드/API/QA 태스크와 구현 순서를 정리합니다." },
    "change-request-diff": { useWhen: "운영 중 추가요청, 스코프 조정, 변경 영향 확인이 필요할 때", value: "현재 기준선 대비 추가/변경/보류 범위를 비교 중심으로 정리합니다." },
    "api-contract": { useWhen: "프론트/백엔드 동시 작업 전", value: "요청/응답/에러 계약을 정리해 구현 오해를 줄입니다." },
    "data-schema": { useWhen: "상태값, 저장 구조, 엔티티 정의가 중요한 기능일 때", value: "필드, 상태, 저장 규칙을 정리해 데이터 설계를 고정합니다." },
    "prompt-spec": { useWhen: "AI 생성 로직을 반복 개선해야 할 때", value: "입력 변수, 지시문 구조, 가드레일을 명문화합니다." },
    "evaluation-plan": { useWhen: "품질을 정량/정성으로 평가해야 할 때", value: "샘플셋, 점검 기준, 회귀 테스트 방식을 정리합니다." },
    "qa-checklist": { useWhen: "QA 또는 출시 직전 점검", value: "핵심 기능, 실패 케이스, 성능 점검 항목을 빠르게 확인합니다." },
    "release-runbook": { useWhen: "배포 직전 또는 운영 준비 단계", value: "배포 순서, 모니터링, 장애 대응, 롤백 절차를 정리합니다." },
  },
  en: {
    prd: { useWhen: "Always the default", value: "The base document for background, goals, requirements, priorities, and delivery plan." },
    "problem-statement": { useWhen: "When complaints or incidents need to be framed first", value: "Clarifies symptoms, impact, root-cause hypotheses, and response direction." },
    "open-questions": { useWhen: "Early or mid-stage work with many unresolved items", value: "Separates unknowns and follow-up questions to reduce meeting ambiguity." },
    "acceptance-criteria": { useWhen: "When dev and QA need aligned done criteria", value: "Defines done criteria per requirement for implementation and validation." },
    "user-flow": { useWhen: "When user or operational flow is important", value: "Organizes core flows and exception flows step by step." },
    "client-brief": { useWhen: "When you need a shareable client-facing summary", value: "Explains context, scope, approach, and next steps in simple language." },
    "task-breakdown": { useWhen: "When you need immediate execution tasks after doc generation", value: "Breaks the work into FE/BE/API/QA tasks and execution order." },
    "change-request-diff": { useWhen: "When you need to inspect additional scope or impact", value: "Compares add/change/hold items against the current baseline." },
    "api-contract": { useWhen: "Before parallel FE and BE work", value: "Locks request/response/error contracts to reduce implementation mismatch." },
    "data-schema": { useWhen: "When entities and storage rules matter", value: "Defines fields, states, and storage rules for the data model." },
    "prompt-spec": { useWhen: "When AI generation logic needs repeated iteration", value: "Documents inputs, instruction structure, and guardrails." },
    "evaluation-plan": { useWhen: "When quality needs quantitative or qualitative review", value: "Defines sample sets, scoring criteria, and regression checks." },
    "qa-checklist": { useWhen: "For QA or launch readiness", value: "Quickly checks core features, failure cases, and performance items." },
    "release-runbook": { useWhen: "Right before deployment or ops prep", value: "Documents deployment order, monitoring, incident handling, and rollback." },
  },
} as const;

const scenarioGuideCopy = {
  ko: [
    { title: "첫 고객 미팅 직후 핵심 정리", description: "요구사항은 잡혔지만 기술 설계는 아직 열려 있는 상태", preset: "core" },
    { title: "고객 컴플레인이나 VOC를 문제 문서로 전환", description: "불만 원문을 바로 문제정의, PRD, 고객 공유 문서까지 연결해야 하는 상태", preset: "voc" },
    { title: "개발 착수 전에 FE/BE 전달", description: "구현 범위와 API/데이터 계약을 같이 넘겨야 하는 상태", preset: "handoff" },
    { title: "고객에게 방향성과 범위를 빠르게 공유", description: "비개발자도 이해할 수 있는 정리본으로 범위와 진행 방식을 먼저 맞춰야 하는 상태", preset: "customer" },
    { title: "운영 중 고객 추가 기능 요청 대응", description: "기존 기준선 대비 변경점과 구현 태스크를 같이 정리해야 하는 상태", preset: "change" },
    { title: "AI 생성 품질 검수 체계 만들기", description: "프롬프트와 평가 기준이 없으면 기능 품질을 관리하기 어려운 상태", preset: "ai-review" },
    { title: "출시 직전 QA와 운영 준비", description: "배포 순서, 체크리스트, 롤백 기준까지 필요한 상태", preset: "release" },
    { title: "개발 핸드오프 + AI 검수 기준 둘 다 필요", description: "AI 기능이 핵심이라 계약과 평가 기준을 동시에 잡아야 하는 상태", preset: "handoff", extras: ["prompt-spec", "evaluation-plan"] },
  ],
  en: [
    { title: "Capture the essentials after a first client meeting", description: "Requirements are visible, but technical design is still open.", preset: "core" },
    { title: "Turn complaints or VOC into a problem document", description: "You need to continue from the raw complaint into a problem statement, PRD, and client share doc.", preset: "voc" },
    { title: "Hand off to FE/BE before implementation starts", description: "You need to pass scope and API/data contracts together.", preset: "handoff" },
    { title: "Share direction and scope quickly with a client", description: "You need a non-technical summary to align on scope and delivery approach.", preset: "customer" },
    { title: "Respond to an added feature request in production", description: "You need to organize both the diff from baseline and the implementation tasks.", preset: "change" },
    { title: "Create an AI quality review framework", description: "Prompt and evaluation criteria are required to manage output quality.", preset: "ai-review" },
    { title: "Prepare QA and operations right before launch", description: "You need deployment steps, a checklist, and rollback criteria.", preset: "release" },
    { title: "Need both dev handoff and AI quality criteria", description: "The feature is AI-heavy, so contracts and evaluation criteria must be defined together.", preset: "handoff", extras: ["prompt-spec", "evaluation-plan"] },
  ],
} as const;

export function getCallToPrdCopy(locale: AppLocale) {
  const base = locale === "en" ? baseCopy.en : baseCopy.ko;
  const tab = locale === "en" ? tabCopy.en : tabCopy.ko;
  const resolvedPresetGuide = locale === "en" ? presetGuide.en : presetGuide.ko;
  const resolvedDocGuide = locale === "en" ? docGuideCopy.en : docGuideCopy.ko;
  const resolvedScenarioGuide = locale === "en" ? scenarioGuideCopy.en : scenarioGuideCopy.ko;

  return {
    ...base,
    tab,
    guideData: {
      presetGuide: resolvedPresetGuide,
      docGuide: resolvedDocGuide,
      scenarioGuide: resolvedScenarioGuide,
    },
  };
}

export type CallToPrdCopy = ReturnType<typeof getCallToPrdCopy>;

export function getCallInputKindLabel(value: CallInputKind, locale: AppLocale) {
  return pickLocale(locale, inputKindLabels[value]);
}

export function getCallSeverityLabel(value: CallSeverity, locale: AppLocale) {
  return pickLocale(locale, severityLabels[value]);
}

export function getCallCustomerImpactLabel(value: CallCustomerImpact, locale: AppLocale) {
  return pickLocale(locale, customerImpactLabels[value]);
}

export function getCallUrgencyLabel(value: CallUrgency, locale: AppLocale) {
  return pickLocale(locale, urgencyLabels[value]);
}

export function getCallReproducibilityLabel(value: CallReproducibility, locale: AppLocale) {
  return pickLocale(locale, reproducibilityLabels[value]);
}

export function getCallDocLabel(docType: CallDocType, locale: AppLocale) {
  return pickLocale(locale, docCopy[docType].label);
}

export function getCallDocShortLabel(docType: CallDocType, locale: AppLocale) {
  return pickLocale(locale, docCopy[docType].shortLabel);
}

export function getCallDocDescription(docType: CallDocType, locale: AppLocale) {
  return pickLocale(locale, docCopy[docType].description);
}

export function getCallPresetLabel(preset: CallDocPreset, locale: AppLocale) {
  return pickLocale(locale, presetCopy[preset].label);
}

export function getCallPresetDescription(preset: CallDocPreset, locale: AppLocale) {
  return pickLocale(locale, presetCopy[preset].description);
}

export function getCallNextActionLabel(actionType: CallNextActionType, locale: AppLocale) {
  return pickLocale(locale, nextActionCopy[actionType].label);
}

export function getCallNextActionShortLabel(actionType: CallNextActionType, locale: AppLocale) {
  return pickLocale(locale, nextActionCopy[actionType].shortLabel);
}

export function getCallNextActionDescription(actionType: CallNextActionType, locale: AppLocale) {
  return pickLocale(locale, nextActionCopy[actionType].description);
}

export function getCallGenerationModeLabel(mode: CallGenerationMode, locale: AppLocale) {
  return pickLocale(locale, generationModeCopy[mode].label);
}

export function getCallGenerationModeDescription(mode: CallGenerationMode, locale: AppLocale) {
  return pickLocale(locale, generationModeCopy[mode].description);
}

export function getCallGenerationStepLabel(mode: CallGenerationMode, locale: AppLocale) {
  return pickLocale(locale, generationModeCopy[mode].stepLabel);
}

export function getCallGenerationModeOptions(locale: AppLocale): Array<{
  value: CallGenerationMode;
  label: string;
  description: string;
}> {
  return (Object.keys(generationModeCopy) as CallGenerationMode[]).map((value) => ({
    value,
    label: getCallGenerationModeLabel(value, locale),
    description: getCallGenerationModeDescription(value, locale),
  }));
}

export function getCallStatusLabel(status: CallRecord["status"], locale: AppLocale) {
  return pickLocale(locale, statusCopy[status]);
}

export function formatCallToPrdFailureMessage(error: string | null, locale: AppLocale) {
  if (!error) {
    return pickLocale(locale, {
      ko: "입력값이나 로컬 실행 환경을 확인한 뒤 다시 시도해 주세요.",
      en: "Check the input and local runtime, then try again.",
    });
  }

  if (error.includes("whisper CLI") || error.includes("openai-whisper") || error.includes("whisper-cpp")) {
    return pickLocale(locale, {
      ko: "음성 변환 도구가 준비되지 않았습니다. `python3 -m pip install openai-whisper`를 설치하거나, `whisper-cpp`를 쓰는 경우 `WHISPER_MODEL_PATH`에 실제 ggml 모델 경로를 설정한 뒤 다시 시도해 주세요.",
      en: "The transcription tool is not ready. Install `python3 -m pip install openai-whisper`, or if you use `whisper-cpp`, set `WHISPER_MODEL_PATH` to a real ggml model path and try again.",
    });
  }

  if (error.includes("Claude 실패") || error.includes("Codex 실패") || error.includes("OpenAI API 실패")) {
    return pickLocale(locale, {
      ko: `AI 생성 단계에서 중단되었습니다. ${error} 입력 내용은 유지되므로 프롬프트나 실행 환경을 확인한 뒤 다시 생성하면 됩니다.`,
      en: `The AI generation step stopped. ${error} Your input is still preserved, so review the prompt or runtime setup and try again.`,
    });
  }

  if (error.includes("재시작")) {
    return pickLocale(locale, {
      ko: "앱이 재시작되면서 진행 중 작업이 중단되었습니다. 같은 입력값으로 다시 생성하면 저장 구조와 다음 액션까지 다시 이어집니다.",
      en: "The app restarted and interrupted the in-flight job. Regenerate with the same input to restore the saved structure and next actions.",
    });
  }

  return formatKnownCallToPrdRuntimeMessage(error, locale);
}

export function formatCallToPrdProgressMessage(message: string | null, locale: AppLocale) {
  if (!message) {
    return null;
  }

  return formatKnownCallToPrdRuntimeMessage(message, locale);
}

export function formatCallToPrdWarningMessage(message: string, locale: AppLocale) {
  return formatKnownCallToPrdRuntimeMessage(message, locale);
}

export function formatCallToPrdApiError(
  error: { code?: string; message?: string } | null | undefined,
  locale: AppLocale,
  fallback: string,
) {
  if (!error) {
    return fallback;
  }

  if (error.code) {
    const resolved = getSharedCallToPrdApiError(
      locale,
      error.code as Parameters<typeof getSharedCallToPrdApiError>[1],
      error.message,
    );

    if (resolved.message) {
      return resolved.message;
    }
  }

  return error.message ? formatKnownCallToPrdRuntimeMessage(error.message, locale) : fallback;
}
