import {
  buildGeneratedDocTitle,
  CALL_DOC_DEFINITIONS,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import { formatPrdMarkdown } from "@/lib/call-to-prd/prd-markdown-formatter";
import { runClaudePrd } from "@/lib/call-to-prd/prd-runner";
import type { GeneratedDoc } from "@/lib/types/call-to-prd";

interface SupportingDocumentOptions {
  type: Exclude<CallDocType, "prd">;
  projectName?: string | null;
  workingContext: string;
  separateExternalDocs?: boolean;
}

const DOCUMENT_GUIDES: Record<Exclude<CallDocType, "prd">, string> = {
  "problem-statement": `## 필수 구성
- ## 문제 한눈에 보기
- ## 현재 관측된 현상
- ## 영향 범위
- ## 원인 가설
- ## 우리가 해결해야 하는 핵심 문제
- ## 대응 방향 및 옵션
- ## 바로 확인할 데이터 / 추가 정보
- ## 성공 판단 기준
- ## Mermaid 인과 다이어그램

## 작성 지침
- 고객 불만, 회의 메모, 운영 이슈 중 무엇이 들어와도 사실과 해석을 분리
- 이미 확인된 사실은 단정적으로, 가설은 반드시 "추정:"으로 표시
- 해결책 제안 전에 문제가 무엇인지 먼저 선명하게 정의
- 내부 팀이 읽고 바로 의사결정을 시작할 수 있는 수준으로 작성
- "## Mermaid 인과 다이어그램" 섹션에는 반드시 \`\`\`mermaid fenced code block으로 \`flowchart LR\` 또는 \`graph LR\` 포함
- 현상 → 영향 → 원인 가설 → 대응 방향 순서가 드러나게 연결
- 확인 안 된 가설은 노드 라벨 뒤에 "(추정)" 접미사`,
  "open-questions": `## 필수 구성
- ## 결정된 사항
- ## 미확정 사항
- ## 고객 확인 필요 질문
- ## 현재 가정
- ## 블로커 및 의존성

## 작성 지침
- 확정된 내용과 미정 내용을 혼합하지 말 것
- 질문은 실제 회의 후속 액션으로 바로 보낼 수 있게 작성
- 우선 고객 확인이 필요한 질문부터 정리`,
  "acceptance-criteria": `## 필수 구성
- ## 범위 요약
- ## REQ별 수용 기준
- 각 REQ는 ### REQ-번호 제목 형식으로 정리
- 각 REQ마다 Given / When / Then 또는 동등한 완료 기준 bullet 포함
- ## 검수 포인트

## 작성 지침
- "무엇을 만족하면 완료인지"가 명확해야 함
- 개발/QA가 같은 기준을 사용할 수 있어야 함
- 불필요한 배경 설명보다 완료 기준을 우선`,
  "user-flow": `## 필수 구성
- ## 핵심 사용자 흐름
- ## 예외 흐름
- ## 시스템 반응 및 상태 변화
- ## Mermaid 플로우

## 작성 지침
- "## Mermaid 플로우" 섹션에는 반드시 \`\`\`mermaid fenced code block 포함
- 핵심 흐름이 화면 상태 전환 중심이면 \`stateDiagram-v2\`, 의사결정 분기 중심이면 \`flowchart TD\` 사용
- 분기/예외 흐름은 별도 노드 또는 상태로 분리
- 확인 안 된 단계는 노드 라벨에 "(추정)" 접미사
- 사용자가 어떤 순서로 어떤 결과를 보는지 단계별로 작성
- 관리자/운영자/시스템 이벤트가 있으면 분리해서 표현`,
  "client-brief": `## 필수 구성
- ## 이번 요청 한눈에 보기
- ## 우리가 이해한 요청
- ## 제안하는 작업 범위
- ## 이렇게 진행할 예정입니다
- ## 기대 효과
- ## 고객과 함께 확인할 사항
- ## 다음 단계
- ## Mermaid 고객 여정

## 작성 지침
- 비개발자 고객이 읽는다고 가정하고 쉬운 표현으로 작성
- 기술 용어가 필요하면 한 줄로 바로 풀어서 설명
- API, DB, 인프라, 프롬프트 같은 내부 구현 세부사항은 꼭 필요한 경우만 간단히 언급
- 톤은 "우리는 이렇게 이해했고, 이렇게 개발할 예정입니다"에 가깝게 정리
- 확정된 범위와 추가 협의가 필요한 범위를 분리
- "## Mermaid 고객 여정" 섹션에는 반드시 \`\`\`mermaid fenced code block으로 \`journey\` 다이어그램 포함
- 단계는 요청 인지 → 협의 → 구현 → 확인까지 최소 4단계 이상
- 만족도는 1~5 정수로 표기하고, 확인 안 된 값은 본문 또는 라벨에 "추정:" 명시`,
  "task-breakdown": `## 필수 구성
- ## 구현 전략 요약
- ## 작업 분해
- ### 프론트엔드
- ### 백엔드
- ### API / 계약
- ### 데이터 / 마이그레이션
- ### QA / 운영
- ## 선행조건 및 병렬 처리 가능 범위
- ## 추천 구현 순서
- ## Mermaid 일정 초안

## 작성 지침
- 각 작업은 바로 티켓으로 옮길 수 있을 정도로 구체적으로 작성
- 작업마다 목표, 산출물, 의존성을 bullet로 정리
- 병렬 가능한 작업과 순차 작업을 분리
- "## Mermaid 일정 초안" 섹션에는 반드시 \`\`\`mermaid fenced code block으로 \`gantt\` 다이어그램 포함
- \`dateFormat YYYY-MM-DD\`를 선언하고, 실제 일정이 미확정이면 상대 기간(예: 1d, 3d) 중심으로 작성
- 섹션은 FE / BE / QA / Release 등 역할 기준으로 나누고, 의존성은 \`after taskId\` 문법 사용`,
  "change-request-diff": `## 필수 구성
- ## 현재 기준선 요약
- ## 추가되는 범위
- ## 변경되는 범위
- ## 제거/보류되는 범위
- ## 영향 받는 화면/도메인/API
- ## 리스크 및 확인 필요 항목
- ## Mermaid 변경 흐름

## 작성 지침
- 기존 기준선 대비 무엇이 달라지는지 비교 중심으로 작성
- "신규", "수정", "유지", "보류"를 명확히 구분
- 기준선이 명확하지 않으면 "추정 기준선"으로 표시
- "## Mermaid 변경 흐름" 섹션에는 반드시 \`\`\`mermaid fenced code block으로 \`flowchart LR\` 포함
- 기준선 → 변경 요청 → 영향 영역 → 최종 상태 순서가 드러나게 연결
- 확인되지 않은 기준선은 노드 라벨 또는 다이어그램 아래에 "추정:"으로 표시`,
  "api-contract": `## 필수 구성
- ## API 개요
- ## 엔드포인트 제안
- 각 엔드포인트별로 목적, 메서드, 경로, 요청, 응답, 에러 케이스
- ## 인증/권한 고려사항
- ## 성능/운영 고려사항
- ## Mermaid 요청 흐름

## 작성 지침
- PRD를 기준으로 필요한 엔드포인트를 제안
- 확정되지 않은 리소스명이나 경로는 "추정:"으로 표시
- JSON 예시는 fenced code block으로 작성
- "## Mermaid 요청 흐름" 섹션에는 반드시 \`\`\`mermaid fenced code block으로 \`sequenceDiagram\` 포함
- 클라이언트, API, 저장소/외부서비스 중 실제 필요한 참여자만 사용
- 실패 분기나 권한 검사가 있으면 다이어그램 주석 또는 별도 step으로 표현`,
  "data-schema": `## 필수 구성
- ## 엔티티 개요
- ## 핵심 필드 정의
- ## 상태값 및 enum
- ## 관계 및 저장 규칙
- ## 데이터 무결성/감사 로그 고려사항
- ## Mermaid ER 다이어그램

## 작성 지침
- 테이블과 bullet list를 혼합해도 되지만 읽기 쉬워야 함
- 필드명은 영어 또는 snake_case/camelCase 중 하나로 일관되게 제안
- 상태 전이와 필수/선택 여부를 명확히 표시
- "## Mermaid ER 다이어그램" 섹션에는 반드시 \`\`\`mermaid fenced code block으로 \`erDiagram\` 포함
- 엔티티명은 PascalCase 사용, 주요 필드는 2~4개만 간결하게 표기
- 확인되지 않은 엔티티는 이름에 "_Proposed" 접미사 사용
- 관계선은 실제 카디널리티가 불확실하면 "추정:" 설명을 텍스트로 함께 남길 것`,
  "prompt-spec": `## 필수 구성
- ## 적용 대상
- ## 입력 변수
- ## 지시문 또는 규칙 설계
- ## 출력 형식
- ## 가드레일 및 금지 사항
- ## 실패 대응 / fallback

## 작성 지침
- AI/LLM 또는 규칙 기반 생성 로직이 예상될 때 바로 쓸 수 있게 작성
- PRD상 AI 사용이 명확하지 않다면 "AI 사용 여부 미확정"을 먼저 명시
- 프롬프트 전문 대신 구조와 변수 계약을 중심으로 정리`,
  "evaluation-plan": `## 필수 구성
- ## 평가 목표
- ## 샘플셋 구성
- ## 정량 평가 기준
- ## 정성 평가 기준
- ## 통과 기준
- ## 회귀 테스트 운영 방식

## 작성 지침
- AI 기능이면 품질 평가 루브릭을 포함
- 일반 기능이면 핵심 시나리오/예외 시나리오의 검증 기준을 포함
- 실제 운영 전에 반복 검증 가능한 형태로 작성`,
  "qa-checklist": `## 필수 구성
- ## 사전 조건
- ## 핵심 기능 체크리스트
- ## 예외/실패 케이스
- ## 품질/성능 체크
- ## 배포 전 최종 확인

## 작성 지침
- 체크박스 느낌의 bullet list로 작성
- 실제 QA 담당자가 순서대로 점검할 수 있어야 함
- 성공 기준과 실패 징후를 함께 적을 것`,
  "release-runbook": `## 필수 구성
- ## 배포 전 준비
- ## 배포 순서
- ## 모니터링 포인트
- ## 장애 대응
- ## 롤백 기준 및 절차
- ## 배포 후 확인 항목
- ## Mermaid 배포 흐름

## 작성 지침
- 운영자가 바로 따라할 수 있는 순서 중심 문서
- 인프라/권한/환경변수/로그 확인 포인트를 포함
- 미정인 배포 방식은 "추정:"으로 명시
- "## Mermaid 배포 흐름" 섹션에는 반드시 \`\`\`mermaid fenced code block으로 \`flowchart LR\` 또는 \`gantt\` 포함
- 준비 → 배포 → 모니터링 → 롤백 분기를 순서대로 표현
- 조건 분기 노드는 짧게, 구체 설명은 본문 bullet로 보완`,
};

export async function generateSupportingDocument(options: SupportingDocumentOptions): Promise<GeneratedDoc> {
  const prompt = buildSupportingDocumentPrompt(options);
  const rawMarkdown = await runClaudePrd(prompt, { reasoningEffort: "low" });

  return {
    type: options.type,
    title: buildGeneratedDocTitle(options.type, options.projectName),
    markdown: formatPrdMarkdown(rawMarkdown),
  };
}

function buildSupportingDocumentPrompt(options: SupportingDocumentOptions): string {
  const { type, projectName, workingContext } = options;
  const definition = CALL_DOC_DEFINITIONS[type];
  const title = buildGeneratedDocTitle(type, projectName);
  const audienceGuide = type === "client-brief"
    ? options.separateExternalDocs !== false
      ? `- 이 문서는 외부 고객에게 전달 가능한 수준의 표현을 사용
- 비개발자도 이해할 수 있게 기술 용어를 쉬운 말로 설명
- 내부 원인 가설, 운영 메모, 책임 소재 표현은 제외
- 내부 구현 디테일보다 고객이 이해해야 할 범위, 방식, 기대 결과를 우선`
      : `- 이 문서는 고객 공유 초안이지만 내부 리뷰용 메모를 제한적으로 포함할 수 있음
- 비개발자도 이해할 수 있게 기술 용어를 쉬운 말로 설명
- 내부 메모가 필요하면 "## 내부 참고 메모" 섹션으로 분리`
    : type === "problem-statement"
      ? `- 문제 현상, 영향, 원인 가설, 대응 방향을 분리해서 정리
- 사실과 추정을 혼합하지 말고, 추정은 반드시 "추정:"으로 표기
- 해결 방안을 쓰더라도 문제 정의가 먼저 읽히게 작성`
      : `- 장황한 배경 설명보다 실무자가 바로 쓸 수 있는 정보 위주로 작성`;
  const diagramGuide = type === "user-flow"
    || type === "data-schema"
    || type === "task-breakdown"
    || type === "problem-statement"
    || type === "client-brief"
    || type === "change-request-diff"
    || type === "api-contract"
    || type === "release-runbook"
    ? `- Mermaid 다이어그램은 반드시 \`\`\`mermaid fenced code block\`\`\`만 사용
- Mermaid 블록 바깥에 문법 설명용 pseudo code를 섞지 말 것
- 다이어그램이 추정을 포함하면 텍스트 또는 노드 라벨에 "추정:" 또는 "(추정)"으로 표시`
    : "";

  return `당신은 시니어 프로덕트 매니저이자 테크니컬 라이터입니다.
아래 작업 기준 요약을 바탕으로 "${definition.label}" 문서를 작성해주세요.

## 문서 목적
${definition.description}

## 작업 기준 요약
${workingContext}

## 공통 규칙
- 한국어 markdown으로 작성
- 문서 첫 줄은 반드시 "# ${title}" 사용
- 최상위 섹션은 ##, 하위 섹션은 ### 사용
- 핵심은 bullet list 우선으로 정리
- raw HTML 금지
- 불확실한 내용은 "추정:" 접두사로 명시
${audienceGuide}
${diagramGuide}
- 문단 사이 공백을 충분히 두어 읽기 쉽게 작성

${DOCUMENT_GUIDES[type]}

## 최종 목표
- 이 문서 하나만 따로 공유해도 실무자가 바로 이해할 수 있어야 함
- PRD의 내용을 단순 반복하지 말고, 해당 문서의 목적에 맞게 재구성할 것`;
}
