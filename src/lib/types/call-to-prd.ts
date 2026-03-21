import type { CallDocPreset, CallDocType } from "@/lib/call-to-prd/document-config";
import type {
  CallCustomerImpact,
  CallInputKind,
  CallReproducibility,
  CallSeverity,
  CallUrgency,
} from "@/lib/call-to-prd/intake-config";

export const CALL_GENERATION_MODES = ["claude", "codex", "dual"] as const;
export type CallGenerationMode = (typeof CALL_GENERATION_MODES)[number];

export type CallStatus =
  | "uploading"
  | "transcribing"
  | "extracting-pdf"
  | "analyzing-pdf"
  | "analyzing"
  | "merging"
  | "generating-docs"
  | "completed"
  | "failed";

export interface GeneratedDoc {
  type: CallDocType;
  title: string;
  markdown: string;
}

export interface CallRecord {
  id: string;
  savedEntryName: string | null;
  fileName: string;
  fileSize: string;
  duration: string | null;
  projectName: string | null;
  projectPath: string | null;
  customerName: string | null;
  additionalContext: string | null;
  inputKind: CallInputKind;
  severity: CallSeverity;
  customerImpact: CallCustomerImpact;
  urgency: CallUrgency;
  reproducibility: CallReproducibility;
  currentWorkaround: string | null;
  separateExternalDocs: boolean;
  callDate: string;
  status: CallStatus;
  createdAt: string;
  updatedAt?: string | null;
  completedAt: string | null;
  transcript: string | null;
  prdMarkdown: string | null;
  pdfFileName: string | null;
  pdfContent: string | null;
  pdfAnalysis: string | null;
  projectContext: string | null;
  baselineEntryName: string | null;
  baselineTitle: string | null;
  claudePrd: string | null;
  codexPrd: string | null;
  diffReport: string | null;
  generationMode: CallGenerationMode;
  generationPreset: CallDocPreset;
  selectedDocTypes: CallDocType[];
  generatedDocs: GeneratedDoc[];
  nextActions: SavedNextActionDraft[];
  docGenerationProgress: string | null;
  generationWarnings: string[];
  error: string | null;
}

export interface CallHistoryResponse {
  records: CallRecord[];
  totalCount: number;
}

export interface SavedCallBundleIndexItem {
  entryName: string;
  title: string;
  kind: "bundle" | "legacy";
  size: string;
  createdAt: string;
  preview: string;
  docCount: number;
  docTypes: CallDocType[];
  projectName: string | null;
  customerName: string | null;
  generationMode: CallGenerationMode;
  baselineEntryName?: string | null;
  baselineTitle?: string | null;
}

export interface SavedCallBundleListResponse {
  items: SavedCallBundleIndexItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
}

export interface SavedCallBundleDetail {
  entryName: string;
  savedEntryName: string | null;
  title: string;
  kind: "bundle" | "legacy";
  createdAt: string;
  callDate: string;
  projectName: string | null;
  customerName: string | null;
  generationMode: CallGenerationMode;
  baselineEntryName: string | null;
  baselineTitle: string | null;
  inputKind: CallInputKind;
  severity: CallSeverity;
  customerImpact: CallCustomerImpact;
  urgency: CallUrgency;
  reproducibility: CallReproducibility;
  currentWorkaround: string | null;
  separateExternalDocs: boolean;
  generationPreset: CallDocPreset;
  selectedDocTypes: CallDocType[];
  generatedDocs: GeneratedDoc[];
  nextActions: SavedNextActionDraft[];
  prdMarkdown: string | null;
  claudePrd: string | null;
  codexPrd: string | null;
  diffReport: string | null;
  generationWarnings: string[];
}

export interface CallDocTemplateSet {
  id: string;
  name: string;
  projectName: string | null;
  projectPath: string | null;
  generationMode: CallGenerationMode;
  generationPreset: CallDocPreset;
  selectedDocTypes: CallDocType[];
  createdAt: string;
  updatedAt: string;
}

export type CallNextActionType =
  | "pm-handoff"
  | "frontend-plan"
  | "backend-plan"
  | "qa-plan"
  | "cs-brief"
  | "github-issues";

export interface SavedNextActionDraft {
  actionType: CallNextActionType;
  title: string;
  markdown: string;
  fileName: string | null;
  createdAt: string;
}

export interface CallNextActionRequest {
  actionType: CallNextActionType;
  savedEntryName?: string | null;
  projectName?: string | null;
  customerName?: string | null;
  projectContext?: string | null;
  baselineTitle?: string | null;
  baselinePrd?: string | null;
  additionalContext?: string | null;
  inputKind?: CallInputKind;
  severity?: CallSeverity;
  customerImpact?: CallCustomerImpact;
  urgency?: CallUrgency;
  reproducibility?: CallReproducibility;
  currentWorkaround?: string | null;
  separateExternalDocs?: boolean;
  prdMarkdown: string;
  generatedDocs: GeneratedDoc[];
}

export interface CallNextActionResponse extends SavedNextActionDraft {
  saved: boolean;
  savedEntryName: string | null;
}
