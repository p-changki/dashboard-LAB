"use client";

import { useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLocale } from "@/components/layout/LocaleProvider";
import { markdownComponents } from "@/features/call-to-prd/components/CallToPrdMarkdown";
import { getCallToPrdCopy } from "@/features/call-to-prd/copy";
import type { PrdSection } from "@/lib/call-to-prd/prd-markdown-formatter";

interface CallToPrdViewerCardProps {
  section: PrdSection;
  loading: boolean;
  canRegenerate: boolean;
  onRegenerate: (hint?: string) => Promise<void>;
}

export function CallToPrdViewerCard({
  section,
  loading,
  canRegenerate,
  onRegenerate,
}: CallToPrdViewerCardProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [hintOpen, setHintOpen] = useState(false);
  const [hint, setHint] = useState("");

  return (
    <article className="rounded-[28px] border border-border-base bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.viewer.sectionCardsTitle}</p>
          <h4 className="mt-2 text-lg font-semibold text-white">{section.title}</h4>
        </div>
        <button
          type="button"
          onClick={() => setHintOpen((current) => !current)}
          disabled={!canRegenerate || loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-text-secondary transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          {copy.viewer.regenerateSection}
        </button>
      </div>

      {!canRegenerate ? (
        <p className="mt-3 text-xs leading-6 text-text-muted">{copy.viewer.regenerateUnavailable}</p>
      ) : null}

      {hintOpen ? (
        <div className="mt-4 rounded-2xl border border-border-base bg-black/15 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.viewer.regenerateSectionHint}</p>
          <textarea
            value={hint}
            onChange={(event) => setHint(event.target.value)}
            placeholder={copy.viewer.regenerateSectionPlaceholder}
            rows={3}
            className="mt-3 w-full rounded-2xl border border-border-base bg-bg-surface px-4 py-3 text-sm leading-6 text-text-primary outline-none transition-colors focus:border-cyan-400/40"
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setHint("");
                setHintOpen(false);
              }}
              className="rounded-xl border border-border-base bg-bg-surface px-4 py-2 text-sm text-text-secondary transition hover:bg-bg-card-hover"
            >
              {copy.viewer.regenerateSectionCancel}
            </button>
            <button
              type="button"
              onClick={() => void onRegenerate(hint)}
              disabled={loading}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.viewer.regenerateSectionSubmit}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 max-w-none">
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
          {section.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
