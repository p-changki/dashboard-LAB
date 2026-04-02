import { formatPrdMarkdown } from "@/lib/call-to-prd/prd-markdown-formatter";
import { CALL_NEXT_ACTION_DEFINITIONS } from "@/lib/call-to-prd/next-action-config";
import { runClaudePrd } from "@/lib/call-to-prd/prd-runner";
import { buildCallWorkingContext } from "@/lib/call-to-prd/working-context";
import type {
  CallNextActionRequest,
  CallNextActionResponse,
  CallNextActionType,
  GeneratedDoc,
} from "@/lib/types/call-to-prd";

const ROLE_GUIDES: Record<
  CallNextActionType,
  {
    titleSuffix: string;
    relevantDocTypes: GeneratedDoc["type"][];
    structure: string;
  }
> = {
  "pm-handoff": {
    titleSuffix: "PM 다음 액션",
    relevantDocTypes: ["problem-statement", "open-questions", "acceptance-criteria", "user-flow", "change-request-diff"],
    structure: `## 필수 구성
- ## 이번 문서의 목적
- ## 지금 확정된 범위
- ## 아직 결정이 필요한 사항
- ## 이해관계자별 확인 포인트
- ## 다음 회의/다음 액션 제안
- ## 우선순위 재정렬 필요 항목

## 작성 지침
- PM이 바로 회의 아젠다와 후속 액션으로 사용할 수 있게 작성
- 확정/미확정/추정 항목을 분리
- 의사결정이 필요한 순서대로 정리`,
  },
  "frontend-plan": {
    titleSuffix: "프론트엔드 실행안",
    relevantDocTypes: ["task-breakdown", "user-flow", "acceptance-criteria", "api-contract", "data-schema"],
    structure: `## 필수 구성
- ## 구현 범위 요약
- ## 화면/페이지 단위 작업
- ## 컴포넌트 구조 제안
- ## 상태 관리 및 데이터 흐름
- ## 예외 처리 / 빈 상태 / 로딩 상태
- ## 구현 순서와 병렬 처리 가능 범위

## 작성 지침
- FE 티켓으로 바로 쪼갤 수 있을 정도로 구체적으로 작성
- 디자인 시스템, 상태 관리, API 연결 포인트를 명확히 분리`,
  },
  "backend-plan": {
    titleSuffix: "백엔드 실행안",
    relevantDocTypes: ["task-breakdown", "api-contract", "data-schema", "change-request-diff"],
    structure: `## 필수 구성
- ## 구현 범위 요약
- ## API / 엔드포인트 작업
- ## 데이터 모델 / 저장 구조
- ## 비동기 작업 / 배치 / 외부 연동
- ## 실패 케이스 및 운영 로그
- ## 구현 순서와 선행조건

## 작성 지침
- BE 작업자가 바로 구현 범위를 나눌 수 있게 작성
- 데이터 변경, 마이그레이션, 운영 리스크를 분리해서 표시`,
  },
  "qa-plan": {
    titleSuffix: "QA 실행안",
    relevantDocTypes: ["problem-statement", "acceptance-criteria", "qa-checklist", "user-flow", "change-request-diff"],
    structure: `## 필수 구성
- ## 검수 범위 요약
- ## 핵심 시나리오 테스트
- ## 예외 / 실패 케이스
- ## 회귀 테스트 포인트
- ## 오픈 리스크 및 확인 필요 항목
- ## 출시 전 최종 점검 순서

## 작성 지침
- QA 담당자가 바로 체크할 수 있는 순서형 문서로 작성
- 성공 기준과 실패 징후를 함께 작성`,
  },
  "cs-brief": {
    titleSuffix: "CS 전달 초안",
    relevantDocTypes: ["problem-statement", "client-brief", "change-request-diff", "open-questions", "acceptance-criteria"],
    structure: `## 필수 구성
- ## 고객에게 전달할 핵심 요약
- ## 달라지는 점
- ## 아직 확정되지 않은 점
- ## 고객 문의 예상 질문과 답변
- ## 내부 운영팀 공유 메모

## 작성 지침
- 외부 전달용 표현과 내부 참고 메모를 분리
- 고객이 이해하기 쉬운 표현을 우선
- 미정 사항은 확정된 것처럼 쓰지 말 것`,
  },
  "github-issues": {
    titleSuffix: "GitHub Issue 초안",
    relevantDocTypes: ["task-breakdown", "acceptance-criteria", "api-contract", "qa-checklist"],
    structure: `## 필수 구성
- ## 이슈 분해 원칙
- 각 이슈는 반드시 ### [영역] 제목 형식 사용
- 각 이슈마다 아래 항목 포함
  - 목적
  - 작업 범위
  - 완료 조건
  - 의존성
  - 참고 문서

## 작성 지침
- GitHub issue body에 바로 복사할 수 있게 markdown으로 작성
- 너무 큰 작업은 여러 이슈로 나누기
- FE / BE / QA / 공통 작업을 적절히 분리`,
  },
};

