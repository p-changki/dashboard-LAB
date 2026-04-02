"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { BookmarkCommands } from "@/features/terminal/components/BookmarkCommands";
import { QuickLauncher } from "@/features/terminal/components/QuickLauncher";
import { TerminalInstance } from "@/features/terminal/components/TerminalInstance";
import { TerminalTabs } from "@/features/terminal/components/TerminalTabs";
import type { TerminalSession } from "@/lib/types";

type ServerMessage =
  | { type: "created"; session: TerminalSession }
  | { type: "output"; sessionId: string; data: string }
  | { type: "closed"; sessionId: string }
  | { type: "error"; message: string };

type ConnectionState = "connecting" | "open" | "closed" | "error";
interface TerminalBufferState {
  content: string;
  trimCount: number;
  wasTrimmed: boolean;
}

const MAX_TERMINAL_BUFFER_CHARS = 200_000;
const TERMINAL_BUFFER_TRIM_TARGET = 160_000;

export function TerminalTab() {
  const socketRef = useRef<WebSocket | null>(null);
  const pendingCommandsRef = useRef<(string | undefined)[]>([]);
  const autoCreatedRef = useRef(false);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [bufferStates, setBufferStates] = useState<Record<string, TerminalBufferState>>({});
  const [activeSessionId, setActiveSessionId] = useState("");
  const [openPanel, setOpenPanel] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [socketVersion, setSocketVersion] = useState(0);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTerminalUrl() {
      try {
        setConnectionState("connecting");
        setErrorMessage("");
        const response = await fetch("/api/system/terminal-token", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("터미널 토큰을 불러오지 못했습니다.");
        }

        const payload = (await response.json()) as { enabled?: boolean; token?: string | null };

        if (!payload.enabled || !payload.token) {
          throw new Error("터미널 서버를 사용할 수 없습니다.");
        }

        if (!cancelled) {
          setWsUrl(buildTerminalUrl(payload.token));
        }
      } catch (error) {
        if (!cancelled) {
          setWsUrl(null);
          setConnectionState("error");
          setErrorMessage(error instanceof Error ? error.message : "터미널 서버에 연결하지 못했습니다.");
        }
      }
    }

    void loadTerminalUrl();

    return () => {
      cancelled = true;
    };
  }, [socketVersion]);

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    setSessions([]);
    setBufferStates({});
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
          setBufferStates,
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
  }, [wsUrl]);

  const activeBufferState = useMemo(
    () => (activeSessionId ? bufferStates[activeSessionId] ?? createTerminalBufferState() : null),
    [activeSessionId, bufferStates],
  );
  const activeBuffer = activeBufferState?.content ?? "";

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
          {activeBufferState?.wasTrimmed ? (
            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
              출력이 길어서 최근 {TERMINAL_BUFFER_TRIM_TARGET.toLocaleString()}자만 유지 중입니다.
              {" "}자동 정리 {activeBufferState.trimCount}회.
            </div>
          ) : null}
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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpenPanel((current) => !current)}
          className="rounded-xl"
        >
          {openPanel ? "하단 패널 접기" : "하단 패널 열기"}
        </Button>
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
  setBufferStates: React.Dispatch<React.SetStateAction<Record<string, TerminalBufferState>>>;
  setActiveSessionId: (value: string) => void;
  setErrorMessage: (value: string) => void;
}

function buildTerminalUrl(token: string) {
  if (typeof window === "undefined") {
    return `ws://127.0.0.1:34877?token=${encodeURIComponent(token)}`;
  }

  const port = process.env.NEXT_PUBLIC_TERMINAL_WS_PORT ?? "34877";
  return `ws://${window.location.hostname}:${port}?token=${encodeURIComponent(token)}`;
}

function handleMessage(
  message: ServerMessage,
  context: TerminalHandlerContext,
) {
  const {
    socket,
    pendingCommandsRef,
    setSessions,
    setBufferStates,
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
    setBufferStates((current) => ({
      ...current,
      [message.sessionId]: appendTerminalBuffer(
        current[message.sessionId] ?? createTerminalBufferState(),
        message.data,
      ),
    }));
    return;
  }

  if (message.type === "closed") {
    setSessions((current) => current.filter((session) => session.id !== message.sessionId));
    setBufferStates((current) => {
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

function createTerminalBufferState(): TerminalBufferState {
  return {
    content: "",
    trimCount: 0,
    wasTrimmed: false,
  };
}

function appendTerminalBuffer(current: TerminalBufferState, nextChunk: string) {
  const next = `${current.content}${nextChunk}`;
  if (next.length <= MAX_TERMINAL_BUFFER_CHARS) {
    return {
      content: next,
      trimCount: current.trimCount,
      wasTrimmed: current.wasTrimmed,
    };
  }

  return {
    content: next.slice(-TERMINAL_BUFFER_TRIM_TARGET),
    trimCount: current.trimCount + 1,
    wasTrimmed: true,
  };
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 font-medium text-amber-100 hover:bg-amber-500/20"
        >
          다시 연결
        </Button>
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
    <section className="rounded-2xl border border-border-base bg-bg-card p-5">
      <p className="text-sm font-semibold text-white">웹 터미널 fallback</p>
      <p className="mt-2 text-sm text-text-muted">
        WebSocket 연결이 불안정하면 자주 쓰는 명령을 복사해서 로컬 터미널에서 실행할 수 있습니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {commands.map((command) => (
          <Button
            key={command}
            type="button"
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(command)}
            className="rounded-full border border-border-base bg-white/6 px-3 text-white/80 hover:bg-white/10"
          >
            {command} 복사
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={() => openLocalTerminal()}
          className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 text-purple-200 hover:bg-purple-500/20"
        >
          로컬 터미널 열기
        </Button>
      </div>
    </section>
  );
}

function openLocalTerminal() {
  void fetch("/api/system/apps/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appPath: "__dashboard_lab_default_terminal__" }),
  }).catch(() => {});
}
