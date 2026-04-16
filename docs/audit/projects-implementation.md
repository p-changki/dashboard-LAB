# Projects 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/projects/ProjectsTab.tsx` (191줄)
- 주요 컴포넌트: `ProjectGrid.tsx` (94줄), `ProjectStats.tsx` (41줄), advanced `CleanNodeModules.tsx` (120줄), `GitBatchStatus.tsx` (99줄), `GitTimeline.tsx` (49줄), `PortUsage.tsx` (61줄), `EnvMap.tsx` (52줄)
- 상태 관리: 탭 내부 `useState`, advanced 섹션은 `dynamic()` import로 지연 로드

## 2. 지원 기능 (코드 기준)
- 프로젝트 목록/요약 표시, 검색/정렬/필터
- Node Modules 정리 preview/실행
- Git 배치 상태, Git timeline, 포트 사용량, Env Map 표시
- 간단 모드 / 전체 모드에 따른 섹션 노출 제어

## 3. 입력 / 출력
- 입력: 검색어, 프로젝트 타입/정렬, advanced 도구별 dry-run 및 대상 선택
- 출력: 프로젝트 카드, 요약 통계, 복사용 명령어, 정리 결과/진단 데이터

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: 추정: parser 계층에서 `git`, 파일 시스템/포트 조회 명령을 사용
- 로컬 파일: 프로젝트 루트 스캔, `.env` 계열 파일 분석, `node_modules` 크기 및 cleanup 대상 계산
- 네트워크: 내부 API `GET /api/projects/*`, `POST /api/projects/clean-nm`

## 5. API Routes
- `GET /api/projects` — 프로젝트 목록 반환
- `GET /api/projects/git-batch` — Git 상태 집계 반환
- `GET /api/projects/git-timeline` — 최근 커밋 timeline 반환
- `GET /api/projects/ports` — 포트 사용 현황 반환
- `GET /api/projects/env-map` — 환경 변수 키 맵 반환
- `POST /api/projects/clean-nm` — `node_modules` cleanup preview/실행

## 6. 데이터 타입
- 주요 타입: `src/lib/types/core.ts` (`ProjectInfo`, `ProjectsResponse`), `src/lib/types/projects-extended.ts`
- 저장 포맷: 별도 persistent 저장 없음. 파서 계산 결과를 API 응답으로 전달

## 7. 관찰 사항 (객관적)
- `src/lib/projects/` 전용 경로는 현재 존재하지 않음
- 주요 UI 파일은 800줄 미만이며 advanced 패널이 분리되어 있음
- 최근 수정 커밋: `d8eac20 feat: prepare v0.1.13 release`
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함

## 8. 현재 시점 제한
- 전용 `copy.ts`는 존재하지 않고, UI 문자열이 컴포넌트 내부 한국어 상수로 분산
- `src/lib/projects/` 경로 부재로 parser/type 계층 참조가 여러 파일로 나뉨
- 일부 진단 기능은 전체 모드에서만 lazy load 됨

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? `src/app/api/projects/clean-nm` 자체에는 bare command spawn이 없고 parser 호출만 수행
- [ ] 사용자 노출 메시지 ko/en 양쪽 존재? 전용 `copy.ts`가 없고 UI 문자열이 한국어 중심으로 직접 작성됨
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 주요 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 원본 mutate 패턴은 발견하지 못함
