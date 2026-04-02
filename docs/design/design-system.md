# Design System & Component Guide
> dashboard-LAB — Linear/Vercel 스타일 다크 대시보드 리디자인

**작성일**: 2026-03-27
**담당**: UI Engineer
**상태**: v1.0 초안 (Task #3 산출물)

---

## 1. 현재 globals.css 분석

### 현재 CSS 변수 현황

```css
/* ── Background Layers ── */
--background: #0f0f0f;
--foreground: #f0f0f0;
--bg-surface: #161616;
--bg-card: #1e1e1e;
--bg-card-hover: #242424;

/* ── Border ── */
--border-base: rgba(255, 255, 255, 0.1);
--border-hover: rgba(255, 255, 255, 0.18);

/* ── Accent ── */
--accent-claude: #c084fc;
--accent-codex: #34d399;
--accent-gemini: #60a5fa;

/* ── Legacy (혼재) ── */
--panel: rgba(30, 30, 30, 0.7);
--panel-border: rgba(255, 255, 255, 0.08);
--color-muted: #8f98ab;
--color-text-soft: #c1c9d6;
```

### 문제점 분석

| 문제 | 현황 | 개선 방향 |
|------|------|-----------|
| **토큰 네이밍 비일관성** | `--bg-card` vs `--color-muted` 혼재 | `--color-*` 접두사로 통일 |
| **레거시 변수 병존** | `--panel`, `--panel-border` 중복 | `--bg-surface`로 통합 |
| **타이포 토큰 없음** | 폰트 크기/웨이트 하드코딩 | `--text-*` 스케일 추가 |
| **스페이싱 토큰 없음** | `p-5`, `gap-3` 제각각 | 스페이싱 상수 정의 필요 |
| **인터랙션 토큰 없음** | 트랜지션 `duration-[150ms]` 인라인 | `--transition-*` 변수화 |
| **Tailwind CSS 4 미활용** | `@theme inline`에 최소 등록 | 디자인 토큰을 `@theme`에 등록 |

---

## 2. 디자인 토큰 정의 (Tailwind CSS 4)

### 2.1 컬러 팔레트 — 다크 모드 계층 구조

```css
/* globals.css */
:root {
  /* ── Surface Hierarchy (5 레이어) ── */
  --color-bg-base:       #0a0a0a;   /* 최하위 — body 배경 */
  --color-bg-page:       #0f0f0f;   /* 페이지 레이어 */
  --color-bg-surface:    #161616;   /* 사이드바/패널 */
  --color-bg-card:       #1e1e1e;   /* 카드 기본 */
  --color-bg-card-hover: #242424;   /* 카드 호버 */
  --color-bg-overlay:    #2a2a2a;   /* 모달/팝오버 */
  --color-bg-elevated:   #303030;   /* 드롭다운/툴팁 */

  /* ── Text Hierarchy ── */
  --color-text-primary:  #f0f0f0;   /* 주 텍스트 */
  --color-text-secondary:#c1c9d6;   /* 보조 텍스트 */
  --color-text-muted:    #8f98ab;   /* 비활성/힌트 */
  --color-text-disabled: #4a5568;   /* 비활성화 */
  --color-text-inverse:  #0a0a0a;   /* 반전 (밝은 배경 위) */

  /* ── Border ── */
  --color-border-subtle:  rgba(255,255,255,0.06);  /* 최소 구분선 */
  --color-border-base:    rgba(255,255,255,0.10);  /* 기본 */
  --color-border-hover:   rgba(255,255,255,0.18);  /* 호버 */
  --color-border-focus:   rgba(255,255,255,0.35);  /* 포커스 */

  /* ── Brand Accent (AI 도구별) ── */
  --color-accent-claude:       #c084fc;  /* Claude 퍼플 */
  --color-accent-claude-muted: rgba(192,132,252,0.15);
  --color-accent-codex:        #34d399;  /* Codex 에메랄드 */
  --color-accent-codex-muted:  rgba(52,211,153,0.15);
  --color-accent-gemini:       #60a5fa;  /* Gemini 블루 */
  --color-accent-gemini-muted: rgba(96,165,250,0.15);

  /* ── Semantic Status ── */
  --color-success:        #4ade80;
  --color-success-muted:  rgba(74,222,128,0.15);
  --color-warning:        #fbbf24;
  --color-warning-muted:  rgba(251,191,36,0.15);
  --color-error:          #f87171;
  --color-error-muted:    rgba(248,113,113,0.15);
  --color-info:           #60a5fa;
  --color-info-muted:     rgba(96,165,250,0.15);
}

@theme inline {
  /* Tailwind CSS 4에 토큰 등록 */
  --color-bg-base:        var(--color-bg-base);
  --color-bg-page:        var(--color-bg-page);
  --color-bg-surface:     var(--color-bg-surface);
  --color-bg-card:        var(--color-bg-card);
  --color-bg-card-hover:  var(--color-bg-card-hover);
  --color-bg-overlay:     var(--color-bg-overlay);
  --color-text-primary:   var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-muted:     var(--color-text-muted);
  --color-border-base:    var(--color-border-base);
  --color-border-hover:   var(--color-border-hover);
  --color-border-focus:   var(--color-border-focus);
  --color-accent-claude:  var(--color-accent-claude);
  --color-accent-codex:   var(--color-accent-codex);
  --color-accent-gemini:  var(--color-accent-gemini);
  --color-success:        var(--color-success);
  --color-warning:        var(--color-warning);
  --color-error:          var(--color-error);

  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), 'JetBrains Mono', monospace;
}
```

### 2.2 타이포그래피 스케일

```css
:root {
  /* Font Size */
  --text-2xs:  0.625rem;   /* 10px — 라벨, 뱃지 */
  --text-xs:   0.6875rem;  /* 11px — 캡션, 메타 */
  --text-sm:   0.75rem;    /* 12px — 보조 텍스트 */
  --text-base: 0.875rem;   /* 14px — 본문 기본 */
  --text-md:   1rem;       /* 16px — 제목 소 */
  --text-lg:   1.125rem;   /* 18px — 제목 중 */
  --text-xl:   1.25rem;    /* 20px — 제목 대 */
  --text-2xl:  1.5rem;     /* 24px — 헤더 */

  /* Font Weight */
  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;

  /* Line Height */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Letter Spacing */
  --tracking-tight:   -0.01em;
  --tracking-normal:  0;
  --tracking-wide:    0.05em;
  --tracking-widest:  0.18em;  /* 현재 사용 중 — label uppercase */
}
```

**타이포 사용 규칙**

| 역할 | 크기 | 웨이트 | 예시 |
|------|------|--------|------|
| 섹션 레이블 (uppercase) | 10px | 500 | `AGENTS`, `SKILLS` |
| 캡션/메타 | 11px | 400 | 버전, 경로 |
| 보조 텍스트 | 12px | 400 | 설명문 |
| 본문 | 14px | 400 | 카드 내용 |
| 카드 타이틀 | 14px | 500 | 에이전트명 |
| 섹션 헤더 | 16–18px | 600 | 탭 제목 |
| 페이지 헤더 | 20–24px | 700 | Dashboard |

### 2.3 스페이싱 스케일

Tailwind CSS 4 기본 스케일 활용 (4px 기반). 컴포넌트별 권장값:

```
padding-xs:  p-2   (8px)   — 뱃지, 인라인 요소
padding-sm:  p-3   (12px)  — 소형 카드, 버튼
padding-md:  p-4   (16px)  — 기본 카드
padding-lg:  p-5   (20px)  — 현재 카드 (유지)
padding-xl:  p-6   (24px)  — 모달, 대형 패널

gap-xs:  gap-1.5  (6px)
gap-sm:  gap-2    (8px)   — 인라인 요소
gap-md:  gap-3    (12px)  — 그리드
gap-lg:  gap-4    (16px)  — 섹션 간
gap-xl:  gap-6    (24px)  — 레이아웃 구분
```

### 2.4 보더 라디우스

```css
:root {
  --radius-xs:  4px;   /* 인라인 뱃지, 태그 */
  --radius-sm:  6px;   /* 버튼 sm, 인풋 */
  --radius-md:  8px;   /* 버튼 기본, 드롭다운 */
  --radius-lg:  12px;  /* 패널, 모달 */
  --radius-xl:  16px;  /* 카드 (현재: rounded-2xl) */
  --radius-full: 9999px; /* 뱃지 pill, 아바타 */
}
```

### 2.5 그림자 (Shadow)

```css
:root {
  --shadow-xs:  0 1px 3px rgba(0,0,0,0.3);
  --shadow-sm:  0 2px 8px rgba(0,0,0,0.35);
  --shadow-md:  0 2px 12px rgba(0,0,0,0.4);   /* 현재 카드 */
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.5);   /* 모달 */
  --shadow-xl:  0 16px 40px rgba(0,0,0,0.6);  /* 대형 패널 */

  /* Glow — AI 도구 강조 */
  --shadow-glow-claude: 0 0 12px rgba(192,132,252,0.3);
  --shadow-glow-codex:  0 0 12px rgba(52,211,153,0.3);
  --shadow-glow-gemini: 0 0 12px rgba(96,165,250,0.3);
}
```

### 2.6 트랜지션

```css
:root {
  --transition-fast:    100ms ease;
  --transition-base:    150ms ease;   /* 현재 사용 중 */
  --transition-slow:    250ms ease;
  --transition-layout:  300ms ease;
}
```

---

## 3. 핵심 컴포넌트 스펙

### 3.1 Card

현재 패턴 (`AgentGrid`, `ToolCard` 공통):
```tsx
rounded-2xl border border-white/8 bg-[#1e1e1e] p-5
shadow-[0_2px_12px_rgba(0,0,0,0.4)]
transition-all duration-[150ms]
hover:-translate-y-0.5 hover:border-white/[.14] hover:bg-[#242424]
```

**개선 스펙 — `Card` 컴포넌트**

```tsx
// 사용법
<Card variant="default" | "elevated" | "ghost" hoverable>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>
```

| Variant | 배경 | 테두리 | 용도 |
|---------|------|--------|------|
| `default` | `--color-bg-card` | `border/8` | 일반 카드 |
| `elevated` | `--color-bg-overlay` | `border/10` | 강조 섹션 |
| `ghost` | transparent | `border/6` | 배경 섹션 구분 |

**호버 인터랙션** (21st.dev Dark Grid 영감):
```css
/* 기본 호버 */
hover:-translate-y-0.5
hover:border-white/[.14]
hover:bg-[--color-bg-card-hover]

/* 선택적: 코너 마커 (강조 카드) */
.card-featured::before /* 좌상단 2×2 흰 픽셀 */
.card-featured::after  /* 우하단 2×2 흰 픽셀 */
```

---

### 3.2 Button

CVA 기반 3+1 variant 체계 (21st.dev Button 패턴 적용):

```tsx
// 스펙
<Button
  variant="primary" | "secondary" | "ghost" | "outline" | "destructive"
  size="sm" | "md" | "lg" | "icon"
  disabled?
>
```

| Variant | 배경 | 텍스트 | 테두리 | 용도 |
|---------|------|--------|--------|------|
| `primary` | `#ffffff` | `#0a0a0a` | — | 주요 액션 |
| `secondary` | `#2a2a2a` | `#f0f0f0` | `border/10` | 보조 액션 |
| `ghost` | transparent | `#c1c9d6` | — | 사이드바 네비, 툴바 |
| `outline` | transparent | `#f0f0f0` | `border/18` | 취소, 뒤로가기 |
| `destructive` | `rgba(248,113,113,0.15)` | `#f87171` | `border-error/30` | 삭제 |

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm`   | 28px | px-2.5 | 11px |
| `md`   | 32px | px-3   | 13px |
| `lg`   | 40px | px-4   | 14px |
| `icon` | 32px | — (정사각) | — |

**상태별 스타일**:
```css
/* Focus ring */
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-white/30
focus-visible:ring-offset-2
focus-visible:ring-offset-[#0f0f0f]

/* Disabled */
disabled:opacity-50
disabled:pointer-events-none
```

---

### 3.3 Input

```tsx
<Input
  variant="default" | "ghost"
  size="sm" | "md" | "lg"
  state="default" | "error" | "success"
  leftIcon?
  rightIcon?
  label?
  hint?
/>
```

```css
/* 기본 스타일 */
.input-base {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: var(--radius-md); /* 8px */
  color: var(--color-text-primary);
  font-size: 13px;
  height: 34px;
  padding: 0 12px;
  transition: border-color var(--transition-base),
              box-shadow var(--transition-base);
}

.input-base::placeholder {
  color: var(--color-text-disabled);
}

.input-base:focus {
  border-color: rgba(255,255,255,0.35);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.06);
  outline: none;
}

.input-error {
  border-color: rgba(248,113,113,0.5);
}
.input-error:focus {
  box-shadow: 0 0 0 3px rgba(248,113,113,0.12);
}
```

---

### 3.4 사이드바 네비게이션

현재 구조: 상단 탭바 (TabNav). 리디자인 방향: **Left Sidebar**

```
Sidebar (width: 220px, collapsed: 56px)
├── Logo + Workspace Name
├── NavSection "Main"
│   ├── NavItem [icon] Home          ← active: bg-white/8, text-primary
│   ├── NavItem [icon] Call to PRD
│   ├── NavItem [icon] AI Skills
│   └── NavItem [icon] CS Helper
├── NavSection "Tools"
│   ├── NavItem [icon] Terminal
│   ├── NavItem [icon] File Manager
│   └── NavItem [icon] Projects
└── NavSection "Info"
    ├── NavItem [icon] Info Hub
    └── NavItem [icon] Meeting Hub
```

**NavItem 스타일**:
```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  transition: all var(--transition-base);
  cursor: pointer;
}

