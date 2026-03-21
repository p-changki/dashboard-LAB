import { spawn } from "node:child_process";

const LOG_PREFIX = "[dashboard-lab]";

let openedBrowser = false;

const child = spawn("pnpm", ["dev"], {
  env: { ...process.env },
  stdio: ["inherit", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  detectAndOpen(text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  process.stderr.write(text);
  detectAndOpen(text);
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`${LOG_PREFIX} failed to launch: ${error.message}`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

function detectAndOpen(text) {
  if (openedBrowser) {
    return;
  }

  const match = text.match(/\[dashboard-lab\] app (http:\/\/[^\s]+)/);
  if (!match) {
    return;
  }

  openedBrowser = true;
  const appUrl = match[1];
  console.log(`${LOG_PREFIX} opening ${appUrl}`);

  const openProc = spawnBrowser(appUrl);
  openProc?.unref();
}

function spawnBrowser(appUrl) {
  if (process.platform === "darwin") {
    return spawn("open", [appUrl], {
      stdio: "ignore",
      detached: true,
    });
  }

  if (process.platform === "win32") {
    return spawn("cmd", ["/c", "start", "", appUrl], {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });
  }

  return spawn("xdg-open", [appUrl], {
    stdio: "ignore",
    detached: true,
  });
}
