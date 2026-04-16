"use client";

import { useMemo, useState } from "react";
import { Clock3, MoreHorizontal, Sparkles, Trash2 } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { getCallDocShortLabel, getCallGenerationModeLabel, getCallPresetLabel, getCallToPrdCopy } from "@/features/call-to-prd/copy";
import type { CallDocTemplateSet } from "@/lib/types/call-to-prd";

interface RecentTemplatesRowProps {
  templateSets: CallDocTemplateSet[];
  onApply: (templateSet: CallDocTemplateSet) => void;
  onDelete: (templateSetId: string) => void;
}

export function RecentTemplatesRow({
  templateSets,
  onApply,
  onDelete,
}: RecentTemplatesRowProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const recentTemplates = useMemo(
    () => [...templateSets]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 3),
    [templateSets],
  );

  if (recentTemplates.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-border-base bg-[linear-gradient(135deg,rgba(34,197,94,0.08),rgba(15,23,42,0.12))] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">{copy.tab.recentTemplatesEyebrow}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{copy.tab.recentTemplatesTitle}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{copy.tab.recentTemplatesDescription}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-text-muted">
          {recentTemplates.length}
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        {recentTemplates.map((templateSet) => (
          <article
            key={templateSet.id}
            className="relative rounded-[26px] border border-white/10 bg-black/15 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{templateSet.name}</p>
                <p className="mt-1 text-xs leading-6 text-text-muted">
                  {templateSet.projectName ?? copy.common.allProjects} · {getCallPresetLabel(templateSet.generationPreset, locale)}
                </p>
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpenId((current) => (current === templateSet.id ? null : templateSet.id))}
                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-text-muted transition hover:bg-white/[0.08] hover:text-white"
                  aria-label={copy.tab.recentTemplateMenu}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuOpenId === templateSet.id ? (
                  <div className="absolute right-0 top-11 z-10 min-w-36 rounded-2xl border border-white/10 bg-[#141414] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpenId(null);
                        onDelete(templateSet.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-white/[0.05]"
                    >
                      <Trash2 className="h-4 w-4" />
                      {copy.common.delete}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100">
                <Sparkles className="h-3.5 w-3.5" />
                {getCallGenerationModeLabel(templateSet.generationMode, locale)}
              </span>
              {templateSet.selectedDocTypes.map((docType) => (
                <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-text-secondary">
                  {getCallDocShortLabel(docType, locale)}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <Clock3 className="h-3.5 w-3.5" />
                {copy.tab.recentTemplateUpdated(formatUpdatedAt(templateSet.updatedAt, locale))}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMenuOpenId(null);
                  onApply(templateSet);
                }}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/20"
              >
                {copy.tab.recentTemplateApply}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatUpdatedAt(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