.nav-item:hover {
  background: rgba(255,255,255,0.06);
  color: var(--color-text-secondary);
}

.nav-item.active {
  background: rgba(255,255,255,0.08);
  color: var(--color-text-primary);
}

.nav-item.active .nav-icon {
  opacity: 1;
}

.nav-icon {
  width: 16px;
  height: 16px;
  opacity: 0.5;
}
```

**섹션 레이블**:
```css
.nav-section-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-disabled);
  padding: 4px 10px;
  margin-top: 16px;
}
```

---

### 3.5 Modal

```tsx
<Modal size="sm" | "md" | "lg" | "fullscreen">
  <ModalHeader title closeButton />
  <ModalBody />
  <ModalFooter />
</Modal>
```

```css
.modal-overlay {
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--color-bg-overlay);   /* #2a2a2a */
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: var(--radius-lg);       /* 12px */
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
}

/* Size */
.modal-sm  { max-width: 400px; }
.modal-md  { max-width: 560px; }   /* 기본 */
.modal-lg  { max-width: 760px; }
```

**애니메이션**:
```css
/* enter */
@keyframes modal-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
animation: modal-in 150ms ease;
```

---

### 3.6 Table

```tsx
<Table>
  <TableHead>
    <TableRow>
      <TableHeader sortable>Name</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow hoverable>
      <TableCell>...</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

