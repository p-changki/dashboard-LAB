import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ObsidianNoteContent } from "@/lib/types";

interface NotePreviewProps {
  note: ObsidianNoteContent | null;
}

export function NotePreview({ note }: NotePreviewProps) {
  if (!note) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-400">
        노트를 선택해 주세요.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
      <header className="border-b border-gray-800 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-white">{note.name}</h3>
            <p className="mt-2 text-xs text-gray-500">{note.path}</p>
          </div>
          <div className="rounded-full border border-gray-800 bg-gray-950/80 px-3 py-1 text-xs text-gray-400">
            수정일 {formatDate(note.lastModified)}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <span
              key={`${note.path}-${tag}`}
              className="rounded-full bg-blue-900/30 px-2.5 py-1 text-xs text-blue-200"
            >
              {tag}
            </span>
          ))}
          {note.isDownloaded === false ? (
            <span className="rounded-full bg-yellow-900/30 px-2.5 py-1 text-xs text-yellow-200">
              iCloud 다운로드 필요
            </span>
          ) : null}
        </div>
      </header>

      <div className="prose prose-invert mt-6 max-w-none prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white prose-code:text-blue-200">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
      </div>

      {note.wikiLinks.length > 0 ? (
        <footer className="mt-6 border-t border-gray-800 pt-4">
          <p className="text-sm font-medium text-white">위키 링크</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {note.wikiLinks.map((link) => (
              <span
                key={`${note.path}-${link}`}
                className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300"
              >
                [[{link}]]
              </span>
            ))}
          </div>
        </footer>
      ) : null}
    </section>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "정보 없음";
  }

  return new Date(value).toLocaleString("ko-KR");
}
