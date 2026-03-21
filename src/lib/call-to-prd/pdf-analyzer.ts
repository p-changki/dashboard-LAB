import { runClaudePrd } from "./prd-runner";

const LINES_PER_CHUNK = 500;

interface ChunkInfo {
  current: number;
  total: number;
}

const ANALYSIS_REQUIREMENTS = `## 분석 항목 (모두 작성)

### 1. 문서 유형
워크북/교재/시험지/양식/기타 분류

### 2. 출판사·브랜드
쏠북, 이그잼 포유, EBS 등 식별 가능한 브랜드

### 3. 문제 유형 목록
각 유형별로:
- 유형명 (한줄해석, 어법선택, 어휘선택, 내용일치, 순서, 삽입, 어순배열, 영작 등)
- 출현 빈도/비중
- 난이도 패턴

### 4. 각 문제 유형별 구조
- 지문 배치 방식 (상단/좌측/박스 등)
- 선택지 형태 (4지선다, 빈칸, 서술형, T/F 등)
- 보기 개수, 번호 체계
- 정답 표기 방식

### 5. 레이아웃·양식 특징
- 단 구성 (1단/2단)
- 헤더/푸터 패턴
- 번호 체계 (대문제-소문제)
- 여백, 구분선, 박스 사용 패턴
- 페이지당 문제 수

### 6. 브랜드 통일감 요소
- 반복되는 시각적 패턴
- 스타일 규칙 (볼드, 밑줄, 하이라이트 사용법)
- 특수 기호/아이콘 사용

### 7. 콘텐츠 특성
- 대상 학년/수준
- 교과 과정 연계 여부
- 지문 출처 패턴 (수능 기출, 모의고사, 자체 제작 등)

## 규칙
- 한국어로 작성
- 추측은 "추정:" 접두사
- 발견되지 않는 항목은 "해당 없음"으로 표기
- 구체적인 예시를 포함하여 설명`;

export async function analyzePdf(
  pdfText: string,
  fileName: string,
  onChunkProgress?: (chunkInfo: ChunkInfo) => void,
): Promise<string> {
  const lines = pdfText.split("\n");

  if (lines.length <= LINES_PER_CHUNK) {
    return analyzeChunk(pdfText, fileName, null);
  }

  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_CHUNK) {
    chunks.push(lines.slice(i, i + LINES_PER_CHUNK).join("\n"));
  }

  const chunkResults: string[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunkInfo = { current: i + 1, total: chunks.length };
    onChunkProgress?.(chunkInfo);
    const result = await analyzeChunk(chunks[i], fileName, chunkInfo);
    chunkResults.push(result);
  }

  return synthesizeChunks(chunkResults, fileName);
}

async function analyzeChunk(
  text: string,
  fileName: string,
  chunkInfo: ChunkInfo | null,
): Promise<string> {
  const chunkLabel = chunkInfo ? `(${chunkInfo.current}/${chunkInfo.total} 파트)` : "";

  const prompt = `당신은 교육 콘텐츠 분석 전문가입니다.
아래 PDF 문서 ${chunkLabel}를 분석하여 구조화된 보고서를 작성해주세요.

## 문서: ${fileName} ${chunkLabel}

## PDF 원문
${text}

${ANALYSIS_REQUIREMENTS}`;

  return runClaudePrd(prompt);
}

async function synthesizeChunks(
  chunkResults: string[],
  fileName: string,
): Promise<string> {
  const prompt = `당신은 교육 콘텐츠 분석 전문가입니다.
아래는 "${fileName}" PDF를 ${chunkResults.length}개 파트로 나누어 분석한 결과입니다.
모든 파트의 분석 결과를 종합하여 하나의 통합 분석 보고서를 작성해주세요.

${chunkResults.map((result, index) => `## 파트 ${index + 1} 분석 결과\n${result}`).join("\n\n")}

## 통합 요청
- 중복 제거하고 모든 파트에서 발견된 내용을 병합
- 문제 유형별 출현 빈도는 전체 기준으로 재계산
- 파트별로 다른 패턴이 있으면 "앞부분/뒷부분" 등으로 구분 표기
- 기존 7개 분석 항목 구조 유지
- 한국어로 작성
- 추측은 "추정:" 접두사
- 발견되지 않는 항목은 "해당 없음"으로 표기
- 구체적인 예시를 포함하여 설명`;

  return runClaudePrd(prompt);
}
