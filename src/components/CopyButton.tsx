"use client";

import { useState } from "react";

import { pushRecentItem } from "@/hooks/useRecent";

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
  const [copied, setCopied] = useState(false);

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
      {copied ? "복사됨" : label}
    </button>
  );
}
