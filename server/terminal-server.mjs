import { randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";

import { spawn } from "node-pty";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.TERMINAL_WS_PORT ?? "34877");
const HOST = "127.0.0.1";
const MAX_SESSIONS = 5;
const TERMINAL_WS_TOKEN = process.env.TERMINAL_WS_TOKEN ?? "";

const sessions = new Map();
const wss = new WebSocketServer({ host: HOST, port: PORT });

wss.on("error", (error) => {
  if ("code" in error && error.code === "EADDRINUSE") {
    console.log(`Terminal WebSocket server already running on ws://${HOST}:${PORT}`);
    process.exit(0);
  }

  console.error(error);
  process.exit(1);
});

wss.on("connection", (ws, request) => {
  if (!isAuthorizedRequest(request)) {
    ws.close(1008, "unauthorized");
    return;
  }

  ws.on("message", (raw) => {
    try {
      handleMessage(ws, JSON.parse(raw.toString()));
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

function handleMessage(ws, message) {
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

function createSession(ws, cwd) {
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
    env: process.env,
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

function getShellArgs(shell) {
  const shellName = path.basename(shell);

  if (shellName === "zsh" || shellName === "bash") {
    return ["-l"];
  }

  return [];
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function isAuthorizedRequest(request) {
  if (!TERMINAL_WS_TOKEN) {
    return false;
  }

  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
  const token = url.searchParams.get("token") ?? "";

  if (!safeEquals(token, TERMINAL_WS_TOKEN)) {
    return false;
  }

  const origin = request.headers.origin;

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return ["127.0.0.1", "localhost"].includes(originUrl.hostname);
  } catch {
    return false;
  }
}

function safeEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

console.log(`Terminal WebSocket server running on ws://${HOST}:${PORT}`);
