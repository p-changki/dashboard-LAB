# File Manager 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/file-manager/FileManagerTab.tsx` (84줄)
- 주요 컴포넌트: `AutoOrganize.tsx` (107줄), `FileManagerStats.tsx` (37줄), `SuggestionGroup.tsx` (81줄), `SuggestionItem.tsx` (29줄)
- 상태 관리: 탭 내부 `useState`, 소스 탭(desktop/downloads)과 suggestion 필터 상태를 메모리에서 관리

## 2. 지원 기능 (코드 기준)
- Desktop / Downloads 스캔 결과 표시
- 정리 제안 우선순위별 그룹화 및 정렬
- 파일 액션 preview/execute
- 자동 정리 preview 및 move-only 실행, undo script 복사

## 3. 입력 / 출력
- 입력: 대상 탭(desktop/downloads), 정렬 옵션, auto-organize target, dry-run 여부
- 출력: 파일 통계, suggestion 목록, 명령어/undo script 복사, 실행 결과 응답

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: 직접 실행 없음
- 로컬 파일: Desktop/Downloads 스캔, 파일 이동/삭제(휴지통 이동) preview/execute
- 네트워크: 내부 API `GET /api/file-manager`, `GET /api/file-manager/preview`, `POST /api/file-manager/execute`, `POST /api/file-manager/auto-organize`

## 5. API Routes
- `GET /api/file-manager` — 전체 스캔 결과 반환
- `GET /api/file-manager/preview` — 파일 액션 미리보기
- `POST /api/file-manager/execute` — 파일 액션 실행
- `POST /api/file-manager/auto-organize` — 자동 정리 preview/실행

## 6. 데이터 타입
- 주요 타입: `src/lib/types/file-manager.ts` (`FileManagerResponse`, `CleanupSuggestion`, `AutoOrganizeResponse`)
- 저장 포맷: 별도 persistent 저장 없음. 스캔/실행 결과를 응답 객체로 반환

## 7. 관찰 사항 (객관적)
- `src/lib/file-manager/` 전용 경로는 현재 존재하지 않음
- 기능은 parser 계층(`file-manager-parser`, `file-action-engine`, `file-manager-auto-organize`) 호출 중심
- 최근 수정 커밋: `d8eac20 feat: prepare v0.1.13 release`
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함

## 8. 현재 시점 제한
- 전용 `copy.ts`는 존재하지 않고 UI 문자열은 한국어 중심
- `src/lib/file-manager/` 경로 부재. 기능은 parser/type 중심 구조
- 실행 API는 존재하지만 별도 장기 히스토리 저장은 확인하지 못함

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? `execute`/`auto-organize` route 자체에는 bare command spawn이 없고 parser 호출만 수행
- [ ] 사용자 노출 메시지 ko/en 양쪽 존재? 전용 `copy.ts`가 없고 UI/API 메시지가 한국어 중심
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 주요 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 원본 mutate 패턴은 발견하지 못함
