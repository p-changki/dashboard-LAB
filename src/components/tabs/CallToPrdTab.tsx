"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CircleHelp, Download, FileAudio, FileText, FolderOpen, Loader2, Phone, Upload } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { MermaidBlock } from "@/components/markdown/MermaidBlock";
import { AppConfirmModal } from "@/components/modals/AppConfirmModal";
import { AppPromptModal } from "@/components/modals/AppPromptModal";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { ErrorCard } from "@/components/ErrorCard";
import { NoticeBanner } from "@/components/NoticeBanner";
import { DocSelectionGuideModal } from "@/components/tabs/call-to-prd/DocSelectionGuideModal";
import { CALL_NEXT_ACTION_DEFINITIONS } from "@/lib/call-to-prd/next-action-config";
import {
  buildGeneratedDocTitle,
  CALL_DOC_DEFINITIONS,
  CALL_DOC_PRESET_DEFINITIONS,
  sortCallDocTypes,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import {
  CALL_CUSTOMER_IMPACT_LABELS,
  CALL_CUSTOMER_IMPACTS,
  CALL_INPUT_KIND_LABELS,
  CALL_INPUT_KINDS,
  CALL_REPRODUCIBILITY_LABELS,
  CALL_REPRODUCIBILITY_STATES,
  CALL_SEVERITIES,
  CALL_SEVERITY_LABELS,
  CALL_URGENCY_LABELS,
  CALL_URGENCY_LEVELS,
  DEFAULT_CALL_INTAKE_METADATA,
  type CallCustomerImpact,
  type CallInputKind,
  type CallReproducibility,
  type CallSeverity,
  type CallUrgency,
} from "@/lib/call-to-prd/intake-config";
import { formatPrdMarkdown } from "@/lib/call-to-prd/prd-markdown-formatter";
import {
  deleteCallDocTemplateSet,
  readCallDocTemplateSets,
  saveCallDocTemplateSet,
} from "@/lib/call-to-prd/template-sets";
import type { ProjectSummary, ProjectsLiteResponse } from "@/lib/types";
import type {
  CallGenerationMode,
  CallDocTemplateSet,
  CallNextActionResponse,
  CallNextActionType,
  CallRecord,
  GeneratedDoc,
  SavedCallBundleDetail,
  SavedCallBundleIndexItem,
  SavedCallBundleListResponse,
} from "@/lib/types/call-to-prd";

type InputMode = "file" | "text";
const SAVED_PAGE_SIZE = 6;
const GENERATION_MODE_OPTIONS: Array<{
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
];

interface CallToPrdProjectsResponse extends ProjectsLiteResponse {
  currentProjectPath?: string | null;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
}

interface PromptDialogState {
  title: string;
  message: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (value: string) => void | Promise<void>;
}

const markdownComponents: Components = {
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

export function CallToPrdTab() {
  const [mode, setMode] = useState<InputMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [directText, setDirectText] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [currentProjectPath, setCurrentProjectPath] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [inputKind, setInputKind] = useState<CallInputKind>(DEFAULT_CALL_INTAKE_METADATA.inputKind);
  const [severity, setSeverity] = useState<CallSeverity>(DEFAULT_CALL_INTAKE_METADATA.severity);
  const [customerImpact, setCustomerImpact] = useState<CallCustomerImpact>(DEFAULT_CALL_INTAKE_METADATA.customerImpact);
  const [urgency, setUrgency] = useState<CallUrgency>(DEFAULT_CALL_INTAKE_METADATA.urgency);
  const [reproducibility, setReproducibility] = useState<CallReproducibility>(DEFAULT_CALL_INTAKE_METADATA.reproducibility);
  const [currentWorkaround, setCurrentWorkaround] = useState(DEFAULT_CALL_INTAKE_METADATA.currentWorkaround ?? "");
  const [separateExternalDocs, setSeparateExternalDocs] = useState(DEFAULT_CALL_INTAKE_METADATA.separateExternalDocs);
  const [baselineEntryName, setBaselineEntryName] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<CallGenerationMode>("claude");
  const [generationPreset, setGenerationPreset] = useState<CallDocPreset>("core");
  const [selectedDocTypes, setSelectedDocTypes] = useState<CallDocType[]>(CALL_DOC_PRESET_DEFINITIONS.core.docTypes);
  const [templateSets, setTemplateSets] = useState<CallDocTemplateSet[]>([]);
  const [current, setCurrent] = useState<CallRecord | null>(null);
  const [history, setHistory] = useState<CallRecord[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<CallRecord | null>(null);
  const [savedBundles, setSavedBundles] = useState<SavedCallBundleIndexItem[]>([]);
  const [savedQuery, setSavedQuery] = useState("");
  const [savedPage, setSavedPage] = useState(1);
  const [savedTotalCount, setSavedTotalCount] = useState(0);
  const [savedTotalPages, setSavedTotalPages] = useState(0);
  const [selectedSaved, setSelectedSaved] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState | null>(null);
  const [activeDocType, setActiveDocType] = useState<CallDocType>("prd");
  const [prdView, setPrdView] = useState<"merged" | "claude" | "codex" | "diff">("merged");
  const [docResultsOpen, setDocResultsOpen] = useState(true);
  const [docContentOpen, setDocContentOpen] = useState(true);
  const [savedTreeOpen, setSavedTreeOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [savedOpen, setSavedOpen] = useState(true);
  const [nextActionsOpen, setNextActionsOpen] = useState(true);
  const [nextActionContentOpen, setNextActionContentOpen] = useState(true);
  const [nextActionLoading, setNextActionLoading] = useState<CallNextActionType | null>(null);
  const [nextActionResults, setNextActionResults] = useState<Partial<Record<CallNextActionType, CallNextActionResponse>>>({});
  const [activeNextAction, setActiveNextAction] = useState<CallNextActionType | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredSavedQuery = useDeferredValue(savedQuery);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/call-to-prd/history");
      const data = await res.json();
      setHistory(data.records ?? []);
    } catch { /* ignore */ }
  }, []);

  const fetchSaved = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(savedPage),
        pageSize: String(SAVED_PAGE_SIZE),
      });

      if (deferredSavedQuery.trim()) {
        params.set("query", deferredSavedQuery.trim());
      }

      const res = await fetch(`/api/call-to-prd/saved?${params.toString()}`);
      const data: SavedCallBundleListResponse = await res.json();
      setSavedBundles(data.items ?? []);
      setSavedTotalCount(data.totalCount ?? 0);
      setSavedTotalPages(data.totalPages ?? 0);
      if (typeof data.page === "number" && data.page !== savedPage) {
        setSavedPage(data.page);
      }
    } catch { /* ignore */ }
  }, [deferredSavedQuery, savedPage]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/call-to-prd/projects", { cache: "no-store" });
      const data: CallToPrdProjectsResponse = await res.json();
      setProjects(data.projects ?? []);
      setCurrentProjectPath(data.currentProjectPath ?? "");
    } catch {
      setProjects([]);
      setCurrentProjectPath("");
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchSaved();
    fetchProjects();
    setTemplateSets(readCallDocTemplateSets());
  }, [fetchHistory, fetchSaved, fetchProjects]);

  const displayRecord = useMemo(() => selectedHistory ?? current, [current, selectedHistory]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.path === projectPath) ?? null,
    [projectPath, projects],
  );
  const displayDocs = useMemo(() => getDisplayDocs(displayRecord), [displayRecord]);
  const activeDoc = useMemo(
    () => displayDocs.find((doc) => doc.type === activeDocType) ?? displayDocs[0] ?? null,
    [activeDocType, displayDocs],
  );
  const generationWarnings = useMemo(
    () => displayRecord?.generationWarnings ?? [],
    [displayRecord],
  );
  const queueRecords = useMemo(() => {
    const merged = new Map<string, CallRecord>();

    history.forEach((record) => {
      merged.set(record.id, record);
    });

    if (current) {
      merged.set(current.id, current);
    }

    return [...merged.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [current, history]);
  const activeQueue = useMemo(
    () => queueRecords.filter((record) => record.status !== "completed" && record.status !== "failed"),
    [queueRecords],
  );
  const recentQueue = useMemo(
    () => queueRecords.filter((record) => record.status === "completed" || record.status === "failed").slice(0, 5),
    [queueRecords],
  );
  const availableTemplateSets = useMemo(() => {
    return templateSets.filter((item) => {
      if (!item.projectPath) {
        return true;
      }

      return item.projectPath === projectPath;
    });
  }, [projectPath, templateSets]);
  const needsChangeBaseline = useMemo(
    () => selectedDocTypes.includes("change-request-diff"),
    [selectedDocTypes],
  );
  const selectedDocContent = useMemo(() => {
    if (activeDocType === "prd" && displayRecord) {
      return {
        merged: displayRecord.prdMarkdown ?? "",
        claude: displayRecord.claudePrd ?? "(Claude 결과 없음)",
        codex: displayRecord.codexPrd ?? "(Codex 결과 없음)",
        diff: displayRecord.diffReport ?? "(차이점 리포트 없음)",
      }[prdView];
    }

    return activeDoc?.markdown ?? "";
  }, [activeDoc, activeDocType, displayRecord, prdView]);
  const renderedDocContent = useMemo(
    () => (selectedDocContent ? formatPrdMarkdown(selectedDocContent) : ""),
    [selectedDocContent],
  );
  const availableNextActions = useMemo(
    () => Object.entries(CALL_NEXT_ACTION_DEFINITIONS) as Array<
      [CallNextActionType, (typeof CALL_NEXT_ACTION_DEFINITIONS)[CallNextActionType]]
    >,
    [],
  );
  const activeNextActionResult = useMemo(
    () => (activeNextAction ? nextActionResults[activeNextAction] ?? null : null),
    [activeNextAction, nextActionResults],
  );
  const nextActionList = useMemo(
    () => availableNextActions
      .map(([actionType]) => nextActionResults[actionType] ?? null)
      .filter((item): item is CallNextActionResponse => Boolean(item)),
    [availableNextActions, nextActionResults],
  );
  const renderedNextActionContent = useMemo(
    () => (activeNextActionResult?.markdown ? formatPrdMarkdown(activeNextActionResult.markdown) : ""),
    [activeNextActionResult],
  );
  const displaySavedEntryName = useMemo(
    () => displayRecord?.savedEntryName ?? (selectedSaved ? selectedSaved : null),
    [displayRecord?.savedEntryName, selectedSaved],
  );

  useEffect(() => {
    setPrdView("merged");
    setActiveDocType("prd");
    setDocResultsOpen(true);
    setDocContentOpen(true);
    setSavedTreeOpen(true);
    setNextActionsOpen(true);
    setNextActionContentOpen(true);
    setNextActionResults(buildNextActionMap(displayRecord?.nextActions ?? []));
    setActiveNextAction(displayRecord?.nextActions?.[0]?.actionType ?? null);
  }, [displayRecord?.id, displayRecord?.nextActions]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timer = window.setTimeout(() => setFeedbackMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  useEffect(() => {
    if (displayDocs.length === 0) {
      return;
    }

    if (!displayDocs.some((doc) => doc.type === activeDocType)) {
      setActiveDocType(displayDocs[0].type);
    }
  }, [activeDocType, displayDocs]);

  useEffect(() => {
    setDocContentOpen(true);
  }, [activeDocType, prdView]);

  useEffect(() => {
    if (activeNextActionResult) {
      setNextActionContentOpen(true);
    }
  }, [activeNextActionResult]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  async function handleSubmit() {
    const formData = new FormData();
    if (mode === "file" && file) {
      formData.append("file", file);
    } else if (mode === "text" && directText.trim()) {
      formData.append("directTranscript", directText);
    } else {
      return;
    }
    if (pdfFile) formData.append("pdfFile", pdfFile);
    if (projectName) formData.append("projectName", projectName);
    if (projectPath) formData.append("projectPath", projectPath);
    if (customerName) formData.append("customerName", customerName);
    if (additionalContext) formData.append("additionalContext", additionalContext);
    formData.append("inputKind", inputKind);
    formData.append("severity", severity);
    formData.append("customerImpact", customerImpact);
    formData.append("urgency", urgency);
    formData.append("reproducibility", reproducibility);
    if (currentWorkaround.trim()) formData.append("currentWorkaround", currentWorkaround.trim());
    formData.append("separateExternalDocs", String(separateExternalDocs));
    if (baselineEntryName) formData.append("baselineEntryName", baselineEntryName);
    formData.append("generationMode", generationMode);
    formData.append("generationPreset", generationPreset);
    selectedDocTypes.forEach((docType) => formData.append("selectedDocTypes", docType));

    setSelectedHistory(null);
    setSelectedSaved(null);
    setCurrent(null);
    setActiveDocType("prd");
    setPrdView("merged");

    const res = await fetch("/api/call-to-prd/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.id) {
      startPolling(data.id);
      setFeedbackMessage("문서 생성 작업이 시작되었습니다. 완료되면 저장 구조와 다음 액션에서 이어서 사용할 수 있습니다.");
    }
  }

  async function handleGenerateNextAction(actionType: CallNextActionType) {
    if (!displayRecord?.prdMarkdown) {
      return;
    }

    setNextActionLoading(actionType);

    try {
      const response = await fetch("/api/call-to-prd/actions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          savedEntryName: displayRecord.savedEntryName,
          projectName: displayRecord.projectName,
          customerName: displayRecord.customerName,
          projectContext: displayRecord.projectContext,
          baselineTitle: displayRecord.baselineTitle,
          additionalContext: displayRecord.additionalContext,
          inputKind: displayRecord.inputKind,
          severity: displayRecord.severity,
          customerImpact: displayRecord.customerImpact,
          urgency: displayRecord.urgency,
          reproducibility: displayRecord.reproducibility,
          currentWorkaround: displayRecord.currentWorkaround,
          separateExternalDocs: displayRecord.separateExternalDocs,
          prdMarkdown: displayRecord.prdMarkdown,
          generatedDocs: displayDocs,
        }),
      });

      if (!response.ok) {
        return;
      }

      const result: CallNextActionResponse = await response.json();

      setNextActionResults((currentResults) => ({
        ...currentResults,
        [actionType]: result,
      }));
      setActiveNextAction(actionType);
      setFeedbackMessage(
        result.saved
          ? `${result.title} 초안을 저장 구조 아래 next-actions에 저장했습니다.`
          : `${result.title} 초안을 생성했습니다.`,
      );
      setCurrent((record) => mergeRecordWithNextAction(record, displayRecord.id, result));
      setSelectedHistory((record) => mergeRecordWithNextAction(record, displayRecord.id, result));
      setHistory((records) => records.map((record) => mergeRecordWithNextAction(record, displayRecord.id, result) ?? record));
    } catch {
      /* ignore */
    } finally {
      setNextActionLoading(null);
    }
  }

  function downloadNextActionMarkdown() {
    if (!activeNextActionResult?.markdown) {
      return;
    }

    const fileName = buildNextActionDownloadFileName(
      displayRecord?.projectName ?? null,
      activeNextActionResult.actionType,
    );
    const blob = new Blob([activeNextActionResult.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function getPollingDelay(status: CallRecord["status"]) {
    switch (status) {
      case "uploading":
      case "transcribing":
      case "extracting-pdf":
        return 2_000;
      case "analyzing-pdf":
        return 5_000;
      case "analyzing":
        return 6_000;
      case "merging":
        return 3_000;
      case "generating-docs":
        return 3_000;
      default:
        return 3_000;
    }
  }

  function applyPreset(preset: CallDocPreset) {
    setGenerationPreset(preset);

    if (preset === "custom") {
      return;
    }

    setSelectedDocTypes(CALL_DOC_PRESET_DEFINITIONS[preset].docTypes);
  }

  function toggleDocType(docType: CallDocType) {
    if (docType === "prd") {
      return;
    }

    setGenerationPreset("custom");
    setSelectedDocTypes((prev) => {
      const next = prev.includes(docType)
        ? prev.filter((type) => type !== docType)
        : [...prev, docType];

      return sortCallDocTypes(next);
    });
  }

  function handleSavedQueryChange(nextQuery: string) {
    setSavedQuery(nextQuery);
    setSavedPage(1);
  }

  function handleProjectSelect(nextPath: string) {
    setProjectPath(nextPath);
    const nextProject = projects.find((project) => project.path === nextPath) ?? null;

    if (nextProject) {
      setProjectName(nextProject.name);
    }
  }

  function applyTemplateSet(templateSet: CallDocTemplateSet) {
    setGenerationMode(templateSet.generationMode);
    setGenerationPreset(templateSet.generationPreset);
    setSelectedDocTypes(sortCallDocTypes(templateSet.selectedDocTypes));

    if (templateSet.projectPath) {
      handleProjectSelect(templateSet.projectPath);
    }
  }

  function handleSaveTemplateSet() {
    setPromptDialog({
      title: "템플릿 세트 저장",
      message: "현재 문서 구성과 생성 모드를 템플릿 세트로 저장합니다.",
      placeholder: "템플릿 세트 이름을 입력하세요.",
      initialValue: projectName ? `${projectName} 기본 세트` : "내 템플릿",
      confirmLabel: "저장",
      onConfirm: (name) => {
        setTemplateSets(
          saveCallDocTemplateSet({
            name,
            projectName: projectName || selectedProject?.name || null,
            projectPath: projectPath || null,
            generationMode,
            generationPreset,
            selectedDocTypes,
          }),
        );
        setFeedbackMessage("현재 문서 구성을 템플릿 세트로 저장했습니다.");
      },
    });
  }

  function handleDeleteTemplateSet(templateSetId: string) {
    setConfirmDialog({
      title: "템플릿 세트 삭제",
      message: "이 템플릿 세트를 삭제할까요?",
      confirmLabel: "삭제",
      tone: "danger",
      onConfirm: () => {
        setTemplateSets(deleteCallDocTemplateSet(templateSetId));
        setFeedbackMessage("템플릿 세트를 삭제했습니다.");
      },
    });
  }

  async function handleDeleteSavedBundle(entryName: string) {
    setConfirmDialog({
      title: "저장된 문서 삭제",
      message: "저장된 문서 번들과 next-actions를 함께 삭제할까요?",
      confirmLabel: "삭제",
      tone: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/call-to-prd/saved/${encodeURIComponent(entryName)}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            return;
          }

          if (selectedSaved === entryName) {
            setSelectedSaved(null);
            setCurrent(null);
          }

          await fetchSaved();
          setFeedbackMessage("저장된 문서를 삭제했습니다.");
        } catch {
          /* ignore */
        }
      },
    });
  }

  async function handleDeleteHistoryRecord(recordId: string) {
    setConfirmDialog({
      title: "현재 세션 기록 삭제",
      message: "현재 세션 기록을 삭제할까요?",
      confirmLabel: "삭제",
      tone: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch("/api/call-to-prd/history", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: recordId }),
          });

          if (!response.ok) {
            return;
          }

          setHistory((records) => records.filter((record) => record.id !== recordId));
          setSelectedHistory((record) => (record?.id === recordId ? null : record));
          setCurrent((record) => (record?.id === recordId ? null : record));
          setFeedbackMessage("현재 세션 기록을 삭제했습니다.");
        } catch {
          /* ignore */
        }
      },
    });
  }

  function handleRetryRecord(record: CallRecord) {
    setProjectName(record.projectName ?? "");
    setProjectPath(record.projectPath ?? "");
    setCustomerName(record.customerName ?? "");
    setAdditionalContext(record.additionalContext ?? "");
    setInputKind(record.inputKind);
    setSeverity(record.severity);
    setCustomerImpact(record.customerImpact);
    setUrgency(record.urgency);
    setReproducibility(record.reproducibility);
    setCurrentWorkaround(record.currentWorkaround ?? "");
    setSeparateExternalDocs(record.separateExternalDocs);
    setBaselineEntryName(record.baselineEntryName ?? "");
    setGenerationMode(record.generationMode);
    setGenerationPreset(record.generationPreset);
    setSelectedDocTypes(sortCallDocTypes(record.selectedDocTypes));
    setSelectedHistory(record);
    setSelectedSaved(null);
    setFile(null);
    setPdfFile(null);

    if (record.transcript?.trim()) {
      setMode("text");
      setDirectText(record.transcript);
      setFeedbackMessage("입력값을 복원했습니다. 내용 확인 후 다시 문서 생성을 시작하세요.");
    } else {
      setMode("file");
      setDirectText("");
      setFeedbackMessage("설정값을 복원했습니다. 원본 오디오/PDF 파일은 다시 첨부한 뒤 재시도하세요.");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function downloadCurrentMarkdown() {
    if (!selectedDocContent) {
      return;
    }

    const fileName = buildDownloadFileName({
      projectName: displayRecord?.projectName ?? null,
      activeDocType,
      prdView,
    });

    const blob = new Blob([selectedDocContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const hasSupportDocs = useMemo(
    () => (current?.selectedDocTypes ?? []).some((docType) => docType !== "prd"),
    [current?.selectedDocTypes],
  );

  function startPolling(id: string) {
    stopPolling();

    const poll = async () => {
      const res = await fetch(`/api/call-to-prd/status/${id}`);
      const record: CallRecord = await res.json();
      setCurrent(record);

      if (record.status === "completed" || record.status === "failed") {
        stopPolling();
        fetchHistory();
        fetchSaved();
        return;
      }

      pollingRef.current = setTimeout(poll, getPollingDelay(record.status));
    };

    void poll();
  }

  return (
    <div className="space-y-5">
      {feedbackMessage ? (
        <NoticeBanner
          title="반영되었습니다"
          message={feedbackMessage}
        />
      ) : null}

      {/* 입력 모드 토글 */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("file")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "file" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          <FileAudio className="mr-2 inline h-4 w-4" />녹음 파일
        </button>
        <button type="button" onClick={() => setMode("text")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "text" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          내용 직접 입력
        </button>
      </div>

      {/* 파일 업로드 또는 텍스트 입력 */}
      {mode === "file" ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-[#1e1e1e] p-10 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-[#242424]">
          <Upload className="h-8 w-8 text-gray-500" />
          <p className="text-sm text-gray-400">{file ? file.name : "녹음 파일을 드래그하거나 클릭 (.m4a .mp3 .wav .webm, 최대 50MB)"}</p>
          <input type="file" accept=".m4a,.mp3,.wav,.webm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      ) : (
        <textarea
          value={directText}
          onChange={(e) => setDirectText(e.target.value)}
          placeholder="고객 불만, 회의 메모, 통화 내용, 운영 이슈를 여기에 붙여넣기..."
          className="w-full rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
          rows={8}
        />
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-[#1e1e1e] p-6 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-[#242424]">
        <FileText className="h-6 w-6 text-gray-500" />
        <p className="text-sm text-gray-400">
          {pdfFile ? `첨부 PDF: ${pdfFile.name}` : "참고 PDF 첨부 (워크북/양식, 선택, 최대 20MB)"}
        </p>
        <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
      </label>

      {/* 메타 정보 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select
          value={projectPath}
          onChange={(event) => handleProjectSelect(event.target.value)}
          className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
        >
          <option value="">로컬 프로젝트 선택 (선택)</option>
          {projects.map((project) => (
            <option key={project.path} value={project.path}>
              {project.path === currentProjectPath ? `${project.name} (현재 작업중)` : project.name}
            </option>
          ))}
        </select>
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="프로젝트명 (선택)" className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="고객명 (선택)" className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
        <input value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder="추가 맥락 (선택)" className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
      </div>

      <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#f0f0f0]">입력 구조화</h3>
            <p className="mt-1 text-xs leading-6 text-gray-500">
              입력 유형과 문제 강도를 같이 주면 문제정의서, PRD, 고객 공유 문서의 톤과 우선순위 판단이 더 안정적으로 나옵니다.
            </p>
          </div>
          <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-[11px] text-cyan-200">
            {CALL_INPUT_KIND_LABELS[inputKind]}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2">
            <span className="text-xs text-gray-500">입력 유형</span>
            <select
              value={inputKind}
              onChange={(event) => setInputKind(event.target.value as CallInputKind)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_INPUT_KINDS.map((value) => (
                <option key={value} value={value}>{CALL_INPUT_KIND_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">심각도</span>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as CallSeverity)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_SEVERITIES.map((value) => (
                <option key={value} value={value}>{CALL_SEVERITY_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">영향 범위</span>
            <select
              value={customerImpact}
              onChange={(event) => setCustomerImpact(event.target.value as CallCustomerImpact)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_CUSTOMER_IMPACTS.map((value) => (
                <option key={value} value={value}>{CALL_CUSTOMER_IMPACT_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">긴급도</span>
            <select
              value={urgency}
              onChange={(event) => setUrgency(event.target.value as CallUrgency)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_URGENCY_LEVELS.map((value) => (
                <option key={value} value={value}>{CALL_URGENCY_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">재현 상태</span>
            <select
              value={reproducibility}
              onChange={(event) => setReproducibility(event.target.value as CallReproducibility)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_REPRODUCIBILITY_STATES.map((value) => (
                <option key={value} value={value}>{CALL_REPRODUCIBILITY_LABELS[value]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <input
            value={currentWorkaround}
            onChange={(event) => setCurrentWorkaround(event.target.value)}
            placeholder="현재 우회책 또는 임시 대응이 있으면 입력"
            className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
          />

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#151515] px-4 py-3 text-sm text-gray-300">
            <div>
              <p className="font-medium text-[#f0f0f0]">고객 공유 문서 분리</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">켜면 고객 전달용 문서에서 내부 메모와 원인 가설을 제외합니다.</p>
            </div>
            <input
              type="checkbox"
              checked={separateExternalDocs}
              onChange={(event) => setSeparateExternalDocs(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/20 accent-purple-400"
            />
          </label>
        </div>
      </div>

      {selectedProject && (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#f0f0f0]">{selectedProject.name}</span>
            <span className="rounded-full bg-purple-900/25 px-2 py-0.5 text-[11px] text-purple-200">{selectedProject.type}</span>
            {selectedProject.techStack.slice(0, 4).map((stack) => (
              <span key={stack} className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-gray-300">
                {stack}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">{selectedProject.path}</p>
          {selectedProject.path === currentProjectPath && (
            <p className="mt-2 text-xs font-medium text-purple-200">현재 이 워크스페이스를 기준으로 문서를 생성합니다.</p>
          )}
          <p className="mt-2 text-xs leading-6 text-gray-400">
            선택한 프로젝트의 `package.json`, `README`, `docs`, git 상태를 요약해서 문서 생성 프롬프트에 함께 반영합니다.
          </p>
        </div>
      )}

      {needsChangeBaseline ? (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">변경 비교 기준 문서</h3>
              <p className="mt-1 text-xs leading-6 text-gray-500">
                선택하면 해당 저장 문서를 기준선으로 비교하고, 비워두면 같은 프로젝트의 최신 저장 문서를 자동 선택합니다.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={baselineEntryName}
              onChange={(event) => setBaselineEntryName(event.target.value)}
              className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              <option value="">자동 선택 (같은 프로젝트 최신 저장 문서)</option>
              {savedBundles.map((bundle) => (
                <option key={bundle.entryName} value={bundle.entryName}>
                  {bundle.title} · {bundle.createdAt.slice(0, 10)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setBaselineEntryName("")}
              className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-xs text-gray-300 transition hover:bg-[#242424]"
            >
              자동 기준선 사용
            </button>
          </div>
        </div>
      ) : null}

      {(activeQueue.length > 0 || recentQueue.length > 0) && (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">작업 큐</h3>
              <p className="mt-1 text-xs leading-6 text-gray-500">
                현재 생성 중인 작업과 최근 완료 작업을 한 화면에서 확인합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-purple-900/20 px-2 py-0.5 text-purple-200">진행중 {activeQueue.length}</span>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">최근 완료 {recentQueue.length}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">In Progress</p>
              {activeQueue.length > 0 ? activeQueue.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    setSelectedHistory(record);
                    setSelectedSaved(null);
                  }}
                  className="w-full rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 text-left transition hover:bg-[#202020]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                    <span className="text-xs text-purple-300">{record.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {record.docGenerationProgress ?? buildStatusLabel(record.status)}
                  </p>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
                  진행 중인 작업이 없습니다.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Recent</p>
              {recentQueue.length > 0 ? recentQueue.map((record) => (
                <div
                  key={record.id}
                  className="w-full rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 transition hover:bg-[#202020]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHistory(record);
                        setSelectedSaved(null);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                        <span className={`text-xs ${record.status === "completed" ? "text-emerald-300" : "text-rose-300"}`}>
                          {record.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{record.callDate} · {record.generatedDocs.length || record.selectedDocTypes.length}개 문서</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                        <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                          {getGenerationModeLabel(record.generationMode)}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {record.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => handleRetryRecord(record)}
                          className="rounded-full border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-950/30"
                        >
                          재시도
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleDeleteHistoryRecord(record.id)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
                  최근 완료 작업이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#f0f0f0]">프로젝트 템플릿 세트</h3>
            <p className="text-xs leading-6 text-gray-500">
              현재 문서 조합을 프로젝트별 템플릿으로 저장해 반복 요청에 재사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveTemplateSet}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            현재 구성 저장
          </button>
        </div>

        {availableTemplateSets.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {availableTemplateSets.map((templateSet) => (
              <div key={templateSet.id} className="rounded-2xl border border-white/8 bg-[#151515] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{templateSet.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {templateSet.projectName ?? "모든 프로젝트"} · {getGenerationModeLabel(templateSet.generationMode)} · {templateSet.generationPreset === "custom" ? "커스텀" : CALL_DOC_PRESET_DEFINITIONS[templateSet.generationPreset].label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplateSet(templateSet.id)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    삭제
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {templateSet.selectedDocTypes.map((docType) => (
                    <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-gray-300">
                      {CALL_DOC_DEFINITIONS[docType].shortLabel}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => applyTemplateSet(templateSet)}
                    className="rounded-full border border-purple-500/20 bg-purple-900/20 px-4 py-2 text-xs font-medium text-purple-200 transition hover:bg-purple-900/30"
                  >
                    이 구성 적용
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
            저장된 템플릿 세트가 없습니다. 자주 쓰는 문서 구성을 저장해 두면 운영 기능 추가나 AI 검수 요청에 바로 재사용할 수 있습니다.
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#f0f0f0]">문서 생성 구성</h3>
            <p className="text-xs leading-6 text-gray-500">
              내부는 문서별로 따로 생성하고, 여기서는 프리셋으로 한 번에 선택하거나 필요한 문서만 커스텀으로 고를 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <CircleHelp className="h-4 w-4" />
            선택 가이드 보기
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {GENERATION_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGenerationMode(option.value)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                generationMode === option.value
                  ? "border-cyan-500/30 bg-cyan-950/20"
                  : "border-white/8 bg-[#151515] hover:bg-[#202020]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#f0f0f0]">{option.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  generationMode === option.value ? "bg-cyan-900/30 text-cyan-200" : "bg-white/8 text-gray-500"
                }`}>
                  {generationMode === option.value ? "사용 중" : "선택 가능"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-gray-500">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          {(
            [
              ...Object.entries(CALL_DOC_PRESET_DEFINITIONS).map(([preset, definition]) => ({
                preset: preset as Exclude<CallDocPreset, "custom">,
                label: definition.label,
                description: definition.description,
              })),
              {
                preset: "custom" as const,
                label: "커스텀",
                description: "아래 체크박스로 필요한 문서만 선택",
              },
            ] satisfies Array<{ preset: CallDocPreset; label: string; description: string }>
          ).map((preset) => (
            <button
              key={preset.preset}
              type="button"
              onClick={() => applyPreset(preset.preset)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                generationPreset === preset.preset
                  ? "border-purple-500/30 bg-purple-950/20"
                  : "border-white/8 bg-[#151515] hover:bg-[#202020]"
              }`}
            >
              <div className="text-sm font-medium text-[#f0f0f0]">{preset.label}</div>
              <p className="mt-2 text-xs leading-6 text-gray-500">{preset.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.values(CALL_DOC_DEFINITIONS).map((doc) => {
            const checked = selectedDocTypes.includes(doc.type);
            const locked = doc.type === "prd";

            return (
              <button
                key={doc.type}
                type="button"
                onClick={() => toggleDocType(doc.type)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all duration-[150ms] ${
                  checked
                    ? "border-purple-500/30 bg-purple-950/20"
                    : "border-white/8 bg-[#151515] hover:bg-[#202020]"
                } ${locked ? "cursor-default" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#f0f0f0]">{doc.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                    checked ? "bg-purple-900/30 text-purple-300" : "bg-white/8 text-gray-500"
                  }`}>
                    {locked ? "필수" : checked ? "선택됨" : "선택 가능"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-gray-500">{doc.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>선택 문서 {selectedDocTypes.length}개</span>
          <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
            {getGenerationModeLabel(generationMode)}
          </span>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">
            {generationPreset === "custom" ? "커스텀" : CALL_DOC_PRESET_DEFINITIONS[generationPreset].label}
          </span>
        </div>
      </div>

      <button type="button" onClick={handleSubmit}
        disabled={mode === "file" ? !file : !directText.trim()}
        className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-all duration-[150ms] hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600">
        <Phone className="mr-2 inline h-4 w-4" />문서 생성 시작
      </button>

      {!displayRecord && history.length === 0 && savedTotalCount === 0 ? (
        <EmptyStateCard
          title="첫 문서 번들을 아직 만들지 않았습니다."
          message="녹음 파일, 회의 메모, 고객 불만 내용을 넣고 문서 구성을 고르면, PRD와 문제정의서, 고객 공유 문서, 저장 구조, 다음 액션까지 한 흐름으로 이어집니다."
          actionLabel="선택 가이드 보기"
          onAction={() => setGuideOpen(true)}
        />
      ) : null}

      {/* 진행 상태 */}
      {current && current.status !== "failed" && (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 space-y-3">
          <Step done={true} label="파일 업로드 완료" />
          <Step done={!["uploading"].includes(current.status)} active={current.status === "transcribing"} label="음성→텍스트 변환" />
          <Step done={!["uploading", "transcribing"].includes(current.status)} active={current.status === "extracting-pdf"} label="PDF 텍스트 추출" />
          <Step done={!["uploading", "transcribing", "extracting-pdf"].includes(current.status)} active={current.status === "analyzing-pdf"} label="PDF 구조 분석" />
          <Step
            done={!["uploading", "transcribing", "extracting-pdf", "analyzing-pdf"].includes(current.status)}
            active={current.status === "analyzing"}
            label={buildGenerationStepLabel(current.generationMode)}
          />
          {current.generationMode === "dual" ? (
            <Step done={!["uploading", "transcribing", "extracting-pdf", "analyzing-pdf", "analyzing"].includes(current.status)} active={current.status === "merging"} label="Dual-AI 머지" />
          ) : null}
          {hasSupportDocs && (
            <Step
              done={current.status === "completed"}
              active={current.status === "generating-docs"}
              label={current.docGenerationProgress ?? "실무 문서 생성"}
            />
          )}
          <Step done={current.status === "completed"} label="완료" />
        </div>
      )}

      {current?.status === "failed" && (
        <ErrorCard
          title="문서 생성이 중단되었습니다"
          message={formatCallToPrdFailureMessage(current.error)}
          actionLabel="재시도"
          onAction={() => handleRetryRecord(current)}
        />
      )}

      {/* 문서 결과 */}
      {displayDocs.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setDocResultsOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div>
              <h3 className="text-lg font-semibold text-[#f0f0f0]">문서 결과</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                PRD와 생성된 지원 문서를 문서별로 열고, 현재 본문은 필요할 때만 펼쳐서 볼 수 있습니다.
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${docResultsOpen ? "rotate-180" : ""}`} />
          </button>

          {docResultsOpen ? (
            <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {displayDocs.map((doc) => (
                    <button
                      key={doc.type}
                      type="button"
                      onClick={() => setActiveDocType(doc.type)}
                      className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                        activeDocType === doc.type
                          ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                          : "border border-white/8 bg-[#151515] text-gray-400"
                      }`}
                    >
                      {CALL_DOC_DEFINITIONS[doc.type].shortLabel}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => navigator.clipboard.writeText(selectedDocContent)}
                    className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]">
                    현재 문서 복사
                  </button>
                  <button type="button" onClick={downloadCurrentMarkdown}
                    className="inline-flex items-center rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]">
                    <Download className="mr-1 h-4 w-4" />.md 다운로드
                  </button>
                </div>
              </div>

              {activeDocType === "prd" && (displayRecord?.claudePrd || displayRecord?.codexPrd) && (
                <div className="flex flex-wrap gap-2">
                  {(["merged", "claude", "codex", "diff"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPrdView(tab)}
                      className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                        prdView === tab
                          ? "border border-purple-500/20 bg-purple-900/30 text-purple-300"
                          : "border border-white/8 bg-[#151515] text-gray-400"
                      }`}
                    >
                      {{ merged: "통합 PRD", claude: "Claude", codex: "Codex", diff: "차이점" }[tab]}
                    </button>
                  ))}
                </div>
              )}

              {generationWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                  일부 문서는 생성되지 않았습니다: {generationWarnings.join(" / ")}
                </div>
              )}

              {displayRecord?.baselineTitle ? (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">
                  변경 비교 기준 문서: {displayRecord.baselineTitle}
                  {displayRecord.baselineEntryName ? ` (${displayRecord.baselineEntryName})` : ""}
                </div>
              ) : null}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setDocContentOpen((currentOpen) => !currentOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#202020]"
                >
                  <div>
                    <div className="text-sm font-medium text-[#f0f0f0]">
                      {CALL_DOC_DEFINITIONS[activeDocType].label}
                      {activeDocType === "prd" ? ` · ${{
                        merged: "통합 PRD",
                        claude: "Claude",
                        codex: "Codex",
                        diff: "차이점",
                      }[prdView]}` : ""}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {docContentOpen ? "본문을 접습니다." : "본문을 펼쳐서 전체 내용을 확인합니다."}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${docContentOpen ? "rotate-180" : ""}`} />
                </button>

                {docContentOpen ? (
                  <div className="max-w-none rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-7 py-7 text-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:px-8 md:py-8">
                    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                      {renderedDocContent}
                    </ReactMarkdown>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {(displaySavedEntryName || nextActionList.length > 0) ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSavedTreeOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div>
              <h3 className="text-lg font-semibold text-[#f0f0f0]">저장 구조</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                저장된 PRD 번들 아래 문서와 `next-actions` 파일을 트리처럼 다시 열어볼 수 있습니다.
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${savedTreeOpen ? "rotate-180" : ""}`} />
          </button>

          {savedTreeOpen ? (
            <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
              <div className="rounded-2xl border border-white/8 bg-[#151515] p-4 font-mono text-xs text-gray-300">
                <div className="flex items-center gap-2 text-sm text-white">
                  <FolderOpen className="h-4 w-4 text-purple-400" />
                  <span>{displaySavedEntryName ?? "현재 PRD 번들"}/</span>
                </div>

                <div className="mt-3 space-y-2 pl-4">
                  {displayDocs.map((doc) => (
                    <button
                      key={`tree-doc-${doc.type}`}
                      type="button"
                      onClick={() => {
                        setDocResultsOpen(true);
                        setDocContentOpen(true);
                        setActiveDocType(doc.type);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                    >
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span>{CALL_DOC_DEFINITIONS[doc.type].fileName}</span>
                    </button>
                  ))}

                  {(displayRecord?.claudePrd || displayRecord?.codexPrd || displayRecord?.diffReport) ? (
                    <div className="space-y-2 pl-4">
                      <div className="text-gray-500">artifacts/</div>
                      {displayRecord?.claudePrd ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDocResultsOpen(true);
                            setDocContentOpen(true);
                            setActiveDocType("prd");
                            setPrdView("claude");
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>90-claude-prd.md</span>
                        </button>
                      ) : null}
                      {displayRecord?.codexPrd ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDocResultsOpen(true);
                            setDocContentOpen(true);
                            setActiveDocType("prd");
                            setPrdView("codex");
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>91-codex-prd.md</span>
                        </button>
                      ) : null}
                      {displayRecord?.diffReport ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDocResultsOpen(true);
                            setDocContentOpen(true);
                            setActiveDocType("prd");
                            setPrdView("diff");
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>92-diff-report.md</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2 pl-4">
                    <div className="text-gray-500">next-actions/</div>
                    {nextActionList.length > 0 ? nextActionList.map((nextAction) => (
                      <button
                        key={`tree-next-${nextAction.actionType}`}
                        type="button"
                        onClick={() => {
                          setNextActionsOpen(true);
                          setNextActionContentOpen(true);
                          setActiveNextAction(nextAction.actionType);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                      >
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{nextAction.fileName?.split("/").pop() ?? `${nextAction.actionType}.md`}</span>
                      </button>
                    )) : (
                      <div className="rounded-xl border border-dashed border-white/8 px-3 py-2 text-gray-500">
                        아직 저장된 다음 액션이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {displayRecord?.prdMarkdown ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setNextActionsOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div>
              <h3 className="text-lg font-semibold text-[#f0f0f0]">다음 액션</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                PRD를 바탕으로 PM / FE / BE / QA / CS / GitHub Issue 초안을 이어서 생성합니다.
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${nextActionsOpen ? "rotate-180" : ""}`} />
          </button>

          {nextActionsOpen ? (
            <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
              <div className="grid gap-3 xl:grid-cols-3">
                {availableNextActions.map(([actionType, definition]) => {
                  const generated = Boolean(nextActionResults[actionType]);
                  const loading = nextActionLoading === actionType;

                  return (
                    <button
                      key={actionType}
                      type="button"
                      onClick={() => void handleGenerateNextAction(actionType)}
                      disabled={Boolean(nextActionLoading)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                        activeNextAction === actionType
                          ? "border-cyan-500/30 bg-cyan-950/20"
                          : "border-white/8 bg-[#151515] hover:bg-[#202020]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#f0f0f0]">{definition.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                          loading
                            ? "bg-amber-900/25 text-amber-200"
                            : generated
                              ? "bg-cyan-900/25 text-cyan-200"
                              : "bg-white/8 text-gray-500"
                        }`}>
                          {loading ? "생성 중" : generated ? "준비됨" : "생성"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-gray-500">{definition.description}</p>
                    </button>
                  );
                })}
              </div>

              {activeNextActionResult ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {availableNextActions
                        .filter(([actionType]) => Boolean(nextActionResults[actionType]))
                        .map(([actionType, definition]) => (
                          <button
                            key={actionType}
                            type="button"
                            onClick={() => setActiveNextAction(actionType)}
                            className={`rounded-full px-4 py-1.5 text-xs transition-all duration-[150ms] ${
                              activeNextAction === actionType
                                ? "border border-cyan-500/20 bg-cyan-900/30 text-cyan-200"
                                : "border border-white/8 bg-[#151515] text-gray-400"
                            }`}
                          >
                            {definition.shortLabel}
                          </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(activeNextActionResult.markdown)}
                        className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]"
                      >
                        초안 복사
                      </button>
                      <button
                        type="button"
                        onClick={downloadNextActionMarkdown}
                        className="inline-flex items-center rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-sm text-gray-300 transition-all duration-[150ms] hover:bg-[#242424]"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        초안 다운로드
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setNextActionContentOpen((currentOpen) => !currentOpen)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#202020]"
                    >
                      <div>
                        <div className="text-sm font-medium text-[#f0f0f0]">{activeNextActionResult.title}</div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {nextActionContentOpen ? "초안 본문을 접습니다." : "초안 본문을 펼쳐서 전체 내용을 확인합니다."}
                        </p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${nextActionContentOpen ? "rotate-180" : ""}`} />
                    </button>

                    {nextActionContentOpen ? (
                      <div className="max-w-none rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-7 py-7 text-[15px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:px-8 md:py-8">
                        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                          {renderedNextActionContent}
                        </ReactMarkdown>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
                  역할별 버튼을 누르면 현재 PRD와 지원 문서를 바탕으로 다음 액션 초안을 생성합니다.
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 히스토리 (현재 세션) */}
      {history.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[#f0f0f0]">현재 세션</h3>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-gray-400">{history.length}개</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen ? history.map((record) => (
            <div
              key={record.id}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-[150ms] ${selectedHistory?.id === record.id ? "border-purple-500/40 bg-purple-950/20" : "border-white/8 bg-[#1e1e1e] hover:bg-[#242424]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedHistory(record); setSelectedSaved(null); }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="truncate text-sm font-medium text-[#f0f0f0]">{record.projectName ?? "프로젝트 미지정"}</span>
                      {record.customerName && <span className="truncate text-sm text-gray-400">· {record.customerName}</span>}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${record.status === "completed" ? "bg-green-900/30 text-green-300" : record.status === "failed" ? "bg-red-900/30 text-red-300" : "bg-amber-900/30 text-amber-300"}`}>
                      {record.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{record.callDate} · {record.fileName}</span>
                    <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                      {getGenerationModeLabel(record.generationMode)}
                    </span>
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">
                      {record.generationPreset === "custom" ? "커스텀" : CALL_DOC_PRESET_DEFINITIONS[record.generationPreset].label}
                    </span>
                    <span>{record.generatedDocs.length || record.selectedDocTypes.length}개 문서</span>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {record.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => handleRetryRecord(record)}
                      className="rounded-full border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-950/30"
                    >
                      재시도
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDeleteHistoryRecord(record.id)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )) : null}
        </div>
      )}

      {/* 저장된 문서 번들 */}
      {(savedTotalCount > 0 || savedQuery.trim()) && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSavedOpen((currentOpen) => !currentOpen)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3 text-left transition-all duration-[150ms] hover:bg-[#242424]"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[#f0f0f0]">저장된 문서</h3>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-gray-400">{savedTotalCount}개</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-[150ms] ${savedOpen ? "rotate-180" : ""}`} />
          </button>
          {savedOpen ? (
            <div className="space-y-3">
              <input
                value={savedQuery}
                onChange={(event) => handleSavedQueryChange(event.target.value)}
                placeholder="저장된 문서 검색"
                className="w-full max-w-xs rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
              />
              {savedBundles.length > 0 ? (
            <div className="space-y-3">
              {savedBundles.map((bundle) => (
                <div
                  key={bundle.entryName}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-[150ms] ${selectedSaved === bundle.entryName ? "border-purple-500/40 bg-purple-950/20" : "border-white/8 bg-[#1e1e1e] hover:bg-[#242424]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setSelectedHistory(null);
                        setSelectedSaved(bundle.entryName);
                        try {
                          const res = await fetch(`/api/call-to-prd/saved/${encodeURIComponent(bundle.entryName)}`);
                          if (!res.ok) {
                            return;
                          }
                          const detail: SavedCallBundleDetail = await res.json();
                          setCurrent(hydrateRecordFromSavedBundle(detail, bundle.size));
                          setActiveDocType("prd");
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-4 w-4 text-purple-400" />
                        <span className="truncate text-sm font-medium text-[#f0f0f0]">{bundle.title}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{bundle.createdAt.slice(0, 10)}</span>
                        <span>{bundle.docCount}개 문서</span>
                        <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                          {getGenerationModeLabel(bundle.generationMode)}
                        </span>
                        {bundle.kind === "legacy" && <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">legacy</span>}
                        {bundle.baselineTitle ? <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">기준선 있음</span> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">{bundle.preview}</p>
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{bundle.size}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteSavedBundle(bundle.entryName);
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {savedTotalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#1e1e1e] px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {savedPage} / {savedTotalPages} 페이지
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSavedPage((currentPage) => Math.max(currentPage - 1, 1))}
                      disabled={savedPage <= 1}
                      className="rounded-xl border border-white/8 bg-[#151515] px-3 py-2 text-xs text-gray-300 transition-all duration-[150ms] hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavedPage((currentPage) => Math.min(currentPage + 1, savedTotalPages))}
                      disabled={savedPage >= savedTotalPages}
                      className="rounded-xl border border-white/8 bg-[#151515] px-3 py-2 text-xs text-gray-300 transition-all duration-[150ms] hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 text-sm text-gray-400">
              검색 결과가 없습니다.
            </div>
          )}
            </div>
          ) : null}
        </div>
      )}

      <DocSelectionGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onApplyPreset={(preset) => applyPreset(preset)}
      />
      <AppConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        tone={confirmDialog?.tone}
        onClose={() => setConfirmDialog(null)}
        onConfirm={async () => {
          if (!confirmDialog) {
            return;
          }
          await confirmDialog.onConfirm();
        }}
      />
      <AppPromptModal
        open={Boolean(promptDialog)}
        title={promptDialog?.title ?? ""}
        message={promptDialog?.message ?? ""}
        placeholder={promptDialog?.placeholder}
        initialValue={promptDialog?.initialValue}
        confirmLabel={promptDialog?.confirmLabel}
        onClose={() => setPromptDialog(null)}
        onConfirm={async (value) => {
          if (!promptDialog) {
            return;
          }
          await promptDialog.onConfirm(value);
        }}
      />
    </div>
  );
}

function getDisplayDocs(record: CallRecord | null): GeneratedDoc[] {
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

function sortGeneratedDocs(docs: readonly GeneratedDoc[]): GeneratedDoc[] {
  const order = sortCallDocTypes(docs.map((doc) => doc.type));
  return order
    .map((docType) => docs.find((doc) => doc.type === docType))
    .filter((doc): doc is GeneratedDoc => Boolean(doc));
}

function hydrateRecordFromSavedBundle(detail: SavedCallBundleDetail, fileSize: string): CallRecord {
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

function buildNextActionMap(nextActions: CallRecord["nextActions"]): Partial<Record<CallNextActionType, CallNextActionResponse>> {
  return nextActions.reduce<Partial<Record<CallNextActionType, CallNextActionResponse>>>((accumulator, nextAction) => {
    accumulator[nextAction.actionType] = {
      ...nextAction,
      saved: Boolean(nextAction.fileName),
      savedEntryName: null,
    };
    return accumulator;
  }, {});
}

function mergeRecordWithNextAction(
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

function upsertNextAction(
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

function buildDownloadFileName(options: {
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

function formatCallToPrdFailureMessage(error: string | null) {
  if (!error) {
    return "입력값이나 로컬 실행 환경을 확인한 뒤 다시 시도해 주세요.";
  }

  if (error.includes("whisper CLI") || error.includes("openai-whisper") || error.includes("whisper-cpp")) {
    return "음성 변환 도구가 준비되지 않았습니다. `python3 -m pip install openai-whisper`를 설치하거나, `whisper-cpp`를 쓰는 경우 `WHISPER_MODEL_PATH`에 실제 ggml 모델 경로를 설정한 뒤 다시 시도해 주세요.";
  }

  if (error.includes("Claude 실패") || error.includes("Codex 실패")) {
    return `AI 생성 단계에서 중단되었습니다. ${error} 입력 내용은 유지되므로 프롬프트나 실행 환경을 확인한 뒤 다시 생성하면 됩니다.`;
  }

  if (error.includes("재시작")) {
    return "앱이 재시작되면서 진행 중 작업이 중단되었습니다. 같은 입력값으로 다시 생성하면 저장 구조와 다음 액션까지 다시 이어집니다.";
  }

  return error;
}

function buildNextActionDownloadFileName(projectName: string | null, actionType: CallNextActionType) {
  const base = sanitizeDownloadName(projectName ?? "call-to-prd");
  const suffix = actionType.replace(/_/g, "-");
  return `${base}-${suffix}.md`;
}

function sanitizeDownloadName(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-").toLowerCase();
}

function Step({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
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

function buildStatusLabel(status: CallRecord["status"]) {
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

function getGenerationModeLabel(mode: CallGenerationMode) {
  return {
    claude: "Claude 단일",
    codex: "Codex 단일",
    dual: "Dual AI",
  }[mode];
}

function buildGenerationStepLabel(mode: CallGenerationMode) {
  return {
    claude: "PRD 생성 (Claude 단일)",
    codex: "PRD 생성 (Codex 단일)",
    dual: "PRD 생성 (Claude + Codex 병렬)",
  }[mode];
}
