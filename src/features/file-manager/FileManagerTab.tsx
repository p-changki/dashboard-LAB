"use client";

import { useEffect, useMemo, useState } from "react";

import { CategoryFilter } from "@/features/file-manager/components/CategoryFilter";
import { AutoOrganize } from "@/features/file-manager/components/AutoOrganize";
import { FileManagerStats } from "@/features/file-manager/components/FileManagerStats";
import { SuggestionGroup } from "@/features/file-manager/components/SuggestionGroup";
import type {
  CleanupUrgency,
  FileCategory,
  FileCleanupAction,
  FileManagerResponse,
} from "@/lib/types";

type SourceTab = "desktop" | "downloads";

export function FileManagerTab() {
  const [data, setData] = useState<FileManagerResponse | null>(null);
  const [source, setSource] = useState<SourceTab>("desktop");
  const [action, setAction] = useState<FileCleanupAction | "all">("all");
  const [urgency, setUrgency] = useState<CleanupUrgency | "all">("all");
  const [category, setCategory] = useState<FileCategory | "all">("all");

  useEffect(() => {
    void fetch("/api/file-manager", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: FileManagerResponse) => setData(payload))
      .catch(() => setData(null));
  }, []);

  const suggestions = useMemo(() => {
    const list = data?.[source].suggestions ?? [];

    return list.filter((suggestion) => {
      const matchesAction = action === "all" || suggestion.action === action;
      const matchesUrgency = urgency === "all" || suggestion.urgency === urgency;
      const matchesCategory = category === "all" || suggestion.file.category === category;
      return matchesAction && matchesUrgency && matchesCategory;
    });
  }, [action, category, data, source, urgency]);

  return (
    <div className="space-y-4">
      <AutoOrganize />
      {data ? <FileManagerStats data={data} /> : null}
      <div className="flex gap-2">
        {(["desktop", "downloads"] as SourceTab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSource(item)}
            className={[
              "rounded-full px-3 py-2 text-sm transition",
              source === item ? "bg-blue-900/40 text-blue-300" : "bg-gray-800 text-text-muted",
            ].join(" ")}
          >
            {item === "desktop" ? "Desktop" : "Downloads"}
          </button>
        ))}
      </div>
      <CategoryFilter
        action={action}
        urgency={urgency}
        category={category}
        onActionChange={setAction}
        onUrgencyChange={setUrgency}
        onCategoryChange={setCategory}
      />
      <SuggestionGroup
        title="높음 우선순위"
        suggestions={suggestions.filter((item) => item.urgency === "high")}
      />
      <SuggestionGroup
        title="중간 우선순위"
        suggestions={suggestions.filter((item) => item.urgency === "medium")}
      />
      <SuggestionGroup
        title="낮음 우선순위"
        suggestions={suggestions.filter((item) => item.urgency === "low")}
      />
    </div>
  );
}
