# Meeting Hub 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/meeting-hub/MeetingHubTab.tsx` (283줄)
- 주요 컴포넌트: `components/MeetingHubUI.tsx` (664줄), `copy.ts` (595줄)
- 상태 관리: `hooks/useMeetingHubData`, `useMeetingHubDrafts`, `useMeetingHubMutations` + persistent JSON 기반 팀/회의 저장

## 2. 지원 기능 (코드 기준)
- 팀 생성, 회의 메모 생성/업로드, 회의 메모 AI 구조화 또는 규칙 기반 처리
- 액션 아이템 추출, 주간 브리프/요약 집계, 회의별 결정/리스크/후속 추적
- GitHub 이슈 생성, repo overview 불러오기, 액션-이슈 동기화
- overview / teams / meetings / actions / github 뷰 전환

## 3. 입력 / 출력
- 입력: 팀 메타데이터, 회의 제목/참석자/메모, 업로드 파일, GitHub 저장소/이슈 생성 정보
- 출력: 화면 내 요약/브리프/이슈 상태 렌더, `meeting-hub-teams.json`, `meeting-hub-meetings.json`, 회의 Markdown 아티팩트 저장

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: `gh` (GitHub CLI), AI 처리 시 `claude` / `codex` / `gemini` / `openai` / rule 분기
- 로컬 파일: `data/meeting-hub-*` JSON 및 저장된 회의 Markdown
- 네트워크: 내부 API `POST /api/meeting-hub/process`, `POST /api/meeting-hub/upload`, `POST /api/meeting-hub/github/issues/create`, `POST /api/meeting-hub/github/sync`

## 5. API Routes
- `GET /api/meeting-hub/overview` — 팀/회의/액션 집계 반환
- `GET /api/meeting-hub/teams` — 팀 목록 반환
- `GET /api/meeting-hub/meetings` — 회의 목록 반환
- `POST /api/meeting-hub/process` — 메모 구조화 및 액션 추출
- `POST /api/meeting-hub/upload` — 파일 업로드 후 회의 데이터 생성
- `GET /api/meeting-hub/actions/[actionId]` — 액션 상세 조회
- `POST /api/meeting-hub/github/issues/create` — GitHub 이슈 생성
- `GET /api/meeting-hub/github/overview` / `POST /api/meeting-hub/github/sync` — 저장소 현황 및 동기화

## 6. 데이터 타입
- 주요 타입: `src/lib/types/meeting-hub.ts` (`MeetingHubMeeting`, `MeetingHubActionItem`, `MeetingHubGithubOverviewResponse`)
- 저장 포맷: persistent JSON + 회의 Markdown 아티팩트

## 7. 관찰 사항 (객관적)
- 800줄 초과 파일: `src/lib/meeting-hub/storage.ts` 897줄, `src/lib/meeting-hub/github.ts` 806줄
- UI 대형 파일: `MeetingHubUI.tsx` 664줄
- TODO/FIXME 주석은 없고, `copy.ts`에는 액션 추출 예시 문자열로 `TODO:`가 포함됨
- 최근 수정 커밋: `d8690b2 fix: augment PATH for meeting-hub gh CLI spawn`

## 8. 현재 시점 제한
- GitHub 연동은 `gh` CLI 또는 설정된 자격 증명 상태에 의존
- 대형 storage/github 파일이 한 파일에 많은 책임을 보유
- 전용 `copy.ts`는 존재하지만 일부 하위 컴포넌트는 `pickLocale()`를 직접 호출하여 문자열을 로컬 정의

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? bare command spawn은 `processor.ts`와 `github.ts`에서 증강된 env 사용
- [x] 사용자 노출 메시지 ko/en 양쪽 존재? `src/features/meeting-hub/copy.ts`와 하위 컴포넌트 `pickLocale()` 사용
- [ ] 파일 크기 800줄 초과 컴포넌트 없음? UI 컴포넌트는 800줄 미만이지만 `storage.ts`, `github.ts`가 800줄 초과
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 경로 기준 기존 객체를 직접 mutate 하는 패턴은 발견하지 못함
