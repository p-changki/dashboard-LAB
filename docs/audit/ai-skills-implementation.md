# AI Skills 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/ai-skills/AiSkillsTab.tsx` (390줄)
- 주요 컴포넌트: `components/SkillForm.tsx` (142줄), `RunHistory.tsx` (129줄), `RunResultViewer.tsx` (116줄), `SkillCard.tsx`
- 상태 관리: 탭 내부 `useState` + `/api/ai-skills/history` polling, 실행 이력은 `src/lib/storage/persistent-json.ts` 기반 파일 저장

## 2. 지원 기능 (코드 기준)
- 스킬 템플릿 목록 로드 및 카테고리/러너/검색어 필터링
- 템플릿 기반 실행 요청 생성 후 큐잉, 병렬 최대 3개 실행
- Claude / Codex / Gemini 런처 health 표시와 실패/취소 상태 관리
- 실행 결과 Markdown / JSON 뷰어, 최근 실행 이력, 실패 재시도용 입력 복원

## 3. 입력 / 출력
- 입력: 템플릿 선택, 프로젝트 이름, 자유 입력 프롬프트, 러너 선택, 옵션 필드
- 출력: 화면 내 실행 상태/결과 렌더, `data/` 하위 persistent JSON 히스토리 저장, 출력 파일 경로는 run metadata에 보관

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: `claude`, `codex`, `gemini`
- 로컬 파일: `~/.claude/`, `~/.codex/`, `~/.gemini/` 기반 템플릿/설정 파싱, run history JSON 저장
- 네트워크: 내부 API `GET /api/ai-skills/templates`, `GET /api/ai-skills/history`, `POST /api/ai-skills/run`, `POST /api/ai-skills/cancel/[runId]`

## 5. API Routes
- `GET /api/ai-skills/templates` — 사용 가능한 스킬 템플릿 목록 반환
- `GET /api/ai-skills/history` — 저장된 실행 이력 반환
- `POST /api/ai-skills/run` — 새 실행 생성 후 큐에 추가
- `GET /api/ai-skills/status/[runId]` — 단일 실행 상태 조회
- `POST /api/ai-skills/cancel/[runId]` — queued/running 실행 취소

## 6. 데이터 타입
- 주요 타입: `src/lib/types/ai-skills.ts` (`SkillTemplate`, `SkillRun`, `SkillRunRequest`)
- 저장 포맷: persistent JSON (`skill-runs.json`), 템플릿 메타는 파서 결과 객체

## 7. 관찰 사항 (객관적)
- 큰 파일: `AiSkillsTab.tsx` 390줄, `src/lib/ai-skills/runner.ts` 458줄
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함
- 최근 수정 커밋: `23272a6 refactor: centralize codex exec args and clarify signal writer health copy`

## 8. 현재 시점 제한
- 타입 기준 러너는 `claude | codex` 두 종류만 정의되어 있고, Gemini 실행은 런처 코드 분기에서 별도 처리
- 전용 `copy.ts`는 존재하지만 API 에러 응답 메시지는 한국어 고정
- 실행 결과 품질 검증은 스키마 검증보다 런타임 stdout/stderr 파싱 비중이 큼

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? 실행 spawn은 `src/lib/ai-skills/runner.ts`에서 `resolveCommandPath()`와 `getCommandEnvironment({ TERM: "dumb" })`를 사용
- [x] 사용자 노출 메시지 ko/en 양쪽 존재? `src/features/ai-skills/copy.ts`에서 `pickLocale()` 사용
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 UI/runner 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 API 응답 원본 mutate 패턴은 발견하지 못함
