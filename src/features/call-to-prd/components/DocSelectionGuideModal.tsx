"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Check, Sparkles, Target, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/components/layout/LocaleProvider";
import type { CallDocPreset, CallDocType } from "@/lib/call-to-prd/document-config";
import { getCallDocDescription, getCallDocLabel, getCallDocShortLabel, getCallPresetLabel, getCallToPrdCopy } from "@/features/call-to-prd/copy";

type GuideTab = "presets" | "docs" | "scenarios";

interface DocSelectionGuideModalProps {
  onApplyPreset: (preset: Exclude<CallDocPreset, "custom">) => void;
  onClose: () => void;
  open: boolean;
}

export function DocSelectionGuideModal({ onApplyPreset, onClose, open }: DocSelectionGuideModalProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [activeTab, setActiveTab] = useState<GuideTab>("presets");
  const presetGuide = copy.guideData.presetGuide;
  const docGuide = copy.guideData.docGuide;
  const scenarioGuide = copy.guideData.scenarioGuide;

  const guideTabs = useMemo(
    () => ([
      { id: "presets", label: copy.guide.tabs.presets },
      { id: "docs", label: copy.guide.tabs.docs },
      { id: "scenarios", label: copy.guide.tabs.scenarios },
    ] satisfies Array<{ id: GuideTab; label: string }>),
    [copy.guide.tabs.docs, copy.guide.tabs.presets, copy.guide.tabs.scenarios],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/65 px-4 py-6 backdrop-blur-sm">
      <button type="button" aria-label={copy.guide.closeAria} className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-border-base bg-bg-page shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-border-base px-6 py-5">
          <div>
            <Badge variant="claude" size="sm"><BookOpenText className="h-3.5 w-3.5" />{copy.guide.badge}</Badge>
            <h2 className="mt-3 text-xl font-semibold text-white">{copy.guide.title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">{copy.guide.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2 overflow-y-auto">
            {guideTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                  activeTab === tab.id
                    ? "border-purple-500/30 bg-purple-950/25 text-purple-200"
                    : "border-border-base bg-white/[0.03] text-text-muted hover:bg-white/[0.06] hover:text-text-secondary"
                }`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.id ? <Check className="h-4 w-4" /> : null}
              </button>
            ))}
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
            {activeTab === "presets" ? (
              <div className="space-y-4">
                {Object.entries(presetGuide).map(([preset, guide]) => {
                  const presetId = preset as Exclude<CallDocPreset, "custom">;

                  return (
                    <div key={presetId} className="rounded-[26px] border border-border-base bg-white/[0.03] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-white">{getCallPresetLabel(presetId, locale)}</h3>
                          <p className="mt-2 text-sm leading-6 text-text-muted">{guide.summary}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onApplyPreset(presetId);
                            onClose();
                          }}
                          className="rounded-full border border-purple-500/25 bg-purple-950/30 px-4 py-2 text-xs font-medium text-purple-200 transition-colors hover:bg-purple-900/40"
                        >
                          {copy.guide.applyPreset}
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(
                          {
                            core: ["prd", "open-questions", "acceptance-criteria", "user-flow"],
                            "issue-analysis": ["prd", "problem-statement", "client-brief", "open-questions"],
                            "client-share": ["prd", "client-brief", "open-questions"],
                            "dev-handoff": ["prd", "open-questions", "acceptance-criteria", "user-flow", "api-contract", "data-schema"],
                            "change-request": ["prd", "open-questions", "change-request-diff", "task-breakdown"],
                            "ai-quality": ["prd", "open-questions", "acceptance-criteria", "user-flow", "prompt-spec", "evaluation-plan"],
                            release: ["prd", "acceptance-criteria", "qa-checklist", "release-runbook"],
                          } as const
                        )[presetId].map((docType) => (
                          <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-text-secondary">
                            {getCallDocShortLabel(docType, locale)}
                          </span>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.05] p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                            <Target className="h-4 w-4" />
                            {copy.guide.chooseWhen}
                          </div>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                            {guide.useWhen.map((item: string) => (
                              <li key={item}>- {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.05] p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                            <Sparkles className="h-4 w-4" />
                            {copy.guide.skipWhen}
                          </div>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                            {guide.avoidWhen.map((item: string) => (
                              <li key={item}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {activeTab === "docs" ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {Object.entries(docGuide).map(([docType, guide]) => {
                  const resolvedDocType = docType as CallDocType;

                  return (
                    <div key={docType} className="rounded-[24px] border border-border-base bg-white/[0.03] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-white">{getCallDocLabel(resolvedDocType, locale)}</h3>
                        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-text-muted">
                          {guide.useWhen}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text-secondary">{guide.value}</p>
                      <p className="mt-3 text-xs leading-6 text-text-muted">{getCallDocDescription(resolvedDocType, locale)}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {activeTab === "scenarios" ? (
              <div className="space-y-4">
                {scenarioGuide.map((scenario) => (
                  <div key={scenario.title} className="rounded-[26px] border border-border-base bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{scenario.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-text-muted">{scenario.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPreset(scenario.preset);
                          onClose();
                        }}
                        className="rounded-full border border-purple-500/25 bg-purple-950/30 px-4 py-2 text-xs font-medium text-purple-200 transition-colors hover:bg-purple-900/40"
                      >
                        {locale === "ko" ? `${getCallPresetLabel(scenario.preset, locale)} 적용` : `Apply ${getCallPresetLabel(scenario.preset, locale)}`}
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                      <span className="rounded-full bg-purple-950/30 px-3 py-1 text-purple-200">
                        {copy.guide.useLabel}: {getCallPresetLabel(scenario.preset, locale)}
                      </span>
                      {("extras" in scenario ? scenario.extras : undefined)?.map((docType) => (
                        <span key={docType} className="rounded-full bg-white/8 px-3 py-1 text-text-secondary">
                          {copy.guide.extraLabel}: {getCallDocLabel(docType, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 rounded-[24px] border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
                <BookOpenText className="h-4 w-4" />
                {copy.guide.flowTitle}
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                {copy.guide.flowSteps.map((step) => (
                  <p key={step}>{step}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
