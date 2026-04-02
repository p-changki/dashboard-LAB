"use client";

import { Loader2 } from "lucide-react";
import type { Components } from "react-markdown";

import { MermaidBlock } from "@/components/markdown/MermaidBlock";
import type { AppLocale } from "@/lib/locale";
import { buildGeneratedDocTitle, CALL_DOC_DEFINITIONS, sortCallDocTypes, type CallDocType } from "@/lib/call-to-prd/document-config";
import type {
  CallGenerationMode,
  CallNextActionResponse,
  CallNextActionType,
  CallRecord,
  GeneratedDoc,
  SavedCallBundleDetail,
} from "@/lib/types/call-to-prd";
import {
  formatCallToPrdFailureMessage as formatFailureMessageByLocale,
  getCallGenerationModeLabel as getGenerationModeLabelByLocale,
  getCallGenerationModeOptions as getGenerationModeOptionsByLocale,
  getCallGenerationStepLabel as getGenerationStepLabelByLocale,
  getCallStatusLabel,
} from "@/features/call-to-prd/copy";

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

export function getGenerationModeOptions(locale: AppLocale) {
  return getGenerationModeOptionsByLocale(locale);
}

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
    return <p className="my-3 leading-7 text-text-secondary">{children}</p>;
  },
  ul({ children }) {
    return <ul className="my-4 list-disc space-y-2 pl-6 text-text-secondary marker:text-text-muted">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-4 list-decimal space-y-2 pl-6 text-text-secondary marker:text-text-muted">{children}</ol>;
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
      <blockquote className="my-5 rounded-r-xl border-l-2 border-purple-400/60 bg-purple-500/[0.06] px-4 py-3 text-text-secondary">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-6 overflow-x-auto rounded-2xl border border-border-base bg-bg-surface">
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
      <th className="border-b border-border-base px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="px-4 py-3 text-sm leading-6 text-text-secondary">{children}</td>;
  },
  pre({ children }) {
    return <div className="my-5 overflow-x-auto rounded-2xl border border-border-base bg-bg-surface p-4">{children}</div>;
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
            ? `${className ?? ""} block whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-text-primary`
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
      <span className={`text-sm ${done ? "text-text-secondary" : active ? "text-purple-300" : "text-text-disabled"}`}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

export function buildStatusLabel(status: CallRecord["status"], locale: AppLocale = "ko") {
  return getCallStatusLabel(status, locale);
}

export function buildGenerationModeLabel(mode: CallGenerationMode, locale: AppLocale = "ko") {
  return getGenerationModeLabelByLocale(mode, locale);
}

export function getGenerationModeLabel(mode: CallGenerationMode, locale: AppLocale = "ko") {
  return getGenerationModeLabelByLocale(mode, locale);
}

export function buildGenerationStepLabel(mode: CallGenerationMode, locale: AppLocale = "ko") {
  return getGenerationStepLabelByLocale(mode, locale);
}

export function formatCallToPrdFailureMessage(error: string | null, locale: AppLocale = "ko") {
  return formatFailureMessageByLocale(error, locale);
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
    projectPath: detail.projectPath,
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
    projectContext: detail.projectContext,
    projectContextSources: detail.projectContextSources,
    projectContextError: detail.projectContextError,
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
