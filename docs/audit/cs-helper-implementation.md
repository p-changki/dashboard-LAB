# CS Helper 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/cs-helper/CsTab.tsx` (516줄)
- 주요 컴포넌트: `components/CsSettingsBar.tsx` (100줄), `copy.ts` (336줄)
- 상태 관리: 탭 내부 `useState`, 최근 히스토리/프로젝트 목록은 API fetch 후 메모리 상태로 보관

## 2. 지원 기능 (코드 기준)
- 프로젝트별 컨텍스트 로딩 및 응답 초안 생성
- 고객 메시지 / 요약 입력 모드 전환, 채널/톤 선택
- Claude / Codex / Gemini / OpenAI 러너 분기
- 응답 재생성, 최근 히스토리 조회, 프로젝트 목록/컨텍스트 초기화

## 3. 입력 / 출력
- 입력: 프로젝트 선택, 고객 원문 또는 요약, 채널, 톤, 러너, 추가 지침
- 출력: 화면 내 분석/응답 초안 렌더, `cs-history.json` 기반 히스토리 저장

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: `claude`, `codex`, `gemini`
- 로컬 파일: CS context 디렉터리, persistent JSON history
- 네트워크: 내부 API `POST /api/cs-helper/generate`, `POST /api/cs-helper/analyze`, `POST /api/cs-helper/context/init`, `POST /api/cs-helper/regenerate`

## 5. API Routes
- `GET /api/cs-helper/projects` — 프로젝트 후보 반환
- `GET /api/cs-helper/history` — 최근 응답 이력 반환
- `POST /api/cs-helper/generate` — 응답 초안 생성
- `POST /api/cs-helper/analyze` — 입력 분석
- `POST /api/cs-helper/context/init` — 프로젝트 컨텍스트 초기화
- `POST /api/cs-helper/regenerate` — 기존 이력 기준 재생성

## 6. 데이터 타입
- 주요 타입: `src/lib/types/cs-helper.ts` (`CsRequest`, `CsResponse`, `CsHistoryItem`)
- 저장 포맷: persistent JSON (`cs-history.json`), 프로젝트 컨텍스트 파일

## 7. 관찰 사항 (객관적)
- 큰 파일: `CsTab.tsx` 516줄, `copy.ts` 336줄, `cs-runner.ts` 273줄
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함
- 최근 수정 커밋: `23272a6 refactor: centralize codex exec args and clarify signal writer health copy`

## 8. 현재 시점 제한
- UI는 `copy.ts` 기반 이중 언어를 사용하지만 API 오류 응답은 한국어 고정
- 러너 availability는 로컬 CLI 설치 및 OpenAI key 상태에 의존
- 탭 엔트리 파일이 500줄을 넘고 설정/히스토리/결과 렌더를 함께 보유

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? 실행 spawn은 `src/lib/cs-helper/cs-runner.ts`에서 공용 실행 헬퍼와 Codex exec helper 사용
- [x] 사용자 노출 메시지 ko/en 양쪽 존재? `src/features/cs-helper/copy.ts`에서 `pickLocale()` 사용
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 주요 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 원본 mutate 패턴은 발견하지 못함
