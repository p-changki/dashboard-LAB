export type SearchResultType =
  | "skill"
  | "agent"
  | "team"
  | "command"
  | "mcp"
  | "project"
  | "obsidian-note"
  | "ai-doc"
  | "app";

export interface GlobalSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  icon: string;
  tab: string;
  action: string;
  actionMode: "copy" | "navigate" | "launch";
  matchField: string;
  payload?: Record<string, string>;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  totalCount: number;
}

export interface PinnedItem {
  id: string;
  type: "skill" | "agent" | "team" | "command" | "project";
  name: string;
  pinnedAt: string;
  tab: string;
  action: string;
  actionMode: "copy" | "navigate";
}

export interface RecentItem {
  id: string;
  type: SearchResultType;
  name: string;
  action: "copied" | "navigated" | "launched";
  timestamp: string;
  tab?: string;
  value?: string;
  payload?: Record<string, string>;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

export interface GitBatchProjectStatus {
  project: string;
  branch: string;
}

export interface GitBatchStatus {
  uncommitted: Array<
    GitBatchProjectStatus & {
      changedFiles: number;
      untrackedFiles: number;
    }
  >;
  unpushed: Array<
    GitBatchProjectStatus & {
      aheadCount: number;
    }
  >;
  clean: Array<
    GitBatchProjectStatus & {
      lastCommitDate: string | null;
    }
  >;
  noGit: string[];
  summary: {
    totalProjects: number;
    uncommittedCount: number;
    unpushedCount: number;
    cleanCount: number;
    noGitCount: number;
  };
}

export interface NodeModulesCleanupItem {
  project: string;
  projectPath: string;
  targetPath: string;
  sizeBytes: number;
  sizeHuman: string;
}

export interface NodeModulesCleanupResponse {
  dryRun: boolean;
  items: NodeModulesCleanupItem[];
  totalTargets: number;
  totalSize: string;
  commandPreview: string[];
  selectedPaths?: string[];
}
