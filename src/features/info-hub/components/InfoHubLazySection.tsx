"use client";

import type { ReactNode } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";

interface InfoHubLazySectionProps {
  title: string;
  description: string;
  open: boolean;
  loading: boolean;
  error?: string;
  emptyMessage: string;
  loadingMessage: string;
  onToggle: () => void;
  children?: ReactNode;
}

export function InfoHubLazySection({
  title,
  description,
  open,
  loading,
  error,
  emptyMessage,
  loadingMessage,
  onToggle,
  children,
}: InfoHubLazySectionProps) {
  const hasContent = Boolean(children);

  return (
    <section className="rounded-2xl border border-border-base bg-white/5 p-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/45">{description}</p>
        </div>
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-white/45" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 text-white/45 transition-transform duration-[150ms] ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open ? (
        <div className="mt-4">
          {!hasContent && loading ? (
            <p className="rounded-xl border border-border-base bg-black/20 px-4 py-3 text-sm text-white/65">
              {loadingMessage}
            </p>
          ) : error ? (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {error}
            </p>
          ) : hasContent ? (
            children
          ) : (
            <p className="rounded-xl border border-border-base bg-black/20 px-4 py-3 text-sm text-white/65">
              {emptyMessage}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
