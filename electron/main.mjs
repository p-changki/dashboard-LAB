import { app, BrowserWindow, dialog, shell, session } from "electron";
import path from "node:path";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const APP_TITLE = "dashboard-LAB";
const RUNTIME_URL_ENV = "DASHBOARD_LAB_APP_URL";
const RUNTIME_TIMEOUT_MS = 45_000;
const CACHE_VERSION_FILE = "desktop-cache-version.json";
const CACHE_DIRS_TO_CLEAR = [
  "Cache",
  "Code Cache",
  "GPUCache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
];

let mainWindow = null;
let runtimeChild = null;
let runtimeUrl = process.env[RUNTIME_URL_ENV] || null;
let isQuitting = false;

app.on("second-instance", () => {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.whenReady().then(async () => {
  await ensureFreshRendererCache();
  mainWindow = createWindow();

  try {
    const targetUrl = runtimeUrl ?? (await bootLocalRuntime());
    await waitForServer(targetUrl);
    await mainWindow.loadURL(targetUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "데스크톱 앱을 시작하지 못했습니다.";
    dialog.showErrorBox("dashboard-LAB 시작 실패", message);
    app.quit();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      if (runtimeUrl) {
        await mainWindow.loadURL(runtimeUrl);
      }
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  stopRuntime();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1160,
    minHeight: 760,
    backgroundColor: "#0f0f0f",
    title: APP_TITLE,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!runtimeUrl || url.startsWith(runtimeUrl)) {
      return;
    }

    event.preventDefault();
    void shell.openExternal(url);
  });
  void window.loadURL(buildLoadingUrl("dashboard-LAB 데스크톱 앱을 준비하는 중입니다."));
  return window;
}

function buildLoadingUrl(message) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${APP_TITLE}</title>
        <style>
          body {
            margin: 0;
            display: grid;
            place-items: center;
            min-height: 100vh;
            background: #0f0f0f;
            color: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .card {
            width: min(420px, calc(100vw - 48px));
            padding: 28px 28px 24px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            background: rgba(255,255,255,0.04);
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          }
          .eyebrow {
            font-size: 12px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #8fe8d6;
          }
          h1 {
            margin: 12px 0 10px;
            font-size: 24px;
          }
          p {
            margin: 0;
            line-height: 1.7;
            color: rgba(255,255,255,0.72);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="eyebrow">desktop runtime</div>
          <h1>${APP_TITLE}</h1>
          <p>${message}</p>
        </div>
      </body>
    </html>
  `;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function bootLocalRuntime() {
  return new Promise((resolve, reject) => {
    const appPath = app.getAppPath();
    const runtimeScriptPath = path.join(appPath, "server", "run-local.mjs");
    const childEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      DASHBOARD_LAB_DESKTOP: "1",
      DASHBOARD_LAB_DISABLE_TERMINAL: "1",
      DASHBOARD_LAB_DATA_ROOT: app.getPath("userData"),
    };

    runtimeChild = spawn(process.execPath, [runtimeScriptPath, "start"], {
      cwd: appPath,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        reject(new Error("로컬 dashboard-LAB 런타임이 제시간에 시작되지 않았습니다."));
        stopRuntime();
      }
    }, RUNTIME_TIMEOUT_MS);

    runtimeChild.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      const url = matchAppUrl(text);
      if (!resolved && url) {
        resolved = true;
        runtimeUrl = url;
        clearTimeout(timer);
        resolve(url);
      }
    });

    runtimeChild.stderr.on("data", (chunk) => {
      process.stderr.write(chunk.toString());
    });

    runtimeChild.on("error", (error) => {
      clearTimeout(timer);
      if (!resolved) {
        reject(error);
      }
    });

    runtimeChild.on("exit", (code) => {
      clearTimeout(timer);
      runtimeChild = null;
      if (!resolved) {
        reject(new Error(`로컬 런타임이 비정상 종료되었습니다. code=${code ?? "unknown"}`));
        return;
      }

      if (!isQuitting) {
        dialog.showErrorBox(
          "dashboard-LAB 런타임 종료",
          "내부 앱 서버가 종료되었습니다. 앱을 다시 실행해 주세요.",
        );
        app.quit();
      }
    });
  });
}

function stopRuntime() {
  if (!runtimeChild || runtimeChild.killed) {
    return;
  }

  runtimeChild.kill("SIGTERM");
}

function matchAppUrl(text) {
  const match = text.match(/\[dashboard-lab\] app (http:\/\/[^\s]+)/);
  return match ? match[1] : null;
}

async function waitForServer(targetUrl) {
  const deadline = Date.now() + RUNTIME_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(targetUrl, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the local server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`앱 URL에 연결할 수 없습니다: ${targetUrl}`);
}

async function ensureFreshRendererCache() {
  const userDataPath = app.getPath("userData");
  const versionFilePath = path.join(userDataPath, "state", CACHE_VERSION_FILE);
  const currentVersion = app.getVersion();
  const previousVersion = await readPreviousCacheVersion(versionFilePath);

  if (previousVersion === currentVersion) {
    return;
  }

  await Promise.all(
    CACHE_DIRS_TO_CLEAR.map((dirName) =>
      rm(path.join(userDataPath, dirName), { recursive: true, force: true }),
    ),
  );
  await session.defaultSession.clearCache();
  await mkdir(path.dirname(versionFilePath), { recursive: true });
  await writeFile(versionFilePath, JSON.stringify({ version: currentVersion }, null, 2), "utf8");
}

async function readPreviousCacheVersion(versionFilePath) {
  try {
    const raw = await readFile(versionFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed?.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}
