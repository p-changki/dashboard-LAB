"use client";

import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import {
  deleteCallDocTemplateSet,
  saveCallDocTemplateSet,
} from "@/lib/call-to-prd/template-sets";
import { CALL_DOC_PRESET_DEFINITIONS, sortCallDocTypes, type CallDocPreset, type CallDocType } from "@/lib/call-to-prd/document-config";
import type { ProjectSummary } from "@/lib/types";
import type {
  CallDocTemplateSet,
  CallGenerationMode,
  CallNextActionResponse,
  CallNextActionType,
  CallRecord,
} from "@/lib/types/call-to-prd";
import {
  buildDownloadFileName,
  buildNextActionDownloadFileName,
  mergeRecordWithNextAction,
  type ConfirmDialogState,
  type PromptDialogState,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";
import {
  formatCallToPrdApiError,
  getCallToPrdCopy,
} from "@/features/call-to-prd/copy";

import type { InputMode, IntakeMode, SubTab } from "../state";

type SubmitOverrides = {
  mode?: InputMode;
  file?: File | null;
  pdfFile?: File | null;
  directText?: string;
  projectName?: string;
  projectPath?: string;
  customerName?: string;
  additionalContext?: string;
  inputKind?: CallRecord["inputKind"];
  severity?: CallRecord["severity"];
  customerImpact?: CallRecord["customerImpact"];
  urgency?: CallRecord["urgency"];
  reproducibility?: CallRecord["reproducibility"];
  currentWorkaround?: string;
  separateExternalDocs?: boolean;
  baselineEntryName?: string;
  generationMode?: CallGenerationMode;
  generationPreset?: CallDocPreset;
  selectedDocTypes?: CallDocType[];
};

type UseCallToPrdActionsParams = {
  mode: InputMode;
  file: File | null;
  pdfFile: File | null;
  directText: string;
  projectName: string;
  projectPath: string;
  projectContextStatus: "idle" | "loading" | "ready" | "failed";
  projectContextError: string;
  customerName: string;
  additionalContext: string;
  inputKind: CallRecord["inputKind"];
  severity: CallRecord["severity"];
  customerImpact: CallRecord["customerImpact"];
  urgency: CallRecord["urgency"];
  reproducibility: CallRecord["reproducibility"];
  currentWorkaround: string;
  separateExternalDocs: boolean;
  baselineEntryName: string;
  generationMode: CallGenerationMode;
  generationPreset: CallDocPreset;
  selectedDocTypes: CallDocType[];
  selectedProject: ProjectSummary | null;
  selectedSaved: string | null;
  displayRecord: CallRecord | null;
  displayDocs: CallRecord["generatedDocs"];
  activeDocType: CallDocType;
  prdView: "merged" | "claude" | "codex" | "diff";
  selectedDocContent: string;
  projects: ProjectSummary[];
  setSubTab: (value: SubTab) => void;
  setIntakeMode: (value: IntakeMode) => void;
  setSelectedHistory: Dispatch<SetStateAction<CallRecord | null>>;
  setSelectedSaved: (saved: string | null) => void;
  setCurrent: Dispatch<SetStateAction<CallRecord | null>>;
  setActiveDocType: (docType: CallDocType) => void;
  setPrdView: (view: "merged" | "claude" | "codex" | "diff") => void;
  setFeedbackMessage: (message: string) => void;
  setNextActionLoading: (value: CallNextActionType | null) => void;
  setNextActionResults: Dispatch<
    SetStateAction<Partial<Record<CallNextActionType, CallNextActionResponse>>>
  >;
  setActiveNextAction: (value: CallNextActionType | null) => void;
  setGenerationPreset: (value: CallDocPreset) => void;
  setSelectedDocTypes: Dispatch<SetStateAction<CallDocType[]>>;
  setSavedQuery: (value: string) => void;
  setSavedPage: (value: number) => void;
  setProjectPath: (value: string) => void;
  setProjectName: (value: string) => void;
  setTemplateSets: (sets: CallDocTemplateSet[]) => void;
  setConfirmDialog: (value: ConfirmDialogState | null) => void;
  setPromptDialog: (value: PromptDialogState | null) => void;
  setCustomerName: (value: string) => void;
  setAdditionalContext: (value: string) => void;
  setInputKind: (value: CallRecord["inputKind"]) => void;
  setSeverity: (value: CallRecord["severity"]) => void;
  setCustomerImpact: (value: CallRecord["customerImpact"]) => void;
  setUrgency: (value: CallRecord["urgency"]) => void;
  setReproducibility: (value: CallRecord["reproducibility"]) => void;
  setCurrentWorkaround: (value: string) => void;
  setSeparateExternalDocs: (value: boolean) => void;
  setBaselineEntryName: (value: string) => void;
  setGenerationMode: (value: CallGenerationMode) => void;
  setFile: (value: File | null) => void;
  setPdfFile: (value: File | null) => void;
  setMode: (value: InputMode) => void;
  setDirectText: (value: string) => void;
  setHistory: Dispatch<SetStateAction<CallRecord[]>>;
  fetchSaved: () => Promise<void>;
  startPolling: (id: string) => void;
};

export function useCallToPrdActions({
  mode,
  file,
  pdfFile,
  directText,
  projectName,
  projectPath,
  projectContextStatus,
  projectContextError,
  customerName,
  additionalContext,
  inputKind,
  severity,
  customerImpact,
  urgency,
  reproducibility,
  currentWorkaround,
  separateExternalDocs,
  baselineEntryName,
  generationMode,
  generationPreset,
  selectedDocTypes,
  selectedProject,
  selectedSaved,
  displayRecord,
  displayDocs,
  activeDocType,
  prdView,
  selectedDocContent,
  projects,
  setSubTab,
  setIntakeMode,
  setSelectedHistory,
  setSelectedSaved,
  setCurrent,
  setActiveDocType,
  setPrdView,
  setFeedbackMessage,
  setNextActionLoading,
  setNextActionResults,
  setActiveNextAction,
  setGenerationPreset,
  setSelectedDocTypes,
  setSavedQuery,
  setSavedPage,
  setProjectPath,
  setProjectName,
  setTemplateSets,
  setConfirmDialog,
  setPromptDialog,
  setCustomerName,
  setAdditionalContext,
  setInputKind,
  setSeverity,
  setCustomerImpact,
  setUrgency,
  setReproducibility,
  setCurrentWorkaround,
  setSeparateExternalDocs,
  setBaselineEntryName,
  setGenerationMode,
  setFile,
  setPdfFile,
  setMode,
  setDirectText,
  setHistory,
  fetchSaved,
  startPolling,
}: UseCallToPrdActionsParams) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);

  async function handleSubmit(overrides: SubmitOverrides = {}) {
    const resolvedMode = overrides.mode ?? mode;
    const resolvedFile = overrides.file ?? file;
    const resolvedPdfFile = overrides.pdfFile ?? pdfFile;
    const resolvedDirectText = overrides.directText ?? directText;
    const resolvedProjectName = overrides.projectName ?? projectName;
    const resolvedProjectPath = overrides.projectPath ?? projectPath;
    const resolvedCustomerName = overrides.customerName ?? customerName;
    const resolvedAdditionalContext = overrides.additionalContext ?? additionalContext;
    const resolvedInputKind = overrides.inputKind ?? inputKind;
    const resolvedSeverity = overrides.severity ?? severity;
    const resolvedCustomerImpact = overrides.customerImpact ?? customerImpact;
    const resolvedUrgency = overrides.urgency ?? urgency;
    const resolvedReproducibility = overrides.reproducibility ?? reproducibility;
    const resolvedCurrentWorkaround = overrides.currentWorkaround ?? currentWorkaround;
    const resolvedSeparateExternalDocs = overrides.separateExternalDocs ?? separateExternalDocs;
    const resolvedBaselineEntryName = overrides.baselineEntryName ?? baselineEntryName;
    const resolvedGenerationMode = overrides.generationMode ?? generationMode;
    const resolvedGenerationPreset = overrides.generationPreset ?? generationPreset;
    const resolvedSelectedDocTypes = sortCallDocTypes(overrides.selectedDocTypes ?? selectedDocTypes);

    if (!resolvedProjectPath.trim()) {
      setFeedbackMessage(copy.hooks.projectRequired);
      return;
    }

    if (projectContextStatus !== "ready") {
      setFeedbackMessage(projectContextError || copy.hooks.projectContextNotReady);
      return;
    }

    const formData = new FormData();
    if (resolvedMode === "file" && resolvedFile) {
      formData.append("file", resolvedFile);
    } else if (resolvedMode === "text" && resolvedDirectText.trim()) {
      formData.append("directTranscript", resolvedDirectText);
    } else {
      setFeedbackMessage(copy.hooks.submitMissingInput);
      return;
    }
    if (resolvedPdfFile) formData.append("pdfFile", resolvedPdfFile);
    if (resolvedProjectName) formData.append("projectName", resolvedProjectName);
    formData.append("projectPath", resolvedProjectPath);
    if (resolvedCustomerName) formData.append("customerName", resolvedCustomerName);
    if (resolvedAdditionalContext) formData.append("additionalContext", resolvedAdditionalContext);
    formData.append("inputKind", resolvedInputKind);
    formData.append("severity", resolvedSeverity);
    formData.append("customerImpact", resolvedCustomerImpact);
    formData.append("urgency", resolvedUrgency);
    formData.append("reproducibility", resolvedReproducibility);
    if (resolvedCurrentWorkaround.trim()) {
      formData.append("currentWorkaround", resolvedCurrentWorkaround.trim());
    }
    formData.append("separateExternalDocs", String(resolvedSeparateExternalDocs));
    if (resolvedBaselineEntryName) formData.append("baselineEntryName", resolvedBaselineEntryName);
    formData.append("generationMode", resolvedGenerationMode);
    formData.append("generationPreset", resolvedGenerationPreset);
    resolvedSelectedDocTypes.forEach((docType) => formData.append("selectedDocTypes", docType));

    setSelectedHistory(null);
    setSelectedSaved(null);
    setCurrent(null);
    setActiveDocType("prd");
    setPrdView("merged");

    try {
      const res = await fetch("/api/call-to-prd/upload", {
        method: "POST",
        headers: { "x-dashboard-locale": locale },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedbackMessage(formatCallToPrdApiError(data?.error, locale, copy.hooks.submitFailed));
        return;
      }

      if (data.id) {
        startPolling(data.id);
        setSubTab("viewer");
        setFeedbackMessage(copy.hooks.submitStarted);
        return;
      }

      setFeedbackMessage(copy.hooks.submitFailed);
    } catch {
      setFeedbackMessage(copy.hooks.submitFailed);
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
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-locale": locale,
        },
        body: JSON.stringify({
          actionType,
          savedEntryName: displayRecord.savedEntryName,
          projectName: displayRecord.projectName,
          customerName: displayRecord.customerName,
          projectContext: displayRecord.projectContext,
          projectContextSources: displayRecord.projectContextSources,
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
        const errorData = await response.json().catch(() => null);
        setFeedbackMessage(formatCallToPrdApiError(errorData?.error, locale, copy.hooks.nextActionFailed));
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
          ? copy.hooks.nextActionSaved(result.title)
          : copy.hooks.nextActionCreated(result.title),
      );
      setCurrent((record) => mergeRecordWithNextAction(record, displayRecord.id, result));
      setSelectedHistory((record) => mergeRecordWithNextAction(record, displayRecord.id, result));
      setHistory((records) => records.map((record) => mergeRecordWithNextAction(record, displayRecord.id, result) ?? record));
    } catch {
      setFeedbackMessage(copy.hooks.nextActionFailed);
    } finally {
      setNextActionLoading(null);
    }
  }

  function downloadNextActionMarkdown(activeNextActionResult: CallNextActionResponse | null) {
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
      return;
    }

    setProjectName("");
  }

  function applyTemplateSet(templateSet: CallDocTemplateSet) {
    setIntakeMode("pro");
    setGenerationMode(templateSet.generationMode);
    setGenerationPreset(templateSet.generationPreset);
    setSelectedDocTypes(sortCallDocTypes(templateSet.selectedDocTypes));

    if (templateSet.projectPath) {
      handleProjectSelect(templateSet.projectPath);
    }
  }

  function handleSaveTemplateSet() {
    setPromptDialog({
      title: copy.hooks.saveTemplateTitle,
      message: copy.hooks.saveTemplateMessage,
      placeholder: copy.hooks.saveTemplatePlaceholder,
      initialValue: copy.hooks.saveTemplateInitial(projectName),
      confirmLabel: copy.hooks.saveLabel,
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
        setFeedbackMessage(copy.hooks.templateSaved);
      },
    });
  }

  function handleDeleteTemplateSet(templateSetId: string) {
    setConfirmDialog({
      title: copy.hooks.deleteTemplateTitle,
      message: copy.hooks.deleteTemplateMessage,
      confirmLabel: copy.common.delete,
      tone: "danger",
      onConfirm: () => {
        setTemplateSets(deleteCallDocTemplateSet(templateSetId));
        setFeedbackMessage(copy.hooks.templateDeleted);
      },
    });
  }

  async function handleDeleteSavedBundle(entryName: string) {
    setConfirmDialog({
      title: copy.hooks.deleteSavedBundleTitle,
      message: copy.hooks.deleteSavedBundleMessage,
      confirmLabel: copy.common.delete,
      tone: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/call-to-prd/saved/${encodeURIComponent(entryName)}`, {
            method: "DELETE",
            headers: { "x-dashboard-locale": locale },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            setFeedbackMessage(formatCallToPrdApiError(errorData?.error, locale, copy.hooks.deleteFailed));
            return;
          }

          if (selectedSaved === entryName) {
            setSelectedSaved(null);
            setCurrent(null);
          }

          await fetchSaved();
          setFeedbackMessage(copy.hooks.savedBundleDeleted);
        } catch {
          setFeedbackMessage(copy.hooks.deleteFailed);
        }
      },
    });
  }

  async function handleDeleteHistoryRecord(recordId: string) {
    setConfirmDialog({
      title: copy.hooks.deleteHistoryTitle,
      message: copy.hooks.deleteHistoryMessage,
      confirmLabel: copy.common.delete,
      tone: "danger",
      onConfirm: async () => {
        try {
          const response = await fetch("/api/call-to-prd/history", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-dashboard-locale": locale,
            },
            body: JSON.stringify({ id: recordId }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            setFeedbackMessage(formatCallToPrdApiError(errorData?.error, locale, copy.hooks.deleteFailed));
            return;
          }

          setHistory((records) => records.filter((record) => record.id !== recordId));
          setSelectedHistory((record) => (record?.id === recordId ? null : record));
          setCurrent((record) => (record?.id === recordId ? null : record));
          setFeedbackMessage(copy.hooks.historyDeleted);
        } catch {
          setFeedbackMessage(copy.hooks.deleteFailed);
        }
      },
    });
  }

  function handleRetryRecord(record: CallRecord) {
    setIntakeMode(record.generationPreset === "quick" ? "quick" : "pro");
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
      setFeedbackMessage(copy.hooks.retryTextRestored);
    } else {
      setMode("file");
      setDirectText("");
      setFeedbackMessage(copy.hooks.retrySettingsRestored);
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

  return {
    handleSubmit,
    handleGenerateNextAction,
    downloadNextActionMarkdown,
    applyPreset,
    toggleDocType,
    handleSavedQueryChange,
    handleProjectSelect,
    applyTemplateSet,
    handleSaveTemplateSet,
    handleDeleteTemplateSet,
    handleDeleteSavedBundle,
    handleDeleteHistoryRecord,
    handleRetryRecord,
    downloadCurrentMarkdown,
  };
}
