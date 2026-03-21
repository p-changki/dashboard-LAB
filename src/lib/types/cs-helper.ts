export type CsChannel = "kakao" | "email" | "instagram" | "phone" | "other";
export type CsTone = "friendly" | "formal" | "casual";
export type CsAiRunner = "claude" | "codex" | "gemini";

export interface CsProject {
  id: string;
  name: string;
  path: string;
  hasContext: boolean;
  contextPath: string | null;
  contextSummary: string;
  warning: string | null;
}

export interface CsRequest {
  projectId: string;
  runner: CsAiRunner;
  channel: CsChannel;
  tone: CsTone;
  customerMessage: string;
  additionalContext: string;
  includeAnalysis: boolean;
}

export interface CsResponse {
  id: string;
  reply: string;
  analysis?: string | null;
  includeAnalysis: boolean;
  runner: CsAiRunner;
  projectId: string;
  channel: CsChannel;
  tone: CsTone;
  customerMessage: string;
  additionalContext: string;
  createdAt: string;
  promptUsed: string;
}

export interface CsHistoryItem {
  id: string;
  projectId: string;
  channel: CsChannel;
  customerMessagePreview: string;
  replyPreview: string;
  customerMessage: string;
  additionalContext: string;
  reply: string;
  analysis?: string | null;
  includeAnalysis: boolean;
  runner: CsAiRunner;
  tone: CsTone;
  createdAt: string;
}

export interface CsProjectsResponse {
  projects: CsProject[];
}

export interface CsHistoryResponse {
  items: CsHistoryItem[];
  totalCount: number;
}

export interface CsContextInitRequest {
  projectName: string;
}

export interface CsRegenerateRequest {
  originalId: string;
  tone?: CsTone;
  runner?: CsAiRunner;
  includeAnalysis?: boolean;
}
