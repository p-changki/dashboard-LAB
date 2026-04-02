import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";

export function getHomeCopy(locale: AppLocale) {
  return pickLocale(locale, {
    ko: {
      pinnedTitle: "즐겨찾기",
      pinnedDescription: "자주 쓰는 항목을 한 번에 열거나 복사합니다.",
      pinnedCount: (count: number) => `${count}개`,
      removePinned: "즐겨찾기 해제",
      emptyStateLabel: "비어 있음",
      loadingOverview: "홈 요약 데이터를 불러오는 중입니다.",
      failedOverview: "홈 요약 데이터를 불러오지 못했습니다.",
      pulse: {
        eyebrow: "Workspace Pulse",
        title: "지금 기준선을 빠르게 훑는 홈 요약",
        description: (readyTools: number, totalTools: number, todayCount: number, skillCount: number) =>
          `연결된 CLI ${readyTools}/${totalTools}, 오늘 작업 ${todayCount}건, 핵심 스킬 ${skillCount}개를 기준으로 지금 상태를 먼저 확인합니다.`,
        readyTools: (readyTools: number, totalTools: number) => `도구 ${readyTools}/${totalTools} 준비`,
        todayWork: (count: number) => `오늘 작업 ${count}건`,
        skills: (count: number) => `핵심 스킬 ${count}개`,
        modeTitle: "현재 보기",
        advancedMode: "전체 모드",
        coreMode: "간단 모드",
        advancedHint: "에이전트, 팀, MCP, 정책 요약까지 한 화면에서 이어서 확인합니다.",
        coreHint: "오늘 작업과 핵심 스킬부터 보고 필요한 흐름만 순서대로 여는 구조입니다.",
      },
      stats: {
        agents: "에이전트",
        teams: "팀",
        claudeSkills: "Claude 스킬",
        codexSkills: "Codex 스킬",
      },
      quickCommand: {
        label: "Codex 실행",
        description: "Codex CLI 출력을 파일로 저장하는 빠른 실행 템플릿",
      },
      flowTitle: "이 워크스페이스에서 자주 하는 흐름",
      flowDescription:
        "이 앱은 녹음 도구 하나를 위한 프로젝트가 아니라, 로컬 AI CLI를 통해 프로젝트 문맥을 읽고 문서 초안, 고객 대응, 뉴스 확인, 후속 작업 정리까지 이어서 처리하는 개인 워크스페이스입니다.",
      advancedTracks: [
        {
          label: "프로젝트 기준선",
          title: "Projects와 Doc Hub로 현재 상태를 먼저 파악",
          description: "내 프로젝트 목록, 핵심 문서, 변경 흐름을 먼저 보고 작업 기준선을 맞춥니다.",
        },
        {
          label: "실행 보조",
          title: "CS Helper, AI Skills, Call → PRD로 초안을 만든 뒤 다듬기",
          description: "응답 초안, 반복 작업, 회의/이슈 문서화를 같은 워크스페이스 안에서 이어서 처리합니다.",
        },
        {
          label: "운영/확장",
          title: "필요할 때만 고급 도구 열기",
          description: "에이전트, MCP, 빠른 명령어, 시스템 도구는 익숙해진 뒤 전체 모드에서 사용하는 흐름이 자연스럽습니다.",
        },
      ],
      coreTracks: [
        {
          label: "1단계",
          title: "Projects로 내 작업 대상부터 확인",
          description: "지금 다루는 프로젝트와 문서가 무엇인지 먼저 파악합니다.",
        },
        {
          label: "2단계",
          title: "CS Helper 또는 Doc Hub로 초안과 문맥 정리",
          description: "고객 응답, 내부 공유, 문서 확인처럼 바로 써먹는 작업부터 시작합니다.",
        },
        {
          label: "3단계",
          title: "Info Hub와 Call → PRD는 필요할 때 추가",
          description: "매일 업데이트와 긴 문서화 작업은 핵심 흐름이 잡힌 뒤에 붙이면 됩니다.",
        },
      ],
      coreModeMessage:
        "간단 모드에서는 오늘 작업과 핵심 스킬만 먼저 보여줍니다. 에이전트, 팀, 빠른 명령어, MCP, 정책 요약은 전체 모드에서 확인할 수 있습니다.",
      todayWorkTitle: "오늘 작업",
      todayWorkPanelTitle: "최신 작업 10건",
      todayWorkPanelDescription:
        "오늘 진행한 `Call → PRD`, `CS Helper`, `AI Skills` 작업을 최신순으로 보여줍니다.",
      todayWorkCount: (count: number) => `${count}건`,
      noTodayWork: "오늘 기록된 작업이 없습니다.",
      sections: {
        agentsEyebrow: "Claude 에이전트",
        agentsTitle: "전문 에이전트 목록",
        teamsEyebrow: "Claude 팀",
        teamsTitle: "팀 커맨드 프리셋",
        commandsEyebrow: "빠른 명령어",
        commandsTitle: "바로 복사할 수 있는 바로가기",
        skillsEyebrow: "스킬",
        skillsTitle: "Claude / Codex 스킬",
        mcpEyebrow: "MCP 서버",
        mcpTitle: "연결된 연동 정보",
        summaryEyebrow: "요약 문서",
        summaryTitle: "Codex / Gemini 정책",
        claudeSkillListTitle: "Claude 스킬 + 커맨드",
        claudeSkillPlaceholder: "Claude 스킬이나 커맨드 검색",
        codexSkillListTitle: "Codex 스킬",
        codexSkillPlaceholder: "Codex 스킬 검색",
        codexRoleSummary: "Codex Role 요약",
        geminiPolicy: "Gemini 정책",
      },
      noRoleFile: "ROLE.md가 없습니다",
      noGeminiPolicy: "GEMINI.md가 없습니다",
      noAgents: "에이전트가 없습니다",
      noTeams: "팀이 없습니다",
      noMcp: "MCP 서버가 없습니다",
      noSettings: "설정 없음",
      tool: {
        connected: "연결됨",
        unavailable: "감지 실패",
        configPath: "설정 경로",
        unavailableHint: "버전 확인 또는 설정 경로 감지에 실패했습니다.",
      },
      memberCount: (count: number) => `${count}명`,
      itemCount: (count: number) => `${count}개`,
      documentsCount: (count: number) => `${count}개 문서`,
      status: {
        queued: "대기 중",
        running: "실행 중",
        completed: "완료",
        failed: "실패",
      },
    },
    en: {
      pinnedTitle: "Pinned",
      pinnedDescription: "Open or copy the items you use most often.",
      pinnedCount: (count: number) => `${count}`,
      removePinned: "Remove from pinned",
      emptyStateLabel: "Empty",
      loadingOverview: "Loading the home overview.",
      failedOverview: "Failed to load the home overview.",
      pulse: {
        eyebrow: "Workspace Pulse",
        title: "A quick baseline for the workspace right now",
        description: (readyTools: number, totalTools: number, todayCount: number, skillCount: number) =>
          `Start with ${readyTools}/${totalTools} connected CLI tools, ${todayCount} items from today, and ${skillCount} core skills already available in this workspace.`,
        readyTools: (readyTools: number, totalTools: number) => `${readyTools}/${totalTools} tools ready`,
        todayWork: (count: number) => `${count} items today`,
        skills: (count: number) => `${count} core skills`,
        modeTitle: "Current view",
        advancedMode: "Advanced mode",
        coreMode: "Core mode",
        advancedHint: "Review agents, teams, MCP, and policy summaries in the same workspace flow.",
        coreHint: "Start from today's work and essential skills, then open only the flows you need.",
      },
      stats: {
        agents: "Agents",
        teams: "Teams",
        claudeSkills: "Claude skills",
        codexSkills: "Codex skills",
      },
      quickCommand: {
        label: "Run Codex",
        description: "Quick template for saving Codex CLI output to a file",
      },
      flowTitle: "Common flows in this workspace",
      flowDescription:
        "This app is not just a recorder. It is a personal workspace that reads project context through local AI CLI tools and carries work through drafting, customer replies, news review, and follow-up organization.",
      advancedTracks: [
        {
          label: "Project baseline",
          title: "Start with Projects and Doc Hub",
          description: "Review your local projects, core docs, and recent changes before you act.",
        },
        {
          label: "Execution assist",
          title: "Draft with CS Helper, AI Skills, and Call → PRD",
          description: "Keep response drafts, repeatable tasks, and meeting or issue docs in one workspace.",
        },
        {
          label: "Operations and extensions",
          title: "Open advanced tools only when needed",
          description: "Agents, MCP, quick commands, and system tools fit best after you are comfortable with the core flow.",
        },
      ],
      coreTracks: [
        {
          label: "Step 1",
          title: "Use Projects to confirm what you are working on",
          description: "Start by checking the project and documents you are actively working with.",
        },
        {
          label: "Step 2",
          title: "Use CS Helper or Doc Hub to shape context and drafts",
          description: "Start with immediately useful tasks like replies, internal notes, or document lookup.",
        },
        {
          label: "Step 3",
          title: "Add Info Hub or Call → PRD when needed",
          description: "Daily updates and longer-form documentation fit best after the core workflow is in place.",
        },
      ],
      coreModeMessage:
        "Core mode shows today's work and the essential skill section first. Agents, teams, quick commands, MCP, and policy summaries stay in advanced mode.",
      todayWorkTitle: "Today's work",
      todayWorkPanelTitle: "Latest 10 items",
      todayWorkPanelDescription:
        "Shows the latest `Call → PRD`, `CS Helper`, and `AI Skills` work completed today.",
      todayWorkCount: (count: number) => `${count} items`,
      noTodayWork: "No work has been recorded today.",
      sections: {
        agentsEyebrow: "Claude agents",
        agentsTitle: "Specialized agent list",
        teamsEyebrow: "Claude teams",
        teamsTitle: "Team command presets",
        commandsEyebrow: "Quick commands",
        commandsTitle: "Shortcuts you can copy right away",
        skillsEyebrow: "Skills",
        skillsTitle: "Claude / Codex skills",
        mcpEyebrow: "MCP servers",
        mcpTitle: "Connected integrations",
        summaryEyebrow: "Reference docs",
        summaryTitle: "Codex / Gemini policies",
        claudeSkillListTitle: "Claude skills + commands",
        claudeSkillPlaceholder: "Search Claude skills or commands",
        codexSkillListTitle: "Codex skills",
        codexSkillPlaceholder: "Search Codex skills",
        codexRoleSummary: "Codex role summary",
        geminiPolicy: "Gemini policy",
      },
      noRoleFile: "ROLE.md is missing",
      noGeminiPolicy: "GEMINI.md is missing",
      noAgents: "No agents found.",
      noTeams: "No teams found.",
      noMcp: "No MCP servers found.",
      noSettings: "No matches found.",
      tool: {
        connected: "Connected",
        unavailable: "Check failed",
        configPath: "Config path",
        unavailableHint: "Version lookup or config-path detection failed.",
      },
      memberCount: (count: number) => `${count} members`,
      itemCount: (count: number) => `${count} items`,
      documentsCount: (count: number) => `${count} docs`,
      status: {
        queued: "Queued",
        running: "Running",
        completed: "Completed",
        failed: "Failed",
      },
    },
  });
}

export function formatHomeTime(locale: AppLocale, value: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatTodayWorkSummary(locale: AppLocale, summary: string) {
  if (locale === "ko") {
    return summary;
  }

  return summary.replace(/(\d+)개 문서/g, "$1 docs");
}
