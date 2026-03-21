import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { appPath?: string };
    const appPath = payload.appPath?.trim() ?? "";

    if (!appPath || (!appPath.startsWith("/Applications/") && !appPath.startsWith("/System/Applications/"))) {
      return jsonError("INVALID_APP_PATH", "허용되지 않은 앱 경로입니다.", 400);
    }

    await execFileAsync("open", ["-a", appPath]);
    return Response.json({ success: true, pid: null, error: null });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    return jsonError("APP_LAUNCH_FAILED", getErrorMessage(error, "앱 실행에 실패했습니다."), 500);
  }
}
