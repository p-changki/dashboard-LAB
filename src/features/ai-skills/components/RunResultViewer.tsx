"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatAiSkillDate, getAiSkillsCopy } from "@/features/ai-skills/copy";
import type { SkillRun } from "@/lib/types";

interface RunResultViewerProps {
  run: SkillRun | null;
  onClose: () => void;
}

export function RunResultViewer({ run, onClose }: RunResultViewerProps) {
  const { locale } = useLocale();
  const copy = getAiSkillsCopy(locale);

  if (!run) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
      <button type="button" onClick={onClose} className="absolute inset-0" aria-label={copy.close} />
      <aside className="absolute inset-y-0 right-0 z-10 w-full max-w-5xl overflow-y-auto border-l border-border-base bg-bg-base p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-base pb-4">
          <div className="min-w-0 flex-1">
            <p className="break-words text-xl font-semibold text-white">{run.skillName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="info">{run.runner}</Badge>
              <Badge variant="neutral">{copy.status[run.status]}</Badge>
            </div>
            <p className="mt-3 text-xs leading-6 text-text-muted">
              {formatAiSkillDate(locale, run.startedAt)}
            </p>
            <p className="mt-2 break-words text-xs leading-6 text-text-muted">
              {run.cwd}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {copy.close}
          </Button>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-border-base bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.metaTitle}</p>
              <dl className="mt-4 grid gap-3">
                <MetaRow label={copy.runnerLabel} value={run.runner} />
                <MetaRow label={copy.statusLabel} value={copy.status[run.status]} />
                <MetaRow label={copy.startedAtLabel} value={formatAiSkillDate(locale, run.startedAt)} />
                <MetaRow
                  label={copy.completedAtLabel}
                  value={run.completedAt ? formatAiSkillDate(locale, run.completedAt) : copy.status[run.status]}
                />
                <MetaRow label={copy.cwdLabel} value={run.cwd} breakWords />
              </dl>
            </section>

            <section className="rounded-3xl border border-border-base bg-white/[0.04] p-4">
              <div className="flex flex-wrap gap-2">
                <CopyButton value={run.output ?? run.error ?? ""} label={copy.copyResult} />
                <CopyButton value={run.prompt ?? ""} label={copy.copyPrompt} />
              </div>
            </section>

            <details className="rounded-3xl border border-border-base bg-white/[0.04] p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-white">
                {copy.promptTitle}
              </summary>
              <div className="mt-4 rounded-2xl border border-border-base bg-black/20 p-4">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-text-secondary">
                  {run.prompt || copy.noPrompt}
                </pre>
              </div>
            </details>
          </div>

          <section className="min-w-0 rounded-[28px] border border-border-base bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.resultTitle}</p>
            <div className="prose prose-invert mt-4 max-w-none overflow-auto pr-2 prose-p:text-text-secondary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {run.output ?? `${copy.failedOutputTitle}\n\n${run.error ?? copy.noOutput}`}
              </ReactMarkdown>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function MetaRow({
  label,
  value,
  breakWords = false,
}: {
  label: string;
  value: string;
  breakWords?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border-base bg-black/20 px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</dt>
      <dd className={["mt-2 text-sm text-white", breakWords ? "break-words" : ""].join(" ")}>{value}</dd>
    </div>
  );
}
