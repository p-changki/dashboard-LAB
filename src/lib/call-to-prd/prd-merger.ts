import { runClaudePrd } from "./prd-runner";

interface MergeResult {
  mergedPrd: string;
  diffReport: string;
}

export async function mergeDualPrd(
  claudePrd: string,
  codexPrd: string,
  originalContext: string,
  options?: { cwd?: string },
): Promise<MergeResult> {
  const prompt = `당신은 시니어 프로덕트 매니저입니다.
두 AI가 동일한 원문 입력 내용을 바탕으로 각각 PRD를 작성했습니다.
두 PRD를 비교·통합하여 최종 PRD와 차이점 리포트를 작성해주세요.

## 원본 맥락
${originalContext}

## PRD-A (Claude 작성)
${claudePrd}

## PRD-B (Codex/GPT 작성)
${codexPrd}

## 작성 요청

### PART 1: 통합 PRD
- 양쪽에서 가장 정확하고 구체적인 내용을 채택
- 한쪽에만 있는 유효한 인사이트는 포함
- 충돌하는 내용은 원본 입력 내용 기준으로 판단
- 추측은 "추정:" 접두사
- 선택된 프로젝트 컨텍스트가 있다면 그 구조와 용어를 유지
- 기존 PRD 10개 섹션 구조 유지 (입력요약, 니즈분석, 요구사항, PRD, 개발계획, 시퀀스 다이어그램, 우선순위, 리스크, 후속질문, 경쟁사)
- 시퀀스 다이어그램 섹션은 반드시 mermaid fenced code block으로 유지
- mermaid 코드는 sequenceDiagram 문법이 깨지지 않게 정리
- 읽기 쉬운 마크다운 문서로 다시 정리
- 최상위 섹션은 ##, 하위 섹션은 ### 사용
- 표는 필요한 섹션에만 제한적으로 사용하고, 설명은 bullet list를 우선 사용
- 섹션 사이 공백을 충분히 넣고 raw HTML은 사용하지 않음

### PART 2: 차이점 리포트
#### A에만 있는 항목
#### B에만 있는 항목
#### 충돌 항목 (채택 근거 포함)
#### 통합 시 보강된 항목

PART 1과 PART 2를 구분자 "---DIFF_SEPARATOR---"로 구분.
PART 1 먼저, 그 다음 구분자, 그 다음 PART 2.`;

  const result = await runClaudePrd(prompt, { cwd: options?.cwd });
  const separator = "---DIFF_SEPARATOR---";
  const sepIndex = result.indexOf(separator);

  if (sepIndex === -1) {
    return {
      mergedPrd: result,
      diffReport: "(차이점 리포트 생성 실패)",
    };
  }

  return {
    mergedPrd: result.slice(0, sepIndex).trim(),
    diffReport: result.slice(sepIndex + separator.length).trim(),
  };
}
