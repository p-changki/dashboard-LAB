export type DocType = "claude" | "codex" | "gemini" | "general";

export interface ProjectDoc {
  projectName: string;
  projectPath: string;
  fileName: string;
  filePath: string;
  type: DocType;
  preview: string;
  sizeBytes: number;
  lastModified: string;
  lastModifiedTimestamp: number;
}

export interface DocHubResponse {
  docs: ProjectDoc[];
  totalDocs: number;
  projectNames: string[];
  byType: Record<DocType, number>;
}

export interface DocContent {
  filePath: string;
  projectName: string;
  fileName: string;
  type: DocType;
  content: string;
  lastModified: string;
}

export interface DocSearchResult {
  doc: ProjectDoc;
  matchType: "filename" | "content";
  snippet: string;
}
