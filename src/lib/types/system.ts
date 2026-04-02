import type { PortEntry } from "./projects-extended";

export interface FileAction {
  type: "move" | "delete";
  sourcePath: string;
  destinationPath: string | null;
  command: string;
}

export interface FileActionRequest {
  actions: FileAction[];
  dryRun: boolean;
}

export interface FileActionResult {
  success: boolean;
  action: FileAction;
  error: string | null;
  undoCommand: string | null;
}

export interface FileActionResponse {
  results: FileActionResult[];
  totalSuccess: number;
  totalFailed: number;
  undoScript: string;
}

export type ProcessCategory =
  | "dev-tool"
  | "ai-cli"
  | "browser"
  | "editor"
  | "system"
  | "app"
  | "other";

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  memoryPercent: number;
  user: string;
  startTime: string;
  command: string;
  category: ProcessCategory;
}

export interface ProcessResponse {
  processes: ProcessInfo[];
  summary: {
    totalProcesses: number;
    totalCpu: number;
    totalMemory: string;
    byCategory: Record<ProcessCategory, number>;
  };
  devPorts: PortEntry[];
}

export interface SystemInfo {
  hostname: string;
  os: string;
  arch: string;
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
  memory: {
    total: string;
    used: string;
    free: string;
    percent: number;
  };
  disk: {
    total: string;
    used: string;
    free: string;
    percent: number;
  };
  uptime: string;
  network: {
    localIP: string;
    publicIP: string | null;
  };
}

export type AppCategory =
  | "development"
  | "browser"
  | "productivity"
  | "design"
  | "media"
  | "system"
  | "other";

export interface InstalledApp {
  name: string;
  path: string;
  bundleId: string;
  isRunning: boolean;
  icon: string | null;
  category: AppCategory;
}

export type RuntimeCheckStatus = "pass" | "warn" | "fail";
export type DashboardLabRuntimeRemedyAction = "run" | "open_url" | "manual";
export type DashboardLabRuntimeInstallStatus = "success" | "failed" | "skipped";

export interface DashboardLabRuntimeCheckRemedy {
  action: DashboardLabRuntimeRemedyAction;
  label: string;
  detail: string;
  taskId?: string;
  command?: string;
  url?: string;
}

export interface DashboardLabRuntimeIntegrations {
  openaiConfigured: boolean;
}

export type DashboardLabDisconnectableCommand =
  | "claude"
  | "codex"
  | "gemini"
  | "gh";

export interface DashboardLabRuntimeSettingsPaths {
  projectsRoot: string | null;
  dataRoot: string | null;
  prdSaveDir: string | null;
  csContextsDir: string | null;
  allowedRoots: string[];
}

export interface DashboardLabRuntimeSettings {
  version: 1;
  paths: DashboardLabRuntimeSettingsPaths;
  disabledCommands: DashboardLabDisconnectableCommand[];
}

export interface DashboardLabRuntimePathStatus {
  id: keyof DashboardLabRuntimeSettingsPaths;
  label: string;
  path: string | null;
  exists: boolean;
  required: boolean;
}

export interface DashboardLabRuntimePathCandidate {
  path: string;
  exists: boolean;
  selected: boolean;
}

export interface DashboardLabRuntimeCheck {
  id: string;
  label: string;
  status: RuntimeCheckStatus;
  detail: string;
  required: boolean;
  fixHint?: string | null;
  remedy?: DashboardLabRuntimeCheckRemedy | null;
}

export interface DashboardLabRuntimeWorkflow {
  id: string;
  label: string;
  status: RuntimeCheckStatus;
  detail: string;
}

export interface DashboardLabRuntimeSummaryResponse {
  app: {
    slug: string;
    displayName: string;
    launcherFileName: string;
  };
  settings: DashboardLabRuntimeSettings;
  resolvedPaths: {
    projectsRoot: DashboardLabRuntimePathStatus;
    prdSaveDir: DashboardLabRuntimePathStatus;
    csContextsDir: DashboardLabRuntimePathStatus;
    allowedRoots: string[];
  };
  discovery: {
    projectsRootCandidates: DashboardLabRuntimePathCandidate[];
  };
  integrations: DashboardLabRuntimeIntegrations;
  checks: DashboardLabRuntimeCheck[];
  workflows: DashboardLabRuntimeWorkflow[];
}

export interface DashboardLabRuntimeInstallResult {
  taskId: string;
  label: string;
  status: DashboardLabRuntimeInstallStatus;
  detail: string;
  output?: string | null;
}

export interface DashboardLabRuntimeInstallResponse {
  results: DashboardLabRuntimeInstallResult[];
  summary: DashboardLabRuntimeSummaryResponse;
}
