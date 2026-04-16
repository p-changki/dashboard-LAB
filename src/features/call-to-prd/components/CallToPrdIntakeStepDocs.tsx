"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import {
  ADVANCED_PRESETS,
  CALL_DOC_DEFINITIONS,
  PRIMARY_PRESETS,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import type { CallDocTemplateSet, CallGenerationMode } from "@/lib/types/call-to-prd";
import { getCallGenerationModeLabel, getCallGenerationModeOptions, getCallPresetDescription, getCallPresetLabel, getCallDocDescription, getCallDocLabel, getCallDocShortLabel, getCallToPrdCopy } from "@/features/call-to-prd/copy";

interface CallToPrdIntakeStepDocsProps {
  generationMode: CallGenerationMode;
  setGenerationMode: (mode: CallGenerationMode) => void;
  generationPreset: CallDocPreset;
  applyPreset: (preset: CallDocPreset) => void;
  selectedDocTypes: CallDocType[];
  toggleDocType: (docType: CallDocType) => void;
  setGuideOpen: (open: boolean) => void;
  availableTemplateSets: CallDocTemplateSet[];
  applyTemplateSet: (set: CallDocTemplateSet) => void;
  handleSaveTemplateSet: () => void;
  handleDeleteTemplateSet: (id: string) => void;
}

export function CallToPrdIntakeStepDocs({
  generationMode,
  setGenerationMode,
  generationPreset,
  applyPreset,
  selectedDocTypes,
  toggleDocType,
  setGuideOpen,
  availableTemplateSets,
  applyTemplateSet,
  handleSaveTemplateSet,
  handleDeleteTemplateSet,
}: CallToPrdIntakeStepDocsProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const generationModeOptions = getCallGenerationModeOptions(locale);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showAdvancedPresets, setShowAdvancedPresets] = useState(false);
  const selectedDocLabels = useMemo(
    () => selectedDocTypes.map((docType) => getCallDocShortLabel(docType, locale)),
    [locale, selectedDocTypes],
  );

  useEffect(() => {
    if (ADVANCED_PRESETS.includes(generationPreset)) {
      setShowAdvancedPresets(true);
    }
  }, [generationPreset]);

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-3xl border border-border-base bg-bg-card p-5">
        <div className="grid gap-3 xl:grid-cols-3">
          {generationModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGenerationMode(option.value)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                generationMode === option.value
                  ? "border-cyan-500/30 bg-cyan-950/20"
                  : "border-border-base bg-bg-surface hover:bg-bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-primary">{option.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  generationMode === option.value ? "bg-cyan-900/30 text-cyan-200" : "bg-white/8 text-text-muted"
                }`}>
                  {generationMode === option.value ? copy.common.active : copy.common.available}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-text-muted">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border-base bg-bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{copy.intake.generationTitle}</h3>
            <p className="mt-1 text-xs leading-6 text-text-muted">{copy.intake.generationDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedPresets((current) => !current)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-text-secondary transition hover:bg-white/[0.08] hover:text-white"
            >
              {showAdvancedPresets ? copy.intake.advancedPresetsHide : copy.intake.advancedPresetsShow}
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-text-secondary transition hover:bg-white/[0.08] hover:text-white"
            >
              <CircleHelp className="h-4 w-4" />
              {copy.intake.viewGuide}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {PRIMARY_PRESETS.map((preset) => (
            <PresetCard
              key={preset}
              active={generationPreset === preset}
              label={getCallPresetLabel(preset, locale)}
              description={getCallPresetDescription(preset, locale)}
              onClick={() => applyPreset(preset)}
            />
          ))}
        </div>

        {showAdvancedPresets ? (
          <div className="space-y-3 rounded-2xl border border-border-base bg-bg-surface p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.intake.advancedPresetsShow}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ADVANCED_PRESETS.map((preset) => (
                <PresetCard
                  key={preset}
                  active={generationPreset === preset}
                  label={getCallPresetLabel(preset, locale)}
                  description={getCallPresetDescription(preset, locale)}
                  onClick={() => applyPreset(preset)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {Object.values(CALL_DOC_DEFINITIONS).map((doc) => {
            const checked = selectedDocTypes.includes(doc.type);
            const locked = doc.type === "prd";

            return (
              <button
                key={doc.type}
                type="button"
                onClick={() => toggleDocType(doc.type)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  checked
                    ? "border-purple-500/30 bg-purple-950/20"
                    : "border-border-base bg-bg-surface hover:bg-bg-card"
                } ${locked ? "cursor-default" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{getCallDocLabel(doc.type, locale)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                    locked ? "bg-purple-900/30 text-purple-300" : checked ? "bg-purple-900/30 text-purple-300" : "bg-white/8 text-text-muted"
                  }`}>
                    {locked ? copy.common.required : checked ? copy.common.selected : copy.common.available}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-text-muted">{getCallDocDescription(doc.type, locale)}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border-base bg-bg-card p-5">
        <button
          type="button"
          onClick={() => setTemplateOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{copy.intake.templateTitle}</h3>
            <p className="mt-1 text-xs leading-6 text-text-muted">{copy.intake.templateDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-text-muted">{availableTemplateSets.length}</span>
            <ChevronDown className={`h-4 w-4 text-text-muted transition ${templateOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {templateOpen ? (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveTemplateSet}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-text-secondary transition hover:bg-white/[0.08] hover:text-white"
              >
                {copy.intake.saveCurrentConfig}
              </button>
            </div>

            {availableTemplateSets.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {availableTemplateSets.map((templateSet) => (
                  <div key={templateSet.id} className="rounded-2xl border border-border-base bg-bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="break-words text-sm font-medium text-white">{templateSet.name}</p>
                        <p className="mt-1 text-xs leading-6 text-text-muted">
                          {templateSet.projectName ?? copy.common.allProjects} · {getCallGenerationModeLabel(templateSet.generationMode, locale)} · {getCallPresetLabel(templateSet.generationPreset, locale)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplateSet(templateSet.id)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-text-muted transition hover:bg-white/[0.08] hover:text-white"
                      >
                        {copy.common.delete}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {templateSet.selectedDocTypes.map((docType) => (
                        <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-text-secondary">
                          {getCallDocShortLabel(docType, locale)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => applyTemplateSet(templateSet)}
                        className="rounded-full border border-purple-500/20 bg-purple-900/20 px-4 py-2 text-xs font-medium text-purple-200 transition hover:bg-purple-900/30"
                      >
                        {copy.intake.applyThisConfig}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border-base px-4 py-4 text-sm text-text-muted">
                {copy.intake.noTemplateSets}
              </div>
            )}
          </>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border-base bg-bg-card p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{locale === "ko" ? "선택 문서 목록" : "Selected docs"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedDocLabels.map((label) => (
            <span key={label} className="rounded-full border border-purple-500/20 bg-purple-950/20 px-3 py-1 text-xs text-purple-200">
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function PresetCard({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
        active
          ? "border-purple-500/30 bg-purple-950/20"
          : "border-border-base bg-bg-surface hover:bg-bg-card"
      }`}
    >
      <div className="text-sm font-medium text-text-primary">{label}</div>
      <p className="mt-2 text-xs leading-6 text-text-muted">{description}</p>
    </button>
  );
}