```css
.table { width: 100%; border-collapse: separate; border-spacing: 0; }

.table-header-cell {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-disabled);
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  text-align: left;
}

.table-row {
  transition: background var(--transition-base);
}

.table-row:hover {
  background: rgba(255,255,255,0.03);
}

.table-cell {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
```

---

### 3.7 상태 배지 (Status Badge)

현재 패턴:
```tsx
// ToolCard에서 사용 중
<span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
  isConnected
    ? "border-emerald-500/20 bg-emerald-900/30 text-emerald-200"
    : "border-amber-500/20 bg-amber-900/30 text-amber-200"
}`} />
```

**개선 스펙 — `Badge` 컴포넌트**:

```tsx
<Badge variant="success" | "warning" | "error" | "info" | "neutral" | "claude" | "codex" | "gemini">
```

| Variant | 배경 | 텍스트 | 테두리 |
|---------|------|--------|--------|
| `success` | `rgba(74,222,128,0.15)` | `#4ade80` | `rgba(74,222,128,0.3)` |
| `warning` | `rgba(251,191,36,0.15)` | `#fbbf24` | `rgba(251,191,36,0.3)` |
| `error`   | `rgba(248,113,113,0.15)` | `#f87171` | `rgba(248,113,113,0.3)` |
| `info`    | `rgba(96,165,250,0.15)` | `#60a5fa` | `rgba(96,165,250,0.3)` |
| `neutral` | `rgba(255,255,255,0.06)` | `#8f98ab` | `rgba(255,255,255,0.12)` |
| `claude`  | `rgba(192,132,252,0.15)` | `#c084fc` | `rgba(192,132,252,0.3)` |

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  border: 1px solid;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

