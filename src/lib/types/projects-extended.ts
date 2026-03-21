export interface GitCommit {
  projectName: string;
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  authoredAt: string;
  authoredAtTimestamp: number;
}

export interface GitTimelineResponse {
  commits: GitCommit[];
  totalCommits: number;
}

export interface PortEntry {
  port: number;
  pid: number;
  processName: string;
  project: string | null;
}

export interface PortUsageResponse {
  ports: PortEntry[];
  totalPorts: number;
}

export interface EnvFileInfo {
  projectName: string;
  projectPath: string;
  fileName: string;
  filePath: string;
  keys: string[];
}

export interface EnvMapResponse {
  files: EnvFileInfo[];
  sharedKeys: string[];
}

export interface ICloudEntry {
  name: string;
  path: string;
  type: "file" | "folder";
  sizeBytes: number;
  lastModified: string;
  isDownloaded: boolean;
}

export interface ICloudBrowseResponse {
  rootPath: string;
  currentPath: string;
  entries: ICloudEntry[];
}

export interface ProjectMemo {
  projectPath: string;
  value: string;
  updatedAt: string;
}
