"use client";

import { Loader2 } from "lucide-react";
import type { Components } from "react-markdown";

import { MermaidBlock } from "@/components/markdown/MermaidBlock";
import { buildGeneratedDocTitle, CALL_DOC_DEFINITIONS, sortCallDocTypes, type CallDocType } from "@/lib/call-to-prd/document-config";
import type {
  CallGenerationMode,
  CallNextActionResponse,
  CallNextActionType,
  CallRecord,
  GeneratedDoc,
  SavedCallBundleDetail,
} from "@/lib/types/call-to-prd";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
}

export interface PromptDialogState {
  title: string;
  message: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (value: string) => void | Promise<void>;
}

export const GENERATION_MODE_OPTIONS: Array<{
  value: CallGenerationMode;
  label: string;
  description: string;
}> = [
  {
    value: "claude",
    label: "Claude 단일",
    description: "기본 추천. 가장 비용이 안정적입니다.",
  },
  {
    value: "codex",
    label: "Codex 단일",
    description: "Codex CLI가 준비된 경우에만 사용합니다.",
  },
  {
    value: "dual",
    label: "Dual AI",
    description: "Claude + Codex 생성 후 머지합니다. 비용이 가장 큽니다.",
  },
  {
    value: "openai",
    label: "OpenAI API",
    description: "CLI 없이 API key만으로 문서를 생성합니다.",
  },
];

// ---------------------------------------------------------------------------
// Markdown Components
// ---------------------------------------------------------------------------

