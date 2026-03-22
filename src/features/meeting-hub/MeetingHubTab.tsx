"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Github,
  LayoutGrid,
  ListTodo,
  LoaderCircle,
  NotebookPen,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { useLocale } from "@/components/layout/LocaleProvider";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { pickLocale } from "@/lib/locale";
import { deriveMeetingHubOverview } from "@/lib/meeting-hub/overview";
import { getMeetingHubTemplateDefinitions } from "@/lib/meeting-hub/templates";
import type {
  CreateMeetingHubMeetingInput,
  CreateMeetingHubTeamInput,
  MeetingHubAiRunner,
  MeetingHubActionItem,
  MeetingHubGithubOverviewResponse,
  MeetingHubMeetingType,
  MeetingHubOverviewResponse,
  MeetingHubProcessedMeeting,
  MeetingHubSummaryResponse,
} from "@/lib/types";
import {
  ActionRow,
  DecisionRow,
  Field,
  GitHubList,
  InfoBlock,
  KanbanBoard,
  MeetingRow,
  MetricCard,
  Panel,
  SelectField,
  TextAreaField,
  WeeklyBriefRow,
} from "@/features/meeting-hub/components/MeetingHubUI";

type MeetingHubView = "overview" | "teams" | "meetings" | "actions" | "github";
type MeetingInputMode = "text" | "audio";

type TeamDraft = {
  name: string;
  description: string;
  membersText: string;
  connectedProjectsText: string;
  defaultRepository: string;
};

type MeetingDraft = {
  teamId: string;
  title: string;
  type: MeetingHubMeetingType;
  date: string;
  inputMode: MeetingInputMode;
  participantsText: string;
  linkedProjectsText: string;
  linkedRepository: string;
  notes: string;
  useAi: boolean;
  runner: MeetingHubAiRunner;
};

const EMPTY_TEAM_DRAFT: TeamDraft = {
  name: "",
  description: "",
  membersText: "",
  connectedProjectsText: "",
  defaultRepository: "",
};

const EMPTY_MEETING_DRAFT: MeetingDraft = {
  teamId: "",
  title: "",
  type: "planning",
  date: new Date().toISOString().slice(0, 10),
  inputMode: "text",
  participantsText: "",
  linkedProjectsText: "",
  linkedRepository: "",
  notes: "",
  useAi: true,
  runner: "auto",
};

const MEETING_TYPES: MeetingHubMeetingType[] = [
  "standup",
  "planning",
  "review",
  "retro",
  "client",
];

