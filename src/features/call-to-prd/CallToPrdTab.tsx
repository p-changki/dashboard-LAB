"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { AppConfirmModal } from "@/components/modals/AppConfirmModal";
import { AppPromptModal } from "@/components/modals/AppPromptModal";
import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { DocSelectionGuideModal } from "@/features/call-to-prd/components/DocSelectionGuideModal";
import { CallToPrdIntake } from "@/features/call-to-prd/components/CallToPrdIntake";
import { CallToPrdViewer } from "@/features/call-to-prd/components/CallToPrdViewer";
import { CallToPrdHistory } from "@/features/call-to-prd/components/CallToPrdHistory";
import {
  buildDownloadFileName,
  buildNextActionDownloadFileName,
  buildNextActionMap,
  getDisplayDocs,
  mergeRecordWithNextAction,
  type ConfirmDialogState,
  type PromptDialogState,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";
import { CALL_NEXT_ACTION_DEFINITIONS } from "@/lib/call-to-prd/next-action-config";
import {
  CALL_DOC_PRESET_DEFINITIONS,
  sortCallDocTypes,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import {
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
  SavedCallBundleListResponse,
} from "@/lib/types/call-to-prd";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InputMode = "file" | "text";
type SubTab = "intake" | "viewer" | "history";
const SAVED_PAGE_SIZE = 6;

interface CallToPrdProjectsResponse extends ProjectsLiteResponse {
  currentProjectPath?: string | null;
}

interface CallToPrdTabProps {
  mode?: DashboardNavigationMode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CallToPrdTab({ mode: navigationMode = "advanced" }: CallToPrdTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("intake");
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
  const [savedBundles, setSavedBundles] = useState<import("@/lib/types/call-to-prd").SavedCallBundleIndexItem[]>([]);
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
  const isCoreMode = navigationMode === "core";

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

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
  const hasSupportDocs = useMemo(
    () => (current?.selectedDocTypes ?? []).some((docType) => docType !== "prd"),
    [current?.selectedDocTypes],
  );

  // ---------------------------------------------------------------------------
  // Side effects
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

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
      setSubTab("viewer");
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

    setSubTab("intake");
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(192,132,252,0.16),_transparent_42%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-purple-200/80">Call → PRD</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">회의, 고객 이슈, 운영 메모를 실행 문서로 바꾸는 워크플로</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-soft)]">
          녹음 파일이 없어도 바로 쓸 수 있습니다. 통화 전사본, 회의 메모, 고객 불만, 운영 이슈를 붙여넣거나 파일로 올리면 PRD와
          후속 실행 문서 초안까지 한 번에 이어서 만듭니다.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              label: "입력",
              title: "녹음 파일 또는 텍스트 메모",
              description: "통화 전사, 회의 정리, 고객 이슈 설명을 그대로 넣고 프로젝트 맥락만 함께 고르면 됩니다.",
            },
            {
              label: "생성",
              title: "PRD와 실무 문서 초안",
              description: "문제 정의, change request, 공유 문서, 내부 정리 문서를 프리셋으로 한 번에 만들 수 있습니다.",
            },
            {
              label: "후속 액션",
              title: "PM, FE, BE, QA, CS 초안 연결",
              description: "생성된 PRD를 바탕으로 각 역할별 다음 액션 문서를 이어서 만들 수 있습니다.",
            },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200/70">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-[var(--color-text-soft)]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Sub-tab navigation */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setSubTab("intake")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${subTab === "intake" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          새 문서
        </button>
        <button type="button" onClick={() => setSubTab("viewer")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${subTab === "viewer" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          결과 뷰어
        </button>
        <button type="button" onClick={() => setSubTab("history")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${subTab === "history" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          히스토리
        </button>
      </div>

      {/* Sub-tab content */}
      {subTab === "intake" && (
        <CallToPrdIntake
          isCoreMode={isCoreMode}
          feedbackMessage={feedbackMessage}
          mode={mode}
          setMode={setMode}
          file={file}
          setFile={setFile}
          pdfFile={pdfFile}
          setPdfFile={setPdfFile}
          directText={directText}
          setDirectText={setDirectText}
          projectPath={projectPath}
          projectName={projectName}
          setProjectName={setProjectName}
          customerName={customerName}
          setCustomerName={setCustomerName}
          additionalContext={additionalContext}
          setAdditionalContext={setAdditionalContext}
          projects={projects}
          currentProjectPath={currentProjectPath}
          selectedProject={selectedProject}
          handleProjectSelect={handleProjectSelect}
          inputKind={inputKind}
          setInputKind={setInputKind}
          severity={severity}
          setSeverity={setSeverity}
          customerImpact={customerImpact}
          setCustomerImpact={setCustomerImpact}
          urgency={urgency}
          setUrgency={setUrgency}
          reproducibility={reproducibility}
          setReproducibility={setReproducibility}
          currentWorkaround={currentWorkaround}
          setCurrentWorkaround={setCurrentWorkaround}
          separateExternalDocs={separateExternalDocs}
          setSeparateExternalDocs={setSeparateExternalDocs}
          needsChangeBaseline={needsChangeBaseline}
          baselineEntryName={baselineEntryName}
          setBaselineEntryName={setBaselineEntryName}
          savedBundles={savedBundles}
          activeQueue={activeQueue}
          recentQueue={recentQueue}
          setSelectedHistory={setSelectedHistory}
          setSelectedSaved={setSelectedSaved}
          handleRetryRecord={handleRetryRecord}
          handleDeleteHistoryRecord={(id) => void handleDeleteHistoryRecord(id)}
          availableTemplateSets={availableTemplateSets}
          applyTemplateSet={applyTemplateSet}
          handleSaveTemplateSet={handleSaveTemplateSet}
          handleDeleteTemplateSet={handleDeleteTemplateSet}
          generationMode={generationMode}
          setGenerationMode={setGenerationMode}
          generationPreset={generationPreset}
          applyPreset={applyPreset}
          selectedDocTypes={selectedDocTypes}
          toggleDocType={toggleDocType}
          setGuideOpen={setGuideOpen}
          handleSubmit={handleSubmit}
          displayRecord={displayRecord}
          history={history}
          savedTotalCount={savedTotalCount}
        />
      )}

      {subTab === "viewer" && (
        <CallToPrdViewer
          current={current}
          displayRecord={displayRecord}
          hasSupportDocs={hasSupportDocs}
          displayDocs={displayDocs}
          activeDocType={activeDocType}
          setActiveDocType={setActiveDocType}
          prdView={prdView}
          setPrdView={setPrdView}
          selectedDocContent={selectedDocContent}
          renderedDocContent={renderedDocContent}
          generationWarnings={generationWarnings}
          docResultsOpen={docResultsOpen}
          setDocResultsOpen={setDocResultsOpen}
          docContentOpen={docContentOpen}
          setDocContentOpen={setDocContentOpen}
          savedTreeOpen={savedTreeOpen}
          setSavedTreeOpen={setSavedTreeOpen}
          nextActionsOpen={nextActionsOpen}
          setNextActionsOpen={setNextActionsOpen}
          nextActionContentOpen={nextActionContentOpen}
          setNextActionContentOpen={setNextActionContentOpen}
          displaySavedEntryName={displaySavedEntryName}
          availableNextActions={availableNextActions}
          nextActionLoading={nextActionLoading}
          nextActionResults={nextActionResults}
          activeNextAction={activeNextAction}
          setActiveNextAction={setActiveNextAction}
          activeNextActionResult={activeNextActionResult}
          nextActionList={nextActionList}
          renderedNextActionContent={renderedNextActionContent}
          handleRetryRecord={handleRetryRecord}
          handleGenerateNextAction={(actionType) => void handleGenerateNextAction(actionType)}
          downloadCurrentMarkdown={downloadCurrentMarkdown}
          downloadNextActionMarkdown={downloadNextActionMarkdown}
        />
      )}

      {subTab === "history" && (
        <CallToPrdHistory
          history={history}
          selectedHistory={selectedHistory}
          setSelectedHistory={setSelectedHistory}
          setSelectedSaved={setSelectedSaved}
          handleRetryRecord={handleRetryRecord}
          handleDeleteHistoryRecord={(id) => void handleDeleteHistoryRecord(id)}
          historyOpen={historyOpen}
          setHistoryOpen={setHistoryOpen}
          savedBundles={savedBundles}
          savedQuery={savedQuery}
          handleSavedQueryChange={handleSavedQueryChange}
          savedPage={savedPage}
          setSavedPage={setSavedPage}
          savedTotalCount={savedTotalCount}
          savedTotalPages={savedTotalPages}
          selectedSaved={selectedSaved}
          savedOpen={savedOpen}
          setSavedOpen={setSavedOpen}
          setCurrent={setCurrent}
          setActiveDocType={setActiveDocType}
          onNavigateToViewer={() => setSubTab("viewer")}
          handleDeleteSavedBundle={(entryName) => void handleDeleteSavedBundle(entryName)}
        />
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
