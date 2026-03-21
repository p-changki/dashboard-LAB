export type FileCategory =
  | "image"
  | "video"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "hwp"
  | "archive"
  | "installer"
  | "audio"
  | "code-project"
  | "web-save"
  | "system"
  | "other";

export type FileCleanupAction = "move" | "delete" | "keep" | "review";
export type CleanupUrgency = "high" | "medium" | "low";

export interface ScannedFile {
  name: string;
  path: string;
  extension: string;
  category: FileCategory;
  sizeBytes: number;
  sizeHuman: string;
  lastAccessed: string;
  lastModified: string;
  daysSinceAccess: number;
  isDuplicate: boolean;
  duplicateGroup: string | null;
}

export interface CleanupSuggestion {
  file: ScannedFile;
  action: FileCleanupAction;
  urgency: CleanupUrgency;
  reason: string;
  destination: string | null;
  command: string;
}

export interface FileManagerSection {
  totalFiles: number;
  totalFolders: number;
  totalSize: string;
  byCategory: Record<FileCategory, number>;
  files: ScannedFile[];
  suggestions: CleanupSuggestion[];
}

export interface FileManagerResponse {
  desktop: FileManagerSection;
  downloads: FileManagerSection;
  stats: {
    totalCleanable: number;
    totalCleanableSize: string;
    duplicateCount: number;
    installerCount: number;
    oldFileCount: number;
  };
}

export interface ExecutePreviewResponse {
  commands: string[];
  totalFiles: number;
  totalSize: string;
  copyAllCommand: string;
}

export type AutoOrganizeTarget = "desktop" | "downloads" | "both";

export interface AutoOrganizeRequest {
  target: AutoOrganizeTarget;
  dryRun: boolean;
}

export interface AutoOrganizeMoveItem {
  from: string;
  to: string;
  size: string;
}

export interface AutoOrganizeSkippedItem {
  path: string;
  reason: string;
}

export interface AutoOrganizeResponse {
  dryRun: boolean;
  moved: AutoOrganizeMoveItem[];
  skipped: AutoOrganizeSkippedItem[];
  summary: {
    totalMoved: number;
    totalSkipped: number;
    totalSize: string;
    createdDirs: string[];
  };
  undoScript: string;
}
