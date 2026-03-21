"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyButton } from "@/components/CopyButton";
import type { SkillRun } from "@/lib/types";

interface RunResultViewerProps {
  run: SkillRun | null;
  onClose: () => void;
}

export function RunResultViewer({ run, onClose }: RunResultViewerProps) {
  if (!run) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl border-l border-white/10 bg-[#090b10] p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xl font-semibold text-white">{run.skillName}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {new Date(run.startedAt).toLocaleString("ko-KR")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          닫기
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton value={run.output ?? run.error ?? ""} label="결과 복사" />
      </div>
      <div className="prose prose-invert mt-6 max-h-[calc(100vh-170px)] overflow-auto pr-2 prose-p:text-gray-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {run.output ?? `실패\n\n${run.error ?? "출력이 없습니다."}`}
        </ReactMarkdown>
      </div>
    </aside>
  );
}
