import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";

const DEFAULT_TERMINAL_TARGET = "__dashboard_lab_default_terminal__";
const MAC_APP_ROOTS = ["/Applications/", "/System/Applications/"];
const LINUX_TERMINAL_COMMANDS = [
  "x-terminal-emulator",
  "gnome-terminal",
  "konsole",
  "xfce4-terminal",
  "xterm",
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { appPath?: string };
    const appPath = payload.appPath?.trim() ?? "";

    if (!appPath) {
      return jsonError("INVALID_APP_PATH", "앱 경로가 비어 있습니다.", 400);
    }

    if (appPath === DEFAULT_TERMINAL_TARGET) {
      await launchDefaultTerminal();
      return Response.json({ success: true, pid: null, error: null });
    }

    validateAppPath(appPath);
    await launchApp(appPath);
    return Response.json({ success: true, pid: null, error: null });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    if (error instanceof Error && error.message === "INVALID_APP_PATH") {
      return jsonError("INVALID_APP_PATH", "허용되지 않은 앱 경로입니다.", 400);
    }

    return jsonError("APP_LAUNCH_FAILED", getErrorMessage(error, "앱 실행에 실패했습니다."), 500);
  }
}

function validateAppPath(appPath: string) {
  if (process.platform === "darwin") {
    if (!MAC_APP_ROOTS.some((prefix) => appPath.startsWith(prefix))) {
      throw new Error("INVALID_APP_PATH");
    }
    return;
  }

  if (!path.isAbsolute(appPath) || !existsSync(appPath)) {
    throw new Error("INVALID_APP_PATH");
  }
}

async function launchApp(appPath: string) {
  if (process.platform === "darwin") {
    await runDetached("open", ["-a", appPath]);
    return;
  }

  if (process.platform === "win32") {
    await runDetached("cmd", ["/c", "start", "", appPath], { windowsHide: true });
    return;
  }

  if (appPath.endsWith(".desktop")) {
    await runDetached("xdg-open", [appPath]);
    return;
  }

  await runDetached(appPath, []);
}

async function launchDefaultTerminal() {
  if (process.platform === "darwin") {
    const preferredTerminal = existsSync("/Applications/iTerm.app")
      ? "/Applications/iTerm.app"
      : "/System/Applications/Utilities/Terminal.app";
    await runDetached("open", ["-a", preferredTerminal]);
    return;
  }

  if (process.platform === "win32") {
    try {
      await runDetached("wt.exe", [], { windowsHide: true });
      return;
    } catch {
      await runDetached("powershell.exe", [], { windowsHide: true });
      return;
    }
  }

  for (const command of LINUX_TERMINAL_COMMANDS) {
    try {
      await runDetached(command, []);
      return;
    } catch {
      continue;
    }
  }

  throw new Error("지원 가능한 터미널 앱을 찾지 못했습니다.");
}

function runDetached(
  command: string,
  args: string[],
  options: { windowsHide?: boolean } = {},
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: options.windowsHide ?? false,
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
