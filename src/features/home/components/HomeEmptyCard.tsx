"use client";

import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getHomeCopy } from "@/features/home/copy";

interface HomeEmptyCardProps {
  message: string;
}

export function HomeEmptyCard({ message }: HomeEmptyCardProps) {
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <Badge variant="neutral" size="sm"><Sparkles className="h-3.5 w-3.5 text-cyan-200" />{copy.emptyStateLabel}</Badge>
      <p className="mt-4 text-sm leading-6 text-[var(--color-text-soft)]">{message}</p>
    </div>
  );
}