/* dot indicator */
.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
```

---

### 3.8 툴팁 (Tooltip)

```css
.tooltip {
  background: var(--color-bg-elevated);   /* #303030 */
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: var(--radius-sm);        /* 6px */
  color: var(--color-text-secondary);
  font-size: 12px;
  padding: 5px 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  max-width: 240px;
}
```

애니메이션: `opacity 100ms ease` fade in/out

---

## 4. shadcn/ui 도입 검토

### 장점

| 항목 | 내용 |
|------|------|
| **컴포넌트 품질** | Radix UI 기반, 접근성(a11y) 완전 지원 |
| **복붙 방식** | 코드 소유권이 프로젝트에 있어 자유로운 커스터마이징 |
| **생태계** | 21st.dev 등 서드파티와 연동, 풍부한 레퍼런스 |
| **타입 안전성** | TypeScript first, CVA 기반 variant 체계 |
| **Tailwind 4 지원** | shadcn/ui `canary` 버전에서 Tailwind CSS 4 지원 시작 |

### 단점 / 리스크

| 항목 | 내용 |
|------|------|
| **Tailwind CSS 4 호환성** | 현재 stable 버전은 Tailwind v3 기준. v4 canary는 변수 시스템이 다름 |
| **CSS 변수 충돌** | shadcn/ui의 `--background`, `--foreground`가 기존 토큰과 이름 충돌 |
| **마이그레이션 비용** | 기존 90개+ 컴포넌트를 shadcn/ui로 전환 시 상당한 리팩터링 |
| **번들 사이즈** | Radix UI 의존성 추가 (~50KB gzip) |
| **학습 비용** | 팀이 shadcn/ui 패턴에 익숙해지는 시간 필요 |

### 권장 전략: **선택적 도입 (Incremental Adoption)**

```
Phase 1 (즉시):
  - shadcn/ui 전체 설치 안 함
  - Button, Badge, Input, Tooltip 4개 컴포넌트만 직접 구현 (CVA 패턴 차용)
  - shadcn/ui 소스에서 패턴만 참고

