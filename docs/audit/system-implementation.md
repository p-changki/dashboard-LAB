# System 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/system/SystemTab.tsx` (304줄)
- 주요 컴포넌트: `SystemOverview.tsx` (43줄), `FileActions.tsx` (48줄), `ProcessTable.tsx` (56줄), `AppLauncher.tsx` (49줄), `DevPorts.tsx` (20줄)
- 상태 관리: 탭 내부 `useState` + overview/processes 15초 주기 refresh, apps/file actions lazy load

## 2. 지원 기능 (코드 기준)
- 시스템 정보/프로세스 표시
- 파일 액션 preview/실행을 File Manager 데이터와 결합해 제공
- 프로세스 종료, 앱 목록 조회/실행
- 런타임 요약/설정 저장/설치 작업, terminal WS token 조회

## 3. 입력 / 출력
- 입력: subprocess kill 요청, 앱 launch 요청, runtime settings/install payload, 파일 액션 dry-run 설정
- 출력: overview 카드, 프로세스 표, 앱 런처, runtime 설정 상태, terminal token JSON

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: 앱 launch 시 bare command spawn 가능, runtime installer는 shell wrapper 사용
- 로컬 파일: 시스템/프로세스/설정 경로 조회, runtime settings/secrets 저장
- 네트워크: 내부 API `GET/POST /api/system/*`

## 5. API Routes
- `GET /api/system/info` — 시스템 개요
- `GET /api/system/processes` / `POST /api/system/processes/kill` — 프로세스 목록 및 종료
- `GET /api/system/apps` / `POST /api/system/apps/launch` — 앱 목록 및 실행
- `GET|POST /api/system/runtime` — 런타임 요약 및 설정 저장
- `POST /api/system/runtime/install` — 설치 작업 실행
- `GET /api/system/terminal-token` — terminal WebSocket token 반환

## 6. 데이터 타입
- 주요 타입: `src/lib/types/system.ts` (`SystemInfo`, `ProcessInfo`, `InstalledApp`, `DashboardLabRuntimeSummaryResponse`)
- 저장 포맷: runtime settings/secrets 파일 + API 응답 객체

## 7. 관찰 사항 (객관적)
- `src/lib/system/` 전용 경로는 현재 존재하지 않음
- `src/app/api/system/apps/launch/route.ts`는 143줄이며 Phase 8에서 PATH 증강이 반영됨
- 최근 수정 커밋: `6df96f7 fix: augment PATH for system apps launch spawn`
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함

## 8. 현재 시점 제한
- 전용 `copy.ts`는 존재하지 않고 UI/API 메시지가 한국어 중심
- 앱 실행과 런타임 설치 성공 여부는 로컬 환경 권한과 설치 상태에 직접 의존
- File Manager와 runtime 기능이 같은 탭 안에 공존하여 책임 범위가 넓음

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? bare command spawn은 `apps/launch/route.ts`에서 `getCommandEnvironment()`를 사용하고, 나머지 POST는 spawn 없이 처리
- [ ] 사용자 노출 메시지 ko/en 양쪽 존재? 전용 `copy.ts`가 없고 UI/API 문자열이 한국어 중심
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 주요 UI/API 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 원본 mutate 패턴은 발견하지 못함
