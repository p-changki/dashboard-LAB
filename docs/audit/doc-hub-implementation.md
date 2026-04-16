# Doc Hub 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/doc-hub/DocHubTab.tsx` (72줄)
- 주요 컴포넌트: `components/DocHubList.tsx` (174줄), `DocSearch.tsx` (90줄), `DocViewer.tsx` (59줄), `copy.ts` (45줄)
- 상태 관리: 탭 내부 `useState`, 선택된 문서 경로 기준으로 `/api/doc-hub/content` 재요청

## 2. 지원 기능 (코드 기준)
- 문서 목록 조회 및 타입 필터링
- 파일명/본문 기준 검색
- 문서 본문 로드 및 상세 뷰어 렌더
- 정렬(최신순/오래된순/이름순) 및 문서 타입 라벨 표시

## 3. 입력 / 출력
- 입력: 검색어, 정렬 방식, 타입 필터, 문서 선택
- 출력: 문서 목록과 Markdown/본문 렌더, API 기반 파일 내용 반환

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: 직접 실행 없음
- 로컬 파일: 문서 파일 시스템 탐색 및 파일 내용 읽기
- 네트워크: 내부 API `GET /api/doc-hub`, `GET /api/doc-hub/search`, `GET /api/doc-hub/content`

## 5. API Routes
- `GET /api/doc-hub` — 문서 목록 반환
- `GET /api/doc-hub/search` — `q` 기준 검색 결과 반환
- `GET /api/doc-hub/content` — 유효한 경로의 문서 내용 로드

## 6. 데이터 타입
- 주요 타입: `src/lib/types/doc-hub.ts` (`ProjectDoc`, `DocContent`, `DocSearchResult`)
- 저장 포맷: 별도 저장 포맷 없음. 파일 시스템 문서를 읽어 응답 객체로 반환

## 7. 관찰 사항 (객관적)
- `src/lib/doc-hub/` 경로는 현재 존재하지 않음
- 가장 큰 UI 파일은 `DocHubList.tsx` 174줄로 비교적 작음
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함
- 최근 수정 커밋: `d8eac20 feat: prepare v0.1.13 release`

## 8. 현재 시점 제한
- 문서 생성/편집 기능은 현재 범위에 없음
- API는 read-only이며, `content`와 `search` 일부 메시지만 locale에 따라 en/ko 분기
- `src/lib/doc-hub/` 전용 모듈 레이어 없이 parser/type 중심 구조

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? 이 모듈의 `src/app/api/doc-hub/`에는 POST 엔드포인트가 없음
- [x] 사용자 노출 메시지 ko/en 양쪽 존재? `src/features/doc-hub/copy.ts` 존재, 일부 API 에러도 locale 분기 지원
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 원본 mutate 패턴은 발견하지 못함
