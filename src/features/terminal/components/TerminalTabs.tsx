"use client";

import { Button } from "@/components/ui/Button";
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
              : "bg-gray-900 text-text-secondary",
          ].join(" ")}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => onSelect(session.id)}
            className="h-auto p-0 rounded-none text-sm font-normal text-inherit hover:text-white"
          >
            {session.title}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose(session.id)}
            className="h-auto p-0 rounded-none text-xs font-normal text-text-muted hover:text-white"
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        onClick={onCreate}
        disabled={sessions.length >= 5}
        className="rounded-full border border-gray-700 bg-gray-900 px-3 text-text-secondary"
      >
        +
      </Button>
    </div>
  );
}
