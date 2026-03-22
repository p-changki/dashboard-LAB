import { pickLocale, type AppLocale } from "@/lib/locale";

export type MeetingHubView = "overview" | "teams" | "meetings" | "actions" | "github";
export type MeetingInputMode = "text" | "audio";

type MeetingHubCopyDictionary = {
  ko: {
    eyebrow: string;
    title: string;
    description: string;
    loading: string;
    loadError: string;
    refresh: string;
    simpleMode: string;
    fullMode: string;
    metrics: {
      teams: string;
      meetings: string;
      actions: string;
      repos: string;
    };
    views: Record<MeetingHubView, string>;
    teamForm: {
      title: string;
      name: string;
      description: string;
      members: string;
      membersHint: string;
      projects: string;
      projectsHint: string;
      repository: string;
      repositoryHint: string;
      submit: string;
    };
    meetingForm: {
      title: string;
      team: string;
      titleLabel: string;
      type: string;
      date: string;
      inputMode: string;
      textMode: string;
      audioMode: string;
      participants: string;
      participantsHint: string;
      projects: string;
      repository: string;
      notes: string;
      notesAudio: string;
      notesHint: string;
      notesAudioHint: string;
      audioFile: string;
      audioHint: string;
      noAudioSelected: string;
      useAi: string;
      runner: string;
      preview: string;
      previewTitle: string;
      saveModeAuto: string;
      saveModeRule: string;
      submit: string;
      submitAudio: string;
      selectTeam: string;
      selectType: string;
      selectRunner: string;
    };
    empty: {
      teamsTitle: string;
      teamsMessage: string;
      meetingsTitle: string;
      meetingsMessage: string;
      actionsTitle: string;
      actionsMessage: string;
    };
    cards: {
      recentMeetings: string;
      recentActions: string;
      linkedRepos: string;
      localStorage: string;
      templates: string;
      weeklyBrief: string;
      decisionLog: string;
    };
    github: {
      title: string;
      description: string;
      planned: string;
      items: string[];
      draftIssue: string;
      createIssue: string;
      issueCreated: string;
      issues: string;
      pulls: string;
      projectBoards: string;
      inferredBoard: string;
      inferredBoardDescription: string;
      projectAccessUnavailable: string;
      noBoards: string;
      columnEmpty: string;
      projectBoardBadge: string;
      inferredBoardBadge: string;
      sync: string;
      syncing: string;
      syncDone: string;
      authMissing: string;
      noRepo: string;
    };
    notices: {
      teamSaved: string;
      meetingSaved: string;
      meetingUploaded: string;
    };
    status: {
      noSummary: string;
      noDiscussion: string;
      none: string;
      localFiles: string;
      aiStructured: string;
      ruleStructured: string;
      noWeeklyBrief: string;
      noDecisionLog: string;
      open: string;
      inProgress: string;
      done: string;
      issueOpen: string;
      issueClosed: string;
      neverSynced: string;
    };
    template: {
      apply: string;
      replaceNotice: string;
    };
    labels: {
      summary: string;
      decisions: string;
      actions: string;
      membersCount: (count: number) => string;
    };
  };
  en: {
    eyebrow: string;
    title: string;
    description: string;
    loading: string;
    loadError: string;
    refresh: string;
    simpleMode: string;
    fullMode: string;
    metrics: {
      teams: string;
      meetings: string;
      actions: string;
      repos: string;
    };
    views: Record<MeetingHubView, string>;
    teamForm: {
      title: string;
      name: string;
      description: string;
      members: string;
      membersHint: string;
      projects: string;
      projectsHint: string;
      repository: string;
      repositoryHint: string;
      submit: string;
    };
    meetingForm: {
      title: string;
      team: string;
      titleLabel: string;
      type: string;
      date: string;
      inputMode: string;
      textMode: string;
      audioMode: string;
      participants: string;
      participantsHint: string;
      projects: string;
      repository: string;
      notes: string;
      notesAudio: string;
      notesHint: string;
      notesAudioHint: string;
      audioFile: string;
      audioHint: string;
      noAudioSelected: string;
      useAi: string;
      runner: string;
      preview: string;
      previewTitle: string;
      saveModeAuto: string;
      saveModeRule: string;
      submit: string;
      submitAudio: string;
      selectTeam: string;
      selectType: string;
      selectRunner: string;
    };
    empty: {
      teamsTitle: string;
      teamsMessage: string;
      meetingsTitle: string;
      meetingsMessage: string;
      actionsTitle: string;
      actionsMessage: string;
    };
    cards: {
      recentMeetings: string;
      recentActions: string;
      linkedRepos: string;
      localStorage: string;
      templates: string;
      weeklyBrief: string;
      decisionLog: string;
    };
    github: {
      title: string;
      description: string;
      planned: string;
      items: string[];
      draftIssue: string;
      createIssue: string;
      issueCreated: string;
      issues: string;
      pulls: string;
      projectBoards: string;
      inferredBoard: string;
      inferredBoardDescription: string;
      projectAccessUnavailable: string;
      noBoards: string;
      columnEmpty: string;
      projectBoardBadge: string;
      inferredBoardBadge: string;
      sync: string;
      syncing: string;
      syncDone: string;
      authMissing: string;
      noRepo: string;
    };
    notices: {
      teamSaved: string;
      meetingSaved: string;
      meetingUploaded: string;
    };
    status: {
      noSummary: string;
      noDiscussion: string;
      none: string;
      localFiles: string;
      aiStructured: string;
      ruleStructured: string;
      noWeeklyBrief: string;
      noDecisionLog: string;
      open: string;
      inProgress: string;
      done: string;
      issueOpen: string;
      issueClosed: string;
      neverSynced: string;
    };
    template: {
      apply: string;
      replaceNotice: string;
    };
    labels: {
      summary: string;
      decisions: string;
      actions: string;
      membersCount: (count: number) => string;
    };
  };
};

