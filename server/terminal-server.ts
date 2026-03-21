import { randomUUID } from "node:crypto";
import path from "node:path";

import { spawn, type IPty } from "node-pty";
import { WebSocketServer, type WebSocket } from "ws";

const PORT = Number(process.env.TERMINAL_WS_PORT ?? "34877");
const HOST = "127.0.0.1";
const MAX_SESSIONS = 5;

type TerminalSessionState = {
  pty: IPty;
  ws: WebSocket;
  cwd: string;
};

type ClientMessage =
  | { type: "create"; cwd?: string }
  | { type: "input"; sessionId: string; data: string }
  | { type: "resize"; sessionId: string; cols: number; rows: number }
  | { type: "close"; sessionId: string };

const sessions = new Map<string, TerminalSessionState>();
const wss = new WebSocketServer({ host: HOST, port: PORT });

wss.on("error", (error) => {
  if ("code" in error && error.code === "EADDRINUSE") {
    console.log(`Terminal WebSocket server already running on ws://${HOST}:${PORT}`);
    process.exit(0);
  }

  console.error(error);
  process.exit(1);
});

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      handleMessage(ws, JSON.parse(raw.toString()) as ClientMessage);
    } catch {
      send(ws, { type: "error", message: "invalid message" });
    }
  });

  ws.on("close", () => {
    [...sessions.entries()]
      .filter(([, session]) => session.ws === ws)
      .forEach(([sessionId, session]) => {
        session.pty.kill();
        sessions.delete(sessionId);
      });
  });
});

function handleMessage(ws: WebSocket, message: ClientMessage) {
  if (message.type === "create") {
    createSession(ws, message.cwd);
    return;
  }

  const session = sessions.get(message.sessionId);

  if (!session) {
    send(ws, { type: "error", message: "session not found" });
    return;
  }

  if (message.type === "input") {
    session.pty.write(message.data);
    return;
  }

  if (message.type === "resize") {
    session.pty.resize(message.cols, message.rows);
    return;
  }

  session.pty.kill();
  sessions.delete(message.sessionId);
  send(ws, { type: "closed", sessionId: message.sessionId });
}

function createSession(ws: WebSocket, cwd?: string) {
  if (sessions.size >= MAX_SESSIONS) {
    send(ws, { type: "error", message: "최대 5개 세션까지만 열 수 있습니다." });
    return;
  }

  const sessionId = randomUUID();
  const sessionCwd = cwd || process.env.HOME || "/";
  const shell = process.env.SHELL || "zsh";
  const pty = spawn(shell, getShellArgs(shell), {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: sessionCwd,
    env: process.env as Record<string, string>,
  });

  sessions.set(sessionId, { pty, ws, cwd: sessionCwd });
  pty.onData((data) => send(ws, { type: "output", sessionId, data }));
  pty.onExit(() => {
    sessions.delete(sessionId);
    send(ws, { type: "closed", sessionId });
  });
  send(ws, {
    type: "created",
    session: {
      id: sessionId,
      title: sessionCwd.split("/").pop() || sessionCwd,
      cwd: sessionCwd,
      createdAt: new Date().toISOString(),
      isActive: true,
    },
  });
}

function getShellArgs(shell: string) {
  const shellName = path.basename(shell);

  if (shellName === "zsh" || shellName === "bash") {
    return ["-l"];
  }

  return [];
}

function send(ws: WebSocket, payload: object) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

console.log(`Terminal WebSocket server running on ws://${HOST}:${PORT}`);
