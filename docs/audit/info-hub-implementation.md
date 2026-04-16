# Info Hub 구현 현황 (as of 2026-04-17, v0.1.19)

> 이 문서는 코드 기준 객관적 사실만 정리. 사용자 의도·판단은 포함하지 않음.

## 1. 진입점
- UI 탭: `src/features/info-hub/InfoHubTab.tsx` (692줄)
- 주요 컴포넌트: `InfoHubToolbar.tsx`, `InfoHubFilterBar.tsx`, `FeedCard.tsx`, `AiSkillRecommendations.tsx`, `copy.ts` (143줄)
- 상태 관리: 탭 내부 `useState` + TTL cache map + localStorage 기반 bookmark/read state

## 2. 지원 기능 (코드 기준)
- 카테고리별 피드 조회, 검색, 정렬, 북마크/읽음 표시
- GitHub Trending / npm 업데이트 / 보안 점검 / AI Skills 추천 lazy load
- daily auto refresh 및 idle refresh 스케줄링
- Signal Writer 글감 담기, 현재 프로젝트 기준 패키지/보안 섹션 조회

## 3. 입력 / 출력
- 입력: 카테고리 선택, 검색어, refresh mode, 현재 프로젝트
- 출력: 피드 카드 렌더, 로컬 북마크/읽음 상태 저장, 섹션별 API 결과 표시

## 4. 외부 의존성 (CLI / API / 파일시스템)
- CLI: 직접 실행 경로는 이번 audit 범위에서 확인하지 못함
- 로컬 파일: parser cache, 북마크/읽음 local state
- 네트워크: RSS, GitHub Trending, npm registry, 내부 API `GET /api/info-hub/*`

## 5. API Routes
- `GET /api/info-hub` — 기본 피드 목록
- `GET /api/info-hub/sources` — 소스 메타데이터
- `GET /api/info-hub/trending` — GitHub/npm 트렌딩
- `GET /api/info-hub/my-packages` — 현재 프로젝트 패키지 업데이트
- `GET /api/info-hub/security` — 보안 감사 결과
- `GET /api/info-hub/ai-skills` — AI Skills 추천

## 6. 데이터 타입
- 주요 타입: `src/lib/types/info-hub.ts` (`FeedItem`, `FeedResponse`, `AiSkillRecommendationsResponse`, `SecurityAuditResponse`)
- 저장 포맷: 메모리 cache + local bookmark/read state

## 7. 관찰 사항 (객관적)
- 큰 파일: `InfoHubTab.tsx` 692줄, `ai-skills-fetcher.ts` 440줄
- TODO/FIXME/HACK 주석은 이번 스캔에서 발견하지 못함
- 최근 수정 커밋: `d8eac20 feat: prepare v0.1.13 release`

## 8. 현재 시점 제한
- 이번 시점에는 Info Hub UX 개편이 아니라 read-only audit만 수행
- 외부 데이터 신뢰도와 refresh 타이밍은 원격 소스 가용성에 의존
- 전용 `copy.ts`는 존재하지만 일부 내부 설명 문자열은 lib 계층에도 포함

## 9. 감사 체크리스트 (코덱스가 채움)
- [x] 모든 POST 엔드포인트가 `getCommandEnvironment()` 또는 동일 패턴 적용? 이 모듈의 `src/app/api/info-hub/`에는 POST 엔드포인트가 없음
- [x] 사용자 노출 메시지 ko/en 양쪽 존재? `src/features/info-hub/copy.ts`와 카테고리 label/labelEn 정의 존재
- [x] 파일 크기 800줄 초과 컴포넌트 없음? 확인한 UI/lib 파일 모두 800줄 미만
- [x] `mutate` / 원본 수정 패턴 없음? 이번 audit에서 확인한 주요 파일 기준 명시적 원본 mutate 패턴은 발견하지 못함
