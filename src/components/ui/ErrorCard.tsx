"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { pickLocale } from "@/lib/locale";

interface ErrorCardProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorCard({
  title,
  message,
  actionLabel,
  onAction,
}: ErrorCardProps) {
  const { locale } = useLocale();
  const resolvedTitle = title ?? pickLocale(locale, {
    ko: "문제가 발생했습니다",
    en: "Something went wrong",
  });

  return (
    <section className="rounded-3xl border border-rose-500/20 bg-rose-500/8 p-5">
      <p className="text-sm font-semibold text-rose-200">{resolvedTitle}</p>
      <p className="mt-3 text-sm leading-6 text-rose-100/85">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full border border-rose-300/25 bg-black/15 px-4 py-2 text-sm text-rose-100 transition hover:bg-black/25"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
