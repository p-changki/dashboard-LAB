# Phase 10 — Call-to-PRD Quality Improvements

> **Owner**: Codex (autonomous executor) — 본 문서는 Codex 검증 리뷰 대상
> **Scope**: Call-to-PRD 기능의 안정성 핫픽스 + 데드코드/중복 제거 + i18n 정리 + 큰 파일 분리
> **Depends on**: Phase 7 (Intent Alignment), Phase 8 (Electron Stability), Phase 9 (Finishing Work) 모두 머지 완료 상태
> **Mode**: 4-Phase 분할 PR. 각 Phase 후 `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check` 통과 필수 (`.next/types` 의존 때문에 build 후 type-check 권장). 실패 시 즉시 중단·보고
> **Branch base**: main
> **Date**: 2026-04-23
> **Revision**: v2 (2026-04-23, Codex 1차 리뷰 반영) — pdf-parse 교체 계획 철회, D1 의존성 방향 수정, Phase 병행 표기 수정, 비동기 응답 구조 재설계, i18n 범위 명확화, hook 에러 전파 계약 결정
> **Revision**: v3 (2026-04-24, Codex 2차 리뷰 반영) — `errorCode`/`saveCallStatus` 가공 계약 제거(`updateStatus`만 사용), synthetic failed record를 "마지막 성공 record 복제" 방식으로 확정, partial 산출물 보존을 기존 `prdMarkdown`/`generatedDocs` 재사용으로 확정, H7 `persistJson` Phase 11로 분리, Open Questions 답변 반영(doc-labels 위치, manifest mutation 방식, D4 위치)
> **Revision**: v4 (2026-04-24, Codex 3차 리뷰 반영) — 10-1.1 첫 poll 실패 fallback 재설계(`startPolling(id, seedRecord?)` 시그니처 + fetchHistory 복구 경로), 10-1.2 `generationWarnings` 배열을 `processCallAsync` 최상단으로 이동 + 함수형 updater 부재에 맞춘 로컬 배열 누적 방식 명시
> **Revision**: v5 (2026-04-24, Codex 4차 리뷰 반영 — `proceed` 판정) — 10-1.1 `setFeedbackMessage` hook wiring 변경을 명시적으로 문서화 (`useCallToPrdData` params 추가 + `CallToPrdTab` 전달 지점). setter 자체는 `useCallToPrdWorkspace.ts:84`에 이미 존재
> **Revision**: v6 (2026-04-25, Codex 6차 리뷰 반영) — Phase 10-1 구현 후 사후 리뷰. **post-implementation hotfix 2건 추가**: 10-1.6 (V1 첫 poll 실패 viewer 무증상 — `CallToPrdViewerStatusPanel`이 `current === null`이면 빈 화면. feedbackMessage는 intake 전용 렌더), 10-1.7 (V2 snapshot 저장 실패 silent — `persistGeneratedDocsSnapshot` catch가 console만 찍고 savedEntryName 반환). 두 항목 모두 Phase 10-1 종료 전 closing patch로 처리
> **Revision**: v7 (2026-04-26, Codex 7차 리뷰 반영 — `proceed` 판정) — 10-1.6 closing patch 변경 파일 목록 보정. `CallToPrdTab` → `CallToPrdViewer` → `CallToPrdViewerStatusPanel` relay chain이므로 **중간 `CallToPrdViewer.tsx`도 prop 중계 필요**. **10-1.6 자체는 3파일 relay chain** (StatusPanel + Viewer + Tab), **10-1.7은 route.ts 1파일** → closing patch 합계 4파일. v6 문서에서 누락됐던 항목
> **Revision**: v8 (2026-04-26, Codex 8차 리뷰 반영 — `proceed` 판정) — v7 revision 노트의 "총 4파일" 표현이 10-1.6만 지칭하는 것처럼 읽힌다는 지적 반영. 정확한 표현은 "10-1.6 = 3파일 relay chain, closing patch 합계 = 4파일"
> **Revision**: v9 (2026-04-26, Codex 9차 리뷰 반영 — `proceed` 판정) — Section 2 Phase 10-1.6 표 행에 남아 있던 "4파일 relay chain" 표기를 "3파일 relay chain"으로 보정. 잔여 문서 정합성 정리 완료
> **Revision**: v10 (2026-04-26, Codex 10차 리뷰 반영 — `proceed` 판정) — Section 8-B 검증 게이트 순서를 `lint → type-check → build`에서 `lint → build → type-check`로 보정. `.next/types` 의존 때문에 build 후 type-check가 안전. Section 9 체크리스트와 표기 통일
> **Revision**: v11 (2026-04-26, Codex 11차 리뷰 반영 — `proceed` 판정) — 잔여 검증 게이트 순서 3곳 통일: Section 0 Mode 라인(build 누락 → 추가), Section 2 Phase 10-1 검증 라인, Section 3 진행 순서 마지막 라인. 모두 `lint → build → type-check` 순서로 통일
> **Revision**: v12 (2026-04-26, Codex 12차 리뷰 반영 — `proceed` 판정) — Phase 10-2/10-3/10-4 각 검증 라인도 `lint → build → type-check`로 통일 (이전 v10/v11에서 누락). 이제 모든 prescriptive 검증 게이트 라인이 동일 정책

---

## 0. Context (반드시 먼저 읽을 것)

### 배경
Call-to-PRD UX 오버홀 4단계(Phase 1~9)에서 28개 UI 항목이 모두 반영 완료되었으나, **품질·유지보수성 관점**에서 다음과 같은 이슈가 식별됨:

- **HIGH 6건**: silent failure, 폴링 미처리, 타입 단언 등 안정성 직결 (H5는 v2에서 철회, H7은 v3에서 Phase 11로 분리)
- **중복 6건**: 동일 함수/타입/문자열의 이중 정의 — 변경 시 한쪽 누락 위험
- **파일 크기 위반 5건**: 800줄/50줄 규칙 초과 — 리팩터링·테스트 가능성 저하
- **i18n 누락 (upload/route.ts 전수 grep 필요)**: 1차 보고의 9곳은 과소 계상으로 Codex가 지적. Phase 10-3.1에서 사용자 노출 / AI prompt 내부 / 로그 3분류 후 사용자 노출만 이전