export async function generateNextActionDraft(
  request: CallNextActionRequest,
): Promise<CallNextActionResponse> {
  const guide = ROLE_GUIDES[request.actionType];
  const title = request.projectName?.trim()
    ? `${request.projectName} - ${guide.titleSuffix}`
    : guide.titleSuffix;

  const prompt = buildNextActionPrompt(request, title);
  const markdown = formatPrdMarkdown(await runClaudePrd(prompt));

  return {
    actionType: request.actionType,
    title,
    markdown,
    fileName: null,
    createdAt: new Date().toISOString(),
    saved: false,
    savedEntryName: request.savedEntryName ?? null,
  };
}

function buildNextActionPrompt(request: CallNextActionRequest, title: string) {
  const definition = CALL_NEXT_ACTION_DEFINITIONS[request.actionType];
  const guide = ROLE_GUIDES[request.actionType];
  const relatedDocs = collectRelevantDocs(request.generatedDocs, guide.relevantDocTypes);
  const workingContext = buildCallWorkingContext({
    projectName: request.projectName,
    customerName: request.customerName,
    additionalContext: request.additionalContext,
    intake: {
      inputKind: request.inputKind,
      severity: request.severity,
      customerImpact: request.customerImpact,
      urgency: request.urgency,
      reproducibility: request.reproducibility,
      currentWorkaround: request.currentWorkaround,
      separateExternalDocs: request.separateExternalDocs,
    },
    projectContext: request.projectContext,
    projectContextSources: request.projectContextSources,
    baselineTitle: request.baselineTitle,
    baselinePrd: request.baselinePrd,
    prdMarkdown: request.prdMarkdown,
    relatedDocs,
  });

  return `당신은 시니어 PM이자 실무 리드입니다.
아래 PRD와 보조 문서를 기준으로 "${definition.label}" 문서를 작성해주세요.

## 문서 목적
${definition.description}

## 작업 기준 요약
${workingContext}

## 공통 규칙
- 한국어 markdown으로 작성
- 첫 줄은 반드시 "# ${title}" 사용
- 최상위 섹션은 ##, 하위 섹션은 ### 사용
- bullet list 우선, 장황한 문단 최소화
- raw HTML 금지
- 실무자가 바로 복사해서 실행할 수 있는 수준으로 작성
- 추정 내용은 "추정:" 접두사 사용
- 이미 있는 PRD를 반복하지 말고, "${definition.label}" 목적에 맞게 재구성

${guide.structure}

## 최종 목표
- 이 문서를 받은 담당자가 다음 액션을 바로 시작할 수 있어야 함
- 모호한 항목은 오픈 이슈로 남기고, 이미 확정된 내용은 실행 항목으로 변환할 것`;
}

function collectRelevantDocs(
  generatedDocs: GeneratedDoc[],
  relevantDocTypes: GeneratedDoc["type"][],
) {
  return generatedDocs
    .filter((doc) => doc.type !== "prd")
    .filter((doc) => relevantDocTypes.includes(doc.type))
    .map((doc) => doc);
}
