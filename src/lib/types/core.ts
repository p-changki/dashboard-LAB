export type CliSource = "claude" | "codex" | "gemini";
export type TeamModel = "opus" | "sonnet" | "haiku" | "unknown";
export type SkillSource =
  | "claude-skill"
  | "claude-command"
  | "codex-cli"
  | "codex-prompt";

export interface Agent {
  name: string;
  description: string;
  filePath: string;
  source: "claude";
  model?: string;
}

export interface TeamMember {
  role: string;
  model: TeamModel;
}

export interface Team {
  name: string;
  purpose: string;
  members: TeamMember[];
  memberCount: number;
  command: string;
  filePath: string;
}

export interface Skill {
  name: string;
  description: string;
  command: string;
  source: "claude-skill";
  filePath: string;
}

export interface Command {
  name: string;
  description: string;
  command: string;
  source: "claude-command";
  filePath: string;
}

export interface McpServer {
  name: string;
  command: string;
  args: string[];
  envKeys: string[];
  transport: "http" | "stdio" | "unknown";
  url?: string;
  filePath: string;
}

export interface CodexSkill {
  name: string;
  description: string;
  source: "codex-cli" | "codex-prompt";
  filePath: string;
}

export interface CodexInfo {
  version: string;
  skills: CodexSkill[];
  promptSkills: CodexSkill[];
  hasRoleFile: boolean;
  roleSummary: string;
  roleFilePath: string;
}

export interface GeminiSettings {
  version: string;
  authType: string;
  settings: Record<string, unknown>;
  filePath: string;
}

export interface GeminiInfo {
  version: string;
  authType: string;
  policySummary: string;
  settings: Record<string, unknown>;
  settingsPath: string;
  policyPath: string;
}

export interface ToolInfo {
  name: string;
  version: string;
  configPath: string;
  exists: boolean;
}

export interface CleanupAction {
  label: string;
  command: string;
  sizeFreeable: string;
  sizeBytes: number;
}

export type ProjectType = "nextjs" | "turbo" | "node-backend" | "document" | "other";

export interface ProjectSummary {
  name: string;
  path: string;
  type: ProjectType;
  techStack: string[];
  hasGit: boolean;
}

export interface ProjectInfo extends ProjectSummary {
  gitBranch: string | null;
  lastCommitDate: string | null;
  lastCommitMessage: string | null;
  lastCommitTimestamp: number | null;
  hasUncommitted: boolean;
  diskUsage: {
    total: string;
    totalBytes: number;
    nodeModules: string | null;
    nodeModulesBytes: number;
    nextCache: string | null;
    nextCacheBytes: number;
    turboCache: string | null;
    turboCacheBytes: number;
  };
  lastModified: string;
  lastModifiedTimestamp: number;
  cleanupActions: CleanupAction[];
}

export interface ProjectsLiteResponse {
  scanPath: string;
  totalProjects: number;
  projects: ProjectSummary[];
}

export interface ProjectsResponse {
  scanPath: string;
  totalProjects: number;
  totalDiskUsage: string;
  totalDiskUsageBytes: number;
  cleanableSize: string;
  cleanableSizeBytes: number;
  projects: ProjectInfo[];
}

export interface ObsidianNote {
  name: string;
  path: string;
  absPath: string;
  type: "file" | "folder";
  children?: ObsidianNote[];
  tags: string[];
  frontmatter: Record<string, unknown>;
  lastModified: string;
  lastModifiedTimestamp: number;
  sizeBytes: number;
  preview: string;
  isDownloaded?: boolean;
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface ObsidianTreeResponse {
  vaultPath: string;
  tree: ObsidianNote[];
  totalFiles: number;
  totalFolders: number;
  tags: TagInfo[];
  recentNotes: ObsidianNote[];
}

export interface ObsidianNoteContent {
  path: string;
  name: string;
  content: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  wikiLinks: string[];
  lastModified: string;
  isDownloaded?: boolean;
}

export interface ObsidianSearchResult {
  note: ObsidianNote;
  matchType: "title" | "content" | "tag";
  snippet: string;
}

export interface OverviewStats {
  totalAgents: number;
  totalTeams: number;
  totalSkills: number;
  totalCommands: number;
  totalMcpServers: number;
  totalCodexSkills: number;
}

export interface DashboardTodayWorkItem {
  id: string;
  source: "call-to-prd" | "cs-helper" | "ai-skill";
  title: string;
  summary: string;
  status: string;
  createdAt: string;
  badge: string;
}

export interface OverviewResponse {
  timestamp: string;
  tools: {
    claude: ToolInfo;
    codex: ToolInfo;
    gemini: ToolInfo;
  };
  agents: Agent[];
  teams: Team[];
  skills: Skill[];
  commands: Command[];
  mcpServers: McpServer[];
  codex: CodexInfo;
  gemini: GeminiInfo;
  stats: OverviewStats;
  todayWork: DashboardTodayWorkItem[];
}
