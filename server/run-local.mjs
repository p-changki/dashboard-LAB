import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";

const LOG_PREFIX = "[dashboard-lab]";

const HOST = "127.0.0.1";
const BASE_APP_PORT = 34876;
const BASE_WS_PORT = 34877;
const MAX_PORT = 65_535;
const mode = process.argv[2] === "start" ? "start" : "dev";
const DEV_SESSION_FILE = path.join(process.cwd(), ".dashboard-lab-dev-session.json");

if (mode === "dev") {
  const existingSession = await readExistingDevSession();

  if (existingSession) {
    console.log(`${LOG_PREFIX} app http://${HOST}:${existingSession.appPort} (existing)`);
    console.log(`${LOG_PREFIX} terminal ws://${HOST}:${existingSession.wsPort} (existing)`);
    process.exit(0);
  }
}

const appPort = await findFreePort(BASE_APP_PORT);
const wsPort = await findFreePort(BASE_WS_PORT, new Set([appPort]));
const distDir = mode === "dev" ? `.next-dev-${appPort}` : ".next";
const env = {
  ...process.env,
  NEXT_DIST_DIR: distDir,
  NEXT_PUBLIC_TERMINAL_WS_PORT: String(wsPort),
  TERMINAL_WS_PORT: String(wsPort),
};

if (mode === "dev") {
  await clearDevArtifacts(distDir);
  await writeDevSession({
    pid: process.pid,
    appPort,
    wsPort,
    distDir,
  });
}

const appArgs =
  mode === "start"
    ? ["start", "--hostname", HOST, "--port", String(appPort)]
    : ["dev", "--hostname", HOST, "--port", String(appPort)];
const wsArgs = mode === "start" ? ["server/terminal-server.ts"] : ["watch", "server/terminal-server.ts"];

console.log(`${LOG_PREFIX} app http://${HOST}:${appPort}`);
console.log(`${LOG_PREFIX} terminal ws://${HOST}:${wsPort}`);
console.log(`${LOG_PREFIX} dist ${distDir}`);

const appChild = spawn(resolveBin("next"), appArgs, { stdio: "inherit", env });
const wsChild = spawn(resolveBin("tsx"), wsArgs, { stdio: "inherit", env });

forwardSignals([appChild, wsChild]);

appChild.on("exit", (code) => closeChildren(wsChild, code ?? 0));
wsChild.on("exit", (code) => closeChildren(appChild, code ?? 0));

async function findFreePort(startPort, blockedPorts = new Set()) {
  let port = startPort;

  while (port <= MAX_PORT && (blockedPorts.has(port) || !(await isPortFree(port)))) {
    port += 1;
  }

  if (port > MAX_PORT) {
    throw new Error(`No free port available from ${startPort} to ${MAX_PORT} on ${HOST}`);
  }

  return port;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen({ host: HOST, port }, () => {
      server.close(() => resolve(true));
    });
  });
}

function forwardSignals(children) {
  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, () => {
      children.forEach((child) => child.kill(signal));
      process.exit(0);
    });
  });
}

function closeChildren(otherChild, code) {
  if (!otherChild.killed) {
    otherChild.kill("SIGTERM");
  }

  void cleanupDevSession().finally(() => {
    process.exit(code);
  });
}

function resolveBin(name) {
  return path.join(process.cwd(), "node_modules", ".bin", name);
}

async function clearDevArtifacts(distDir) {
  const nextDir = path.join(process.cwd(), distDir);
  await rm(nextDir, { recursive: true, force: true });
}

async function readExistingDevSession() {
  try {
    const raw = await readFile(DEV_SESSION_FILE, "utf8");
    const session = JSON.parse(raw);

    if (!session || typeof session.pid !== "number" || typeof session.appPort !== "number" || typeof session.wsPort !== "number") {
      await cleanupDevSession();
      return null;
    }

    if (!isProcessAlive(session.pid)) {
      await cleanupDevSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

async function writeDevSession(session) {
  await writeFile(DEV_SESSION_FILE, JSON.stringify(session, null, 2), "utf8");
}

async function cleanupDevSession() {
  await rm(DEV_SESSION_FILE, { force: true });
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      return error.code !== "ESRCH";
    }
    return false;
  }
}
