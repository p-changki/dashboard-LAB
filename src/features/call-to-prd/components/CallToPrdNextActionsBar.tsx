"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, BookMarked, ClipboardList, Loader2, Rocket } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { getCallNextActionDescription, getCallNextActionLabel, getCallToPrdCopy } from "@/features/call-to-prd/copy";
import type { CallNextActionResponse, CallNextActionType, CallRecord } from "@/lib/types/call-to-prd";

interface CallToPrdNextActionsBarProps {
  displayRecord: CallRecord | null;
  nextActionLoading: CallNextActionType | null;
  nextActionResults: Partial<Record<CallNextActionType, CallNextActionResponse>>;
  onGenerateNextAction: (actionType: CallNextActionType) => void;
  onOpenNextAction: (actionType: CallNextActionType) => void;
  onExportToObsidian: () => Promise<void>;
  onCopyGithubIssueDraft: () => Promise<void>;
}

interface ObsidianStatusPayload {
  configured: boolean;
  vaultPath: string | null;
  targetDirectory: string | null;
}

export function CallToPrdNextActionsBar({
  displayRecord,
  nextActionLoading,
  nextActionResults,
  onGenerateNextAction,
  onOpenNextAction,
  onExportToObsidian,
  onCopyGithubIssueDraft,
}: CallToPrdNextActionsBarProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const [obsidianStatus, setObsidianStatus] = useState<ObsidianStatusPayload | null>(null);
  const [obsidianLoading, setObsidianLoading] = useState(false);
  const [githubCopyLoading, setGithubCopyLoading] = useState(false);

  useEffect(() => {
    if (!displayRecord?.prdMarkdown) {
      setObsidianStatus(null);
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch("/api/call-to-prd/obsidian/export", {
          cache: "no-store",
          headers: { "x-dashboard-locale": locale },
        });
        const payload = await response.json() as ObsidianStatusPayload;
        if (!cancelled) {
          setObsidianStatus(payload);
        }
      } catch {
        if (!cancelled) {
          setObsidianStatus({
            configured: false,
            vaultPath: null,
            targetDirectory: null,
          });
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [displayRecord?.prdMarkdown, locale]);

  if (!displayRecord?.prdMarkdown) {
    return null;
  }

  return (
    <section className="sticky top-4 z-10 rounded-3xl border border-border-base bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(17,24,39,0.96))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">{copy.viewer.quickActionsEyebrow}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{copy.viewer.quickActionsTitle}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{copy.viewer.quickActionsDescription}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-4">
        <QuickActionCard
          title={getCallNextActionLabel("pm-handoff", locale)}
          description={getCallNextActionDescription("pm-handoff", locale)}
          detail={nextActionResults["pm-handoff"] ? copy.viewer.quickActionReady : copy.viewer.quickActionGenerateHint}
          loading={nextActionLoading === "pm-handoff"}
          disabled={Boolean(nextActionLoading) && nextActionLoading !== "pm-handoff"}
          icon={<Rocket className="h-4 w-4" />}
          ctaLabel={nextActionResults["pm-handoff"] ? copy.viewer.quickActionOpen : copy.viewer.quickActionGenerate}
          onClick={() => {
            if (nextActionResults["pm-handoff"]) {
              onOpenNextAction("pm-handoff");
              return;
            }
            onGenerateNextAction("pm-handoff");
          }}
        />
        <QuickActionCard
          title={getCallNextActionLabel("frontend-plan", locale)}
          description={getCallNextActionDescription("frontend-plan", locale)}
          detail={nextActionResults["frontend-plan"] ? copy.viewer.quickActionReady : copy.viewer.quickActionGenerateHint}
          loading={nextActionLoading === "frontend-plan"}
          disabled={Boolean(nextActionLoading) && nextActionLoading !== "frontend-plan"}
          icon={<ArrowUpRight className="h-4 w-4" />}
          ctaLabel={nextActionResults["frontend-plan"] ? copy.viewer.quickActionOpen : copy.viewer.quickActionGenerate}
          onClick={() => {
            if (nextActionResults["frontend-plan"]) {
              onOpenNextAction("frontend-plan");
              return;
            }
            onGenerateNextAction("frontend-plan");
          }}
        />
        <QuickActionCard
          title={copy.viewer.obsidianCardTitle}
          description={copy.viewer.obsidianCardDescription}
          detail={obsidianStatus?.configured
            ? `${copy.viewer.obsidianTargetLabel} ${obsidianStatus.targetDirectory ?? obsidianStatus.vaultPath ?? ""}`
            : copy.viewer.obsidianSetupHint}
          loading={obsidianLoading}
          disabled={!obsidianStatus || !obsidianStatus.configured}
          icon={<BookMarked className="h-4 w-4" />}
          ctaLabel={obsidianStatus?.configured ? copy.viewer.obsidianCardCta : copy.viewer.obsidianSetupCta}
          onClick={async () => {
            if (!obsidianStatus?.configured) {
              return;
            }
            setObsidianLoading(true);
            await onExportToObsidian();
            setObsidianLoading(false);
          }}
        />
        <QuickActionCard
          title={copy.viewer.githubIssueCardTitle}
          description={copy.viewer.githubIssueCardDescription}
          detail={copy.viewer.githubIssueCardHint}
          loading={githubCopyLoading}
          icon={<ClipboardList className="h-4 w-4" />}
          ctaLabel={copy.viewer.githubIssueCardCta}
          onClick={async () => {
            setGithubCopyLoading(true);
            await onCopyGithubIssueDraft();
            setGithubCopyLoading(false);
          }}
        />
      </div>
    </section>
  );
}

function QuickActionCard({
  title,
  description,
  detail,
  ctaLabel,
  icon,
  loading,
  disabled = false,
  onClick,
}: {
  title: string;
  description: string;
  detail: string;
  ctaLabel: string;
  icon: ReactNode;
  loading: boolean;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-black/15 p-4">
      <div className="flex items-center gap-2 text-cyan-100">
        <span className="rounded-full bg-cyan-400/10 p-2">{icon}</span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      <p className="mt-3 min-h-12 text-xs leading-6 text-text-muted">{detail}</p>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={loading || disabled}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {ctaLabel}
      </button>
    </article>
  );
}
