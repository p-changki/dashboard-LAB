export type MeetingHubMeetingType =
  | "standup"
  | "planning"
  | "review"
  | "retro"
  | "client";
export type MeetingHubInputSource = "text" | "audio";

export type MeetingHubActionStatus = "open" | "in_progress" | "done";
export type MeetingHubAiRunner = "auto" | "claude" | "codex" | "gemini" | "openai" | "rule";

export interface MeetingHubTeamMember {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  githubLogin?: string | null;
}

export interface MeetingHubTeam {
  id: string;
  name: string;
  description: string;
  members: MeetingHubTeamMember[];
  connectedProjectIds: string[];
  defaultRepository: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingHubActionItem {
  id: string;
  meetingId: string;
  teamId: string;
  title: string;
  owner: string | null;
  dueDate: string | null;
  status: MeetingHubActionStatus;
  repository: string | null;
  issueNumber: number | null;
  issueUrl: string | null;
  issueState: "open" | "closed" | null;
  prNumbers: number[];
  sourceLine: string;
  syncedAt: string | null;
}

export interface MeetingHubMeeting {
  id: string;
  teamId: string;
  title: string;
  type: MeetingHubMeetingType;
  date: string;
  inputSource: MeetingHubInputSource;
  participants: string[];
  linkedProjectIds: string[];
  linkedRepository: string | null;
  sourceFileName: string | null;
  sourceFilePath: string | null;
  rawNotes: string;
  summary: string;
  discussion: string[];
  decisions: string[];
  actionItems: MeetingHubActionItem[];
  risks: string[];
  followUp: string[];
  processingMode: "ai" | "rule";
  processingRunner: Exclude<MeetingHubAiRunner, "auto">;
  markdownPath: string;
  jsonPath: string;
  rawPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingHubStats {
  totalTeams: number;
  totalMeetings: number;
  openActionItems: number;
  linkedRepositories: number;
}

export interface MeetingHubDecisionEntry {
  id: string;
  teamId: string;
  teamName: string;
  meetingId: string;
  meetingTitle: string;
  date: string;
  decision: string;
}

export interface MeetingHubWeeklyBrief {
  id: string;
  teamId: string;
  teamName: string;
  fromDate: string;
  toDate: string;
  meetingCount: number;
  openActionItems: number;
  decisions: string[];
  risks: string[];
  followUp: string[];
  linkedProjectIds: string[];
}

export interface MeetingHubSummaryResponse {
  teams: MeetingHubTeam[];
  meetings: MeetingHubMeeting[];
  actions: MeetingHubActionItem[];
  stats: MeetingHubStats;
  decisionLog: MeetingHubDecisionEntry[];
  weeklyBriefs: MeetingHubWeeklyBrief[];
}

export interface MeetingHubOverviewResponse {
  teams: MeetingHubTeam[];
  stats: MeetingHubStats;
  recentMeetings: MeetingHubMeeting[];
  recentActions: MeetingHubActionItem[];
  decisionLog: MeetingHubDecisionEntry[];
  weeklyBriefs: MeetingHubWeeklyBrief[];
  linkedRepositories: string[];
}

export interface MeetingHubProcessedMeeting {
  summary: string;
  discussion: string[];
  decisions: string[];
  actionItems: Array<{
    title: string;
    owner: string | null;
    dueDate: string | null;
    status: MeetingHubActionStatus;
    sourceLine: string;
  }>;
  risks: string[];
  followUp: string[];
  processingMode: "ai" | "rule";
  processingRunner: Exclude<MeetingHubAiRunner, "auto">;
}

export interface MeetingHubGithubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  url: string;
  author: string | null;
  assignees: string[];
  labels: string[];
  updatedAt: string;
}

export interface MeetingHubGithubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  url: string;
  author: string | null;
  labels: string[];
  updatedAt: string;
}

export interface MeetingHubGithubBoardCard {
  id: string;
  title: string;
  url: string | null;
  kind: "issue" | "pull" | "draft";
  number: number | null;
  state: "open" | "closed" | "draft" | null;
  status: string;
  labels: string[];
  assignees: string[];
  updatedAt: string | null;
}

export interface MeetingHubGithubBoardColumn {
  id: string;
  title: string;
  cards: MeetingHubGithubBoardCard[];
}

export interface MeetingHubGithubProjectBoard {
  id: string;
  number: number | null;
  title: string;
  url: string | null;
  updatedAt: string | null;
  closed: boolean;
  source: "project" | "inferred";
  columns: MeetingHubGithubBoardColumn[];
}

export interface MeetingHubGithubRepoOverview {
  repo: string;
  issues: MeetingHubGithubIssue[];
  pulls: MeetingHubGithubPullRequest[];
  boards: MeetingHubGithubProjectBoard[];
  boardMessage: "project_access_unavailable" | "no_projects_found" | null;
}

export interface MeetingHubGithubOverviewResponse {
  authenticated: boolean;
  source: "gh" | "token" | "none";
  repos: MeetingHubGithubRepoOverview[];
}

export interface CreateMeetingHubTeamInput {
  name: string;
  description?: string;
  members?: Array<{
    name: string;
    role?: string;
    email?: string;
    githubLogin?: string;
  }>;
  connectedProjectIds?: string[];
  defaultRepository?: string | null;
}

export interface CreateMeetingHubMeetingInput {
  teamId: string;
  title: string;
  type: MeetingHubMeetingType;
  date: string;
  inputSource?: MeetingHubInputSource;
  participants?: string[];
  linkedProjectIds?: string[];
  linkedRepository?: string | null;
  sourceFileName?: string | null;
  notes: string;
  useAi?: boolean;
  runner?: MeetingHubAiRunner;
}