Phase 2 (리디자인 진행 중):
  - Dialog(Modal), Select, DropdownMenu는 Radix UI 직접 설치
  - shadcn/ui가 Tailwind CSS 4 stable 지원 시 전환 검토

Phase 3 (안정화 후):
  - shadcn/ui CLI로 컴포넌트 추가 가능
  - 단, CSS 변수 이름 충돌은 반드시 네이밍 컨벤션으로 해결
```

**CSS 변수 충돌 해결 방안**:
```css
/* shadcn/ui는 --background 사용 → dashboard-LAB은 --color-bg-page로 재정의 */
/* shadcn/ui 컴포넌트 임포트 시 CSS override 레이어로 격리 */
@layer shadcn-overrides {
  :root {
    --background: var(--color-bg-page);
    --foreground: var(--color-text-primary);
    --card: var(--color-bg-card);
    --border: var(--color-border-base);
    --input: var(--color-border-base);
    --ring: var(--color-border-focus);
  }
}
```

---

## 5. 21st.dev 컴포넌트 영감 수집 결과

### 5.1 Dark Grid Card (참고: 21st.dev)

**핵심 인사이트**: 호버 시 코너 마커(`2×2px 흰 사각형`) + 내부 glow 효과
```tsx
// 강조 카드에 적용 가능
<div className="group relative ...">
  {/* 코너 마커 — hover 시만 노출 */}
  <div className="pointer-events-none absolute inset-0 hidden group-hover:block">
    <div className="absolute -left-[2px] -top-[2px] h-2 w-2 bg-white/60" />
    <div className="absolute -right-[2px] -top-[2px] h-2 w-2 bg-white/60" />
    <div className="absolute -left-[2px] -bottom-[2px] h-2 w-2 bg-white/60" />
    <div className="absolute -right-[2px] -bottom-[2px] h-2 w-2 bg-white/60" />
  </div>

  {/* Inner glow */}
  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent" />
  </div>
