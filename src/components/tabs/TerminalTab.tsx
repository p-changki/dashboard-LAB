"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BookmarkCommands } from "@/components/terminal/BookmarkCommands";
import { QuickLauncher } from "@/components/terminal/QuickLauncher";
import { TerminalInstance } from "@/components/terminal/TerminalInstance";
import { TerminalTabs } from "@/components/terminal/TerminalTabs";
import type { TerminalSession } from "@/lib/types";

type ServerMessage =
  | { type: "created"; session: TerminalSession }
  | { type: "output"; sessionId: string; data: string }
  | { type: "closed"; sessionId: string }
  | { type: "error"; message: string };

type ConnectionState = "connecting" | "open" | "closed" | "error";

export function TerminalTab() {
  const socketRef = useRef<WebSocket | null>(null);
  const pendingCommandsRef = useRef<(string | undefined)[]>([]);
  const autoCreatedRef = useRef(false);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [buffers, setBuffers] = useState<Record<string, string>>({});
  const [activeSessionId, setActiveSessionId] = useState("");
  const [openPanel, setOpenPanel] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [socketVersion, setSocketVersion] = useState(0);
  const wsUrl = useMemo(() => buildTerminalUrl(), []);

  useEffect(() => {
    setSessions([]);
    setBuffers({});
    setActiveSessionId("");
    const socket = new WebSocket(wsUrl);
    setConnectionState("connecting");
    setErrorMessage("");

    socket.addEventListener("open", () => {
      setConnectionState("open");
      if (!autoCreatedRef.current) {
        autoCreatedRef.current = true;
        createSession(socket, pendingCommandsRef, undefined);
      }
    });

    socket.addEventListener("message", (event) => {
      handleMessage(
        JSON.parse(event.data) as ServerMessage,
        {
          socket,
          pendingCommandsRef,
          setSessions,
          setBuffers,
          setActiveSessionId,
          setErrorMessage,
        },
      );
    });

    socket.addEventListener("error", () => {
      setConnectionState("error");
      setErrorMessage("터미널 서버에 연결하지 못했습니다.");
    });

    socket.addEventListener("close", () => {
      setConnectionState((current) => (current === "error" ? current : "closed"));
    });

    socketRef.current = socket;
    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [socketVersion, wsUrl]);

  const activeBuffer = useMemo(
    () => (activeSessionId ? buffers[activeSessionId] ?? "" : ""),
    [activeSessionId, buffers],
  );

  return (
    <div className="space-y-4">
      <TerminalTabs
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onCreate={() => createSession(socketRef.current, pendingCommandsRef, undefined)}
        onClose={(sessionId) => sendMessage(socketRef.current, { type: "close", sessionId })}
      />
      <TerminalStatusBanner
        activeSessionId={activeSessionId}
        connectionState={connectionState}
        errorMessage={errorMessage}
        onReconnect={() => reconnect(setSocketVersion, autoCreatedRef)}
      />
      {connectionState === "open" && activeSessionId ? (
        <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-4">
          <TerminalInstance
            buffer={activeBuffer}
            onInput={(data) => sendInput(socketRef.current, activeSessionId, data)}
            onResize={(cols, rows) => sendResize(socketRef.current, activeSessionId, cols, rows)}
          />
        </section>
      ) : (
        <TerminalFallback />
      )}
      <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
        <button
          type="button"
          onClick={() => setOpenPanel((current) => !current)}
          className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
        >
          {openPanel ? "하단 패널 접기" : "하단 패널 열기"}
        </button>
        {openPanel ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <QuickLauncher
              onLaunch={(cwd, command) => createSession(socketRef.current, pendingCommandsRef, cwd, command)}
            />
            <BookmarkCommands onRun={(command) => sendInput(socketRef.current, activeSessionId, `${command}\r`)} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

interface TerminalHandlerContext {
  socket: WebSocket;
  pendingCommandsRef: React.RefObject<(string | undefined)[]>;
  setSessions: React.Dispatch<React.SetStateAction<TerminalSession[]>>;
  setBuffers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setActiveSessionId: (value: string) => void;
  setErrorMessage: (value: string) => void;
}

function buildTerminalUrl() {
  if (typeof window === "undefined") {
    return "ws://127.0.0.1:34877";
  }

  const port = process.env.NEXT_PUBLIC_TERMINAL_WS_PORT ?? "34877";
  return `ws://${window.location.hostname}:${port}`;
}

function handleMessage(
  message: ServerMessage,
  context: TerminalHandlerContext,
) {
  const {
    socket,
    pendingCommandsRef,
    setSessions,
    setBuffers,
    setActiveSessionId,
    setErrorMessage,
  } = context;

  if (message.type === "created") {
    setSessions((current) => [...current, message.session]);
    setActiveSessionId(message.session.id);
    const pending = pendingCommandsRef.current?.shift();

    if (pending) {
      socket.send(JSON.stringify({ type: "input", sessionId: message.session.id, data: `${pending}\r` }));
    }

    return;
  }

  if (message.type === "error") {
    setErrorMessage(message.message);
    return;
  }

  if (message.type === "output") {
    setBuffers((current) => ({
      ...current,
      [message.sessionId]: `${current[message.sessionId] ?? ""}${message.data}`,
    }));
    return;
  }

  if (message.type === "closed") {
    setSessions((current) => current.filter((session) => session.id !== message.sessionId));
    setBuffers((current) => {
      const next = { ...current };
      delete next[message.sessionId];
      return next;
    });
  }
}

function reconnect(
  setSocketVersion: React.Dispatch<React.SetStateAction<number>>,
  autoCreatedRef: React.RefObject<boolean>,
) {
  autoCreatedRef.current = false;
  setSocketVersion((current) => current + 1);
}

function createSession(
  socket: WebSocket | null,
  pendingCommandsRef: React.RefObject<(string | undefined)[]>,
  cwd?: string,
  command?: string,
) {
  pendingCommandsRef.current?.push(command);
  sendMessage(socket, { type: "create", cwd });
}

function sendMessage(socket: WebSocket | null, payload: object) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function sendInput(socket: WebSocket | null, sessionId: string, data: string) {
  if (!sessionId) {
    return;
  }

  sendMessage(socket, { type: "input", sessionId, data });
}

function sendResize(
  socket: WebSocket | null,
  sessionId: string,
  cols: number,
  rows: number,
) {
  if (!sessionId) {
    return;
  }

  sendMessage(socket, { type: "resize", sessionId, cols, rows });
}

interface TerminalStatusBannerProps {
  activeSessionId: string;
  connectionState: ConnectionState;
  errorMessage: string;
  onReconnect: () => void;
}

function TerminalStatusBanner({
  activeSessionId,
  connectionState,
  errorMessage,
  onReconnect,
}: TerminalStatusBannerProps) {
  if (connectionState === "open" && activeSessionId) {
    return null;
  }

  const label = getConnectionLabel(connectionState, activeSessionId);

  return (
    <section className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold">{label}</p>
          <p className="text-amber-200/80">
            {errorMessage || "초기 세션을 준비 중입니다. 연결이 늦으면 다시 연결을 눌러 주세요."}
          </p>
        </div>
        <button
          type="button"
          onClick={onReconnect}
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-500/20"
        >
          다시 연결
        </button>
      </div>
    </section>
  );
}

function getConnectionLabel(
  connectionState: ConnectionState,
  activeSessionId: string,
) {
  if (connectionState === "connecting") {
    return "터미널 서버 연결 중";
  }

  if (connectionState === "error") {
    return "터미널 연결 실패";
  }

  if (connectionState === "closed") {
    return "터미널 연결 종료";
  }

  if (!activeSessionId) {
    return "터미널 세션 준비 중";
  }

  return "터미널 준비 완료";
}

function TerminalFallback() {
  const commands = ["claude", "codex", "pnpm dev", "pnpm build"];

  return (
    <section className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
      <p className="text-sm font-semibold text-white">웹 터미널 fallback</p>
      <p className="mt-2 text-sm text-gray-400">
        WebSocket 연결이 불안정하면 자주 쓰는 명령을 복사해서 iTerm에서 실행할 수 있습니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {commands.map((command) => (
          <button
            key={command}
            type="button"
            onClick={() => navigator.clipboard.writeText(command)}
            className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            {command} 복사
          </button>
        ))}
        <button
          type="button"
          onClick={() => openITerm()}
          className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-200 transition hover:bg-purple-500/20"
        >
          iTerm 열기
        </button>
      </div>
    </section>
  );
}

function openITerm() {
  void fetch("/api/system/apps/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appPath: "/Applications/iTerm.app" }),
  })
    .then((response) => {
      if (!response.ok) {
        window.open("iterm://new_window", "_blank");
      }
    })
    .catch(() => {
      window.open("iterm://new_window", "_blank");
  });
}