const meetingHubCopy: MeetingHubCopyDictionary = {
  ko: {
    eyebrow: "Meeting Hub",
    title: "회의를 팀의 실행 기억으로 남기는 로컬 워크스페이스",
    description:
      "팀, 회의, 액션 아이템을 한 곳에서 관리하고 로컬 파일로 저장합니다. GitHub 연동은 실행 레이어로 이어집니다.",
    loading: "Meeting Hub 데이터를 불러오는 중입니다.",
    loadError: "Meeting Hub 데이터를 불러오지 못했습니다.",
    refresh: "새로고침",
    simpleMode:
      "간단 모드에서는 핵심 회의 흐름에 집중합니다. GitHub 보드는 읽기 중심으로만 보여줍니다.",
    fullMode:
      "전체 모드에서는 팀 운영 메모와 GitHub 연결 준비까지 함께 확인할 수 있습니다.",
    metrics: {
      teams: "팀",
      meetings: "회의",
      actions: "열린 액션",
      repos: "연결 레포",
    },
    views: {
      overview: "개요",
      teams: "팀",
      meetings: "회의",
      actions: "액션",
      github: "GitHub",
    },
    teamForm: {
      title: "팀 만들기",
      name: "팀 이름",
      description: "설명",
      members: "멤버",
      membersHint: "한 줄에 한 명씩 `이름 - 역할` 형식으로 입력합니다.",
      projects: "연결 프로젝트",
      projectsHint: "쉼표로 구분해서 입력합니다.",
      repository: "기본 GitHub 저장소",
      repositoryHint: "`owner/repo` 형식으로 입력합니다.",
      submit: "팀 저장",
    },
    meetingForm: {
      title: "회의 저장",
      team: "팀",
      titleLabel: "회의 제목",
      type: "회의 유형",
      date: "날짜",
      inputMode: "입력 방식",
      textMode: "텍스트 메모",
      audioMode: "녹음 업로드",
      participants: "참석자",
      participantsHint: "쉼표로 구분합니다.",
      projects: "연결 프로젝트",
      repository: "연결 GitHub 저장소",
      notes: "회의 메모",
      notesAudio: "추가 메모",
      notesHint:
        "`Action:`, `Decision:`, `Risk:`, `Follow-up:` 같은 접두어를 쓰면 더 구조적으로 정리됩니다.",
      notesAudioHint:
        "녹음과 함께 남길 보충 메모가 있으면 입력합니다. 비워두면 전사문만으로 저장합니다.",
      audioFile: "녹음 파일",
      audioHint:
        "m4a, mp3, wav, webm, aac, flac, ogg 파일을 업로드하면 Whisper로 전사한 뒤 Meeting Hub에 저장합니다.",
      noAudioSelected: "선택된 녹음 파일이 없습니다.",
      useAi: "AI로 구조화해서 저장",
      runner: "AI 실행기",
      preview: "AI 정리 미리보기",
      previewTitle: "AI 구조화 미리보기",
      saveModeAuto: "저장 시 AI 정리를 먼저 시도하고, 실패하면 규칙 기반으로 저장합니다.",
      saveModeRule: "AI 없이 규칙 기반 구조화만 사용합니다.",
      submit: "회의 저장",
      submitAudio: "녹음 업로드 후 저장",
      selectTeam: "팀 선택",
      selectType: "유형 선택",
      selectRunner: "실행기 선택",
    },
    empty: {
      teamsTitle: "아직 팀이 없습니다",
      teamsMessage:
        "팀을 하나 만든 뒤 회의를 연결하면 Meeting Hub가 실질적으로 동작하기 시작합니다.",
      meetingsTitle: "아직 저장된 회의가 없습니다",
      meetingsMessage:
        "텍스트 메모 기반으로 먼저 회의를 저장하고, 이후 녹음 업로드와 AI 문서화를 붙이면 됩니다.",
      actionsTitle: "아직 열린 액션 아이템이 없습니다",
      actionsMessage:
        "회의 메모에 `Action:` 또는 `TODO:` 줄을 넣으면 자동으로 액션 아이템으로 추출합니다.",
    },
    cards: {
      recentMeetings: "최근 회의",
      recentActions: "최근 액션",
      linkedRepos: "연결된 저장소",
      localStorage: "로컬 저장 구조",
      templates: "회의 템플릿",
      weeklyBrief: "주간 브리프",
      decisionLog: "결정 로그",
    },
    github: {
      title: "GitHub 실행 레이어",
      description:
        "초기 버전에서는 GitHub UI를 복제하지 않고, 액션 아이템에서 이슈 생성으로 이어지는 브리지만 만듭니다.",
      planned: "다음 단계 예정",
      items: [
        "액션 아이템에서 GitHub Issue 생성",
        "연결 레포의 이슈/PR 읽기",
        "읽기 전용 칸반 보드",
      ],
      draftIssue: "이슈 초안 열기",
      createIssue: "Issue 생성",
      issueCreated: "Issue 연결됨",
      issues: "Open Issues",
      pulls: "Open PRs",
      projectBoards: "Projects / Boards",
      inferredBoard: "추론 보드",
      inferredBoardDescription:
        "GitHub Projects 접근 권한이 없거나 연결된 보드가 없을 때, open issue와 PR 상태를 기준으로 읽기 전용 실행 보드를 만듭니다.",
      projectAccessUnavailable:
        "GitHub Projects 보드를 읽지 못했습니다. 권한이 없거나 현재 인증 범위에 project / read:project 권한이 없을 수 있습니다.",
      noBoards: "표시할 GitHub 보드가 없습니다.",
      columnEmpty: "이 컬럼에는 아직 카드가 없습니다.",
      projectBoardBadge: "GitHub Project",
      inferredBoardBadge: "Inferred",
      sync: "GitHub 상태 동기화",
      syncing: "동기화 중...",
      syncDone: "GitHub 이슈 상태를 동기화했습니다.",
      authMissing:
        "GitHub를 읽거나 이슈를 생성하려면 gh auth login 또는 GITHUB_TOKEN / GH_TOKEN 설정이 필요합니다.",
      noRepo: "연결된 저장소가 없습니다.",
    },
    notices: {
      teamSaved: "팀을 저장했습니다.",
      meetingSaved: "회의를 저장하고 로컬 파일을 생성했습니다.",
      meetingUploaded: "녹음 파일을 전사한 뒤 회의를 저장했습니다.",
    },
    status: {
      noSummary: "요약 없음",
      noDiscussion: "논의 항목 없음",
      none: "없음",
      localFiles: "회의마다 Markdown, JSON, raw text 파일이 로컬에 저장됩니다.",
      aiStructured: "AI 구조화 완료",
      ruleStructured: "규칙 기반 구조화",
      noWeeklyBrief: "아직 팀별 주간 브리프가 없습니다.",
      noDecisionLog: "아직 기록된 결정이 없습니다.",
      open: "열림",
      inProgress: "진행중",
      done: "완료",
      issueOpen: "Issue 열림",
      issueClosed: "Issue 닫힘",
      neverSynced: "아직 GitHub 동기화 전",
    },
    template: {
      apply: "템플릿 불러오기",
      replaceNotice: "현재 메모를 템플릿으로 교체합니다.",
    },
    labels: {
      summary: "요약",
      decisions: "결정",
      actions: "액션",
      membersCount: (count: number) => `${count}명 멤버`,
    },
  },
  en: {
    eyebrow: "Meeting Hub",
    title: "A local workspace that turns meetings into team execution memory",
    description:
      "Manage teams, meetings, and action items in one place, then save the outputs as local files. GitHub stays as the execution layer.",
    loading: "Loading Meeting Hub data.",
    loadError: "Failed to load Meeting Hub data.",
    refresh: "Refresh",
    simpleMode:
      "Simple mode focuses on the core meeting flow first. GitHub stays read-oriented here.",
    fullMode:
      "Full mode also surfaces team operations context and GitHub bridge prep.",
    metrics: {
      teams: "Teams",
      meetings: "Meetings",
      actions: "Open Actions",
      repos: "Linked Repos",
    },
    views: {
      overview: "Overview",
      teams: "Teams",
      meetings: "Meetings",
      actions: "Actions",
      github: "GitHub",
    },
    teamForm: {
      title: "Create Team",
      name: "Team Name",
      description: "Description",
      members: "Members",
      membersHint: "Enter one member per line in `Name - Role` format.",
      projects: "Linked Projects",
      projectsHint: "Separate multiple project ids with commas.",
      repository: "Default GitHub Repository",
      repositoryHint: "Use the `owner/repo` format.",
      submit: "Save Team",
    },
    meetingForm: {
      title: "Save Meeting",
      team: "Team",
      titleLabel: "Meeting Title",
      type: "Meeting Type",
      date: "Date",
      inputMode: "Input Mode",
      textMode: "Typed Notes",
      audioMode: "Recording Upload",
      participants: "Participants",
      participantsHint: "Separate names with commas.",
      projects: "Linked Projects",
      repository: "Linked GitHub Repository",
      notes: "Meeting Notes",
      notesAudio: "Supporting Notes",
      notesHint:
        "Use prefixes like `Action:`, `Decision:`, `Risk:`, and `Follow-up:` to improve structure.",
      notesAudioHint:
        "Add any extra operator notes to append alongside the transcript. Leave it empty to save the transcript alone.",
      audioFile: "Recording File",
      audioHint:
        "Upload m4a, mp3, wav, webm, aac, flac, or ogg. Meeting Hub will transcribe it with Whisper, then save the meeting locally.",
      noAudioSelected: "No recording selected.",
      useAi: "Use AI structuring before save",
      runner: "AI Runner",
      preview: "Preview AI Structure",
      previewTitle: "AI Structured Preview",
      saveModeAuto:
        "Try AI structuring before save, then fall back to rule-based parsing if AI is unavailable.",
      saveModeRule: "Use rule-based structuring only, without AI.",
      submit: "Save Meeting",
      submitAudio: "Upload Recording and Save",
      selectTeam: "Select team",
      selectType: "Select type",
      selectRunner: "Select runner",
    },
    empty: {
      teamsTitle: "No teams yet",
      teamsMessage:
        "Create one team first, then connect meetings to make Meeting Hub useful.",
      meetingsTitle: "No meetings saved yet",
      meetingsMessage:
        "Start with typed meeting notes now, then layer recording uploads and AI formatting next.",
      actionsTitle: "No open action items yet",
      actionsMessage:
        "Add lines starting with `Action:` or `TODO:` in meeting notes to extract action items automatically.",
    },
    cards: {
      recentMeetings: "Recent Meetings",
      recentActions: "Recent Actions",
      linkedRepos: "Linked Repositories",
      localStorage: "Local Storage Layout",
      templates: "Meeting Templates",
      weeklyBrief: "Weekly Brief",
      decisionLog: "Decision Log",
    },
    github: {
      title: "GitHub Execution Layer",
      description:
        "The first version should not recreate GitHub. It should bridge action items into issue creation and status tracking.",
      planned: "Planned next",
      items: [
        "Create GitHub issues from action items",
        "Read issues and PRs from linked repositories",
        "Show a read-only kanban view",
      ],
      draftIssue: "Open Issue Draft",
      createIssue: "Create Issue",
      issueCreated: "Issue Linked",
      issues: "Open Issues",
      pulls: "Open PRs",
      projectBoards: "Projects / Boards",
      inferredBoard: "Inferred Board",
      inferredBoardDescription:
        "If GitHub Projects are unavailable or no linked board exists, Meeting Hub builds a read-only execution board from open issues and pull requests.",
      projectAccessUnavailable:
        "Meeting Hub could not read GitHub Projects for this repository. The current auth likely does not include project / read:project access.",
      noBoards: "No GitHub board is available for this repository yet.",
      columnEmpty: "This column does not have any cards yet.",
      projectBoardBadge: "GitHub Project",
      inferredBoardBadge: "Inferred",
      sync: "Sync GitHub Status",
      syncing: "Syncing...",
      syncDone: "Synced linked GitHub issue states.",
      authMissing:
        "Install gh and run gh auth login, or set GITHUB_TOKEN / GH_TOKEN to read GitHub data and create issues.",
      noRepo: "No linked repositories yet.",
    },
    notices: {
      teamSaved: "Saved the team.",
      meetingSaved: "Saved the meeting and created local files.",
      meetingUploaded: "Transcribed the recording and saved the meeting.",
    },
    status: {
      noSummary: "No summary yet",
      noDiscussion: "No discussion points yet",
      none: "None",
      localFiles: "Each meeting is saved locally as Markdown, JSON, and raw text.",
      aiStructured: "AI structured",
      ruleStructured: "Rule-based",
      noWeeklyBrief: "No weekly brief is available yet.",
      noDecisionLog: "No decisions have been recorded yet.",
      open: "Open",
      inProgress: "In Progress",
      done: "Done",
      issueOpen: "Issue Open",
      issueClosed: "Issue Closed",
      neverSynced: "Not synced with GitHub yet",
    },
    template: {
      apply: "Use Template",
      replaceNotice: "This replaces the current notes with the selected template.",
    },
    labels: {
      summary: "Summary",
      decisions: "Decisions",
      actions: "Actions",
      membersCount: (count: number) => `${count} members`,
    },
  },
};

export function getMeetingHubCopy(locale: AppLocale) {
  return pickLocale(locale, meetingHubCopy);
}

export type MeetingHubCopy = ReturnType<typeof getMeetingHubCopy>;