</div>
```

→ **적용 대상**: Home 탭의 Tool Card, Agent Card 강조 hover 효과

### 5.2 Button CVA Pattern (참고: 21st.dev)

```tsx
// class-variance-authority 기반
const buttonVariants = cva(
  // base
  "cursor-pointer inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-hidden",
  {
    variants: {
      variant: {
        primary:   "bg-white text-black shadow-xs shadow-black/5 hover:bg-white/90",
        secondary: "bg-white/8 text-white/80 border border-white/10 hover:bg-white/12",
        ghost:     "text-white/60 hover:bg-white/6 hover:text-white/80",
        outline:   "border border-white/18 text-white/80 hover:border-white/30",
        destructive: "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25",
      },
      size: {
        sm:   "h-7 rounded-md px-2.5 text-xs gap-1.5",
        md:   "h-8 rounded-md px-3 gap-1.5",
        lg:   "h-10 rounded-lg px-4 gap-2",
        icon: "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
)
```

→ **적용 대상**: 전체 버튼 통일 (`src/components/ui/Button.tsx` 신규 생성 시)

### 5.3 Status Badge Pattern

**인사이트**: pill 형태 + dot indicator + muted 배경 조합이 가독성 최적
```tsx
// 현재 ToolCard 패턴을 Badge 컴포넌트로 추상화
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
  {
    variants: {
      variant: {
        success:  "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        warning:  "border-amber-500/30   bg-amber-500/15   text-amber-300",
        error:    "border-red-500/30     bg-red-500/15     text-red-300",
        info:     "border-blue-500/30   bg-blue-500/15    text-blue-300",
        neutral:  "border-white/12      bg-white/6        text-white/60",
        claude:   "border-purple-500/30 bg-purple-500/15  text-purple-300",
        codex:    "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        gemini:   "border-blue-500/30   bg-blue-500/15    text-blue-300",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
)
```

---

## 6. 개선된 globals.css 전체 개선안

```css
@import "tailwindcss";

/* ─────────────────────────────────────────────
   Design Tokens — dashboard-LAB
   ───────────────────────────────────────────── */
:root {
  /* Surface */
  --color-bg-base:        #0a0a0a;
  --color-bg-page:        #0f0f0f;
  --color-bg-surface:     #161616;
  --color-bg-card:        #1e1e1e;
  --color-bg-card-hover:  #242424;
  --color-bg-overlay:     #2a2a2a;
  --color-bg-elevated:    #303030;

  /* Text */
  --color-text-primary:   #f0f0f0;
  --color-text-secondary: #c1c9d6;
  --color-text-muted:     #8f98ab;
  --color-text-disabled:  #4a5568;

  /* Border */
  --color-border-subtle:  rgba(255,255,255,0.06);
  --color-border-base:    rgba(255,255,255,0.10);
  --color-border-hover:   rgba(255,255,255,0.18);
  --color-border-focus:   rgba(255,255,255,0.35);

  /* Accent */
  --color-accent-claude:  #c084fc;
  --color-accent-codex:   #34d399;
  --color-accent-gemini:  #60a5fa;

  /* Status */
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-error:   #f87171;
  --color-info:    #60a5fa;

  /* Radius */
  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  /* Transition */
  --transition-fast:   100ms ease;
  --transition-base:   150ms ease;
  --transition-slow:   250ms ease;
  --transition-layout: 300ms ease;
}

/* ─────────────────────────────────────────────
   Tailwind CSS 4 @theme 등록
   ───────────────────────────────────────────── */
@theme inline {
  --color-background:       var(--color-bg-page);
  --color-foreground:       var(--color-text-primary);
  --color-bg-card:          var(--color-bg-card);
  --color-bg-surface:       var(--color-bg-surface);
  --color-text-muted:       var(--color-text-muted);
  --color-border-base:      var(--color-border-base);
  --color-accent-claude:    var(--color-accent-claude);
  --color-accent-codex:     var(--color-accent-codex);
  --color-accent-gemini:    var(--color-accent-gemini);
  --color-success:          var(--color-success);
  --color-warning:          var(--color-warning);
  --color-error:            var(--color-error);

  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), 'JetBrains Mono', monospace;
}

/* ─────────────────────────────────────────────
   Base Reset
   ───────────────────────────────────────────── */
* { box-sizing: border-box; }
html { color-scheme: dark; }

body {
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.01), transparent 18%),
    var(--color-bg-page);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  text-rendering: optimizeLegibility;
}

a { color: inherit; text-decoration: none; }

/* ─────────────────────────────────────────────
   Utility Classes
   ───────────────────────────────────────────── */
.panel {
  border: 1px solid var(--color-border-subtle);
  background: rgba(30,30,30,0.7);
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
}
```

---

## 7. 구현 우선순위 (Phase 제안)

| Phase | 작업 | 영향 범위 |
|-------|------|-----------|
| **P1** | globals.css CSS 변수 정리 + @theme 확장 | 전역 |
| **P1** | `Badge` 컴포넌트 통합 (`src/components/ui/Badge.tsx`) | 모든 상태 표시 |
| **P2** | `Button` CVA 컴포넌트 신규 생성 | 모든 액션 |
| **P2** | `Card` 컴포넌트 추상화 (현재 인라인 클래스 통합) | Home/모든 탭 |
| **P3** | 사이드바 레이아웃 전환 (TabNav → Sidebar) | 전체 레이아웃 |
| **P3** | `Input`, `Modal` 스타일 통일 | CS Helper, Meeting Hub |
| **P4** | `Table` 컴포넌트 (Meeting Hub, Info Hub) | 데이터 표시 |

---

*이 문서는 Task #1 (트렌드 리서치) + Task #2 (UX 분석) 완료 후 업데이트 예정*
