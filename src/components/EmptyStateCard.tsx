"use client";

import { Sparkles } from "lucide-react";

interface EmptyStateCardProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStateCard({ title, message, actionLabel, onAction }: EmptyStateCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-200">
        <Sparkles className="h-3.5 w-3.5" />
        빠른 시작
      </div>
      <p className="mt-4 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
