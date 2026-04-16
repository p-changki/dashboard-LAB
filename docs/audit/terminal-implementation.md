# Terminal 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/terminal/TerminalTab.tsx` (434줄)
- 주요 컴포넌트: `TerminalTabs.tsx` (62줄), `TerminalViewport.tsx` (70줄), `QuickLauncher.tsx` (38줄), `BookmarkCommands.tsx` (84줄)
- 상태 관리: 탭 내부 `useState`로 세션 목록, active session, buffer trim 상태 관리

## 2. 지원 기능 (코드 기준)
- WebSocket 기반 터미널 세션 생성/전환/종료
- 빠른 명령 실행 및 북마크 저장
- 버퍼 trim 경고와 fallback 명령 복사 UI
- 연결 상태 배너, 재연결, 로컬 터미널 열기 버튼

## 3. 입력 / 출력
- 입력: quick launch 명령, 북마크 추가, 터미널 stdin 입력, reconnect 요청
- 출력: 터미널 stdout/stderr 스트림 렌더, 세션 탭 상태, fallback 복사용 명령

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: terminal server가 로컬 shell/pty를 실행
- 로컬 파일: 별도 feature storage는 확인하지 못함
- 네트워크: `GET /api/system/terminal-token`, WebSocket server `server/terminal-server.mjs`

## 5. API Routes
- 전용 `src/app/api/terminal` 경로는 현재 존재하지 않음
- `GET /api/system/terminal-token` — terminal server 사용 가능 여부와 token 반환
- 실시간 I/O는 Next API가 아니라 `server/terminal-server.mjs` WebSocket 프로세스가 담당

## 6. 데이터 타입
- 주요 타입: `src/lib/types/terminal.ts` (`TerminalSession`, `QuickLaunchItem`, `TerminalBookmark`)
- 저장 포맷: 세션 상태는 메모리 중심. 장기 저장 포맷은 이번 audit 범위에서 확인하지 못함

## 7. 관찰 사항 (객관적)
- `src/lib/terminal/` 경로는 현재 존재하지 않음
- `server/terminal-server.mjs`는 165줄이며 최대 5세션 제한 메시지를 포함
- 최근 수정 커밋: `d8eac20 feat: prepare v0.1.13 release`
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함

## 8. 현재 시점 제한
- 전용 `copy.ts`는 존재하지 않고 UI 문자열이 한국어 중심
- WebSocket token이 없으면 기능이 비활성화됨
- `src/app/api/terminal` 경로 없이 `system/terminal-token` + 별도 server 프로세스에 의존

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? 전용 POST 엔드포인트가 없고, terminal I/O는 WebSocket server 경로가 담당
- [ ] 사용자 노출 메시지 ko/en 양쪽 존재? 전용 `copy.ts`가 없고 UI 메시지가 한국어 중심
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 주요 UI/server 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 원본 mutate 패턴은 발견하지 못함