export function MeetingHubTab({ mode }: { mode: DashboardNavigationMode }) {
  const { locale } = useLocale();
  const [view, setView] = useState<MeetingHubView>("overview");
  const [overview, setOverview] = useState<MeetingHubOverviewResponse | null>(null);
  const [summary, setSummary] = useState<MeetingHubSummaryResponse | null>(null);
  const [processedPreview, setProcessedPreview] =
    useState<MeetingHubProcessedMeeting | null>(null);
  const [githubOverview, setGithubOverview] =
    useState<MeetingHubGithubOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [uploadingMeeting, setUploadingMeeting] = useState(false);
  const [processingMeeting, setProcessingMeeting] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [syncingGithubActions, setSyncingGithubActions] = useState(false);
  const [creatingIssueId, setCreatingIssueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [teamDraft, setTeamDraft] = useState<TeamDraft>(EMPTY_TEAM_DRAFT);
  const [meetingDraft, setMeetingDraft] = useState<MeetingDraft>(EMPTY_MEETING_DRAFT);
  const [meetingAudioFile, setMeetingAudioFile] = useState<File | null>(null);

  const copy = pickLocale(locale, {
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
      },
      empty: {
        teamsTitle: "아직 팀이 없습니다",
        teamsMessage: "팀을 하나 만든 뒤 회의를 연결하면 Meeting Hub가 실질적으로 동작하기 시작합니다.",
        meetingsTitle: "아직 저장된 회의가 없습니다",
        meetingsMessage: "텍스트 메모 기반으로 먼저 회의를 저장하고, 이후 녹음 업로드와 AI 문서화를 붙이면 됩니다.",
        actionsTitle: "아직 열린 액션 아이템이 없습니다",
        actionsMessage: "회의 메모에 `Action:` 또는 `TODO:` 줄을 넣으면 자동으로 액션 아이템으로 추출합니다.",
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
      },
      empty: {
        teamsTitle: "No teams yet",
        teamsMessage: "Create one team first, then connect meetings to make Meeting Hub useful.",
        meetingsTitle: "No meetings saved yet",
        meetingsMessage: "Start with typed meeting notes now, then layer recording uploads and AI formatting next.",
        actionsTitle: "No open action items yet",
        actionsMessage: "Add lines starting with `Action:` or `TODO:` in meeting notes to extract action items automatically.",
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
    },
  });
  const displayLoadError =
    error === "__meeting_hub_load_failed__"
      ? copy.loadError
      : error;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meeting-hub/overview", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("__meeting_hub_load_failed__");
      }

      const payload = (await response.json()) as MeetingHubOverviewResponse;
      setOverview(payload);
      setMeetingDraft((current) => ({
        ...current,
        teamId: current.teamId || payload.teams[0]?.id || "",
        linkedRepository:
          current.linkedRepository || payload.teams[0]?.defaultRepository || "",
      }));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "__meeting_hub_load_failed__",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meeting-hub/summary", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("__meeting_hub_load_failed__");
      }

      const payload = (await response.json()) as MeetingHubSummaryResponse;
      setSummary(payload);
      setOverview(deriveMeetingHubOverview(payload));
      setMeetingDraft((current) => ({
        ...current,
        teamId: current.teamId || payload.teams[0]?.id || "",
        linkedRepository:
          current.linkedRepository || payload.teams[0]?.defaultRepository || "",
      }));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "__meeting_hub_load_failed__",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleCreateTeam() {
    setSavingTeam(true);
    setError(null);
    setSuccess(null);

    const payload: CreateMeetingHubTeamInput = {
      name: teamDraft.name,
      description: teamDraft.description,
      members: parseMembers(teamDraft.membersText),
      connectedProjectIds: splitCommaValues(teamDraft.connectedProjectsText),
      defaultRepository: teamDraft.defaultRepository || null,
    };

    try {
      const response = await fetch("/api/meeting-hub/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setSummary(result.summary);
      setOverview(deriveMeetingHubOverview(result.summary));
      setTeamDraft(EMPTY_TEAM_DRAFT);
      setMeetingDraft((current) => ({
        ...current,
        teamId: current.teamId || result.summary.teams[0]?.id || "",
      }));
      setSuccess(copy.notices.teamSaved);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setSavingTeam(false);
    }
  }

  async function handleCreateMeeting() {
    setSavingMeeting(true);
    setError(null);
    setSuccess(null);

    const payload: CreateMeetingHubMeetingInput = {
      teamId: meetingDraft.teamId,
      title: meetingDraft.title,
      type: meetingDraft.type,
      date: meetingDraft.date,
      participants: splitCommaValues(meetingDraft.participantsText),
      linkedProjectIds: splitCommaValues(meetingDraft.linkedProjectsText),
      linkedRepository: meetingDraft.linkedRepository || null,
      notes: meetingDraft.notes,
      useAi: meetingDraft.useAi,
      runner: meetingDraft.runner,
    };

    try {
      const response = await fetch("/api/meeting-hub/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setSummary(result.summary);
      setOverview(deriveMeetingHubOverview(result.summary));
      setMeetingDraft((current) => ({
        ...EMPTY_MEETING_DRAFT,
        date: current.date,
        teamId: current.teamId,
        linkedRepository: current.linkedRepository,
      }));
      setProcessedPreview(null);
      setSuccess(copy.notices.meetingSaved);
      setView("overview");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setSavingMeeting(false);
    }
  }

  async function handleUploadMeeting() {
    if (!meetingAudioFile) {
      setError(copy.meetingForm.noAudioSelected);
      return;
    }

    setUploadingMeeting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("file", meetingAudioFile);
      formData.set("teamId", meetingDraft.teamId);
      formData.set("title", meetingDraft.title);
      formData.set("type", meetingDraft.type);
      formData.set("date", meetingDraft.date);
      formData.set("participants", meetingDraft.participantsText);
      formData.set("linkedProjects", meetingDraft.linkedProjectsText);
      formData.set("linkedRepository", meetingDraft.linkedRepository);
      formData.set("notes", meetingDraft.notes);
      formData.set("useAi", String(meetingDraft.useAi));
      formData.set("runner", meetingDraft.runner);

      const response = await fetch("/api/meeting-hub/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setSummary(result.summary);
      setOverview(deriveMeetingHubOverview(result.summary));
      setMeetingDraft((current) => ({
        ...EMPTY_MEETING_DRAFT,
        date: current.date,
        teamId: current.teamId,
        linkedRepository: current.linkedRepository,
      }));
      setMeetingAudioFile(null);
      setProcessedPreview(null);
      setSuccess(copy.notices.meetingUploaded);
      setView("overview");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setUploadingMeeting(false);
    }
  }

  async function handleProcessMeetingPreview() {
    setProcessingMeeting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/meeting-hub/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: meetingDraft.teamId || "preview",
          title: meetingDraft.title,
          type: meetingDraft.type,
          date: meetingDraft.date,
          participants: splitCommaValues(meetingDraft.participantsText),
          linkedRepository: meetingDraft.linkedRepository || null,
          notes: meetingDraft.notes,
          runner: meetingDraft.runner,
        }),
      });

      const result = (await response.json()) as
        | { processed: MeetingHubProcessedMeeting }
        | { error?: { message?: string } };

      if (!response.ok || !("processed" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setProcessedPreview(result.processed);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setProcessingMeeting(false);
    }
  }

  async function handleCreateGithubIssue(item: MeetingHubActionItem) {
    if (!item.repository) {
      return;
    }

    setCreatingIssueId(item.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/meeting-hub/github/issues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: item.id,
          repo: item.repository,
          title: item.title,
          body: `## Context\n- Imported from Meeting Hub\n- Action Item: ${item.sourceLine}\n`,
        }),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setSummary(result.summary);
      setOverview(deriveMeetingHubOverview(result.summary));
      setSuccess(copy.github.issueCreated);
      if (view === "github") {
        await loadGithubOverview();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setCreatingIssueId(null);
    }
  }

  async function handleUpdateActionStatus(
    actionId: string,
    status: "open" | "in_progress" | "done",
  ) {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/meeting-hub/actions/${encodeURIComponent(actionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setSummary(result.summary);
      setOverview(deriveMeetingHubOverview(result.summary));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    }
  }

  async function handleSyncGithubActions() {
    setSyncingGithubActions(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/meeting-hub/github/sync", {
        method: "POST",
      });
      const result = (await response.json()) as
        | { summary: MeetingHubSummaryResponse; syncedCount: number }
        | { error?: { message?: string } };

      if (!response.ok || !("summary" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setSummary(result.summary);
      setOverview(deriveMeetingHubOverview(result.summary));
      setSuccess(copy.github.syncDone);
      if (view === "github") {
        await loadGithubOverview();
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setSyncingGithubActions(false);
    }
  }

  const recentMeetings = overview?.recentMeetings ?? [];
  const recentActions = overview?.recentActions ?? [];
  const recentDecisions = overview?.decisionLog ?? [];
  const weeklyBriefs = overview?.weeklyBriefs ?? [];
  const meetingTemplates = useMemo(
    () => getMeetingHubTemplateDefinitions(locale),
    [locale],
  );
  const linkedRepositories = useMemo(
    () => {
      const repos = [
        ...(summary?.teams.map((team) => team.defaultRepository).filter(Boolean) ??
          overview?.teams.map((team) => team.defaultRepository).filter(Boolean) ??
          []),
        ...(summary?.meetings.map((meeting) => meeting.linkedRepository).filter(Boolean) ??
          overview?.linkedRepositories ??
          []),
      ];

      return [...new Set(repos)] as string[];
    },
    [overview, summary],
  );
  const teamOptions = summary?.teams ?? overview?.teams ?? [];
  const fullMeetings = summary?.meetings ?? [];
  const fullActions = summary?.actions ?? [];
  const stats = summary?.stats ?? overview?.stats ?? {
    totalTeams: 0,
    totalMeetings: 0,
    openActionItems: 0,
    linkedRepositories: 0,
  };

  function applyMeetingTemplate(type: MeetingHubMeetingType) {
    const selected = meetingTemplates.find((template) => template.type === type);
    if (!selected) {
      return;
    }

    setMeetingDraft((current) => ({
      ...current,
      type,
      title: current.title.trim() ? current.title : selected.defaultTitle,
      notes: selected.notes,
    }));
    setProcessedPreview(null);
  }

  const loadGithubOverview = useCallback(async () => {
    if (linkedRepositories.length === 0) {
      setGithubOverview(null);
      return;
    }

    setGithubLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        repos: linkedRepositories.join(","),
      });
      const response = await fetch(`/api/meeting-hub/github/overview?${params.toString()}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as
        | MeetingHubGithubOverviewResponse
        | { error?: { message?: string } };

      if (!response.ok || !("repos" in result)) {
        throw new Error("error" in result ? result.error?.message ?? copy.loadError : copy.loadError);
      }

      setGithubOverview(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setGithubLoading(false);
    }
  }, [linkedRepositories, copy.loadError]);

  useEffect(() => {
    if (view === "meetings" || view === "actions") {
      if (!summary && !summaryLoading) {
        void loadSummary();
      }
    }
  }, [loadSummary, summary, summaryLoading, view]);

  useEffect(() => {
    if (linkedRepositories.length === 0) {
      setGithubOverview(null);
      return;
    }

    if (view !== "github") {
      return;
    }

    void loadGithubOverview();
  }, [linkedRepositories, view, loadGithubOverview]);

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.025] to-cyan-500/[0.06] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{copy.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{copy.title}</h2>
            <p className="text-sm leading-6 text-[var(--color-text-soft)]">{copy.description}</p>
            <p className="text-xs leading-5 text-gray-500">
              {mode === "core" ? copy.simpleMode : copy.fullMode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void (summary ? loadSummary() : loadOverview())}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LayoutGrid className="h-4 w-4" />}
            {copy.refresh}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copy.metrics.teams} value={stats.totalTeams} icon={Users} />
        <MetricCard label={copy.metrics.meetings} value={stats.totalMeetings} icon={NotebookPen} />
        <MetricCard label={copy.metrics.actions} value={stats.openActionItems} icon={ListTodo} />
        <MetricCard label={copy.metrics.repos} value={stats.linkedRepositories} icon={Github} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["overview", "teams", "meetings", "actions", "github"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={[
              "rounded-full border px-4 py-2 text-sm transition",
              view === item
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            {copy.views[item]}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorCard
          title="Meeting Hub"
          message={displayLoadError ?? copy.loadError}
          actionLabel={copy.refresh}
          onAction={() => void (summary ? loadSummary() : loadOverview())}
        />
      ) : null}
      {success ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      {loading && !overview ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-[var(--color-text-soft)]">
          {copy.loading}
        </section>
      ) : null}

      {!loading && overview ? (
        <>
          {view === "overview" ? (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <Panel title={copy.cards.recentMeetings} icon={NotebookPen}>
                  {recentMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {recentMeetings.map((meeting) => (
                        <MeetingRow key={meeting.id} meeting={meeting} locale={locale} />
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard
                      title={copy.empty.meetingsTitle}
                      message={copy.empty.meetingsMessage}
                      actionLabel={copy.views.meetings}
                      onAction={() => setView("meetings")}
                    />
                  )}
                </Panel>

                <Panel title={copy.cards.recentActions} icon={ListTodo}>
                  {recentActions.length > 0 ? (
                    <div className="space-y-3">
                      {recentActions.map((item) => (
                        <ActionRow
                          key={item.id}
                          item={item}
                          locale={locale}
                          copyStatus={copy.status}
                          draftLabel={copy.github.draftIssue}
                          createIssueLabel={copy.github.createIssue}
                          issueCreatedLabel={copy.github.issueCreated}
                          creating={creatingIssueId === item.id}
                          onCreateIssue={(nextItem) => void handleCreateGithubIssue(nextItem)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard
                      title={copy.empty.actionsTitle}
                      message={copy.empty.actionsMessage}
                      actionLabel={copy.views.meetings}
                      onAction={() => setView("meetings")}
                    />
                  )}
                </Panel>
              </div>

              <div className="space-y-6">
                <Panel title={copy.cards.linkedRepos} icon={Github}>
                  {linkedRepositories.length > 0 ? (
                    <div className="space-y-3">
                      {linkedRepositories.map((repo) => (
                        <a
                          key={repo}
                          href={`https://github.com/${repo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white transition hover:bg-white/6"
                        >
                          <span>{repo}</span>
                          <ArrowUpRight className="h-4 w-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard
                      title={copy.github.noRepo}
                      message={copy.github.description}
                      actionLabel={copy.views.teams}
                      onAction={() => setView("teams")}
                    />
                  )}
                </Panel>

                <Panel title={copy.cards.localStorage} icon={Clock3}>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <pre className="overflow-x-auto text-xs leading-6 text-gray-300">{`data/meeting-hub/
  teams/{teamId}/
    team.json
    meetings/{date}-{slug}.md
    meetings/{date}-{slug}.json
    meetings/{date}-{slug}.raw.txt
    meetings/{date}-{slug}.source.{ext}
    actions/open-items.json
    decisions/decision-log.md
    briefs/latest-weekly-brief.md`}</pre>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">
                    {copy.status.localFiles}
                  </p>
                </Panel>

                <Panel title={copy.cards.weeklyBrief} icon={Sparkles}>
                  {weeklyBriefs.length > 0 ? (
                    <div className="space-y-3">
                      {weeklyBriefs.map((brief) => (
                        <WeeklyBriefRow key={brief.id} brief={brief} locale={locale} />
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard
                      title={copy.cards.weeklyBrief}
                      message={copy.status.noWeeklyBrief}
                    />
                  )}
                </Panel>

                <Panel title={copy.cards.decisionLog} icon={CheckCircle2}>
                  {recentDecisions.length > 0 ? (
                    <div className="space-y-3">
                      {recentDecisions.map((entry) => (
                        <DecisionRow key={entry.id} entry={entry} locale={locale} />
                      ))}
                    </div>
                  ) : (
                    <EmptyStateCard
                      title={copy.cards.decisionLog}
                      message={copy.status.noDecisionLog}
                    />
                  )}
                </Panel>
              </div>
            </div>
          ) : null}

          {view === "teams" ? (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={copy.teamForm.title} icon={Plus}>
                <div className="grid gap-4">
                  <Field
                    label={copy.teamForm.name}
                    value={teamDraft.name}
                    onChange={(value) => setTeamDraft((current) => ({ ...current, name: value }))}
                  />
                  <TextAreaField
                    label={copy.teamForm.description}
                    value={teamDraft.description}
                    onChange={(value) => setTeamDraft((current) => ({ ...current, description: value }))}
                    rows={3}
                  />
                  <TextAreaField
                    label={copy.teamForm.members}
                    hint={copy.teamForm.membersHint}
                    value={teamDraft.membersText}
                    onChange={(value) => setTeamDraft((current) => ({ ...current, membersText: value }))}
                    rows={4}
                  />
                  <Field
                    label={copy.teamForm.projects}
                    hint={copy.teamForm.projectsHint}
                    value={teamDraft.connectedProjectsText}
                    onChange={(value) =>
                      setTeamDraft((current) => ({ ...current, connectedProjectsText: value }))
                    }
                  />
                  <Field
                    label={copy.teamForm.repository}
                    hint={copy.teamForm.repositoryHint}
                    value={teamDraft.defaultRepository}
                    onChange={(value) =>
                      setTeamDraft((current) => ({ ...current, defaultRepository: value }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateTeam()}
                    disabled={savingTeam}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTeam ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {copy.teamForm.submit}
                  </button>
                </div>
              </Panel>

              <Panel title={copy.views.teams} icon={Users}>
                {teamOptions.length > 0 ? (
                  <div className="space-y-3">
                    {teamOptions.map((team) => (
                      <div
                        key={team.id}
                        className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-white">{team.name}</p>
                            <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">
                              {team.description || copy.status.none}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
                            {pickLocale(locale, {
                              ko: `${team.members.length}명 멤버`,
                              en: `${team.members.length} members`,
                            })}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <InfoBlock
                            label={copy.teamForm.projects}
                            value={team.connectedProjectIds.join(", ") || copy.status.none}
                          />
                          <InfoBlock
                            label={copy.teamForm.repository}
                            value={team.defaultRepository || copy.status.none}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard
                    title={copy.empty.teamsTitle}
                    message={copy.empty.teamsMessage}
                  />
                )}
              </Panel>
            </div>
          ) : null}

          {view === "meetings" ? (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={copy.meetingForm.title} icon={NotebookPen}>
                <div className="grid gap-4">
                  <SelectField
                    label={copy.meetingForm.team}
                    placeholder={pickLocale(locale, { ko: "팀 선택", en: "Select team" })}
                    value={meetingDraft.teamId}
                    onChange={(value) =>
                      setMeetingDraft((current) => {
                        const selectedTeam =
                          teamOptions.find((team) => team.id === value) ?? null;

                        return {
                          ...current,
                          teamId: value,
                          linkedRepository: selectedTeam?.defaultRepository || "",
                        };
                      })
                    }
                    options={teamOptions.map((team) => ({ value: team.id, label: team.name }))}
                  />
                  <Field
                    label={copy.meetingForm.titleLabel}
                    value={meetingDraft.title}
                    onChange={(value) => setMeetingDraft((current) => ({ ...current, title: value }))}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label={copy.meetingForm.type}
                      placeholder={pickLocale(locale, { ko: "유형 선택", en: "Select type" })}
                      value={meetingDraft.type}
                      onChange={(value) =>
                        setMeetingDraft((current) => ({ ...current, type: value as MeetingHubMeetingType }))
                      }
                      options={MEETING_TYPES.map((type) => ({
                        value: type,
                        label: formatMeetingType(type),
                      }))}
                    />
                    <Field
                      label={copy.meetingForm.date}
                      type="date"
                      value={meetingDraft.date}
                      onChange={(value) => setMeetingDraft((current) => ({ ...current, date: value }))}
                    />
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{copy.cards.templates}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{copy.template.replaceNotice}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {meetingTemplates.map((template) => (
                        <button
                          key={template.type}
                          type="button"
                          onClick={() => applyMeetingTemplate(template.type)}
                          className={[
                            "rounded-2xl border p-4 text-left transition",
                            meetingDraft.type === template.type
                              ? "border-cyan-400/30 bg-cyan-400/10"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/6",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">{template.label}</p>
                              <p className="mt-1 text-xs leading-5 text-[var(--color-text-soft)]">
                                {template.description}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-gray-300">
                              {copy.template.apply}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium text-white">{copy.meetingForm.inputMode}</span>
                    <div className="flex flex-wrap gap-2">
                      {([
                        ["text", copy.meetingForm.textMode],
                        ["audio", copy.meetingForm.audioMode],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setMeetingDraft((current) => ({
                              ...current,
                              inputMode: value,
                            }));
                            if (value === "text") {
                              setMeetingAudioFile(null);
                            }
                          }}
                          className={[
                            "rounded-full border px-4 py-2 text-sm transition",
                            meetingDraft.inputMode === value
                              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/5 hover:text-white",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field
                    label={copy.meetingForm.participants}
                    hint={copy.meetingForm.participantsHint}
                    value={meetingDraft.participantsText}
                    onChange={(value) =>
                      setMeetingDraft((current) => ({ ...current, participantsText: value }))
                    }
                  />
                  <Field
                    label={copy.meetingForm.projects}
                    value={meetingDraft.linkedProjectsText}
                    onChange={(value) =>
                      setMeetingDraft((current) => ({ ...current, linkedProjectsText: value }))
                    }
                  />
                  <Field
                    label={copy.meetingForm.repository}
                    value={meetingDraft.linkedRepository}
                    onChange={(value) =>
                      setMeetingDraft((current) => ({ ...current, linkedRepository: value }))
                    }
                  />
                  {meetingDraft.inputMode === "audio" ? (
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-white">{copy.meetingForm.audioFile}</span>
                      <input
                        type="file"
                        accept=".m4a,.mp3,.wav,.webm,.aac,.flac,.ogg,audio/*"
                        onChange={(event) =>
                          setMeetingAudioFile(event.target.files?.[0] ?? null)
                        }
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan-100"
                      />
                      <span className="text-xs leading-5 text-gray-500">{copy.meetingForm.audioHint}</span>
                      <span className="text-xs leading-5 text-white/70">
                        {meetingAudioFile?.name ?? copy.meetingForm.noAudioSelected}
                      </span>
                    </label>
                  ) : null}
                  <TextAreaField
                    label={
                      meetingDraft.inputMode === "audio"
                        ? copy.meetingForm.notesAudio
                        : copy.meetingForm.notes
                    }
                    hint={
                      meetingDraft.inputMode === "audio"
                        ? copy.meetingForm.notesAudioHint
                        : copy.meetingForm.notesHint
                    }
                    value={meetingDraft.notes}
                    onChange={(value) => setMeetingDraft((current) => ({ ...current, notes: value }))}
                    rows={meetingDraft.inputMode === "audio" ? 5 : 10}
                  />
                  <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={meetingDraft.useAi}
                      onChange={(event) =>
                        setMeetingDraft((current) => ({ ...current, useAi: event.target.checked }))
                      }
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{copy.meetingForm.useAi}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {meetingDraft.useAi ? copy.meetingForm.saveModeAuto : copy.meetingForm.saveModeRule}
                      </p>
                    </div>
                  </label>
                  <SelectField
                    label={copy.meetingForm.runner}
                    placeholder={pickLocale(locale, { ko: "실행기 선택", en: "Select runner" })}
                    value={meetingDraft.runner}
                    onChange={(value) =>
                      setMeetingDraft((current) => ({ ...current, runner: value as MeetingHubAiRunner }))
                    }
                    options={[
                      { value: "auto", label: formatRunner("auto") },
                      { value: "claude", label: formatRunner("claude") },
                      { value: "codex", label: formatRunner("codex") },
                      { value: "gemini", label: formatRunner("gemini") },
                      { value: "openai", label: formatRunner("openai") },
                      { value: "rule", label: formatRunner("rule") },
                    ]}
                  />
                  <button
                    type="button"
                    onClick={() => void handleProcessMeetingPreview()}
                    disabled={
                      processingMeeting ||
                      meetingDraft.inputMode === "audio" ||
                      !meetingDraft.notes.trim()
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processingMeeting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {copy.meetingForm.preview}
                  </button>
                  {meetingDraft.inputMode === "text" && processedPreview ? (
                    <div className="rounded-3xl border border-cyan-400/20 bg-cyan-950/10 p-4">
                      <p className="text-sm font-semibold text-white">{copy.meetingForm.previewTitle}</p>
                      <div className="mt-3 space-y-3 text-sm text-[var(--color-text-soft)]">
                        <InfoBlock
                          label={pickLocale(locale, { ko: "요약", en: "Summary" })}
                          value={processedPreview.summary || copy.status.noSummary}
                        />
                        <InfoBlock
                          label={pickLocale(locale, { ko: "결정", en: "Decisions" })}
                          value={processedPreview.decisions.join(" | ") || copy.status.none}
                        />
                        <InfoBlock
                          label={pickLocale(locale, { ko: "액션", en: "Actions" })}
                          value={
                            processedPreview.actionItems.map((item) => item.title).join(" | ") ||
                            copy.status.none
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      void (meetingDraft.inputMode === "audio"
                        ? handleUploadMeeting()
                        : handleCreateMeeting())
                    }
                    disabled={
                      savingMeeting ||
                      uploadingMeeting ||
                      teamOptions.length === 0 ||
                      (meetingDraft.inputMode === "audio" && !meetingAudioFile)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingMeeting || uploadingMeeting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <NotebookPen className="h-4 w-4" />
                    )}
                    {meetingDraft.inputMode === "audio"
                      ? copy.meetingForm.submitAudio
                      : copy.meetingForm.submit}
                  </button>
                </div>
              </Panel>

              <Panel title={copy.cards.recentMeetings} icon={LayoutGrid}>
                {summaryLoading && !summary ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-[var(--color-text-soft)]">
                    {copy.loading}
                  </div>
                ) : fullMeetings.length > 0 ? (
                  <div className="space-y-3">
                    {fullMeetings.map((meeting) => (
                      <MeetingRow key={meeting.id} meeting={meeting} locale={locale} detailed />
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard
                    title={copy.empty.meetingsTitle}
                    message={copy.empty.meetingsMessage}
                  />
                )}
              </Panel>
            </div>
          ) : null}

          {view === "actions" ? (
            <Panel title={copy.views.actions} icon={ListTodo}>
              {summaryLoading && !summary ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-[var(--color-text-soft)]">
                  {copy.loading}
                </div>
              ) : fullActions.length > 0 ? (
                <div className="space-y-3">
                  {fullActions.map((item) => (
                    <ActionRow
                      key={item.id}
                      item={item}
                      locale={locale}
                      copyStatus={copy.status}
                      draftLabel={copy.github.draftIssue}
                      createIssueLabel={copy.github.createIssue}
                      issueCreatedLabel={copy.github.issueCreated}
                      creating={creatingIssueId === item.id}
                      onCreateIssue={(nextItem) => void handleCreateGithubIssue(nextItem)}
                      onStatusChange={(actionId, status) => void handleUpdateActionStatus(actionId, status)}
                      detailed
                    />
                  ))}
                </div>
              ) : (
                <EmptyStateCard
                  title={copy.empty.actionsTitle}
                  message={copy.empty.actionsMessage}
                />
              )}
            </Panel>
          ) : null}

          {view === "github" ? (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title={copy.github.title} icon={Github}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm leading-6 text-[var(--color-text-soft)]">
                    {copy.github.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSyncGithubActions()}
                    disabled={syncingGithubActions}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {syncingGithubActions ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Github className="h-4 w-4" />
                    )}
                    {syncingGithubActions ? copy.github.syncing : copy.github.sync}
                  </button>
                </div>
                {githubLoading ? (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--color-text-soft)]">
                    {copy.loading}
                  </div>
                ) : githubOverview?.authenticated ? (
                  <div className="mt-5 space-y-4">
                    {githubOverview.repos.map((repo) => (
                      <div key={repo.repo} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{repo.repo}</p>
                          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
                            {repo.issues.length} {copy.github.issues} · {repo.pulls.length} {copy.github.pulls}
                          </span>
                        </div>
                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                              {copy.github.projectBoards}
                            </p>
                            <div className="mt-3 space-y-4">
                              {repo.boards.length > 0 ? (
                                repo.boards.map((board) => (
                                  <KanbanBoard
                                    key={board.id}
                                    board={board}
                                    locale={locale}
                                    projectLabel={copy.github.projectBoardBadge}
                                    inferredLabel={copy.github.inferredBoardBadge}
                                    emptyLabel={copy.github.columnEmpty}
                                  />
                                ))
                              ) : (
                                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-[var(--color-text-soft)]">
                                  {copy.github.noBoards}
                                </div>
                              )}
                            </div>
                          </div>

                          {repo.boardMessage === "project_access_unavailable" ? (
                            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-100">
                              {copy.github.projectAccessUnavailable}
                            </div>
                          ) : null}

                          {repo.boards.some((board) => board.source === "inferred") ||
                          repo.boardMessage === "no_projects_found" ? (
                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-[var(--color-text-soft)]">
                              {copy.github.inferredBoardDescription}
                            </div>
                          ) : null}

                          <div className="grid gap-4 md:grid-cols-2">
                          <GitHubList
                            title={copy.github.issues}
                            emptyLabel={copy.status.none}
                            items={repo.issues.map((issue) => ({
                              id: issue.number,
                              title: issue.title,
                              meta: `#${issue.number} · ${issue.author ?? "unknown"}`,
                              url: issue.url,
                            }))}
                          />
                          <GitHubList
                            title={copy.github.pulls}
                            emptyLabel={copy.status.none}
                            items={repo.pulls.map((pull) => ({
                              id: pull.number,
                              title: pull.title,
                              meta: `#${pull.number} · ${pull.author ?? "unknown"}`,
                              url: pull.url,
                            }))}
                          />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                    {copy.github.authMissing}
                  </div>
                )}
              </Panel>

              <Panel title={copy.cards.linkedRepos} icon={ArrowUpRight}>
                {linkedRepositories.length > 0 ? (
                  <div className="space-y-3">
                    {linkedRepositories.map((repo) => (
                      <a
                        key={repo}
                        href={`https://github.com/${repo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white transition hover:bg-white/6"
                      >
                        <span>{repo}</span>
                        <ArrowUpRight className="h-4 w-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyStateCard
                    title={copy.github.noRepo}
                    message={copy.github.description}
                  />
                )}
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">{copy.github.planned}</p>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-soft)]">
                    {copy.github.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );

  function formatMeetingType(type: MeetingHubMeetingType) {
    return pickLocale(locale, {
      ko: {
        standup: "스탠드업",
        planning: "플래닝",
        review: "리뷰",
        retro: "회고",
        client: "고객 미팅",
      },
      en: {
        standup: "Standup",
        planning: "Planning",
        review: "Review",
        retro: "Retro",
        client: "Client Meeting",
      },
    })[type];
  }

  function formatRunner(runner: MeetingHubAiRunner) {
    return pickLocale(locale, {
      ko: {
        auto: "자동 선택",
        claude: "Claude CLI",
        codex: "Codex CLI",
        gemini: "Gemini CLI",
        openai: "OpenAI",
        rule: "규칙 기반",
      },
      en: {
        auto: "Auto",
        claude: "Claude CLI",
        codex: "Codex CLI",
        gemini: "Gemini CLI",
        openai: "OpenAI",
        rule: "Rule-based",
      },
    })[runner];
  }
}

function parseMembers(value: string): CreateMeetingHubTeamInput["members"] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, rolePart] = line.split(/\s+-\s+/, 2);
      return {
        name: namePart?.trim() || line,
        role: rolePart?.trim() || "Member",
      };
    });
}

function splitCommaValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
