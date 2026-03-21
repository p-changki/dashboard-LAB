import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { executeRuntimeInstallTasks } from "@/lib/runtime-installer";
import { getRuntimeSummary } from "@/lib/runtime-summary";
import type { DashboardLabRuntimeInstallResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      taskIds?: string[];
    };

    if (!Array.isArray(payload?.taskIds) || payload.taskIds.length === 0) {
      return jsonError(
        "INVALID_PAYLOAD",
        "실행할 설치 작업이 비어 있습니다.",
        400,
      );
    }

    const results = await executeRuntimeInstallTasks(payload.taskIds);
    const response: DashboardLabRuntimeInstallResponse = {
      results,
      summary: getRuntimeSummary(),
    };

    return Response.json(response);
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON 형식이 올바르지 않습니다.", 400);
    }

    return jsonError(
      "RUNTIME_INSTALL_FAILED",
      getErrorMessage(error, "설치 작업을 완료하지 못했습니다."),
      400,
    );
  }
}
