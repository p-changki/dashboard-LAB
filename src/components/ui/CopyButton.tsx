"use client";

import { useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { pushRecentItem } from "@/hooks/useRecent";
import { pickLocale } from "@/lib/locale";

interface CopyButtonProps {
  value: string;
  label?: string;
  recentItem?: {
    id: string;
    name: string;
    type: "skill" | "command" | "project" | "agent" | "team" | "mcp";
  };
}

export function CopyButton({ value, label = "복사", recentItem }: CopyButtonProps) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const buttonLabel = pickLocale(locale, {
    ko: label,
    en: label === "복사" ? "Copy" : label,
  });
  const copiedLabel = pickLocale(locale, {
    ko: "복사됨",
    en: "Copied",
  });

  async function handleClick() {
    await navigator.clipboard.writeText(value);
    if (recentItem) {
      pushRecentItem({
        id: recentItem.id,
        name: recentItem.name,
        type: recentItem.type,
        action: "copied",
        timestamp: "",
        value,
      });
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
    >
      {copied ? copiedLabel : buttonLabel}
    </button>
  );
}
