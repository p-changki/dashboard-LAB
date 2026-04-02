# Redesign Roadmap & Comprehensive Verification Report
> dashboard-LAB — Linear/Vercel 스타일 리디자인 종합 검증

**작성일**: 2026-03-27
**담당**: Design Director
**상태**: v1.0 확정 (Task #4 산출물)
**선행 산출물**: Task #1 (트렌드 리서치) · Task #2 (UX 분석/IA) · Task #3 (디자인 시스템)

---

## 1. 종합 일관성 검증

### 1.1 디자인 토큰 일관성

| 검증 항목 | 현황 | 설계안 | 판정 |
|-----------|------|--------|------|
| 컬러 네이밍 | `--background` vs `--color-muted` 혼재 | `--color-*` 접두사 통일 | PASS |
| Surface 계층 | 5단계 미정의, 하드코딩 | 7단계 명시 (`bg-base` ~ `bg-elevated`) | PASS |
| Text 계층 | `--foreground` + `--color-text-soft` 혼재 | 4단계 (`primary`/`secondary`/`muted`/`disabled`) | PASS |
| Border 계층 | 2단계 (`base`/`hover`) | 4단계 (`subtle`/`base`/`hover`/`focus`) | PASS |
| Semantic 상태 | 없음 | `success`/`warning`/`error`/`info` | PASS |
| 타이포 토큰 | 없음 (하드코딩) | 8단계 스케일 + weight/leading/tracking | PASS |
| 스페이싱 | 제각각 (`p-3` ~ `p-6`) | Tailwind 기본 스케일 + 컴포넌트별 권장 | PASS |
| 보더 라디우스 | `rounded-full/2xl/xl/3xl/lg/md` 혼재 (6종) | 6단계 토큰 (`xs` ~ `full`) | PASS |
| 트랜지션 | `duration-[150ms]` 인라인 | 4단계 토큰 | PASS |
| 그림자 | 5+종 커스텀 shadow 혼재 | 5단계 + AI glow 3종 | PASS |

**검증 결과**: 디자인 토큰 설계안은 현재 코드베이스의 모든 하드코딩 패턴을 커버합니다.

### 1.2 컴포넌트 스펙 일관성

| 컴포넌트 | 현재 상태 | 설계안 | 현재 사용처 | 커버리지 |
|----------|----------|--------|------------|----------|
| **Card** | 인라인 클래스 (패턴 3종+) | 3 variants (`default`/`elevated`/`ghost`) | 모든 탭 | PASS |
| **Button** | 인라인, 패턴 5종+ 혼재 | CVA 5 variants + 4 sizes | 모든 탭 | PASS |
| **Badge** | 인라인 (`ToolCard` 등) | CVA 8 variants | Home, AI Skills, Info Hub | PASS |
| **Input** | feature별 개별 스타일 | 2 variants + 3 states | CS Helper, Call-to-PRD | PASS |
| **Modal** | `DashboardGuideModal` 등 인라인 | 3 sizes + 애니메이션 | 전역 | PASS |
| **Table** | Meeting Hub에서 인라인 | 완전 스펙 | Meeting Hub, Info Hub | PASS |
| **Tooltip** | 미구현 (title attr만 사용) | 완전 스펙 | 사이드바, 카드 | PASS |
| **Sidebar Nav** | TabNav.tsx 인라인 | 섹션 그룹핑 + 표준 스펙 | 전역 레이아웃 | PASS |

### 1.3 발견된 보완 필요 사항

| # | 항목 | 설명 | 심각도 |
|---|------|------|--------|
| 1 | **EmptyState 패턴 미정의** | `HomeEmptyCard.tsx` 등에서 빈 상태 UI가 인라인. 설계안에 EmptyState 컴포넌트 스펙 추가 필요 | LOW |
| 2 | **Loading State 미정의** | `TabPanelMessage` 로딩 상태가 인라인. Skeleton/Spinner 컴포넌트 필요 | MEDIUM |
| 3 | **Toast/Notification 없음** | 에러/성공 피드백이 인라인 `<p>` 태그. Toast 컴포넌트 필요 | MEDIUM |
| 4 | **Select/Dropdown 미정의** | CS Helper, Signal Writer에서 `<select>` 사용. 스타일 통일 필요 | LOW |
| 5 | **Tabs 컴포넌트 미정의** | 탭 내부 서브탭 (Meeting Hub views 등) 패턴 미정의 | LOW |

---

## 2. 기존 13개 피처 기능 보존 확인

### 2.1 피처 매핑 (탭 ID → 피처 모듈)

| # | 탭 ID | 피처 | 컴포넌트 수 | API 엔드포인트 | 보존 여부 |
|---|-------|------|------------|----------------|----------|
| 1 | `home` | Home (Overview) | 9 | `/api/overview` | PRESERVED |
| 2 | `aiskills` | AI Skills | 5 | `/api/ai-skills/*` (5개) | PRESERVED |
| 3 | `cshelper` | CS Helper | 6 | `/api/cs-helper/*` (6개) | PRESERVED |
| 4 | `projects` | Projects | 11 | `/api/projects/*` (6개) | PRESERVED |
| 5 | `dochub` | Doc Hub | 4 | `/api/doc-hub/*` (3개) | PRESERVED |
| 6 | `meetinghub` | Meeting Hub | 7 | `/api/meeting-hub/*` (9개) | PRESERVED |
| 7 | `filemanager` | File Manager | 6 | `/api/file-manager/*` (4개) | PRESERVED |
| 8 | `system` | System | 6 | `/api/system/*` (7개) | PRESERVED |
| 9 | `infohub` | Info Hub | 11 | `/api/info-hub/*` (6개) | PRESERVED |
| 10 | `signalwriter` | Signal Writer | 1 | `/api/signal-writer/*` (2개) | PRESERVED |
| 11 | `calltoprd` | Call to PRD | 6 | `/api/call-to-prd/*` (7개) | PRESERVED |
| 12 | — | Terminal (embedded) | 6 | `/api/system/terminal-token` | PRESERVED |
| 13 | — | Global Search | 1 | `/api/search` | PRESERVED |

### 2.2 기능 보존 원칙

리디자인은 **순수 프레젠테이션 레이어** 변경입니다:
- API 라우트: 변경 없음 (데이터 흐름 동일)
- Parser/Lib: 변경 없음 (비즈니스 로직 동일)
- Type 시스템: 변경 없음
- i18n (copy.ts): 변경 없음 (텍스트 유지)
- 변경 대상: TSX 컴포넌트의 className만 교체

**결론**: 13개 피처 기능 100% 보존 확인.

---

## 3. 피처별 리디자인 우선순위 매트릭스

### 3.1 임팩트 × 난이도 매트릭스

```
             높은 임팩트
                 │
    P1           │          P2
  globals.css    │    Button/Badge 통합
  토큰 정리       │    Card 추상화
                 │    Home 탭 리디자인
  ─────────────────────────────────────
                 │
    P3           │          P4
  사이드바 전환    │    Table 컴포넌트
  Input/Modal    │    Meeting Hub 뷰
  CS Helper UI   │    Projects 뷰
                 │
             낮은 임팩트
   낮은 난이도 ◀─────────▶ 높은 난이도
```

### 3.2 상세 우선순위

| 우선순위 | 작업 | 임팩트 | 난이도 | 영향 파일 수 | 예상 PR 크기 |
|----------|------|--------|--------|-------------|-------------|
| **P1-1** | globals.css 토큰 정리 + @theme 확장 | HIGH | LOW | 1 | S |
| **P1-2** | `Badge` 컴포넌트 생성 (CVA) | HIGH | LOW | ~8 (교체) | S |
| **P1-3** | `Button` 컴포넌트 생성 (CVA) | HIGH | MEDIUM | ~15 (교체) | M |
| **P2-1** | `Card` 컴포넌트 추상화 | HIGH | MEDIUM | ~12 (교체) | M |
| **P2-2** | Home 탭 리디자인 (AgentGrid, ToolCard 등) | HIGH | MEDIUM | 9 | M |
| **P2-3** | AI Skills 탭 UI 통일 | MEDIUM | LOW | 5 | S |
| **P3-1** | 사이드바 네비게이션 전환 (`TabNav` → `Sidebar`) | HIGH | HIGH | 3 (레이아웃) | L |
| **P3-2** | `Input` 컴포넌트 통일 | MEDIUM | LOW | ~5 | S |
| **P3-3** | `Modal` 컴포넌트 통일 | MEDIUM | MEDIUM | 3 | M |
| **P3-4** | CS Helper 챗 UI 리디자인 | MEDIUM | MEDIUM | 6 | M |
| **P4-1** | `Table` 컴포넌트 생성 | LOW | LOW | ~3 | S |
| **P4-2** | Meeting Hub 뷰 리디자인 | LOW | HIGH | 7 | L |
| **P4-3** | Info Hub 피드 카드 리디자인 | LOW | LOW | 11 | M |
| **P4-4** | Signal Writer UI 개선 | LOW | MEDIUM | 1 (1040줄) | M |
| **P4-5** | Call to PRD 워크플로우 UI | LOW | HIGH | 6 | L |
| **P4-6** | Toast/Notification 시스템 | MEDIUM | MEDIUM | 전역 | M |

---

## 4. 마이그레이션 전략

### 4.1 전략 비교

| 기준 | 점진적 (Incremental) | 일괄 (Big Bang) |
|------|---------------------|----------------|
| **리스크** | LOW — 피처별 롤백 가능 | HIGH — 전체 롤백 필요 |
| **사용자 영향** | 점진적 개선 체감 | 한번에 완전한 경험 |
| **개발 복잡도** | 낮음 — PR 단위 관리 | 높음 — 충돌/병합 관리 |
| **테스트 용이성** | 피처별 검증 가능 | 전체 회귀 테스트 필요 |
| **병렬 개발** | 가능 — 독립 PR | 어려움 — 단일 브랜치 |
| **시간** | 분산 (주 단위) | 집중 (1~2주 풀타임) |
| **코드 일관성** | 과도기에 혼재 가능 | 한번에 통일 |

### 4.2 권장안: **점진적 마이그레이션 (Incremental)**

**근거**:
1. **테스트 프레임워크 부재** — 현재 lint/type-check만 가능. 일괄 변경 시 시각적 회귀를 잡을 수 없음
2. **1인 개발 환경** — 대규모 PR의 셀프 리뷰는 누락 리스크 증가
3. **기능 보존 우선** — 점진적 접근이 기능 깨짐 발견/수정에 유리
4. **낮은 리스크** — 리디자인은 className 교체가 핵심. 로직 변경 없으므로 점진적이 안전

**과도기 혼재 해결 방안**:
```
Phase 1 (토큰 정리) 완료 시:
  → 기존 변수를 새 변수로 alias 처리 (--background: var(--color-bg-page))
  → 하위 호환 유지하면서 점진 교체

Phase 2~3 (컴포넌트 교체) 시:
  → 피처 단위 PR로 기존 인라인 → 컴포넌트 교체
  → 각 PR에서 해당 피처의 모든 인라인을 한번에 교체

Phase 4 (레거시 제거) 시:
  → alias 변수 제거, 미사용 클래스 정리
```

---

## 5. 리스크 식별

### 5.1 기술 리스크

| # | 리스크 | 확률 | 영향 | 완화 전략 |
|---|--------|------|------|-----------|
| R1 | **Tailwind CSS 4 `@theme` 호환성** | MEDIUM | HIGH | `@theme inline`에 점진 등록. Tailwind v4 공식 문서 기준으로만 사용 |
| R2 | **shadcn/ui CSS 변수 충돌** | HIGH | MEDIUM | Phase 2까지 shadcn/ui 미도입. CVA 패턴만 차용. 충돌 방지 `@layer` 격리 |
| R3 | **Signal Writer 1040줄 리팩터링** | MEDIUM | MEDIUM | 리디자인 전 컴포넌트 분할 선행. 분할 → 스타일 교체 2단계 접근 |
| R4 | **시각적 회귀 미감지** | HIGH | MEDIUM | E2E 스크린샷 비교 도입 (Phase 1 전). 최소한 주요 탭 스크린샷 보존 |
| R5 | **Electron 렌더링 차이** | LOW | HIGH | Phase별 Electron 빌드 테스트 포함 |

### 5.2 프로세스 리스크

| # | 리스크 | 확률 | 영향 | 완화 전략 |
|---|--------|------|------|-----------|
| R6 | **과도기 디자인 불일치** | HIGH | LOW | Phase 1 토큰 정리로 기반 통일 후 교체. alias로 하위 호환 유지 |
| R7 | **기능 변경과 스타일 변경 PR 충돌** | MEDIUM | LOW | 리디자인 PR은 className만 변경. 로직 PR과 분리 원칙 |
| R8 | **비개발자 UX 기대치 미달** | MEDIUM | HIGH | Phase 2 완료 후 사용자 피드백 수집. 사이드바+Home이 핵심 임팩트 |

### 5.3 학습 비용

| 항목 | 대상 | 예상 학습 곡선 |
|------|------|---------------|
| CVA (class-variance-authority) | 개발자 | LOW — 패턴 단순, 기존 Tailwind 지식 그대로 |
| 디자인 토큰 시스템 | 개발자 | LOW — CSS 변수명 규칙 숙지만 필요 |
| 컴포넌트 API | 개발자 | LOW — variant/size prop 패턴 통일 |
| Radix UI (Phase 2 이후) | 개발자 | MEDIUM — headless 패턴 학습 필요 |

---

## 6. 최종 디자인 가이드 확정 사항

### 6.1 디자인 원칙

1. **Token-First**: 모든 시각적 속성은 CSS 변수(토큰)를 통해 정의. 하드코딩 금지
2. **Composable Components**: CVA 기반 variant/size 체계. 인라인 클래스 조합 지양
3. **Progressive Disclosure**: 비개발자는 core 모드(9개 탭), 개발자는 advanced(11개)
4. **AI-Native Accent**: Claude/Codex/Gemini 브랜드 컬러를 accent 시스템으로 통합
5. **Dark-Only**: 라이트 모드 미지원 (로컬 개발 도구 특성상 다크 모드 단일)

### 6.2 확정된 토큰 체계

- **Surface**: 7단계 (`bg-base` → `bg-elevated`)
- **Text**: 4단계 + inverse
- **Border**: 4단계 (`subtle` → `focus`)
- **Accent**: 3 AI 브랜드 + muted 변형
- **Semantic**: 4 상태색 + muted 변형
- **Typography**: 8 사이즈, 4 weight, 3 leading, 4 tracking
- **Spacing**: Tailwind 4px 기반 스케일 (컴포넌트별 권장값 정의)
- **Radius**: 6단계 (`xs` 4px → `full` 9999px)
- **Shadow**: 5단계 + AI glow 3종
- **Transition**: 4단계 (`fast` 100ms → `layout` 300ms)

### 6.3 확정된 컴포넌트 목록

**Core (P1~P2에서 구현)**:
- `Badge` — 8 variants (CVA)
- `Button` — 5 variants × 4 sizes (CVA)
- `Card` — 3 variants + `CardHeader`/`CardContent`/`CardFooter`

**Extended (P3~P4에서 구현)**:
- `Input` — 2 variants × 3 states
- `Modal` — 3 sizes + overlay + 애니메이션
- `Table` — sortable header + hoverable row
- `Tooltip` — fade 애니메이션
- `EmptyState` — icon + message + action (보완 추가)
- `Skeleton` — 로딩 상태 (보완 추가)
- `Toast` — 알림 피드백 (보완 추가)

### 6.4 shadcn/ui 전략 확정

**선택적 도입 (Incremental Adoption)**:
- Phase 1~2: shadcn/ui 미도입. CVA 패턴만 차용하여 자체 구현
- Phase 3: Radix UI 직접 사용 (Dialog, Select, DropdownMenu)
- Phase 4+: shadcn/ui Tailwind CSS 4 stable 지원 시 전환 재검토

---

## 7. 구현 로드맵

### Phase 1: Foundation (기반 정립)

**목표**: 디자인 토큰 시스템 확립, 기존 코드 하위 호환 유지

| 작업 | 파일 | 상세 |
|------|------|------|
| 1-1. globals.css 토큰 전면 교체 | `src/app/globals.css` | 새 토큰 + 레거시 alias |
| 1-2. Badge 컴포넌트 생성 | `src/components/ui/Badge.tsx` | CVA 기반 |
| 1-3. Badge 적용 (기존 인라인 교체) | Home, AI Skills, Info Hub 등 | ~8 파일 |
| 1-4. cva 패키지 설치 | `package.json` | `class-variance-authority` |

**완료 기준**: `pnpm lint` + `pnpm type-check` 통과, 시각적 변화 최소

**예상 PR**: 2~3개 (토큰 / Badge 컴포넌트+적용)

---

### Phase 2: Core Components (핵심 컴포넌트)

**목표**: Button, Card 컴포넌트 통일, Home 탭 리디자인

| 작업 | 파일 | 상세 |
|------|------|------|
| 2-1. Button 컴포넌트 생성 | `src/components/ui/Button.tsx` | CVA 5 variants × 4 sizes |
| 2-2. Button 적용 | 전체 탭 (~15파일) | 기존 `<button className="...">` 교체 |
| 2-3. Card 컴포넌트 생성 | `src/components/ui/Card.tsx` | 3 variants + sub-components |
| 2-4. Card 적용 | Home 탭 우선 (~9파일) | `AgentGrid`, `ToolCard` 등 |
| 2-5. Home 탭 리디자인 | `src/features/home/*` | 새 컴포넌트 활용 |
| 2-6. AI Skills 탭 UI 통일 | `src/features/ai-skills/*` | Badge + Button + Card 적용 |

**완료 기준**: Home 탭이 Linear/Vercel 스타일로 전환, 기능 100% 유지

**예상 PR**: 3~4개 (Button / Card / Home 리디자인 / AI Skills)

---

### Phase 3: Layout & Forms (레이아웃 + 폼)

**목표**: 사이드바 전환, Input/Modal 통일, 주요 피처 UI 개선

| 작업 | 파일 | 상세 |
|------|------|------|
| 3-1. Sidebar 레이아웃 전환 | `TabNav.tsx`, `Dashboard.tsx` | 섹션 그룹핑, 호버 스타일 |
| 3-2. Input 컴포넌트 생성+적용 | `src/components/ui/Input.tsx` | CS Helper, Call-to-PRD 등 |
| 3-3. Modal 컴포넌트 통일 | `src/components/ui/Modal.tsx` | Guide, Onboarding 모달 교체 |
| 3-4. CS Helper 챗 UI 개선 | `src/features/cs-helper/*` | 메시지 버블, 입력 영역 |
| 3-5. Toast/Notification 시스템 | `src/components/ui/Toast.tsx` | 전역 피드백 |
| 3-6. Skeleton/Loading 컴포넌트 | `src/components/ui/Skeleton.tsx` | 탭 로딩 상태 |

**완료 기준**: 전체 레이아웃 전환 완료, 폼 요소 통일

**예상 PR**: 4~5개

---

### Phase 4: Polish & Extended (마무리)

**목표**: 나머지 피처 UI 통일, 레거시 정리

| 작업 | 파일 | 상세 |
|------|------|------|
| 4-1. Table 컴포넌트 | `src/components/ui/Table.tsx` | Meeting Hub, Info Hub 적용 |
| 4-2. Signal Writer 리팩터링 | `src/features/signal-writer/*` | 1040줄 → 분할 후 스타일 교체 |
| 4-3. Meeting Hub 뷰 리디자인 | `src/features/meeting-hub/*` | 5개 뷰 통일 |
| 4-4. Info Hub 피드 카드 | `src/features/info-hub/*` | FeedCard, TrendingSection 등 |
| 4-5. Call-to-PRD 워크플로우 UI | `src/features/call-to-prd/*` | 스텝 인디케이터, 업로드 UI |
| 4-6. 레거시 CSS 변수 alias 제거 | `globals.css` | 마이그레이션 완료 후 정리 |
| 4-7. EmptyState 컴포넌트 | `src/components/ui/EmptyState.tsx` | `HomeEmptyCard` 등 통합 |
| 4-8. Tooltip 컴포넌트 | `src/components/ui/Tooltip.tsx` | `title` attr → 컴포넌트 교체 |

**완료 기준**: 모든 피처 UI 통일, 레거시 코드 제거, 디자인 시스템 100% 적용

**예상 PR**: 5~6개

---

### Phase 5: Quality Assurance (선택)

| 작업 | 상세 |
|------|------|
| 5-1. E2E 스크린샷 테스트 도입 | Playwright 기반 시각적 회귀 검증 |
| 5-2. Storybook 도입 검토 | 컴포넌트 카탈로그 (팀 확장 시) |
| 5-3. 접근성(a11y) 감사 | WCAG 2.1 AA 기준 전수 검사 |
| 5-4. 성능 프로파일링 | 새 컴포넌트의 렌더링 성능 검증 |
| 5-5. Electron 크로스 빌드 검증 | macOS/Windows/Linux 시각 일관성 |

---

## 부록 A: 현재 코드베이스 수치

| 항목 | 수치 |
|------|------|
| TypeScript 파일 수 | 291개 |
| 총 코드 라인 | ~43,000줄 |
| 피처 모듈 수 | 12개 (src/features/) |
| API 엔드포인트 수 | 67개 |
| 공유 UI 컴포넌트 | 5개 (src/components/ui/) |
| 가장 큰 파일 | SignalWriterTab.tsx (1,040줄) |
| 평균 피처 컴포넌트 수 | 7개 |

## 부록 B: 피처별 복잡도 매핑

| 피처 | 파일 수 | 코드 라인 | 리디자인 난이도 |
|------|---------|----------|---------------|
| call-to-prd | 11 | 2,207 | HIGH (멀티스텝 워크플로우) |
| meeting-hub | 13 | 1,362 | HIGH (5개 서브뷰) |
| signal-writer | 3 | 735 | MEDIUM (단일 파일 비대) |
| cs-helper | 7 | 336 | MEDIUM (챗 UI) |
| home | 10 | 262 | MEDIUM (그리드 레이아웃) |
| ai-skills | 6 | 166 | LOW |
| info-hub | 12 | 127 | LOW (Lazy 로딩 구조) |

---

*이 문서는 Task #1~3 산출물과 코드베이스 분석을 기반으로 Design Director가 종합 검증 및 확정한 최종 로드맵입니다.*
