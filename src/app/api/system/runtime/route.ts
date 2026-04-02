import { getErrorMessage, isJsonParseError, jsonError } from "@/lib/api/error-response";
import { runtimeSettingsRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { getRuntimeSummary } from "@/lib/runtime/summary";
import { updateRuntimeSecrets, updateRuntimeSettings } from "@/lib/runtime/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);
  return Response.json(getRuntimeSummary(locale));
}

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, runtimeSettingsRequestSchema);

    updateRuntimeSettings({
      projectsRoot: payload.paths?.projectsRoot ?? null,
      dataRoot: payload.paths?.dataRoot ?? null,
      prdSaveDir: payload.paths?.prdSaveDir ?? null,
      csContextsDir: payload.paths?.csContextsDir ?? null,
      allowedRoots: payload.paths?.allowedRoots ?? [],
    });

    if (payload.secrets?.clearOpenaiApiKey) {
      updateRuntimeSecrets({ openaiApiKey: null });
    } else if (typeof payload.secrets?.openaiApiKey === "string") {
      const trimmed = payload.secrets.openaiApiKey.trim();
      if (trimmed) {
        updateRuntimeSecrets({ openaiApiKey: trimmed });
      }
    }

    return Response.json(getRuntimeSummary(locale));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON 형식이 올바르지 않습니다.", 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, "런타임 설정 요청 형식이 올바르지 않습니다."),
        400,
      );
    }

    return jsonError(
      "RUNTIME_SETTINGS_SAVE_FAILED",
      getErrorMessage(error, "런타임 설정을 저장하지 못했습니다."),
      400,
    );
  }
}