### 평가 게이트 (evidence_gate)
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts` 기준 검증
- 추측 금지, 모든 변경에 파일:라인 근거 필수
- 동작 시나리오: Quick 모드 1회 + Pro 모드 1회 통화 업로드 스모크 테스트

### 운영 제약 (CLAUDE.md, ~/.claude/rules)
- **Immutability**: spread로 새 객체 생성, 원본 mutate 금지
- **파일 크기**: 200~400줄 권장, 800줄 max
- **함수 크기**: 50줄 max
- **i18n**: 사용자 노출 텍스트는 `copy.ts` / `messages.ts`에 ko/en 양쪽
- **Lint zero warnings, TypeScript strict**
- **Codex CLI 호출 시**: `src/lib/codex-cli.ts`의 `buildDashboardLabCodexExecArgs` 사용

---

## 1. 식별된 이슈 전수 목록

### 1.1 안정성 (HIGH)

| # | 위치 | 문제 | 영향 |
|---|---|---|---|
| H1 | `src/features/call-to-prd/hooks/useCallToPrdData.ts:150-167` | `poll` 내부 fetch에 try-catch 없음. `res.ok` 미체크 후 `as CallRecord` 단언 | 네트워크 오류 시 unhandled rejection, 폴링 silent 중단 |
| H2 | `src/app/api/call-to-prd/upload/route.ts:284,288` | PDF 추출/분석 실패 시 `console.error`만, 사용자 미통지 | 빈 pdfContent로 진행, 사용자는 PDF 무시된 사실 모름 |
| H3 | `src/app/api/call-to-prd/upload/route.ts:621` | PRD 머지 실패 시 silent | 단일 PRD 폴백 발생 사실 미통지 |
| H4 | `src/app/api/call-to-prd/upload/route.ts:904` | `persistGeneratedDocsSnapshot` 영속화 실패가 `console.error`만 | **저장 실패 silent — 데이터 손실 위험** |
| H5 | `src/lib/call-to-prd/pdf-extractor.ts:9-14` | ~~`pdf-parse` 비공식 named export~~ → **(Codex 검증 후 철회)** `pdf-parse@2.4.5` 기준 `PDFParse` named export가 공식 API. default export 부재. 현재 코드 정상 | 변경 불필요. `TextResult.total/pages` 사용처 보강만 검토 |
| H6 | `src/app/api/call-to-prd/upload/route.ts:51-69` | `formData.get(...) as File`/`as string` 단언 15+곳, `instanceof` 체크 없음 | 잘못된 타입 전달 시 runtime 에러 |
| H7 | `src/lib/storage/persistent-json.ts` `persistJson` write 실패 | call history/status 영속화도 silent failure 가능성 (Codex 추가 식별) | **(v3 확정)** 본 Phase 제외. `persistent-json.ts`는 Call-to-PRD 전용이 아니라 공유 모듈이므로 **Phase 11 (별도)** 로 분리 |

### 1.2 중복 / 데드코드

| # | 위치 | 종류 | 영향 |
|---|---|---|---|
| D1 | `src/lib/call-to-prd/messages.ts:19-34` ↔ `src/features/call-to-prd/copy.ts:57-` | 14개 doc type ko/en 레이블 이중 정의 | 변경 시 한쪽 누락으로 UI 불일치. **단, `copy.ts:18`이 이미 `messages.ts`를 import 중이라 단순 위임은 순환 의존 발생** |
| D2 | `src/lib/call-to-prd/saved-bundles.ts:687,764` ↔ `src/app/api/call-to-prd/sections/regenerate/route.ts:194,213` | `getDirectorySize`/`getPrdSaveDir` 중복 정의 | 저장 경로 변경 시 한쪽 누락. **Codex 권고**: 함수 export보다 `sections/regenerate/route.ts:151` manifest 갱신 자체를 `saved-bundles.ts`의 domain function으로 이전 권장 |
| D3 | `src/app/api/call-to-prd/sections/regenerate/route.ts:20-34` ↔ `src/lib/call-to-prd/saved-bundles.ts:28-69` | `BundleManifest` interface 중복 (route는 `sections` 필드만 추가) | 타입 불일치. D2와 함께 domain function 이전으로 자연 해소 |
| D4 | `src/app/api/call-to-prd/upload/route.ts:603-616` ↔ `src/lib/call-to-prd/working-context.ts` | `originalContext` 빌드 로직 중복 (섹션 제목 하드코딩) | 컨텍스트 포맷 변경 시 한쪽 누락 |
| D5 | `src/features/call-to-prd/copy.ts:1244` `getCallGenerationModeDescription` | export 외부 미사용 (내부 `getCallGenerationModeOptions`만 호출) | 불필요 public API |
| D6 | `src/app/api/call-to-prd/upload/route.ts:859-907` `persistGeneratedDocsSnapshot` | `saveGeneratedDocsBundle`에 그대로 위임하는 1-depth wrapper (catch만 추가) | 호출 깊이 증가 |

### 1.3 파일/함수 크기 위반

| # | 위치 | 현재 | 한도 | 비고 |
|---|---|---|---|---|
| S1 | `src/app/api/call-to-prd/upload/route.ts` `processCallAsync` | **643줄** | 50줄/함수 | 12.8배 초과 |
| S2 | `src/app/api/call-to-prd/upload/route.ts` 파일 | 1,010줄 | 800줄 | 1.26배 초과 |
| S3 | `src/features/call-to-prd/copy.ts` | 1,334줄 | 800줄 | 1.67배 초과, 6개 도메인 혼재 |
| S4 | `src/features/call-to-prd/hooks/useCallToPrdActions.ts` | 739줄 | 800줄 | 임박, params 48개 |
| S5 | `src/lib/call-to-prd/saved-bundles.ts` | 780줄 | 800줄 | 임박 |

### 1.4 i18n 누락

**Codex 검증 후 범위 명확화**: 1차 보고의 9곳은 과소 계상. 추가 위치 식별 필요. 단, 모든 한국어 문자열을 i18n 처리하는 것은 아니며 **분류 규칙**을 먼저 적용:

| 분류 | 처리 |
|---|---|
| 사용자 노출 (status, warning, error, label) | `messages.ts` 헬퍼로 이전 (ko/en) |
| AI prompt 내부 (Claude/Codex로 보내는 시스템 프롬프트) | 한국어 유지 (모델은 한국어 처리 가능, 변경 시 출력 품질 영향) |
| 로그/디버그 (`console.error` 메시지 자체) | 영어로 통일 권장하나 본 Phase 비범위 |

**식별된 위치 (재조사 필요, 최소)**:

| 라인 | 하드코딩 문자열 (예시) | 분류 |
|---|---|---|
| 279 | `"PDF 분석 중... (${current}/${total} 파트)"` | 사용자 노출 |
| 300 | `"PDF 분석을 마쳤습니다."` | 사용자 노출 |
| 424 | `"프로젝트 컨텍스트를 준비하지 못했습니다."` | 사용자 노출 |
| 483 | `"Codex CLI가 설치되어 있지 않습니다."` | 사용자 노출 |
| 605~615 | `originalContext` 섹션 제목 (`"## 프로젝트 컨텍스트"` 등) | **AI prompt 내부 — 유지 권장** |
| 625, 718, 759, 792, 928 | runtime warning / status 메시지 | 사용자 노출 |
| 추가 | `formatKnownCallToPrdRuntimeMessage` 미적용 잔존 위치 | Phase 10-3에서 grep 전수조사 |

기존 헬퍼 `getCallToPrdApiError` / `formatKnownCallToPrdRuntimeMessage` 우회 중인 사용자 노출 문자열만 대상.

---

## 2. 구현 Phase

### Phase 10-1: 안정성 핫픽스 (단일 PR)

**목표**: silent failure 제거. 사용자 데이터 손실/오해 방지.

> **중요 (Codex v2 반영)**: `processCallAsync`는 `upload/route.ts:193`에서 `void` fire-and-forget으로 시작되며, 핸들러는 `:208`에서 `{ id, status: "uploading" }`만 즉시 반환한다. 따라서 처리 중 실패는 **HTTP 응답이 아니라 status record에 기록**해야 클라이언트 폴링이 인지할 수 있다.
>
> **중요 (Codex v3 반영)**: 실제 영속화 API는 `src/lib/call-to-prd/call-store.ts:58` `updateStatus(id, status, extra?: Partial<CallRecord>)` 하나뿐. `saveCallStatus` 함수는 없고, `CallRecord` 타입(`src/lib/types/call-to-prd.ts:46`)에 `errorCode` 필드도 없음. 본 Phase에서는 **기존 필드만 사용**한다:
> - 실패 전환: `updateStatus(id, "failed", { error: "<사용자 메시지>" })`
> - Partial 산출물 보존: 기존 `prdMarkdown`/`generatedDocs`(이미 nullable)에 마지막까지 만들어진 값을 그대로 저장. 신규 필드(`partialPrdMarkdown` 등) **추가 금지** — UI 뷰어(`CallToPrdMarkdown.tsx:202`, `useCallToPrdWorkspace.ts:157`, `CallToPrdHistory.tsx:175`)가 기존 필드만 읽음.

| Task | 파일 | 변경 |
|---|---|---|
| 10-1.1 (H1) | `src/features/call-to-prd/hooks/useCallToPrdData.ts:20,147-167`, `src/features/call-to-prd/CallToPrdTab.tsx:23-39`, `useCallToPrdActions.ts:282` | **Hook wiring (v5 추가)**: `UseCallToPrdDataParams` 타입(`useCallToPrdData.ts:20`)에 `setFeedbackMessage: (message: string) => void` 추가. `CallToPrdTab.tsx:23-39` hook 호출부에 `setFeedbackMessage: workspace.setFeedbackMessage` 한 줄 추가. setter 구현은 `useCallToPrdWorkspace.ts:84`에 이미 존재하므로 신규 state 생성 불필요. <br/>`poll` 내부 try-catch + `res.ok` 검증. **에러 전파 계약 (v4 확정)**: <br/>① `startPolling(id: string, seedRecord?: CallRecord)` 시그니처로 변경. 호출부 `useCallToPrdActions.ts:282`에서 upload 응답 payload에 `CallRecord` 포함 시 `startPolling(data.id, data.record)` 주입. (현재 upload 응답은 `{ id, status }`만 반환하므로 API 응답 shape도 동반 변경 또는 **② fallback 채택**.) <br/>② startPolling 스코프에 `lastSuccessRecordRef: MutableRefObject<CallRecord \| null>` 추가. seedRecord가 있으면 초기값으로 세팅. 정상 응답마다 `lastSuccessRecordRef.current = record`로 갱신. <br/>③ 실패 시 — `lastSuccessRecordRef.current`가 있으면 `setCurrent({ ...lastSuccessRecordRef.current, status: "failed", error })`로 덮어쓰기. **ref가 null (첫 poll 실패, seedRecord 주입 실패한 경우)이면** `stopPolling()` + `await fetchHistory()` (서버에 기록된 마지막 record 강제 재로딩) + `setFeedbackMessage(<네트워크 오류 한국어 메시지>)` 경로로 복구. `CallRecord` 필수 필드는 복제/재로딩으로 자동 충족, fallback 값 제조 금지. <br/>④ 권장 경로: **②+③ 조합**이 API shape 변경 최소화. ① 채택 시 `/api/call-to-prd/upload/route.ts:208` 응답 shape과 `useCallToPrdActions`의 기대 타입 동시 변경. 본 Phase 10-1에서는 **②+③만 구현**, seedRecord 주입은 Phase 10-4.3(`useCallToPrdActions` 리팩터) 시점에 도입 |
| 10-1.2 (H2) | `src/app/api/call-to-prd/upload/route.ts:261-300, 366` | **(v4 재설계)** `updateStatus`에 함수형 updater 없음(`call-store.ts:58` 확인). 따라서 ① `generationWarnings` 로컬 배열 선언을 `processCallAsync` **최상단**(현재 `:366` 위치 → `:215~220` 근처로 hoist)으로 이동, ② PDF 추출/분석 실패 시 `generationWarnings.push("<PDF 경고>")` 직접 추가, ③ 다음 `updateStatus` 호출 시 `{ generationWarnings: [...generationWarnings] }`로 전체 배열을 patch로 전달 (불변 복사본), ④ `console.error` 유지. **함수형 updater 도입은 본 Phase 비범위** |
| 10-1.3 (H3) | `src/app/api/call-to-prd/upload/route.ts:621` | PRD 머지 실패 시 단일 폴백 + 10-1.2와 동일한 로컬 배열에 push → 다음 `updateStatus`에서 전체 배열 patch |
| 10-1.4 (H4) | `src/app/api/call-to-prd/upload/route.ts:801, 904` | **(v3 재설계)** 최종 저장(`:801`) 및 `persistGeneratedDocsSnapshot`(`:904`) 실패 시: ① `updateStatus(id, "failed", { error: "<저장 실패 사용자 메시지>", prdMarkdown: lastKnownPrdMarkdown, generatedDocs: lastKnownGeneratedDocs })` — **기존 필드에 partial 데이터 그대로 저장**, ② `processCallAsync` 내부에 `let currentPrdMarkdown: string \| null = null; let currentGeneratedDocs: GeneratedDoc[] = [];` 지역 변수 두고 각 단계 완료 시마다 갱신, ③ console.error는 stack과 함께 유지. 타입 확장 **없음** |
| 10-1.5 (H5) | ~~`pdf-extractor.ts` default export 교체~~ → **(Codex v1 반영, 철회)** 현재 `PDFParse` named export가 공식 API. 변경 불필요. **대신** `TextResult.total`/`pages` 사용처에 nullish guard만 추가 (방어적 코딩) |
| 10-1.6 (V1, **v6 신규 / v7+v8 보정**) | **(v8 보정) 3파일 relay chain**: `CallToPrdViewerStatusPanel.tsx:28`, `CallToPrdViewer.tsx:7,108`, `CallToPrdTab.tsx:321`(viewer 호출부). 10-1.7의 `route.ts`까지 포함하면 closing patch 합계 4파일 | **첫 poll 실패 viewer 무증상 해소**. 현재 `if (!current) return null;` 때문에 `useCallToPrdData.ts`의 `setFeedbackMessage` 복구 경로가 viewer에서 보이지 않음 (intake 전용). **옵션 A 채택 (v6 결정)**: viewer에서 `feedbackMessage` 렌더. <br/>**v7 보정 — 실제 변경 지점**: <br/>① `CallToPrdViewerStatusPanel.tsx`: props에 `feedbackMessage?: string` 추가, `current === null && feedbackMessage`일 때 `NoticeBanner` 또는 `ErrorCard`로 렌더 <br/>② `CallToPrdViewer.tsx`: `CallToPrdViewerProps`에 `feedbackMessage?: string` 추가 (`:14-` 인터페이스), `:108` 호출부에서 prop 중계 <br/>③ `CallToPrdTab.tsx:321`: viewer 호출부에 `feedbackMessage={workspace.feedbackMessage}` 전달 <br/>setter/state는 `useCallToPrdWorkspace.ts:84`에 이미 존재. **B 옵션(fetchHistory→setCurrent)** 비채택 |
| 10-1.7 (V2, **v6 신규**) | `src/app/api/call-to-prd/upload/route.ts:925-933` `persistGeneratedDocsSnapshot` catch | **snapshot 저장 silent fallback 해소**. 현재 `catch (error) { console.error(...); return options.savedEntryName; }`로 silent return. H4 "snapshot 저장 실패도 failed + partial 보존" 요구 미달. **수정**: `console.error` 유지 + **rethrow** (`throw error`). 호출부(`:688`, `:759`, `:792`)에서 받지 않으므로 outer catch(`processCallAsync`의 라인 ~847)에 도달 → 이미 v6에서 `currentPrdMarkdown`/`currentGeneratedDocs` partial 보존이 들어가 있음. <br/>**대안 (B)**: 호출부마다 try/catch 추가 후 명시적 `updateStatus(id, "failed", { ...partial })` — 변경 범위 큼, 비권장. <br/>→ **rethrow 채택**: 1줄 변경, outer catch 패턴 재사용 |

**리스크 (v4 갱신)**:
- 10-1.1: **(Codex 3차 지적)** `useCallToPrdActions.ts:265`에서 `setCurrent(null)` 후 `:282`에서 `startPolling(data.id)` 호출. upload 응답 shape이 `{ id, status: "uploading" }`(현재 `:208`)이므로 첫 poll 시점에 `lastSuccessRecordRef`는 **반드시 null**. 따라서 첫 poll 실패는 **드문 경로가 아니라 정규 경로** → v4 ③ fallback(fetchHistory + feedback) 반드시 동작해야 함
- 10-1.2: 함수형 updater 없으므로 concurrent `updateStatus` 호출 시 warnings 배열 race condition 가능. 단, `processCallAsync`는 단일 async 흐름이므로 실질적으로 race 없음. 향후 병렬화 시 재검토
- 10-1.4: `currentPrdMarkdown`/`currentGeneratedDocs` 지역 변수 관리가 `processCallAsync` 분리(10-4.1) 후 클로저 깨질 수 있음 → Phase 10-4.1에서 `PipelineContext`에 편입 예정
- 10-1.6 (v6): viewer에 `feedbackMessage` prop 추가 시 다른 호출부 영향 0 (단일 컴포넌트). 단 빈 화면 → 알림 배너 노출은 UX 변경이므로 ko/en copy 확인 필요
- 10-1.7 (v6): rethrow 시 outer catch가 항상 partial을 status record에 저장. 단, snapshot 실패는 일시적 디스크 이슈일 가능성 → **재시도 로직 도입은 비범위**, "한 번 실패=명시적 failed" 정책 채택

**복잡도**: LOW~MEDIUM (수정 ~6파일 (v6 closing patch 포함), ~180줄, **타입 확장 없음**)
**검증 (Codex 추가 시나리오 반영)**:
- `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check` (Codex 권고 순서)
- Quick 모드 통화 업로드 1회 (정상)
- 의도적 PDF 깨짐 1회 (warning 노출 + 진행 계속)
- 의도적 디스크 쓰기 실패 시뮬레이션 (`chmod 000` 등) 1회 (failed 상태 + partial 산출물 보존 확인)
- **polling 404/500 시나리오** 1회 (서버 재시작 중 폴링 — synthetic failed record 노출 확인)

---

### Phase 10-2: 데드코드 / 중복 제거 (단일 PR, 동작 변경 없음)

**목표**: 표면적 정리만. 모든 변경은 mechanical refactor.

| Task | 변경 |
|---|---|
| 10-2.1 (D1) | **(v1/v3 확정)** ~~messages.ts → copy.ts 위임~~ 금지 (순환 의존 발생). **신설 위치**: `src/lib/call-to-prd/doc-labels.ts` (Codex 답변으로 확정). 14개 doc type ko/en 레이블을 단일 정의. `messages.ts`와 `copy.ts` 양쪽이 새 모듈 import. 위임 방향: `lib/doc-labels.ts ← messages.ts`, `lib/doc-labels.ts ← copy.ts` |
| 10-2.2 (D2+D3) | **(v1/v3 확정)** ~~getDirectorySize/getPrdSaveDir export~~ 대신, `sections/regenerate/route.ts:151-169`의 manifest 갱신 로직 자체를 `saved-bundles.ts`에 신규 domain function으로 이전. **시그니처**: `updateBundleManifestSections(id, sectionsByDoc): Promise<SavedBundleManifest>` — **새 매니페스트 객체 반환** (Codex 답변으로 확정, 기존 route:169의 pure object construction 패턴 유지). immer 미도입이므로 spread 기반 immutable update. `BundleManifest` 중복 자동 해소 |
| 10-2.3 (D5) | `src/features/call-to-prd/copy.ts:1244` `getCallGenerationModeDescription` export 제거 (파일 내부 함수로 강등) |
| 10-2.4 (D6) | `src/app/api/call-to-prd/upload/route.ts:859-907` `persistGeneratedDocsSnapshot` wrapper 인라인 제거. catch는 호출부에 (10-1.4 변경과 머지 시점 충돌 — Phase 순서로 회피) |

**리스크**: 10-2.1의 신규 모듈 생성 후 기존 `messages.ts:19-34`, `copy.ts:57-` 양쪽 import 갱신 필요. grep으로 모든 `getCallToPrdDocLabel`/`getCallDocLabel` 호출처 확인.
**복잡도**: LOW
**검증**: `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check` + grep으로 제거된 심볼 잔존 참조 0 확인 + 순환 의존 없음 (`madge --circular src/` 또는 type-check 통과로 간접 확인).

---

### Phase 10-3: i18n 정리 + working-context 추출 (단일 PR)

**목표**: `upload/route.ts`의 사용자 노출 한국어 하드코딩을 `messages.ts` 헬퍼로 이전. AI prompt 내부 한국어는 유지.

| Task | 변경 |
|---|---|
| 10-3.1 | **`upload/route.ts` 전수 grep**: 한국어 문자열을 분류 (사용자 노출 vs AI prompt vs 로그). 본 Phase 대상은 사용자 노출만 |
| 10-3.2 | `src/lib/call-to-prd/messages.ts`에 신규 헬퍼 함수 추가 (Codex 네이밍 제안 반영): `formatCallToPrdPdfAnalysisProgress(locale, current, total)`, `formatCallToPrdPdfAnalysisDone(locale)`, `formatCallToPrdProjectContextFailed(locale)`, `formatCallToPrdCodexNotInstalled(locale)` 등. 기존 `formatKnownCallToPrdRuntimeMessage` 패턴과 일관 |
| 10-3.3 | `src/app/api/call-to-prd/upload/route.ts:279,300,424,483,625,718,759,792,928,...` (10-3.1에서 확정) 호출부를 헬퍼 호출로 교체 |
| 10-3.4 (D4) | **(v3 확정)** `originalContext` 빌드 로직(`upload/route.ts:603-616`)을 `src/lib/call-to-prd/working-context.ts:25`에 **별도 builder 함수**(예: `buildOriginalCallContext(options)`)로 추가 (Codex 답변으로 확정). `buildCallWorkingContext`와는 독립 — 전자는 **원문 포함**, 후자는 **compact 처리**라는 용도 차이 있음. 섹션 제목 상수만 모듈 최상단에 공유. **AI prompt 내부이므로 한국어 유지**. 추출 목적은 i18n이 아니라 **D4 중복 제거** |

**리스크**:
- 10-3.4는 `working-context.ts`에 함수 1개 추가뿐이라 회귀 위험 낮음. 기존 `buildCallWorkingContext` 시그니처 건드리지 않음
- 10-3.3 교체 시 ko/en 양쪽 모두 자연스러운 문구 확인 필요

**복잡도**: LOW~MEDIUM
**검증**: `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check` + grep `"PDF 분석"`, `"Codex CLI가"`, `"프로젝트 컨텍스트를"` 잔존 0 확인 (사용자 노출만). ko/en locale 양쪽 헤더 세팅 후 통화 업로드 1회씩.

---

### Phase 10-4: 큰 파일 분리 (구조 변경, 분할 PR)

**목표**: 800줄/50줄 규칙 위반 해소. 각 sub-PR로 분리.

| Sub-PR | 대상 | 분리안 | 의존 |
|---|---|---|---|
| 10-4.1 | `upload/route.ts:215-857` `processCallAsync` 643줄 (S1, S2) | **(v1 반영)** **선행 작업**: `src/lib/call-to-prd/pipeline/types.ts`에 stage별 result 타입(`TranscriptionResult`, `PdfPipelineResult`, `AiGenerationResult`, `PersistResult`)과 공유 컨텍스트 타입(`PipelineContext`) 정의. `PipelineContext`는 Phase 10-1.4의 `currentPrdMarkdown`/`currentGeneratedDocs` 지역 변수도 편입. 그 후 `pipeline/runTranscription.ts`, `runPdfPipeline.ts`, `runAiGeneration.ts`, `persistBundle.ts` 생성. route 핸들러는 `createRecord` + `runPipeline(context)` 호출만 남김. 실패 시 `updateStatus(id, "failed", { error, prdMarkdown: context.currentPrdMarkdown, generatedDocs: context.currentGeneratedDocs })` 패턴 유지 (기존 필드만 사용, v3 규칙) | Phase 10-1, 10-2, 10-3 모두 머지 후 (동일 파일 다수 수정) |
| 10-4.2 | `copy.ts` 1,334줄 (S3) | `src/features/call-to-prd/copy/` 디렉토리: `doc-types.ts`, `intake.ts`, `status.ts`, `next-actions.ts`, `generation-mode.ts`. `copy.ts`는 barrel export로 외부 import 경로 무변경 | 독립 |
| 10-4.3 | `useCallToPrdActions.ts` 739줄 (S4) | `buildSubmitFormData`, `buildPollingHandlers` 추출. params 48개 → `intakeParams/uiState/setters` 그룹화 | `CallToPrdTab.tsx` 동시 수정. Phase 10-1.1과 hook 인터페이스 동시 변경 우려 → Phase 10-1 머지 후 |
| 10-4.4 (선택) | `saved-bundles.ts` 780줄 (S5) | `saved-bundles/read.ts`, `saved-bundles/write.ts`, `saved-bundles/index.ts` barrel | Phase 10-2.2 후 (`updateBundleManifestSections` 추가됨) |

**리스크**:
- 10-4.1: `pipeline/types.ts` 선행이 없으면 4개 파일 분리가 임시변수 폭증으로 깨짐. 타입 먼저 → 함수 추출 순서 엄수
- 10-4.2: barrel re-export로 외부 영향 0이어야 함. 누락 시 lint 실패
- 10-4.3: `useCallToPrdActions` params 그룹화는 `CallToPrdTab.tsx` 호출부 수정 필요. 타입 좁아지는지 확인

**복잡도**: MEDIUM~HIGH (구조 변경, 6~10시간)
**검증**:
- 각 sub-PR마다 `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check`
- Quick/Pro 모드 1회씩 end-to-end 통화 업로드 스모크 테스트
- `desktop:dev` 1회 (Electron PATH 영향 회귀 확인)

---

## 3. 진행 순서 및 의존성

> **(Codex 반영)** 1차 설계의 "병행 가능" 표기는 **잘못**. Phase 10-1, 10-2(D6), 10-3, 10-4.1이 모두 `src/app/api/call-to-prd/upload/route.ts`를 수정하고, 10-2(D1)와 10-3은 `messages.ts`도 겹친다. 순차 진행이 안전.

```
Phase 10-1 (안정성)
   ↓