export const markdownComponents: Components = {
  h1({ children }) {
    return <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">{children}</h1>;
  },
  h2({ children }) {
    return (
      <h2 className="mt-10 border-t border-white/10 pt-6 text-xl font-semibold tracking-tight text-white first:mt-0 first:border-t-0 first:pt-0">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return <h3 className="mt-6 text-base font-semibold text-white">{children}</h3>;
  },
  p({ children }) {
    return <p className="my-3 leading-7 text-gray-200">{children}</p>;
  },
  ul({ children }) {
    return <ul className="my-4 list-disc space-y-2 pl-6 text-gray-200 marker:text-gray-500">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-4 list-decimal space-y-2 pl-6 text-gray-200 marker:text-gray-500">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-7">{children}</li>;
  },
  hr() {
    return <hr className="my-8 border-white/10" />;
  },
  strong({ children }) {
    return <strong className="font-semibold text-white">{children}</strong>;
  },
  a({ children, ...props }) {
    return (
      <a
        {...props}
        className="font-medium text-blue-300 underline decoration-blue-400/50 underline-offset-4 hover:text-blue-200"
        target="_blank"
        rel="noreferrer"
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-5 rounded-r-xl border-l-2 border-purple-400/60 bg-purple-500/[0.06] px-4 py-3 text-gray-200">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515]">
        <table className="min-w-full border-collapse text-left text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-white/[0.04]">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-white/10">{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="align-top">{children}</tr>;
  },
  th({ children }) {
    return (
      <th className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="px-4 py-3 text-sm leading-6 text-gray-200">{children}</td>;
  },
  pre({ children }) {
    return <div className="my-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#151515] p-4">{children}</div>;
  },
  code(props) {
    const { children, className, ...rest } = props;
    const match = /language-(\w+)/.exec(className ?? "");
    const code = String(children).replace(/\n$/, "");
    const isBlock = Boolean(className) || code.includes("\n");

    if (match?.[1] === "mermaid") {
      return <MermaidBlock chart={code} />;
    }

    return (
      <code
        {...rest}
        className={
          isBlock
            ? `${className ?? ""} block whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-gray-100`
            : `${className ?? ""} rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[0.95em] text-blue-100`
        }
      >
        {children}
      </code>
    );
  },
};

// ---------------------------------------------------------------------------
// Step Component
// ---------------------------------------------------------------------------

export function Step({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <span className="h-5 w-5 rounded-full bg-green-500 text-center text-xs leading-5 text-white">✓</span>
      ) : active ? (
        <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
      ) : (
        <span className="h-5 w-5 rounded-full border border-white/20" />
      )}
      <span className={`text-sm ${done ? "text-gray-300" : active ? "text-purple-300" : "text-gray-600"}`}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

export function buildStatusLabel(status: CallRecord["status"]) {
  switch (status) {
    case "uploading":
      return "업로드 준비 중";
    case "transcribing":
      return "음성 텍스트 변환 중";
    case "extracting-pdf":
      return "PDF 텍스트 추출 중";
    case "analyzing-pdf":
      return "PDF 구조 분석 중";
    case "analyzing":
      return "PRD 생성 중";
    case "merging":
      return "Dual-AI 머지 중";
    case "generating-docs":
      return "실무 문서 생성 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    default:
      return status;
  }
}

export function getGenerationModeLabel(mode: CallGenerationMode) {
  switch (mode) {
    case "claude":
      return "Claude 단일";
    case "codex":
      return "Codex 단일";
    case "dual":
      return "Dual AI";
    case "openai":
      return "OpenAI API";
    default:
      return "AI 생성";
  }
}

export function buildGenerationStepLabel(mode: CallGenerationMode) {
  switch (mode) {
    case "claude":
      return "PRD 생성 (Claude 단일)";
    case "codex":
      return "PRD 생성 (Codex 단일)";
    case "dual":
      return "PRD 생성 (Claude + Codex 병렬)";
    case "openai":
      return "PRD 생성 (OpenAI API)";
    default:
      return "PRD 생성";
  }
}

export function formatCallToPrdFailureMessage(error: string | null) {
  if (!error) {
    return "입력값이나 로컬 실행 환경을 확인한 뒤 다시 시도해 주세요.";
  }

  if (error.includes("whisper CLI") || error.includes("openai-whisper") || error.includes("whisper-cpp")) {
    return "음성 변환 도구가 준비되지 않았습니다. `python3 -m pip install openai-whisper`를 설치하거나, `whisper-cpp`를 쓰는 경우 `WHISPER_MODEL_PATH`에 실제 ggml 모델 경로를 설정한 뒤 다시 시도해 주세요.";
  }

  if (error.includes("Claude 실패") || error.includes("Codex 실패") || error.includes("OpenAI API 실패")) {
    return `AI 생성 단계에서 중단되었습니다. ${error} 입력 내용은 유지되므로 프롬프트나 실행 환경을 확인한 뒤 다시 생성하면 됩니다.`;
  }

  if (error.includes("재시작")) {
    return "앱이 재시작되면서 진행 중 작업이 중단되었습니다. 같은 입력값으로 다시 생성하면 저장 구조와 다음 액션까지 다시 이어집니다.";
  }

  return error;
}

export function getDisplayDocs(record: CallRecord | null): GeneratedDoc[] {
  if (!record) {
    return [];
  }

  if (record.generatedDocs.length > 0) {
    return sortGeneratedDocs(record.generatedDocs);
  }

  if (record.prdMarkdown) {
    return [
      {
        type: "prd",
        title: buildGeneratedDocTitle("prd", record.projectName),
        markdown: record.prdMarkdown,
      },
    ];
  }

  return [];
}

export function sortGeneratedDocs(docs: readonly GeneratedDoc[]): GeneratedDoc[] {
  const order = sortCallDocTypes(docs.map((doc) => doc.type));
  return order
    .map((docType) => docs.find((doc) => doc.type === docType))
    .filter((doc): doc is GeneratedDoc => Boolean(doc));
}

export function hydrateRecordFromSavedBundle(detail: SavedCallBundleDetail, fileSize: string): CallRecord {
  return {
    id: detail.entryName,
    savedEntryName: detail.savedEntryName,
    fileName: detail.entryName,
    fileSize,
    duration: null,
    projectName: detail.projectName,
    projectPath: null,
    customerName: detail.customerName,
    additionalContext: null,
    inputKind: detail.inputKind,
    severity: detail.severity,
    customerImpact: detail.customerImpact,
    urgency: detail.urgency,
    reproducibility: detail.reproducibility,
    currentWorkaround: detail.currentWorkaround,
    separateExternalDocs: detail.separateExternalDocs,
    callDate: detail.callDate,
    status: "completed",
    createdAt: detail.createdAt,
    completedAt: detail.createdAt,
    transcript: null,
    prdMarkdown: detail.prdMarkdown,
    pdfFileName: null,
    pdfContent: null,
    pdfAnalysis: null,
    projectContext: null,
    baselineEntryName: detail.baselineEntryName,
    baselineTitle: detail.baselineTitle,
    claudePrd: detail.claudePrd,
    codexPrd: detail.codexPrd,
    diffReport: detail.diffReport,
    generationMode: detail.generationMode,
    generationPreset: detail.generationPreset,
    selectedDocTypes: detail.selectedDocTypes,
    generatedDocs: detail.generatedDocs,
    nextActions: detail.nextActions,
    docGenerationProgress: null,
    generationWarnings: detail.generationWarnings,
    error: null,
  };
}

export function buildNextActionMap(nextActions: CallRecord["nextActions"]): Partial<Record<CallNextActionType, CallNextActionResponse>> {
  return nextActions.reduce<Partial<Record<CallNextActionType, CallNextActionResponse>>>((accumulator, nextAction) => {
    accumulator[nextAction.actionType] = {
      ...nextAction,
      saved: Boolean(nextAction.fileName),
      savedEntryName: null,
    };
    return accumulator;
  }, {});
}

export function mergeRecordWithNextAction(
  record: CallRecord | null,
  targetRecordId: string,
  nextAction: CallNextActionResponse,
): CallRecord | null {
  if (!record || record.id !== targetRecordId) {
    return record;
  }

  return {
    ...record,
    savedEntryName: nextAction.savedEntryName ?? record.savedEntryName,
    nextActions: upsertNextAction(record.nextActions, nextAction),
  };
}

export function upsertNextAction(
  currentNextActions: CallRecord["nextActions"],
  nextAction: CallNextActionResponse,
): CallRecord["nextActions"] {
  return [
    ...currentNextActions.filter((item) => item.actionType !== nextAction.actionType),
    {
      actionType: nextAction.actionType,
      title: nextAction.title,
      markdown: nextAction.markdown,
      fileName: nextAction.fileName,
      createdAt: nextAction.createdAt,
    },
  ].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function buildDownloadFileName(options: {
  projectName: string | null;
  activeDocType: CallDocType;
  prdView: "merged" | "claude" | "codex" | "diff";
}): string {
  const base = sanitizeDownloadName(options.projectName ?? "call-to-prd");

  if (options.activeDocType === "prd") {
    const suffix = {
      merged: "prd",
      claude: "claude-prd",
      codex: "codex-prd",
      diff: "diff-report",
    }[options.prdView];

    return `${base}-${suffix}.md`;
  }

  return `${base}-${CALL_DOC_DEFINITIONS[options.activeDocType].fileName}`;
}

export function buildNextActionDownloadFileName(projectName: string | null, actionType: CallNextActionType) {
  const base = sanitizeDownloadName(projectName ?? "call-to-prd");
  const suffix = actionType.replace(/_/g, "-");
  return `${base}-${suffix}.md`;
}

export function sanitizeDownloadName(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-").toLowerCase();
}
