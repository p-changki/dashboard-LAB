import { kill } from "node:process";

import { getErrorMessage, isJsonParseError, jsonError } from "@/lib/api/error-response";
import { processKillRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { getProcesses } from "@/lib/parsers/system-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, processKillRequestSchema);
    const pid = payload.pid ?? 0;
    const signal = payload.signal ?? "SIGTERM";

    if (![ "SIGTERM", "SIGKILL" ].includes(signal) || pid <= 1) {
      return jsonError("INVALID_REQUEST", "잘못된 프로세스 종료 요청입니다.", 400);
    }

    const processes = await getProcesses();
    const target = processes.processes.find((process) => process.pid === pid);

    if (!target || target.category === "system") {
      return jsonError("PROTECTED_PROCESS", "보호된 프로세스는 종료할 수 없습니다.", 403);
    }

    kill(pid, signal);
    return Response.json({ success: true, error: null });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, "프로세스 종료 요청 형식이 올바르지 않습니다."),
        400,
      );
    }

    return jsonError("PROCESS_KILL_FAILED", getErrorMessage(error, "프로세스 종료에 실패했습니다."), 500);
  }
}