Phase 10-3 (i18n + working-context 추출)
   ↓
Phase 10-2 (cleanup: D1 doc-labels 신설, D2/D3 domain function, D5/D6 정리)
   ↓
Phase 10-4 (큰 파일 분리)
   ├─ 10-4.1 processCallAsync (Phase 10-1/2/3 후, types.ts 선행)
   ├─ 10-4.2 copy.ts barrel (독립, 어느 시점이든 가능)
   ├─ 10-4.3 useCallToPrdActions (Phase 10-1 후)
   └─ 10-4.4 saved-bundles (Phase 10-2 후)
```

**규칙**:
- 10-4.2(`copy.ts`)만 다른 Phase와 무관, 어느 시점에서도 진행 가능
- 나머지는 위 순서 엄수. 동일 파일 동시 수정 금지
- 각 Phase 머지 직후 `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check` 통과 확인

---

## 4. 검증 게이트 (모든 Phase 공통)

| 게이트 | 명령 | 기준 |
|---|---|---|
| Lint | `pnpm lint --max-warnings=0` | warning 0 |
| Type | `pnpm type-check` | 에러 0 |
| Build | `pnpm build` | 성공 (모든 Phase 후 필수) |
| 스모크 | `pnpm dev` → 통화 1건 업로드 | PRD + supporting docs 생성 |
| 회귀 | `pnpm desktop:dev` | Electron 정상 기동 (Phase 10-4 후) |

**Phase 10-1 추가 시나리오 (Codex 반영, 필수)**:
- PDF 깨짐 (의도적 corrupted PDF 업로드) → warning 노출 + PRD 진행
- 디스크 쓰기 실패 (`chmod 000` 또는 read-only volume) → status `failed` + partial 산출물 보존
- Polling 404/500 (서버 재시작 중간 폴링) → synthetic failed record 노출, hook 멈춤 없음
- ko/en locale 양쪽 헤더 (`x-dashboard-locale: en`) 통화 업로드 1회씩

테스트 프레임워크 미설정 상태이므로 (CLAUDE.md 기준) 자동 테스트 추가는 본 Phase 범위 외.

---

## 5. 비범위 (Out of Scope)

- 신규 기능 추가 (UX 28개 항목은 이미 완료)
- 테스트 프레임워크 도입 (별도 Phase로 분리 권장)
- `CallToPrdTab.tsx` 425줄 분할 (props bridging 위주, 우선순위 LOW)
- 타 기능(Signal Writer, Meeting Hub 등) 영향 분석
- 공유 모듈(`src/lib/codex-cli.ts`, `src/lib/parsers/shared.ts`) 변경

---

## 6. Codex 1차 검증 리뷰 결과 (revise 판정, 반영 완료)

| # | Codex Finding | 본 문서 반영 위치 |
|---|---|---|
| C1 | D1 의존성 방향 반대 + 순환 의존 위험 | Section 1.2 D1 비고, Section 2 Phase 10-2.1 (`doc-labels.ts` 신설로 변경) |
| C2 | pdf-parse@2.4.5는 `PDFParse` named export가 공식. default 부재 | Section 1.1 H5 철회, Section 2 Phase 10-1.5 (변경 불필요, nullish guard만) |
| C3 | Phase 병행 가능성 표기 오류 (동일 파일 충돌) | Section 3 진행 순서 재작성 (10-1 → 10-3 → 10-2 → 10-4 순차) |
| C4 | `processCallAsync` fire-and-forget 구조상 "에러 코드 응답" 불가. status record 반영 + partial 산출물 보존 필요 | Section 2 Phase 10-1.4 재설계 (v2에서는 `errorCode`/신규 `partial*` 필드 추가로 반영했으나 v3에서 **`updateStatus(id, "failed", { error, prdMarkdown, generatedDocs })` 기존 필드 재사용으로 재정정**) |
| C5 | i18n 9곳 과소 계상 + 사용자 노출 vs AI prompt 분류 부재 | Section 1.4 분류 규칙 추가, Section 2 Phase 10-3.1 전수 grep 단계 추가 |
| C6 | H1 hook에 에러 setter 부재 | Section 2 Phase 10-1.1 옵션 A 채택 (synthetic failed record 주입) |
| C7 | D2/D3 함수 export보다 manifest 갱신 자체를 domain function으로 이전 권장 | Section 1.2 D2 비고, Section 2 Phase 10-2.2 (`updateBundleManifestSections` 신설) |
| C8 | persistJson silent failure 추가 식별 | Section 1.1 H7 추가 (Phase 범위 검토 후 포함/제외 결정) |
| C9 | Codex 네이밍 권고: `formatCallToPrdPdfAnalysisProgress(locale, current, total)` 패턴 | Section 2 Phase 10-3.2 헬퍼 네이밍 갱신 |
| C10 | processCallAsync 분리 시 `pipeline/types.ts`와 stage별 result 타입 선행 | Section 2 Phase 10-4.1 선행 작업 추가 |
| C11 | 검증 시나리오 부족 (PDF 깨짐, 저장 실패, polling 404/500) | Section 4 Phase 10-1 추가 시나리오 명시 |

**현재 기준선 검증 (Codex 보고)**: `pnpm lint --max-warnings=0`, `pnpm type-check`, `pnpm build` 모두 통과. Manual smoke 미실행.

---

## 7. Codex 2차 검증 리뷰 결과 (revise → v3 반영 완료)

| # | Codex 2차 Finding | 본 문서 반영 위치 |
|---|---|---|
| R1 | `errorCode`/`saveCallStatus`가 실제 코드에 없음 (`call-store.ts:58` `updateStatus`만, `CallRecord`에 `errorCode` 필드 부재) | Section 2 Phase 10-1 상단 v3 경고 박스, 10-1.1~10-1.4 모두 `updateStatus(id, status, Partial<CallRecord>)` 패턴으로 재작성. `errorCode` 언급 전부 제거. 타입 확장 없음 |
| R2 | synthetic failed record는 "fallback 값 제조"가 아니라 "마지막 성공 record 복제" 방식이어야 함 | Section 2 Phase 10-1.1 — `lastSuccessRecordRef: MutableRefObject<CallRecord \| null>` 패턴 명시. 정상 poll마다 갱신 → 실패 시 `{ ...lastSuccessRecordRef.current, status: "failed", error }` 복제 |
| R3 | Partial 산출물 보존은 기존 `prdMarkdown`/`generatedDocs`(이미 nullable) 재사용. UI 뷰어가 기존 필드만 읽음 | Section 2 Phase 10-1 상단 v3 경고 박스, Phase 10-1.4 — `currentPrdMarkdown`/`currentGeneratedDocs` **지역 변수**로 추적, 실패 시 기존 필드에 그대로 저장. 신규 필드(`partialPrdMarkdown` 등) 추가 금지 명시 |
| R4 | 상단 요약 수치가 본문과 불일치 (HIGH 4건 vs 실제 6, i18n 9곳 vs 실제 과소 계상) | Section 0 배경 수치 갱신: HIGH 6건, i18n은 "전수 grep 필요" |

### Open Questions 답변 반영 (Codex 제공)

| Question | v3 답변 | 반영 위치 |
|---|---|---|
| `doc-labels.ts` 위치 | `src/lib/call-to-prd/doc-labels.ts` 확정 | Section 2 Phase 10-2.1 |
| `updateBundleManifestSections` 시그니처 | 새 매니페스트 객체 반환 (`sections/regenerate/route.ts:169`의 pure object construction 패턴 유지) | Section 2 Phase 10-2.2 |
| D4 추출 위치 | `working-context.ts:25`에 별도 builder 함수 추가 (`buildCallWorkingContext`와 독립) | Section 2 Phase 10-3.4 |
| H7 포함 여부 | 별도 Phase 11로 분리 (`persistent-json.ts`는 공유 모듈) | Section 1.1 H7, Section 0 배경 |

**Codex Verdict**: revise → **v3 적용으로 해소**. 2차 리뷰 불필요 판정(Codex 원문: "전체 2차 리뷰를 한 번 더 돌릴 필요성은 크지 않습니다").

**v3 기준선 재검증**: `pnpm lint --max-warnings=0`, `pnpm type-check` 이번 턴에 다시 통과 (Codex 보고).

---

## 8. Codex 3차 검증 리뷰 결과 (revise → v4 반영 완료)

| # | Codex 3차 Finding | 본 문서 반영 위치 |
|---|---|---|
| T1 | 첫 poll 실패 fallback 전제가 코드와 불일치. `useCallToPrdActions.ts:265`에서 `setCurrent(null)` 후 `:282`에서 `startPolling` 호출 → `lastSuccessRecordRef`는 첫 poll 시 항상 null | Section 2 Phase 10-1.1 v4 재설계: `startPolling(id, seedRecord?)` 시그니처 + ref null 시 `fetchHistory` + `setFeedbackMessage` 복구 경로. v4 리스크 섹션에 "첫 poll 실패는 정규 경로" 명시 |
| T2 | `generationWarnings` 누적 방식이 코드와 불일치. `call-store.ts:58` `updateStatus`는 함수형 updater 없고, `upload/route.ts:366`에서 배열이 PDF 단계(`:261`)보다 **나중에** 선언됨 | Section 2 Phase 10-1.2 v4 재설계: 로컬 배열을 `processCallAsync` 최상단으로 hoist(`:215~220`). `updateStatus`마다 전체 배열을 patch로 전달(spread 복사). 함수형 updater 도입은 비범위 |

**Codex Verdict**: revise (작은 수정) → **v4 적용으로 해소**. Codex 원문: "큰 재검토는 불필요. 위 2개 문장만 고치면 바로 B로 가도 됩니다."

**v3 기준선 재검증 (Codex 3차 보고)**: `pnpm lint --max-warnings=0`, `pnpm type-check` 다시 통과. 문서 파일은 git untracked 상태.

---

## 8-A. Codex 4차 검증 리뷰 결과 (proceed → v5 반영 완료)

| # | Codex 4차 Finding | 본 문서 반영 위치 |
|---|---|---|
| F1 (low) | 10-1.1이 `setFeedbackMessage`를 복구 경로에 사용하지만 hook wiring 변경(`useCallToPrdData.ts:20` params 추가, `CallToPrdTab.tsx:23` 전달)이 문서에 명시 안 됨. setter 자체는 `useCallToPrdWorkspace.ts:84`에 존재 | Section 2 Phase 10-1.1 v5 — **Hook wiring** 첫 문단에 변경 지점 3곳 명시 |

**Codex Verdict**: **proceed**. Codex 원문: "B가 맞습니다. 큰 재검토를 한 번 더 돌릴 구간은 지났고, 위 한 줄만 문서에 보강하거나 구현 PR에서 그대로 처리하면 됩니다."

**v4 기준선 재검증 (Codex 4차 보고)**: `pnpm lint --max-warnings=0`, `pnpm type-check` 다시 통과. 문서 파일은 여전히 git untracked.

---

## 8-B. Codex 6차 검증 리뷰 결과 (Phase 10-1 구현 후 사후 리뷰, revise → v6 반영 완료)

**리뷰 시점**: Phase 10-1.1~10-1.5 구현 완료 후, lint/type-check/build 모두 통과한 상태에서 Codex가 코드 정합성 사후 검토 수행.

| # | Codex 6차 Finding | 본 문서 반영 위치 |
|---|---|---|
| V1 (high) | 첫 poll 실패 fallback이 viewer 기준 무증상. `CallToPrdViewerStatusPanel.tsx:28` `if (!current) return null;` + `feedbackMessage`는 intake 전용 렌더 (`CallToPrdIntake.tsx:107`, `CallToPrdQuickIntake.tsx:89`). 서버 재시작/404/500 시나리오에서 사용자가 viewer에 남아 있지만 빈 화면 + 알림 없음 | Section 2 Phase 10-1.6 신규 추가 — viewer에서 `feedbackMessage` 렌더 (옵션 A 채택) |
| V2 (medium) | `persistGeneratedDocsSnapshot:925-933` catch가 silent. console.error 후 savedEntryName 반환 → 호출부(`:688, :759, :792`) write failure 시 pipeline 계속 진행. H4 "snapshot 저장 실패도 failed + partial 보존" 미달 | Section 2 Phase 10-1.7 신규 추가 — catch에서 rethrow → outer catch의 partial 보존 패턴 재사용 |

### Phase 10-1 잔여 변경 (closing patch)

| Task | 파일 | 변경 |
|---|---|---|
| 10-1.6 | **(v7 보정) 3파일 relay chain**: <br/>① `src/features/call-to-prd/components/CallToPrdViewerStatusPanel.tsx` <br/>② `src/features/call-to-prd/components/CallToPrdViewer.tsx` (중간 relay) <br/>③ `src/features/call-to-prd/CallToPrdTab.tsx` 호출부 | `feedbackMessage?: string` prop 추가 + `current === null && feedbackMessage`일 때 `NoticeBanner`로 렌더. 중간 `CallToPrdViewer`는 prop 중계만 |
| 10-1.7 | `src/app/api/call-to-prd/upload/route.ts:925-933` | `catch (error) { console.error(...); throw error; }` (1줄 추가) |

**검증 게이트 (closing patch 후, Codex 권고 순서)**: `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check` (`.next/types` 의존 때문에 build 후 type-check가 안전) + manual smoke 5개 시나리오 (PDF 깨짐, 저장 실패, polling 404/500, ko/en locale, **첫 poll 실패 시 viewer 알림 노출 신규 추가**).

**Codex Verdict**: revise → **v6 closing patch 적용 후 해소 예정**. Codex 원문: "우선순위는 H1 viewer 복구를 먼저 닫는 쪽입니다."

**v5 코드 기준 재검증 (Codex 6차 보고)**: `pnpm lint --max-warnings=0`, `pnpm type-check`, `pnpm build` 다시 통과. 문서 파일은 여전히 git untracked.

---

## 8-C. Codex 7차 검증 리뷰 결과 (proceed → v7 반영 완료)

| # | Codex 7차 Finding | 본 문서 반영 위치 |
|---|---|---|
| W1 (medium) | 10-1.6 closing patch 파일 목록이 1개 부족. `CallToPrdTab` → `CallToPrdViewer` → `CallToPrdViewerStatusPanel` relay 구조이므로 중간 `CallToPrdViewer.tsx`도 prop 중계 필요 (`:14` props interface, `:108` 호출부). 이전 v6 표기는 `CallToPrdTab` → `CallToPrdViewerStatusPanel` 직접 전달로 잘못 기록 | Section 2 Phase 10-1.6 v7 보정 — 4파일 relay chain 명시 (Status Panel + Viewer + Tab + route.ts). Section 8-B closing patch 표도 3파일 viewer chain으로 갱신 |

**Codex Verdict**: **proceed**. Codex 원문: "추가 리뷰를 돌릴 단계는 아닙니다. 이 closing patch 적용 후 `pnpm lint --max-warnings=0`, `pnpm build`, `pnpm type-check` 순서로 다시 확인하면 됩니다."

**v6 코드 기준 재검증 (Codex 7차 보고)**: 코드 변경 없음 (이전 턴에 closing patch 미실행 상태). 다음 턴에 v7 closing patch 구현 → 검증 게이트 실행 예정.

---

## 8-D. Codex 8차 검증 리뷰 결과 (proceed → v8 반영 완료)

| # | Codex 8차 Finding | 본 문서 반영 위치 |
|---|---|---|
| X1 (low) | v7 revision 노트의 "총 4파일" 표현이 10-1.6만 지칭하는 것처럼 읽힘. 실제로는 10-1.6 = 3파일 relay chain, 10-1.7 = route.ts 1파일, **closing patch 합계 4파일** | Section 0 v7 revision 라인 — 표현 분리 명확화. v8 revision 라인 신설 |

**Codex Verdict**: **proceed**. Codex 원문: "문서에서 10-1.6 = 3파일 relay chain, 전체 closing patch = 4파일만 문구상 맞춰 두고 바로 구현 들어가면 됩니다. 추가 리뷰를 한 번 더 돌릴 단계는 아닙니다."

**v7 코드 기준 재검증 (Codex 8차 보고)**: 4파일 모두 미변경 (`CallToPrdViewerStatusPanel.tsx:28` 빈 반환, `CallToPrdViewer.tsx:14` prop 부재, `CallToPrdTab.tsx:321` 미전달, `upload/route.ts:932` silent return). v7 closing patch 대상 4파일 정의는 타당하다고 확인.

---

## 8-E. Codex 9차 검증 리뷰 결과 (proceed → v9 반영 완료)

| # | Codex 9차 Finding | 본 문서 반영 위치 |
|---|---|---|
| Y1 (low) | Phase 10-1.6 표 행이 여전히 "4파일 relay chain"으로 적혀 있음 (Section 0 v7/v8 revision 노트 및 Section 8-B closing patch 표는 이미 3파일로 정정됨) | Section 2 Phase 10-1.6 표 행 — "3파일 relay chain"으로 보정. 10-1.7 포함 시 합계 4파일임을 명시 |

**Codex Verdict**: **proceed**. Codex 원문: "문서의 저 한 줄만 3파일 relay chain으로 바로잡고 B-continue로 가면 됩니다."

**v8 코드 기준 재검증 (Codex 9차 보고)**: 4파일 모두 미변경 상태 그대로. lint/build/type-check 재실행은 이번 턴 수행 안 됨.

---

## 8-F. Codex 10차 검증 리뷰 결과 (proceed → v10 반영 완료)

| # | Codex 10차 Finding | 본 문서 반영 위치 |
|---|---|---|
| Z1 (low) | Section 8-B 검증 게이트가 `lint && type-check && build` 순으로 적혀 있어 Section 9의 `lint → build → type-check`(Codex 권고)와 불일치. `.next/types` 의존 때문에 build 후 type-check가 안전 | Section 8-B 검증 게이트 라인 — `lint → build → type-check` 순서로 통일 + 사유(.next/types) 명시 |

**Codex Verdict**: **proceed**. Codex 원문: "검증 순서 한 줄만 맞춘 뒤 B-continue로 가면 됩니다."

**v9 코드 기준 재검증 (Codex 10차 보고)**: 4파일 closing patch 미변경 상태 그대로. lint/build/type-check 재실행 없음.

---

## 8-G. Codex 11차 검증 리뷰 결과 (proceed → v11 반영 완료)

| # | Codex 11차 Finding | 본 문서 반영 위치 |
|---|---|---|
| AA1 (low) | 검증 게이트 순서 잔여 불일치 3곳: <br/>① Section 0 Mode 라인 — `lint + type-check`만 적고 build 빠짐 <br/>② Section 2 Phase 10-1 검증 라인 — `lint && type-check && build` 순서 <br/>③ Section 3 진행 순서 마지막 라인 — `lint && type-check && build` 순서 | ① Mode 라인에 build 추가 + 화살표 표기 통일 <br/>② Phase 10-1 검증 라인 `lint → build → type-check` 통일 <br/>③ Section 3 마지막 라인 동일 통일 |

**Codex Verdict**: **proceed**. Codex 원문: "구현 자체는 그 보정과 독립이라 B-continue로 가도 됩니다."

**v10 코드 기준 재검증 (Codex 11차 보고)**: 4파일 closing patch 미변경 상태 그대로. lint/build/type-check 재실행 없음.

---

## 8-H. Codex 12차 검증 리뷰 결과 (proceed → v12 반영 완료)

| # | Codex 12차 Finding | 본 문서 반영 위치 |
|---|---|---|
| AB1 (low) | Phase 10-2/10-3/10-4 검증 라인이 아직 `lint && type-check`로만 적혀 있어 v10/v11에서 통일된 다른 5개 위치(Mode, Phase 10-1, Section 3, Section 8-B, Section 9)와 불일치. "완전 통일" 표현이 정확하지 않음 | Section 2 Phase 10-2 검증 + Phase 10-3 검증 + Phase 10-4 검증 라인 모두 `lint → build → type-check`로 통일 |

**Codex Verdict**: **proceed**. Codex 원문: "이건 아주 낮은 우선순위라, 별도 문서 사이클보다 closing patch 구현 커밋에 같이 묶는 쪽이 낫습니다."

**v11 코드 기준 재검증 (Codex 12차 보고)**: 4파일 closing patch 미변경 상태 그대로. lint/build/type-check 재실행 없음.

---

## 9. 구현 착수 판정

- Codex 1~12차 리뷰 모두 반영 완료 (4/7/8/9/10/11/12차는 `proceed`, 6차는 사후 리뷰, 그 외는 revise)
- v12 설계안 기준 **Phase 10-1 closing patch (10-1.6 = 3파일 relay + 10-1.7 = 1줄, 합계 4파일) 착수 필요** (사용자 승인 후)
- 남은 위험: Manual smoke 5개 시나리오 (PDF 깨짐, 저장 실패, polling 404/500 + viewer 알림 노출, ko/en locale) Phase 10-1 종료 시 실행 필수
- **구현 진행 상태 체크리스트**:
  - [x] v5 본 설계 문서 작성 (git 기준 untracked)
  - [x] 10-1.1~10-1.5 구현 + lint/type-check/build 통과
  - [x] **10-1.6 viewer feedbackMessage 렌더 — 3파일 relay chain (v7 보정)**
    - [x] `CallToPrdViewerStatusPanel.tsx` props + render (`NoticeBanner tone="info"`, `copy.viewer.noticeTitle`)
    - [x] `CallToPrdViewer.tsx` props + relay
    - [x] `CallToPrdTab.tsx` viewer 호출부 prop 전달
    - [x] `copy.ts` ko/en `viewer.noticeTitle` 신규 키 추가 (NoticeBanner가 title 필수)
  - [x] **10-1.7 `persistGeneratedDocsSnapshot` rethrow (v6 신규)** — `route.ts:932` 1줄
  - [x] **10-1.8 (신규, 구현 검증 중 발견) — closing patch 결함 2건 보정**
    - [x] D1: `feedbackMessage` 3초 자동 소거(`useCallToPrdWorkspace.ts:238`)로 10-1.6 배너가 사라져 V1 증상 재발 → sticky `pollingError` 상태 신설, viewer는 `pollingError`를 읽고 intake는 기존 `feedbackMessage` 유지
    - [x] D2: `:759` 스냅샷 호출이 문서별 `try` 안에 있어 10-1.7 rethrow가 문서 생성 실패로 오분류 → 스냅샷 호출을 `try` 밖으로 이동, 성공/실패 분기는 `docSucceeded` 플래그로 처리 (중복 스냅샷 블록 1개 제거)
  - [x] v7 closing patch 후 `pnpm lint --max-warnings=0` → `pnpm build` → `pnpm type-check` 순서로 재검증 (Codex 권고) — 3개 게이트 모두 통과
  - [x] dev 서버 기동 확인 (`Ready in 925ms`)
  - [x] Manual smoke 시나리오 실행 (Playwright 스텁 + 실제 파이프라인 2회)
    - [x] **폴링 404 + viewer 배너**: 업로드/status를 스텁해 404 강제. 배너 t=+10.2s까지 유지. **A/B 대조** — `pollingError`를 `feedbackMessage`로 되돌리면 t=+4.2s에 소멸 확인 (결함 1이 실재했음을 관측으로 입증). `statusHits=1`로 `stopPolling` 정상 동작 확인
    - [x] **정상 실행 (회귀)**: 실제 claude 호출, `prd` + `problem-statement` 2개 생성 → `completed`, `generationWarnings: []`, PRD 5,525자. 루프 재구성 회귀 없음
    - [x] **저장 실패**: 루프 진입 후 저장 경로에 `chmod 000` 주입 → `failed` + partial 보존(`generatedDocs: [prd, problem-statement]`, PRD 5,932자) + **`generationWarnings: []`** (스냅샷 실패가 문서 생성 실패로 오분류되지 않음 = 결함 2 수정 검증)
    - [ ] PDF 깨짐 / ko·en locale 2개 시나리오 — 미실행
  - [x] **10-1.9 (신규) — 코드 리뷰 2라운드 반영**
    - [x] R1: 단발 통신 오류 1회로 폴링이 영구 종료되고 정상 진행 중인 작업을 `failed`로 단정하던 회귀 → `POLL_MAX_FAILURES=3` / `POLL_RETRY_DELAY_MS=2000` 재시도 도입. 404(레코드 소멸)는 회복 불가이므로 재시도 없이 즉시 종결
    - [x] R2: `pdf-extractor.ts`의 nullish guard가 추출 실패를 무경고 스킵으로 바꾸던 문제 → 텍스트가 비면 `formatCallToPrdPdfNoTextMessage` 경고 추가 (if/else로 분기 통합)
    - [x] R3: 신규 경고 3종이 한국어 하드코딩이라 en locale에서 미번역 → `messages.ts`에 `formatCallToPrdPdf{Extract,Analysis}FailedMessage` / `formatCallToPrdPdfNoTextMessage` / `formatCallToPrdMergeFailedMessage` 추가 (10-3 i18n 방향 선반영)
    - [x] R4: 404에도 "네트워크 오류"라 표시하던 오안내 → 레코드 소멸/통신 실패 문구 분리
    - [x] 재검증 (Playwright 스텁 3종): 404 → 요청 1회 후 종결 / 일시 오류 2회 후 **정상 회복, 오류 배너 없음** / 지속 오류 → 3회 재시도 후 종결
    - **미반영 (범위 밖)**: 재시도 소진 시 ErrorCard 제목("생성 중단")과 본문("완료됐는지 확인") 문구 불일치, 재시도 버튼의 중복 실행 가능성, 자동 테스트 부재, `copy.ts`/`route.ts` 800줄 상한 초과(Phase 10-4에서 해소)
  - **발견 (후속 과제)**: 저장 실패 시 `error`가 원시 Node 메시지 + 절대 경로 노출 (`EACCES: permission denied, mkdir '/private/tmp/.../smoke-prd/...'`). `formatCallToPrdFailureMessage`(`copy.ts:1270`)에 저장 실패 분기가 없어 마지막 fallback으로 그대로 통과. 10-1.7 이전에는 스냅샷 실패가 삼켜져 노출되지 않던 경로라 **신규 노출**. Phase 10-3(i18n)에서 한국어 사용자 메시지 분기 추가 필요
  - [ ] 본 설계 문서 + 구현 5(+4)파일 git 커밋
