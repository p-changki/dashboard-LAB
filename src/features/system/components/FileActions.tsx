"use client";

import { CopyButton } from "@/components/ui/CopyButton";
import type { FileAction, FileActionResponse } from "@/lib/types";

interface FileActionsProps {
  actions: FileAction[];
}

export function FileActions({ actions }: FileActionsProps) {
  const previewCommands = actions.map((action) => action.command).join("\n");

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-text-primary">File Actions</p>
      <p className="mt-2 text-sm text-text-muted">
        삭제는 휴지통 이동으로 처리되며, 기본값은 dry run입니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton value={previewCommands} label="미리보기 복사" />
      </div>
      <div className="mt-4 space-y-2">
        {actions.map((action) => (
          <div key={`${action.type}-${action.sourcePath}`} className="rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-3 text-sm text-text-secondary">
            {action.type === "move" ? "📁" : "🗑️"} {action.sourcePath}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FileActionResultPanel({ result }: { result: FileActionResponse | null }) {
  if (!result) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <p className="text-sm text-text-secondary">
        성공 {result.totalSuccess}건 · 실패 {result.totalFailed}건
      </p>
      <div className="mt-3">
        <CopyButton value={result.undoScript} label="되돌리기 스크립트 복사" />
      </div>
    </div>
  );
}
