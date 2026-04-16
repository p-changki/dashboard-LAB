import {
  buildCallIntakeMetadataMarkdown,
  type CallIntakeMetadata,
} from "@/lib/call-to-prd/intake-config";

interface PrdPromptOptions {
  transcript: string;
  projectName?: string;
  projectContext?: string;
  projectContextSources?: string[];
  baselineTitle?: string;
  baselinePrd?: string;
  customerName?: string;
  additionalContext?: string;
  intake: CallIntakeMetadata;
  pdfAnalysis?: string;
  pdfFileName?: string;
}

interface SectionRegeneratePromptOptions {
  title: string;
  content: string;
  context: string;
  hint?: string;
}

export function buildCallToPrdPrompt(options: PrdPromptOptions): string {
  const {
    transcript,
    projectName,
    projectContext,
    projectContextSources,
    baselineTitle,
    baselinePrd,
    customerName,
    additionalContext,
    intake,
    pdfAnalysis,
    pdfFileName,
  } = options;

  return `당신은 시니어 프로덕트 매니저입니다. 아래 원문 입력 내용을 분석하여 구조화된 PRD를 작성해주세요.

${projectName ? `## 관련 프로젝트: ${projectName}` : ""}
${projectContext ? `## 선택된 로컬 프로젝트 컨텍스트
아래 내용은 현재 로컬 프로젝트에서 실제로 읽어 추출한 기준 요약입니다.
이번 PRD는 이 프로젝트의 기존 구조와 도메인을 기준선으로 삼아 작성해야 합니다.

${projectContextSources && projectContextSources.length > 0 ? `검증에 사용한 파일:
${projectContextSources.map((source) => `- ${source}`).join("\n")}

` : ""}${projectContext}
` : ""}

${baselinePrd ? `## 기존 저장 기준 문서
아래 문서는 이전에 저장된 기준 PRD입니다. 이번 요청이 추가 기능 또는 변경 요청이라면, 기존 범위를 함부로 다시 정의하지 말고
무엇이 유지되고 무엇이 추가/변경되는지 비교 관점으로 반영해주세요.

기준 문서: ${baselineTitle ?? "이전 저장 문서"}

${baselinePrd}
` : ""}
${customerName ? `## 고객: ${customerName}` : ""}
## 입력 메타
${buildCallIntakeMetadataMarkdown(intake)}

${additionalContext ? `## 추가 맥락\n${additionalContext}` : ""}
${pdfAnalysis ? `## 첨부 자료 분석 결과: ${pdfFileName ?? "PDF"}
아래는 고객이 제공한 PDF(워크북/양식)를 AI가 사전 분석한 결과입니다.
이 양식의 구조·문제유형·레이아웃을 기반으로 요구사항과 개발 계획을 구체화해주세요.

${pdfAnalysis}
` : ""}

## 원문 입력 내용
${transcript}

## 작성 요청 (아래 구조로 마크다운 작성)

- 최상위 섹션은 반드시 ## 제목으로 작성
- 하위 항목은 반드시 ### 제목 또는 bullet list로 작성
- 문단은 짧게 유지하고, 핵심은 bullet list로 먼저 정리
- 표는 정말 필요한 섹션에만 사용
- 섹션 1, 2, 4, 8, 9, 10은 표보다 bullet list를 우선 사용
- 섹션 3(요구사항 목록), 섹션 7(우선순위 매트릭스)은 표 사용 가능
- raw HTML 금지
- 구분선은 필요한 경우에만 --- 사용
- 각 섹션 사이에는 빈 줄을 충분히 넣어 가독성을 확보
- 입력 유형이 고객 불만/VOC/운영 이슈라면 해결해야 할 문제와 영향 범위를 먼저 읽히게 정리
- 입력 유형이 변경 요청이라면 유지 범위와 바뀌는 범위를 구분
- 심각도, 영향 범위, 긴급도, 재현 상태, 현재 우회책을 PRD의 맥락 판단에 반영
- 선택된 프로젝트 컨텍스트에 이미 존재하는 화면/용어/도메인/API/데이터 구조를 우선 재사용
- 신규 범위는 "추가", "변경", "유지" 관점으로 프로젝트 기준선 대비 정리
- 프로젝트 근거가 없는 내용은 단정하지 말고 "추정:"으로 표시
- 프로젝트 컨텍스트에 드러난 기존 구조와 충돌하는 제안은 피할 것

### 1. 입력 요약
- 제공된 입력 유형과 실제 원문 맥락을 함께 요약
- 일시, 참석자, 전반적 분위기, 핵심 내용
- 4개 bullet 내외로 간결하게 정리

### 2. 고객 니즈 분석
- 명시적 니즈, 숨은 니즈, Pain Points, 기대하는 것
- 각 하위 항목은 ### 소제목 + bullet list 형식 사용

### 3. 요구사항 목록
REQ-001 형식으로 번호. 각각 제목, 설명, 우선순위(MUST/SHOULD/COULD), 분류(feature/bugfix/improvement)

### 4. PRD
목적, 범위, 대상 사용자, 성공 지표, 제약 조건, 비기능 요구사항
- 각 하위 항목은 ### 소제목으로 분리

### 5. 개발 계획서
Phase별 태스크 + 난이도(low/medium/high) + 추천 기술 스택

### 6. 시퀀스 다이어그램
- 반드시 mermaid fenced code block으로 작성
- 형식은 \`\`\`mermaid / sequenceDiagram / \`\`\` 사용
- 참여자는 사용자, 관리자, 프론트엔드, 백엔드, 외부 서비스 중 실제 필요한 것만 포함
- 원문 입력 기준으로 가장 핵심적인 사용자 흐름 1개를 그림
- 확인되지 않은 단계는 다이어그램 아래에 "추정:"으로 따로 표기

### 7. 우선순위 매트릭스
요구사항별 영향도 x 난이도 → 추천(즉시 구현/다음 스프린트/백로그)

### 8. 리스크
기술적/비즈니스 리스크 + 완화 방법
- 리스크는 bullet list 또는 짧은 표 중 더 읽기 쉬운 형식 선택

### 9. 후속 질문
고객에게 다시 확인할 사항

### 10. 경쟁사 참고
원문에서 다른 서비스, 대체안, 비교 대상이 언급된 경우 맥락 정리

## 규칙
- 한국어, 마크다운, 구체적이고 실행 가능한 수준
- 추측은 "추정:" 접두사
- 시퀀스 다이어그램은 mermaid 문법이 깨지지 않도록 코드블록만 출력
- 읽기 쉬운 문서가 목표이며, 한 문단에 너무 많은 내용을 몰아넣지 말 것
- 프로젝트 컨텍스트가 제공된 경우, 현재 프로젝트의 구조를 직접 확인한 것처럼 근거 중심으로 작성할 것
- 기존 기준 문서가 제공된 경우, 바뀌지 않은 범위는 유지하고 변경 요청 중심으로 정리할 것
- 언급되지 않은 내용 만들지 말 것`;
}

export function buildSectionRegeneratePrompt(options: SectionRegeneratePromptOptions): string {
  return `당신은 기존 문서의 한 섹션만 다시 다듬는 시니어 프로덕트 매니저입니다.

## 작업 대상 섹션
제목: ${options.title}

## 현재 섹션 본문
${options.content || "(현재 본문 없음)"}

## 문서 전체 컨텍스트
${options.context}

${options.hint?.trim() ? `## 수정 힌트
${options.hint.trim()}
` : ""}

## 작성 규칙
- 반드시 "${options.title}" 섹션의 본문만 다시 작성
- \`## ${options.title}\` 같은 최상위 제목은 다시 쓰지 말 것
- 필요한 경우 \`###\` 소제목, bullet list, 표, mermaid code block은 유지 가능
- 기존 문서 컨텍스트와 충돌하지 않게 수정
- 추정 내용은 "추정:" 접두사 사용
- 한국어, 마크다운, 실행 가능한 수준으로 작성
- 불필요한 인사말, 설명문, 코드 펜스 외 텍스트 금지

본문만 출력하세요.`;
}
