"use client";

import type { CleanupUrgency, FileCategory, FileCleanupAction } from "@/lib/types";

interface CategoryFilterProps {
  action: FileCleanupAction | "all";
  urgency: CleanupUrgency | "all";
  category: FileCategory | "all";
  onActionChange: (value: FileCleanupAction | "all") => void;
  onUrgencyChange: (value: CleanupUrgency | "all") => void;
  onCategoryChange: (value: FileCategory | "all") => void;
}

export function CategoryFilter(props: CategoryFilterProps) {
  return (
    <section className="grid gap-3 rounded-2xl border border-gray-800 bg-gray-800/40 p-4 md:grid-cols-3">
      <Select
        label="액션"
        value={props.action}
        options={["all", "move", "delete", "review", "keep"]}
        onChange={(value) => props.onActionChange(value as FileCleanupAction | "all")}
      />
      <Select
        label="긴급도"
        value={props.urgency}
        options={["all", "high", "medium", "low"]}
        onChange={(value) => props.onUrgencyChange(value as CleanupUrgency | "all")}
      />
      <Select
        label="카테고리"
        value={props.category}
        options={["all", "image", "video", "document", "spreadsheet", "presentation", "hwp", "archive", "installer", "audio", "code-project", "web-save", "system", "other"]}
        onChange={(value) => props.onCategoryChange(value as FileCategory | "all")}
      />
    </section>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm text-text-muted">
      <span className="mb-2 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm text-text-secondary outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
