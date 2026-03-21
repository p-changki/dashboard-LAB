"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { DocContent } from "@/lib/types";

interface DocViewerProps {
  doc: DocContent | null;
  onClose: () => void;
}

const TYPE_CLASS = {
  claude: "bg-purple-900/30 text-purple-300",
  codex: "bg-green-900/30 text-green-300",
  gemini: "bg-blue-900/30 text-blue-300",
  general: "bg-gray-700 text-gray-300",
} as const;

export function DocViewer({ doc, onClose }: DocViewerProps) {
  if (!doc) {
    return null;
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-full max-w-2xl border-l border-gray-800 bg-gray-950/98 p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <p className="text-lg font-semibold text-white">{doc.fileName}</p>
          <p className="mt-2 text-xs text-gray-500">{doc.projectName} · {doc.filePath}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
        >
          닫기
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_CLASS[doc.type]}`}>
          {doc.type}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(doc.lastModified).toLocaleString("ko-KR")}
        </span>
      </div>
      <div className="prose prose-invert mt-6 max-h-[calc(100vh-180px)] overflow-auto pr-2 prose-p:text-gray-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
      </div>
    </aside>
  );
}
