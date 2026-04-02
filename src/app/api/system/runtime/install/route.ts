import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { runtimeInstallRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { executeRuntimeInstallTasks } from "@/lib/runtime/installer";
import { getRuntimeSummary } from "@/lib/runtime/summary";
import type { DashboardLabRuntimeInstallResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, runtimeInstallRequestSchema);

    const results = await executeRuntimeInstallTasks(payload.taskIds, locale);
    const response: DashboardLabRuntimeInstallResponse = {
      results,
      summary: getRuntimeSummary(locale),
    };

    return Response.json(response);
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON 형식이 올바르지 않습니다.", 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, "런타임 설치 요청 형식이 올바르지 않습니다."),
        400,
      );
    }

    return jsonError(
      "RUNTIME_INSTALL_FAILED",
      getErrorMessage(error, "설치 작업을 완료하지 못했습니다."),
      400,
    );
  }
}
