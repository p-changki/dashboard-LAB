import type { DashboardTabId } from "@/components/layout/TabNav";
import { pickLocale, type AppLocale } from "@/lib/locale";

export const DASHBOARD_TAB_ORDER: DashboardTabId[] = [
  "home",
  "aiskills",
  "cshelper",
  "projects",
  "dochub",
  "meetinghub",
  "filemanager",
  "system",
  "infohub",
  "signalwriter",
  "calltoprd",
];

type DashboardTabMeta = { title: string; description: string };

export interface DashboardGuide {
  badge: string;
  summary: string;
  features: string[];
  quickSteps: string[];
  useWhen: string[];
  caution: string[];
}

const LOCALIZED_TAB_META: Record<AppLocale, Record<DashboardTabId, DashboardTabMeta>> = {
  ko: {
    home: {
      title: "홈",
      description: "CLI 도구, 에이전트, 팀, 스킬을 한 화면에서 확인합니다.",
    },
    aiskills: {
      title: "AI Skills",
      description: "Claude와 Codex 스킬을 대시보드에서 직접 실행합니다.",
    },
    cshelper: {
      title: "CS Helper",
      description: "프로젝트 컨텍스트를 바탕으로 고객 응답을 빠르게 생성합니다.",
    },
    projects: {
      title: "프로젝트",
      description: "로컬 프로젝트 상태와 정리 가능한 데이터를 관리합니다.",
    },
    dochub: {
      title: "문서 허브",
      description: "Desktop 프로젝트 문서를 통합 열람합니다.",
    },
    meetinghub: {
      title: "Meeting Hub",
      description: "팀, 회의, 액션 아이템을 로컬 파일 중심으로 관리합니다.",
    },
    filemanager: {
      title: "파일 매니저",
      description: "Desktop과 Downloads 정리 제안을 검토합니다.",
    },
    system: {
      title: "시스템",
      description: "시스템 정보, 프로세스, 앱 실행을 제어합니다.",
    },
    infohub: {
      title: "Info Hub",
      description: "개발 뉴스, 트렌딩 저장소, 패키지 업데이트와 보안 알림을 모아 봅니다.",
    },
    signalwriter: {
      title: "Signal Writer",
      description: "오늘 기사에서 소셜 초안을 바로 만드는 글쓰기 탭입니다.",
    },
    calltoprd: {
      title: "Call → PRD",
      description: "고객 불만, 회의 메모, 통화 기록을 분석하여 PRD와 실무 문서를 자동 생성합니다.",
    },
  },
  en: {
    home: {
      title: "Home",
      description: "Check CLI tools, agents, teams, and skills from one screen.",
    },
    aiskills: {
      title: "AI Skills",
      description: "Run Claude and Codex skill workflows directly from the dashboard.",
    },
    cshelper: {
      title: "CS Helper",
      description: "Generate customer-facing replies quickly with project context.",
    },
    projects: {
      title: "Projects",
      description: "Inspect local project status and cleanup opportunities.",
    },
    dochub: {
      title: "Doc Hub",
      description: "Read project docs from your Desktop workspace in one place.",
    },
    meetinghub: {
      title: "Meeting Hub",
      description: "Manage teams, meetings, and action items around local files.",
    },
    filemanager: {
      title: "File Manager",
      description: "Review cleanup suggestions for Desktop and Downloads.",
    },
    system: {
      title: "System",
      description: "Inspect system info, processes, and app launch shortcuts.",
    },
    infohub: {
      title: "Info Hub",
      description: "Follow dev news, trending repos, package updates, and security signals.",
    },
    signalwriter: {
      title: "Signal Writer",
      description: "Turn today's signals into social-ready drafts from one writing flow.",
    },
    calltoprd: {
      title: "Call → PRD",
      description: "Turn complaints, meeting notes, and call records into PRDs and work docs.",
    },
  },
};

