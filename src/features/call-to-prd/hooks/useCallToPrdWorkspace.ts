"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { CALL_NEXT_ACTION_DEFINITIONS } from "@/lib/call-to-prd/next-action-config";
import { CALL_DOC_PRESET_DEFINITIONS, type CallDocPreset, type CallDocType } from "@/lib/call-to-prd/document-config";
import {
  DEFAULT_CALL_INTAKE_METADATA,
  type CallCustomerImpact,
  type CallInputKind,
  type CallReproducibility,
  type CallSeverity,
  type CallUrgency,
} from "@/lib/call-to-prd/intake-config";
import { formatPrdMarkdown } from "@/lib/call-to-prd/prd-markdown-formatter";
import type { ProjectSummary } from "@/lib/types";
import type {
  CallDocTemplateSet,
  CallGenerationMode,
  CallNextActionResponse,
  CallNextActionType,
  CallRecord,
  SavedCallBundleIndexItem,
} from "@/lib/types/call-to-prd";
import type { ConfirmDialogState, PromptDialogState } from "@/features/call-to-prd/components/CallToPrdMarkdown";
import {
  buildNextActionMap,
  getDisplayDocs,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";
import { getCallToPrdCopy } from "@/features/call-to-prd/copy";

import type { InputMode, IntakeMode, SubTab } from "../state";

const INTAKE_MODE_STORAGE_KEY = "call-to-prd:intake-mode";

function isIntakeMode(value: string): value is IntakeMode {
  return value === "quick" || value === "pro";
}

export function useCallToPrdWorkspace(navigationMode: DashboardNavigationMode = "advanced") {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [subTab, setSubTab] = useState<SubTab>("intake");
  const [intakeMode, setIntakeMode] = useState<IntakeMode>("quick");
  const [intakeStep, setIntakeStep] = useState(0);
  const [mode, setMode] = useState<InputMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [directText, setDirectText] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [currentProjectPath, setCurrentProjectPath] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectContextStatus, setProjectContextStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [projectContextSummary, setProjectContextSummary] = useState("");
  const [projectContextSources, setProjectContextSources] = useState<string[]>([]);
  const [projectContextError, setProjectContextError] = useState("");
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
  const [feedbackMessage, setFeedbackMessage] = useState("");
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

  const deferredSavedQuery = useDeferredValue(savedQuery);
  const isCoreMode = navigationMode === "core";

  const displayRecord = useMemo(() => selectedHistory ?? current, [current, selectedHistory]);
  const selectedProject = useMemo(
    () => projects.find((project) => project.path === projectPath) ?? null,
    [projectPath, projects],
  );
  const displayDocs = useMemo(() => getDisplayDocs(displayRecord), [displayRecord]);
  const generationWarnings = useMemo(
    () => {
      const warnings = [...(displayRecord?.generationWarnings ?? [])];
      if (displayRecord?.status === "completed" && (displayRecord.savedEntryName || selectedSaved) && !displayRecord.projectContext) {
        warnings.unshift(displayRecord.projectContextError ?? copy.viewer.noProjectContextWarning);
      }
      return warnings;
    },
    [copy.viewer.noProjectContextWarning, displayRecord, selectedSaved],
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
  const activeDoc = useMemo(
    () => displayDocs.find((doc) => doc.type === activeDocType) ?? displayDocs[0] ?? null,
    [activeDocType, displayDocs],
  );
  const selectedDocContent = useMemo(() => {
    if (activeDocType === "prd" && displayRecord) {
      return {
        merged: displayRecord.prdMarkdown ?? "",
        claude: displayRecord.claudePrd ?? copy.viewer.noClaudeResult,
        codex: displayRecord.codexPrd ?? copy.viewer.noCodexResult,
        diff: displayRecord.diffReport ?? copy.viewer.noDiffResult,
      }[prdView];
    }

    return activeDoc?.markdown ?? "";
  }, [activeDoc, activeDocType, copy.viewer.noClaudeResult, copy.viewer.noCodexResult, copy.viewer.noDiffResult, displayRecord, prdView]);
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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(INTAKE_MODE_STORAGE_KEY);
      if (raw && isIntakeMode(raw)) {
        setIntakeMode(raw);
      }
    } catch {
      setIntakeMode("quick");
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(INTAKE_MODE_STORAGE_KEY, intakeMode);
    } catch {
      // Ignore persistence failures and keep the in-memory mode.
    }
  }, [intakeMode]);

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
    if (projectPath || !currentProjectPath) {
      return;
    }

    const currentProject = projects.find((project) => project.path === currentProjectPath);
    if (!currentProject) {
      return;
    }

    setProjectPath(currentProject.path);
    setProjectName((current) => current || currentProject.name);
  }, [currentProjectPath, projectPath, projects]);

  return {
    isCoreMode,
    subTab,
    setSubTab,
    intakeMode,
    setIntakeMode,
    intakeStep,
    setIntakeStep,
    mode,
    setMode,
    file,
    setFile,
    pdfFile,
    setPdfFile,
    directText,
    setDirectText,
    projectName,
    setProjectName,
    projectPath,
    setProjectPath,
    currentProjectPath,
    setCurrentProjectPath,
    projects,
    setProjects,
    projectContextStatus,
    setProjectContextStatus,
    projectContextSummary,
    setProjectContextSummary,
    projectContextSources,
    setProjectContextSources,
    projectContextError,
    setProjectContextError,
    customerName,
    setCustomerName,
    additionalContext,
    setAdditionalContext,
    inputKind,
    setInputKind,
    severity,
    setSeverity,
    customerImpact,
    setCustomerImpact,
    urgency,
    setUrgency,
    reproducibility,
    setReproducibility,
    currentWorkaround,
    setCurrentWorkaround,
    separateExternalDocs,
    setSeparateExternalDocs,
    baselineEntryName,
    setBaselineEntryName,
    guideOpen,
    setGuideOpen,
    generationMode,
    setGenerationMode,
    generationPreset,
    setGenerationPreset,
    selectedDocTypes,
    setSelectedDocTypes,
    templateSets,
    setTemplateSets,
    current,
    setCurrent,
    history,
    setHistory,
    selectedHistory,
    setSelectedHistory,
    savedBundles,
    setSavedBundles,
    savedQuery,
    setSavedQuery,
    deferredSavedQuery,
    savedPage,
    setSavedPage,
    savedTotalCount,
    setSavedTotalCount,
    savedTotalPages,
    setSavedTotalPages,
    selectedSaved,
    setSelectedSaved,
    feedbackMessage,
    setFeedbackMessage,
    confirmDialog,
    setConfirmDialog,
    promptDialog,
    setPromptDialog,
    activeDocType,
    setActiveDocType,
    prdView,
    setPrdView,
    docResultsOpen,
    setDocResultsOpen,
    docContentOpen,
    setDocContentOpen,
    savedTreeOpen,
    setSavedTreeOpen,
    historyOpen,
    setHistoryOpen,
    savedOpen,
    setSavedOpen,
    nextActionsOpen,
    setNextActionsOpen,
    nextActionContentOpen,
    setNextActionContentOpen,
    nextActionLoading,
    setNextActionLoading,
    nextActionResults,
    setNextActionResults,
    activeNextAction,
    setActiveNextAction,
    displayRecord,
    selectedProject,
    displayDocs,
    generationWarnings,
    activeQueue,
    recentQueue,
    availableTemplateSets,
    needsChangeBaseline,
    selectedDocContent,
    renderedDocContent,
    availableNextActions,
    activeNextActionResult,
    nextActionList,
    renderedNextActionContent,
    displaySavedEntryName,
    hasSupportDocs,
  };
}
