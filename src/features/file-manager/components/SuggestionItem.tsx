import { CopyButton } from "@/components/ui/CopyButton";
import { FileTypeIcon } from "@/components/common/FileTypeIcon";
import type { CleanupSuggestion } from "@/lib/types";

interface SuggestionItemProps {
  suggestion: CleanupSuggestion;
}

export function SuggestionItem({ suggestion }: SuggestionItemProps) {
  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileTypeIcon extension={suggestion.file.extension || "txt"} />
          <div>
            <p className="text-sm text-white">{suggestion.file.name}</p>
            <p className="mt-1 text-xs text-text-muted">
              {suggestion.reason} · {suggestion.file.sizeHuman}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {suggestion.destination ?? "휴지통 이동"}
            </p>
          </div>
        </div>
        <CopyButton value={suggestion.command} label="명령어 복사" />
      </div>
    </article>
  );
}