const LOCALIZED_GUIDES: Record<AppLocale, Record<DashboardTabId, DashboardGuide>> = {
  ko: {
    home: {
      badge: "대시보드 개요",
      summary:
        "로컬 환경의 AI 도구, 에이전트, 팀, 스킬, MCP 연결 상태를 한 화면에서 훑는 시작점입니다.",
      features: [
        "Claude, Codex, Gemini CLI 설치 여부와 버전을 한 번에 확인합니다.",
        "Claude 에이전트, 팀 프리셋, 커맨드, Codex 스킬을 빠르게 탐색합니다.",
        "자주 쓰는 즐겨찾기와 빠른 명령어를 복사해 바로 실행할 수 있습니다.",
        "MCP 서버와 요약 문서를 같이 보여줘 현재 작업 환경을 이해하기 쉽습니다.",
      ],
      quickSteps: [
        "상단 상태 카드에서 도구 설치 상태를 먼저 확인합니다.",
        "필요한 에이전트나 스킬이 있으면 해당 섹션을 열어 검색합니다.",
        "빠른 명령어에서 바로 복사할 커맨드를 찾고 실제 작업으로 넘어갑니다.",
      ],
      useWhen: [
        "앱을 처음 열었을 때 전체 환경 상태를 훑고 싶을 때",
        "어떤 스킬이나 커맨드를 써야 할지 빠르게 찾고 싶을 때",
        "MCP 연결 상태와 정책 문서를 동시에 보고 싶을 때",
      ],
      caution: [
        "실제 작업 실행 화면이 아니라 탐색과 진입점 역할에 가깝습니다.",
        "상태는 대시보드용 요약이므로 완전한 운영 모니터링 화면은 아닙니다.",
      ],
    },
    aiskills: {
      badge: "자동화 실행",
      summary:
        "반복 작업 프롬프트를 템플릿 형태로 실행하고, 실행 이력과 결과를 관리하는 탭입니다.",
      features: [
        "Claude/Codex 기반 스킬 템플릿을 검색하고 선택할 수 있습니다.",
        "입력 폼으로 URL, 디렉터리, 자유 프롬프트 등을 넣어 바로 실행합니다.",
        "실행 중인 작업 상태와 결과 이력을 한 화면에서 확인합니다.",
        "완료된 결과를 다시 열어보고 실패한 작업은 오류를 확인할 수 있습니다.",
      ],
      quickSteps: [
        "검색창에서 필요한 스킬을 찾고 선택합니다.",
        "입력 필드를 채운 뒤 실행 버튼으로 작업을 시작합니다.",
        "하단 이력에서 진행 상태와 출력 결과를 확인합니다.",
      ],
      useWhen: [
        "유튜브 요약, 웹 문서 변환, 코드 리뷰처럼 반복되는 AI 작업을 돌릴 때",
        "같은 프롬프트를 매번 수동으로 입력하기 번거로울 때",
        "결과 로그를 남기면서 작업을 실행하고 싶을 때",
      ],
      caution: [
        "스킬마다 runner와 요구 입력값이 다르므로 폼 설명을 먼저 보는 편이 안전합니다.",
        "결과 품질은 각 스킬 프롬프트와 연결된 CLI 상태에 영향을 받습니다.",
      ],
    },
    cshelper: {
      badge: "고객 응답 작성",
      summary:
        "프로젝트 문맥을 기준으로 고객 메시지 답변과 내부 분석을 빠르게 만드는 실무용 탭입니다.",
      features: [
        "프로젝트, 채널, 톤을 선택해 응답 톤앤매너를 맞춥니다.",
        "고객 메시지와 추가 맥락을 넣으면 응답과 내부 분석을 함께 생성합니다.",
        "히스토리에서 이전 응답을 다시 열고 같은 문맥으로 재생성할 수 있습니다.",
        "빠른 응답 프리셋으로 자주 오는 문의를 더 빠르게 처리할 수 있습니다.",
      ],
      quickSteps: [
        "프로젝트와 채널, 톤을 먼저 고릅니다.",
        "고객 메시지와 필요한 추가 맥락을 입력합니다.",
        "응답 생성 후 답변 탭과 내부 분석 탭을 같이 확인합니다.",
        "필요하면 히스토리에서 복원해 다시 다듬습니다.",
      ],
      useWhen: [
        "고객 문의 답변 초안을 빠르게 만들어야 할 때",
        "프로젝트별 정책과 문맥을 반영한 응답이 필요할 때",
        "운영팀 내부 검토용 분석 메모도 같이 남기고 싶을 때",
      ],
      caution: [
        "외부 발송 전에는 민감한 표현과 사실관계를 한 번 더 검토해야 합니다.",
        "프로젝트 선택이 잘못되면 엉뚱한 문맥이 들어갈 수 있습니다.",
      ],
    },
    projects: {
      badge: "로컬 프로젝트 현황",
      summary:
        "Desktop 아래 로컬 프로젝트를 스캔해 기술 스택, git 상태, 용량, 정리 포인트를 보여주는 탭입니다.",
      features: [
        "프로젝트 그리드에서 타입, 기술 스택, git 여부, 최근 수정 시점을 봅니다.",
        "Node Modules 정리 도구로 공간 절약 후보를 확인합니다.",
        "Git Overview, Timeline, Port Usage, Env Map 같은 진단 섹션을 필요할 때만 엽니다.",
        "프로젝트 경로와 상태를 기준으로 다른 탭의 작업 기준선을 잡기 좋습니다.",
      ],
      quickSteps: [
        "프로젝트 목록에서 현재 다루는 리포지토리를 찾습니다.",
        "필요하면 Git Overview나 Timeline 섹션을 열어 상태를 자세히 봅니다.",
        "용량이나 정리 이슈가 있으면 Node Modules 정리 도구를 사용합니다.",
      ],
      useWhen: [
        "내 로컬에 어떤 프로젝트가 있고 상태가 어떤지 파악할 때",
        "최근 커밋, 브랜치, 디스크 사용량을 함께 보고 싶을 때",
        "Call → PRD나 CS Helper에 연결할 프로젝트를 고를 때",
      ],
      caution: [
        "기본은 현황판이고, 실제 코드 편집이나 빌드 실행 화면은 아닙니다.",
        "확장 진단 섹션은 필요할 때만 여는 편이 체감 성능상 유리합니다.",
      ],
    },
    dochub: {
      badge: "프로젝트 문서 열람",
      summary:
        "각 프로젝트 안의 운영 문서, AI 규칙 문서, docs 마크다운을 한 곳에서 검색하고 읽는 탭입니다.",
      features: [
        "CLAUDE.md, AGENTS.md, GEMINI.md, .claude/rules, docs/*.md를 모아 보여줍니다.",
        "프로젝트 단위로 문서를 검색하고 파일명을 기준으로 빠르게 찾을 수 있습니다.",
        "문서를 열면 바로 본문을 확인해 규칙이나 참고 문서를 복기할 수 있습니다.",
        "프로젝트별 규칙 문서를 중앙에서 훑는 레퍼런스 뷰어 역할을 합니다.",
      ],
      quickSteps: [
        "검색창에서 프로젝트명이나 파일명을 입력합니다.",
        "목록에서 필요한 문서를 선택해 내용을 엽니다.",
        "다른 탭 작업 전에 정책이나 참고 문서를 빠르게 확인합니다.",
      ],
      useWhen: [
        "프로젝트별 AI 규칙 문서와 운영 문서를 한 번에 찾고 싶을 때",
        "작업 전에 CLAUDE/AGENTS/GEMINI 문서를 복기할 때",
        "docs 폴더의 마크다운을 빠르게 열어 참고할 때",
      ],
      caution: [
        "문서 작성기가 아니라 열람/검색 중심 탭입니다.",
        "프로젝트 외부 경로의 임의 문서를 여는 범용 파일 브라우저는 아닙니다.",
      ],
    },
    meetinghub: {
      badge: "회의 운영 허브",
      summary:
        "회의 메모를 팀의 실행 기억으로 바꾸는 로컬 운영 탭입니다. 팀, 회의, 액션 아이템, GitHub 브리지 준비를 한곳에서 다룹니다.",
      features: [
        "팀 정보와 연결 프로젝트, 기본 GitHub 저장소를 함께 관리합니다.",
        "회의 메모를 저장하면 Markdown, JSON, raw text 파일을 로컬에 남깁니다.",
        "`Action:`과 `Decision:` 접두어를 사용해 액션 아이템과 결정 사항을 구조적으로 정리할 수 있습니다.",
        "추출된 액션 아이템을 이후 GitHub Issue 브리지로 연결할 준비를 합니다.",
      ],
      quickSteps: [
        "먼저 팀을 만들고 연결 프로젝트와 저장소를 정합니다.",
        "회의 제목, 참석자, 메모를 입력해 로컬 아티팩트를 생성합니다.",
        "Overview와 Actions에서 최근 회의와 열린 액션 아이템을 확인합니다.",
      ],
      useWhen: [
        "팀 회의 내용을 실행 가능한 문서와 액션으로 남기고 싶을 때",
        "회의 결과를 로컬 파일로 관리하고 싶을 때",
        "이후 PRD나 GitHub 이슈 생성으로 이어질 기준 문서가 필요할 때",
      ],
      caution: [
        "초기 버전은 GitHub UI 전체를 재현하지 않고 이슈 브리지 중심으로 확장할 예정입니다.",
        "회의 메모 구조가 명확할수록 액션과 결정 추출 품질이 좋아집니다.",
      ],
    },
    filemanager: {
      badge: "파일 정리 추천",
      summary:
        "Desktop과 Downloads를 스캔해 이동, 삭제, 검토가 필요한 파일을 추천해 주는 정리 보조 탭입니다.",
      features: [
        "Desktop과 Downloads를 나눠 보고 카테고리별 통계를 확인합니다.",
        "중복 파일, 설치 파일, 오래된 파일, 이미지/PDF 같은 정리 후보를 추천합니다.",
        "자동 정리 규칙과 제안 그룹을 함께 보여줘 빠르게 정리할 수 있습니다.",
        "액션, 긴급도, 카테고리 필터로 필요한 정리 대상만 좁힐 수 있습니다.",
      ],
      quickSteps: [
        "Desktop 또는 Downloads 중 정리할 소스를 먼저 고릅니다.",
        "액션/긴급도/카테고리 필터로 후보를 좁힙니다.",
        "높음 우선순위부터 보고 실제 정리 액션을 결정합니다.",
      ],
      useWhen: [
        "Downloads가 너무 지저분해서 우선순위부터 정리하고 싶을 때",
        "설치 파일, 중복 다운로드, 오래된 파일을 빠르게 추릴 때",
        "데스크탑에 쌓인 이미지/PDF/문서를 정리할 때",
      ],
      caution: [
        "범용 Finder 대체가 아니라 정리 추천 도구에 가깝습니다.",
        "추천은 자동 규칙 기반이므로 삭제 전에는 한 번 더 확인하는 편이 안전합니다.",
      ],
    },
    system: {
      badge: "로컬 시스템 상태",
      summary:
        "CPU, 메모리, 디스크, 프로세스, 앱 상태를 대시보드식으로 확인하는 운영 보조 탭입니다.",
      features: [
        "Overview에서 CPU, 메모리, 디스크, OS, uptime 같은 요약 수치를 봅니다.",
        "Processes에서 현재 돌아가는 주요 프로세스를 확인할 수 있습니다.",
        "필요할 때만 File Actions와 App Launcher 데이터를 불러오도록 최적화돼 있습니다.",
        "개발 포트와 로컬 실행 상태를 함께 보며 작업 환경 이상 여부를 점검합니다.",
      ],
      quickSteps: [
        "Overview에서 자원 사용량과 로컬 포트 상태를 먼저 확인합니다.",
        "이상해 보이면 Processes 탭으로 이동해 관련 프로세스를 봅니다.",
        "필요할 때만 파일 액션이나 앱 실행 기능을 사용합니다.",
      ],
      useWhen: [
        "로컬 환경이 느리거나 포트 충돌이 의심될 때",
        "개발 서버가 실제로 떠 있는지 간단히 점검할 때",
        "시스템 상태를 대시보드에서 한 번에 보고 싶을 때",
      ],
      caution: [
        "실시간 모니터링 툴 수준은 아니고 대시보드용 스냅샷에 가깝습니다.",
        "정밀 분석이 필요하면 Activity Monitor나 터미널 명령이 더 정확할 수 있습니다.",
      ],
    },
    infohub: {
      badge: "개발 정보 수집",
      summary:
        "개발 뉴스, GitHub/npm 트렌드, 내 패키지 업데이트, 보안 이슈를 하루 주기로 모아 보는 리서치 탭입니다.",
      features: [
        "카테고리별 개발 뉴스 피드를 검색하고 페이지네이션으로 볼 수 있습니다.",
        "GitHub Trending과 npm 트렌드를 함께 보여줘 최신 흐름을 빠르게 파악합니다.",
        "현재 프로젝트 의존성 업데이트와 보안 감사 결과를 같이 확인합니다.",
        "기본은 하루 캐시를 쓰고, 필요할 때만 새로고침으로 강제 갱신합니다.",
      ],
      quickSteps: [
        "카테고리 필터나 검색어로 관심 주제를 좁힙니다.",
        "상단 트렌드와 패키지 업데이트를 먼저 보고, 아래 기사 목록을 확인합니다.",
        "진짜 최신값이 필요하면 새로고침 버튼으로 강제 갱신합니다.",
      ],
      useWhen: [
        "개발 트렌드와 내 프로젝트 업데이트를 한 번에 보고 싶을 때",
        "패키지 업데이트나 보안 이슈를 빠르게 점검할 때",
        "하루 한 번 정도 요약된 정보만 훑고 싶을 때",
      ],
      caution: [
        "실시간 뉴스 피드보다 일일 브리핑 성격이 강합니다.",
        "캐시를 쓰므로 매 클릭마다 최신 데이터를 다시 받아오지는 않습니다.",
      ],
    },
    signalwriter: {
      badge: "소셜 초안 작성",
      summary:
        "오늘 의미 있는 기사 4~5개를 추려서, 선택한 신호 하나를 Threads, X, LinkedIn용 초안으로 바꾸는 글쓰기 탭입니다.",
      features: [
        "Info Hub 피드에서 지금 글로 풀기 좋은 신호만 카드 형태로 먼저 추립니다.",
        "카드를 하나 선택하면 훅, 메인 포스트, 연속 포스트, 해시태그를 한 번에 생성합니다.",
        "생성 중에는 어떤 단계로 초안을 만들고 있는지 진행 상태를 보여줍니다.",
        "완성된 결과를 바로 복사하고 로컬 파일로 저장해 이후 이력을 남길 수 있습니다.",
      ],
      quickSteps: [
        "첫 화면에서 오늘 쓸 만한 기사 카드를 1개 고릅니다.",
        "게시할 채널과 생성 모드를 맞춥니다.",
        "생성 버튼을 눌러 초안 작성 단계를 진행합니다.",
        "완료된 메인 포스트나 연속 포스트를 복사해서 소셜에 올립니다.",
      ],
      useWhen: [
        "매일 최신 기술 뉴스를 바탕으로 짧은 관점 글을 올리고 싶을 때",
        "Info Hub에서 본 내용을 바로 소셜 글감으로 연결하고 싶을 때",
        "자동 게시 대신 사람이 검수 가능한 초안 생성 흐름이 필요할 때",
      ],
      caution: [
        "초기 버전은 자동 게시가 아니라 초안 생성과 복사 중심입니다.",
        "계정 톤과 사실관계는 게시 전에 한 번 더 검토하는 편이 안전합니다.",
      ],
    },
    calltoprd: {
      badge: "문서 자동 생성",
      summary:
        "통화 녹음, 직접 입력 텍스트, PDF, 프로젝트 기준 정보를 받아 PRD와 실무 문서를 묶음으로 만드는 핵심 탭입니다.",
      features: [
        "녹음 파일 또는 직접 입력 텍스트로 PRD 생성을 시작할 수 있습니다.",
        "PDF와 로컬 프로젝트 기준 정보를 함께 넣어 더 구체적인 문서를 생성합니다.",
        "프리셋, 템플릿 세트, 기준선 비교, 작업 큐, 저장 문서 관리가 한 화면에 있습니다.",
        "PRD뿐 아니라 미확정 사항, Acceptance Criteria, 유저 플로우, 태스크 분해, 변경요청 Diff 같은 지원 문서도 생성합니다.",
      ],
      quickSteps: [
        "입력 방식과 프로젝트, 고객, 추가 맥락을 정합니다.",
        "필요한 문서 프리셋을 고르고, 변경 요청이면 기준 문서를 선택합니다.",
        "문서 생성 시작 후 진행 상태와 작업 큐를 확인합니다.",
        "완료되면 문서 탭, 저장 문서, 다운로드 버튼으로 결과를 활용합니다.",
      ],
      useWhen: [
        "고객 불만, 회의 메모, 요구사항 메모를 바로 실무 문서로 바꾸고 싶을 때",
        "운영 중 추가 요청을 기존 저장 PRD와 비교해 정리할 때",
        "프로젝트별 기준 문서와 템플릿 세트를 활용해 반복 문서 생성을 할 때",
      ],
      caution: [
        "AI 생성 결과라서 외부 공유 전에는 범위와 표현을 한 번 더 검토하는 편이 안전합니다.",
        "기준선 비교는 현재 저장된 PRD 본문 기준이며, 모든 지원 문서의 정밀 diff는 아직 아닙니다.",
      ],
    },
  },
  en: {
    home: {
      badge: "Dashboard Overview",
      summary:
        "Your starting point for scanning local AI tools, agents, teams, skills, and MCP connectivity from one screen.",
      features: [
        "Check whether Claude, Codex, and Gemini CLIs are installed and which versions are available.",
        "Browse Claude agents, team presets, commands, and Codex skills quickly.",
        "Copy pinned shortcuts and quick commands to jump straight into work.",
        "Review MCP servers alongside summary docs so the current environment is easy to understand.",
      ],
      quickSteps: [
        "Start with the top status cards to confirm tool readiness.",
        "Open the agent or skill sections if you need a specific workflow.",
        "Copy a quick command and move directly into the real task.",
      ],
      useWhen: [
        "You just opened the app and want a quick view of the whole environment.",
        "You want to find the right skill or command fast.",
        "You need MCP connectivity and policy docs in the same place.",
      ],
      caution: [
        "This is mainly a discovery and entry-point screen, not the execution surface itself.",
        "The status cards are summary signals, not a full operations dashboard.",
      ],
    },
    aiskills: {
      badge: "Automation",
      summary:
        "Run repeatable prompt workflows as templates and manage their run history and output.",
      features: [
        "Search and choose Claude- or Codex-based skill templates.",
        "Fill in URLs, directories, and free-form prompts from a single input form.",
        "Track running jobs and output history from one screen.",
        "Reopen finished results and inspect failures when a run does not complete.",
      ],
      quickSteps: [
        "Find the skill you need from search.",
        "Fill in the required inputs and start the run.",
        "Check progress and output in the history section below.",
      ],
      useWhen: [
        "You want repeatable AI jobs for summaries, transformations, or reviews.",
        "Typing the same prompt over and over is slowing you down.",
        "You want logs and outputs kept together for later reference.",
      ],
      caution: [
        "Each skill may need a different runner and different inputs, so read the form first.",
        "Output quality still depends on the prompt template and CLI environment behind the skill.",
      ],
    },
    cshelper: {
      badge: "Customer Reply Drafting",
      summary:
        "A practical workspace for generating customer replies and internal analysis from project context.",
      features: [
        "Choose project, channel, and tone before generation so the answer fits the situation.",
        "Generate customer-facing copy and internal notes from the same input.",
        "Reopen history items and regenerate inside the same context.",
        "Use quick presets for common support situations.",
      ],
      quickSteps: [
        "Pick the project, channel, and tone first.",
        "Paste the customer message and any extra context.",
        "Review both the customer reply and the internal analysis together.",
        "Restore a history item if you want to revise from a previous draft.",
      ],
      useWhen: [
        "You need a fast first draft for a customer reply.",
        "The answer should reflect project-specific rules or context.",
        "You also want an internal analysis note for the team.",
      ],
      caution: [
        "Review sensitive wording and factual details before sending anything externally.",
        "Choosing the wrong project can inject the wrong context into the answer.",
      ],
    },
    projects: {
      badge: "Local Project Status",
      summary:
        "Scan Desktop projects and review stack hints, git status, disk usage, and cleanup opportunities.",
      features: [
        "See project type, tech stack, git state, and recent activity in the grid.",
        "Use the node_modules cleanup tool to spot storage-heavy candidates.",
        "Open Git Overview, Timeline, Port Usage, and Env Map only when needed.",
        "Use project paths and status as the baseline for other tabs.",
      ],
      quickSteps: [
        "Find the repository you care about in the project list.",
        "Open Git Overview or Timeline when you need more context.",
        "Use cleanup tools only if disk usage or old installs are becoming noisy.",
      ],
      useWhen: [
        "You want to understand what local projects exist and what state they are in.",
        "You need commits, branches, and disk usage in one place.",
        "You want to choose the right project to feed into CS Helper or Call → PRD.",
      ],
      caution: [
        "This is a status surface, not a code editor or build console.",
        "The advanced diagnostic sections are best opened only when needed.",
      ],
    },
    dochub: {
      badge: "Project Docs",
      summary:
        "Search and read ops docs, AI rule docs, and project markdown files from one place.",
      features: [
        "Collect CLAUDE.md, AGENTS.md, GEMINI.md, .claude/rules, and docs/*.md in one list.",
        "Search by project and filename to find docs quickly.",
        "Open a doc and read it immediately without leaving the dashboard.",
        "Use it as a central viewer for project-specific rules and references.",
      ],
      quickSteps: [
        "Search by project name or filename.",
        "Select the document you need from the list.",
        "Review it before switching into the task-specific tab.",
      ],
      useWhen: [
        "You want project AI rules and ops docs in one place.",
        "You want to revisit CLAUDE, AGENTS, or GEMINI guidance before working.",
        "You want to open markdown docs in project docs folders quickly.",
      ],
      caution: [
        "This is a reader and search surface, not a document editor.",
        "It is not a general-purpose browser for arbitrary files outside supported project paths.",
      ],
    },
    meetinghub: {
      badge: "Meeting Operations Hub",
      summary:
        "A local operations tab that turns meeting notes into team execution memory. It keeps teams, meetings, action items, and GitHub bridge prep together.",
      features: [
        "Manage team details alongside linked projects and a default GitHub repository.",
        "Saving a meeting writes Markdown, JSON, and raw text artifacts locally.",
        "Use prefixes like `Action:` and `Decision:` to structure action items and decisions.",
        "Prepare extracted action items for the next GitHub issue bridge step.",
      ],
      quickSteps: [
        "Create a team first and connect its projects and repository.",
        "Save a meeting with title, participants, and notes to generate local artifacts.",
        "Review recent meetings and open action items from Overview and Actions.",
      ],
      useWhen: [
        "You want meeting outputs to become execution-ready notes and action items.",
        "You want meeting records stored as local files you control.",
        "You need a baseline doc before turning a meeting into GitHub issues or a PRD.",
      ],
      caution: [
        "The first version is not a full GitHub replacement. It should grow from an issue bridge first.",
        "Clear note structure improves extraction quality for actions and decisions.",
      ],
    },
    filemanager: {
      badge: "Cleanup Suggestions",
      summary:
        "Scan Desktop and Downloads for files worth moving, deleting, or reviewing.",
      features: [
        "Split Desktop and Downloads, then inspect category-level stats.",
        "Spot duplicates, installers, stale files, and heavy images or PDFs.",
        "Review auto-organize rules and grouped suggestions together.",
        "Narrow down candidates by action, urgency, and category filters.",
      ],
      quickSteps: [
        "Choose Desktop or Downloads first.",
        "Use action, urgency, and category filters to narrow the list.",
        "Start with high-priority items before touching the rest.",
      ],
      useWhen: [
        "Downloads has become messy and you want a quick cleanup path.",
        "You want to trim installers, duplicates, or stale files fast.",
        "Your desktop is overloaded with images, PDFs, and scattered docs.",
      ],
      caution: [
        "This is a cleanup assistant, not a full Finder replacement.",
        "Suggestions are rule-based, so review before deleting or moving anything important.",
      ],
    },
    system: {
      badge: "Local System Status",
      summary:
        "Review CPU, memory, disk, processes, and app launch helpers from a dashboard-like view.",
      features: [
        "See CPU, memory, disk, OS, and uptime summary metrics at the top.",
        "Inspect current processes from the Processes section.",
        "Load File Actions and App Launcher data only when needed.",
        "Check local ports and runtime state when your environment feels unstable.",
      ],
      quickSteps: [
        "Start from the overview and local port status.",
        "Move to Processes if something looks wrong.",
        "Use file actions or app launch only when necessary.",
      ],
      useWhen: [
        "Your local setup feels slow or you suspect a port conflict.",
        "You want a quick check that dev servers are actually running.",
        "You want system status in the same workspace as your project tools.",
      ],
      caution: [
        "It is closer to a dashboard snapshot than a full real-time monitoring tool.",
        "For deep inspection, Activity Monitor or terminal commands may still be more precise.",
      ],
    },
    infohub: {
      badge: "Research Feed",
      summary:
        "A daily research tab for dev news, GitHub and npm trends, dependency changes, and security alerts.",
      features: [
        "Browse dev news feeds by category with search and pagination.",
        "See GitHub Trending and npm trends together for fast signal gathering.",
        "Review dependency updates and security audit output for your current projects.",
        "Use daily caching by default and force refresh only when you truly need fresh data.",
      ],
      quickSteps: [
        "Filter by category or search term first.",
        "Check the top trends and package updates before drilling into articles.",
        "Use refresh only when you need the latest data immediately.",
      ],
      useWhen: [
        "You want trends and project updates in one place.",
        "You need a quick package-update or security pass.",
        "You prefer a daily briefing instead of constant feed scrolling.",
      ],
      caution: [
        "It behaves more like a daily briefing than a real-time news feed.",
        "Because caching is used, every click does not fetch brand-new data.",
      ],
    },
    signalwriter: {
      badge: "Social draft writing",
      summary:
        "A writing tab that picks 4-5 meaningful stories for today, then turns one selected signal into a Threads, X, or LinkedIn-ready draft.",
      features: [
        "Start from curated signal cards rather than raw feed noise.",
        "Generate a hook, primary post, series version, and hashtags from one chosen card.",
        "See staged progress instead of a blank loading state while the draft is being prepared.",
        "Copy the final result and keep a local file record of the generated draft.",
      ],
      quickSteps: [
        "Choose one of the daily signal cards.",
        "Pick the publishing channel and draft mode.",
        "Press generate and wait for the staged writing flow to finish.",
        "Copy either the primary post or the series version.",
      ],
      useWhen: [
        "You want to post timely takes about dev and AI news without starting from a blank page.",
        "You want to move directly from Info Hub signals into a social draft.",
        "You want draft generation with manual approval instead of blind auto-posting.",
      ],
      caution: [
        "The first release focuses on draft generation and copy, not direct publishing.",
        "You should still review the tone and factual framing before posting publicly.",
      ],
    },
    calltoprd: {
      badge: "Document Generation",
      summary:
        "The main document workflow for turning calls, typed notes, PDFs, and project context into PRDs and support docs.",
      features: [
        "Start PRD generation from an audio file or from typed notes.",
        "Combine PDFs and project baseline context for more grounded output.",
        "Manage presets, template sets, baselines, queues, and saved docs from one screen.",
        "Generate more than PRDs, including unknowns, acceptance criteria, user flows, task breakdowns, and change-request diffs.",
      ],
      quickSteps: [
        "Choose the input mode, project, customer, and any extra context.",
        "Pick document presets and a baseline doc if this is a change request.",
        "Start generation and monitor progress from the queue.",
        "Use the doc tabs, saved bundles, and downloads once results are ready.",
      ],
      useWhen: [
        "You want to turn complaints, meeting notes, or requirement memos into work-ready docs.",
        "You need to compare new change requests against an existing saved PRD.",
        "You want repeatable document generation with project baselines and template sets.",
      ],
      caution: [
        "AI-generated output should still be reviewed before sharing outside your team.",
        "Baseline comparison currently centers on saved PRD content, not a perfect diff for every support document.",
      ],
    },
  },
};

export function getDashboardTabMeta(locale: AppLocale) {
  return LOCALIZED_TAB_META[locale];
}

export function getDashboardGuides(locale: AppLocale) {
  return LOCALIZED_GUIDES[locale];
}

export function getDashboardGuideSectionLabels(locale: AppLocale) {
  return pickLocale(locale, {
    ko: {
      overview: "요약",
      features: "핵심 기능",
      steps: "사용 순서",
      scenarios: "추천 상황",
    },
    en: {
      overview: "Overview",
      features: "Key Features",
      steps: "Steps",
      scenarios: "Use Cases",
    },
  });
}
