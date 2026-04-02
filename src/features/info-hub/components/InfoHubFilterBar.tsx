"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getInfoHubCategoryLabel, getInfoHubCopy } from "@/features/info-hub/copy";
import type { FeedCategory, FeedCategoryId } from "@/lib/types";
import type { AppLocale } from "@/lib/locale";

interface InfoHubFilterBarProps {
  categories: FeedCategory[];
  category: FeedCategoryId | "all";
  query: string;
  locale: AppLocale;
  copy?: ReturnType<typeof getInfoHubCopy>;
  onChange: (value: FeedCategoryId | "all") => void;
  onQueryChange: (value: string) => void;
}

export function InfoHubFilterBar({ categories, category, query, locale, copy: providedCopy, onChange, onQueryChange }: InfoHubFilterBarProps) {
  const copy = providedCopy ?? getInfoHubCopy(locale);
  return (
    <div className="space-y-3">
      <Input
        type="search"
        variant="ghost"
        size="lg"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={copy.filterPlaceholder}
        className="rounded-2xl bg-white/5 placeholder:text-white/35 focus:border-blue-500/40"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange("all")}
          className={chipClass(category === "all")}
        >
          {copy.all}
        </Button>
        {categories.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            onClick={() => onChange(item.id)}
            className={chipClass(category === item.id)}
          >
            {getInfoHubCategoryLabel(item, locale)}
          </Button>
        ))}
      </div>
    </div>
  );
}

function chipClass(active: boolean) {
  return [
    "rounded-full border px-3",
    active
      ? "border-blue-500/40 bg-blue-500/15 text-blue-200"
      : "border-border-base bg-white/5 text-white/70 hover:bg-white/10",
  ].join(" ");
}
