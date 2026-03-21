"use client";

import type { TerminalSession } from "@/lib/types";

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeSessionId: string;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onClose: (sessionId: string) => void;
}

export function TerminalTabs({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onClose,
}: TerminalTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-800 bg-gray-800/40 p-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={[
            "flex items-center gap-2 rounded-full px-3 py-2 text-sm",
            activeSessionId === session.id
              ? "bg-blue-900/40 text-blue-300"
              : "bg-gray-900 text-gray-300",
          ].join(" ")}
        >
          <button type="button" onClick={() => onSelect(session.id)}>
            {session.title}
          </button>
          <button type="button" onClick={() => onClose(session.id)} className="text-xs text-gray-500">
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onCreate}
        disabled={sessions.length >= 5}
        className="rounded-full border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 disabled:cursor-not-allowed disabled:text-gray-600"
      >
        +
      </button>
    </div>
  );
}
