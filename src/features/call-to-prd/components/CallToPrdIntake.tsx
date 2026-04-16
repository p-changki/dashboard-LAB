"use client";

import { useMemo, useState } from "react";
import { Phone } from "lucide-react";

import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { getRequiredIntakeFields, type CallCustomerImpact, type CallInputKind, type CallReproducibility, type CallSeverity, type CallUrgency } from "@/lib/call-to-prd/intake-config";
import type { ProjectSummary } from "@/lib/types";
import type { CallDocTemplateSet, CallGenerationMode, CallRecord, SavedCallBundleIndexItem } from "@/lib/types/call-to-prd";
import type { CallDocPreset, CallDocType } from "@/lib/call-to-prd/document-config";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getCallPresetLabel, getCallToPrdCopy, getCallGenerationModeLabel } from "@/features/call-to-prd/copy";
import { CallToPrdIntakeStepInput } from "@/features/call-to-prd/components/CallToPrdIntakeStepInput";
import { CallToPrdIntakeStepDocs } from "@/features/call-to-prd/components/CallToPrdIntakeStepDocs";
import { CallToPrdIntakeStepContext } from "@/features/call-to-prd/components/CallToPrdIntakeStepContext";

type InputMode = "file" | "text";

export interface CallToPrdIntakeProps {
  isCoreMode: boolean;
  feedbackMessage: string;
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  directText: string;
  setDirectText: (text: string) => void;
  projectPath: string;
  projectName: string;
  setProjectName: (name: string) => void;
  projectContextStatus: "idle" | "loading" | "ready" | "failed";
  projectContextSummary: string;
  projectContextSources: string[];
  projectContextError: string;
  customerName: string;
  setCustomerName: (name: string) => void;
  additionalContext: string;
  setAdditionalContext: (context: string) => void;
  projects: ProjectSummary[];
  currentProjectPath: string;
  selectedProject: ProjectSummary | null;
  handleProjectSelect: (path: string) => void;
  inputKind: CallInputKind;
  setInputKind: (kind: CallInputKind) => void;
  severity: CallSeverity;
  setSeverity: (severity: CallSeverity) => void;
  customerImpact: CallCustomerImpact;
  setCustomerImpact: (impact: CallCustomerImpact) => void;
  urgency: CallUrgency;
  setUrgency: (urgency: CallUrgency) => void;
  reproducibility: CallReproducibility;
  setReproducibility: (reproducibility: CallReproducibility) => void;
  currentWorkaround: string;
  setCurrentWorkaround: (workaround: string) => void;
  separateExternalDocs: boolean;
  setSeparateExternalDocs: (value: boolean) => void;
  needsChangeBaseline: boolean;
  baselineEntryName: string;
  setBaselineEntryName: (name: string) => void;
  savedBundles: SavedCallBundleIndexItem[];
  activeQueue: CallRecord[];
  recentQueue: CallRecord[];
  setSelectedHistory: (record: CallRecord | null) => void;
  setSelectedSaved: (saved: string | null) => void;
  handleRetryRecord: (record: CallRecord) => void;
  handleDeleteHistoryRecord: (id: string) => void;
  availableTemplateSets: CallDocTemplateSet[];
  applyTemplateSet: (set: CallDocTemplateSet) => void;
  handleSaveTemplateSet: () => void;
  handleDeleteTemplateSet: (id: string) => void;
  generationMode: CallGenerationMode;
  setGenerationMode: (mode: CallGenerationMode) => void;
  generationPreset: CallDocPreset;
  applyPreset: (preset: CallDocPreset) => void;
  selectedDocTypes: CallDocType[];
  toggleDocType: (docType: CallDocType) => void;
  setGuideOpen: (open: boolean) => void;
  handleSubmit: () => void;
  displayRecord: CallRecord | null;
  history: CallRecord[];
  savedTotalCount: number;
}

export function CallToPrdIntake(props: CallToPrdIntakeProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [stepIndex, setStepIndex] = useState(0);
  const inputReady = props.mode === "file" ? Boolean(props.file) : Boolean(props.directText.trim());
  const canSubmit = inputReady && Boolean(props.projectPath) && props.projectContextStatus === "ready";
  const requiredFields = useMemo(() => getRequiredIntakeFields(props.generationPreset), [props.generationPreset]);
  const stepReadiness = [canSubmit, props.selectedDocTypes.length > 0, true];
  const submitStatusText = canSubmit
    ? `${getCallGenerationModeLabel(props.generationMode, locale)} · ${getCallPresetLabel(props.generationPreset, locale)} · ${copy.intake.selectedDocs(props.selectedDocTypes.length)}`
    : !inputReady
      ? copy.hooks.submitMissingInput
      : !props.projectPath
        ? copy.hooks.projectRequired
        : props.projectContextError || copy.hooks.projectContextNotReady;

  return (
    <div className="space-y-5">
      {props.isCoreMode ? <NoticeBanner tone="info" title={copy.intake.coreModeTitle} message={copy.intake.coreModeMessage} /> : null}
      {props.feedbackMessage ? <NoticeBanner title={copy.intake.feedbackTitle} message={props.feedbackMessage} /> : null}

      <section className="grid gap-3 lg:grid-cols-3">
        {copy.intake.wizardSteps.map((step, index) => (
          <button
            key={step.title}
            type="button"
            onClick={() => {
              if (index <= stepIndex || stepReadiness[index - 1]) {
                setStepIndex(index);
              }
            }}
            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
              stepIndex === index ? "border-purple-500/30 bg-purple-950/20" : "border-border-base bg-bg-card"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200/70">{index + 1} {copy.intake.wizardStepLabel}</p>
            <p className="mt-2 text-sm font-medium text-text-primary">{step.title}</p>
            <p className="mt-2 text-xs leading-6 text-text-muted">{step.description}</p>
          </button>
        ))}
      </section>

      {stepIndex === 0 ? <CallToPrdIntakeStepInput {...props} /> : null}
      {stepIndex === 1 ? <CallToPrdIntakeStepDocs {...props} /> : null}
      {stepIndex === 2 ? <CallToPrdIntakeStepContext {...props} requiredFields={requiredFields} /> : null}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-purple-500/15 bg-purple-950/15 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-white">
            {stepIndex === 2 ? copy.intake.startGeneration : copy.intake.wizardSteps[stepIndex].title}
          </p>
          <p className="mt-1 text-xs leading-6 text-text-secondary">{submitStatusText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
            className="rounded-xl border border-border-base bg-bg-surface px-4 py-3 text-sm text-text-secondary transition hover:bg-bg-card-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.intake.wizardBack}
          </button>
          {stepIndex < 2 ? (
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.min(2, current + 1))}
              disabled={!stepReadiness[stepIndex]}
              className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.intake.wizardNext}
            </button>
          ) : (
            <button
              type="button"
              onClick={props.handleSubmit}
              disabled={!canSubmit}
              className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Phone className="mr-2 inline h-4 w-4" />
              {copy.intake.startGeneration}
            </button>
          )}
        </div>
      </section>

      {!props.displayRecord && props.history.length === 0 && props.savedTotalCount === 0 ? (
        <EmptyStateCard
          title={copy.intake.emptyTitle}
          message={copy.intake.emptyMessage}
          actionLabel={copy.intake.emptyAction}
          onAction={() => props.setGuideOpen(true)}
        />
      ) : null}
    </div>
  );
}
