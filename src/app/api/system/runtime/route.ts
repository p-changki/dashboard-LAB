import { getErrorMessage, isJsonParseError, jsonError } from "@/lib/api/error-response";
import { getRuntimeSummary } from "@/lib/runtime-summary";
import { updateRuntimeSettings } from "@/lib/runtime-settings";
import type { DashboardLabRuntimeSettingsPaths } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getRuntimeSummary());
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      paths?: Partial<DashboardLabRuntimeSettingsPaths>;
    };

    if (!payload || typeof payload !== "object") {
      return jsonError("INVALID_PAYLOAD", "설정 형식이 올바르지 않습니다.", 400);
    }

    updateRuntimeSettings({
      projectsRoot: readOptionalString(payload.paths?.projectsRoot),
      obsidianVault: readOptionalString(payload.paths?.obsidianVault),
      prdSaveDir: readOptionalString(payload.paths?.prdSaveDir),
      csContextsDir: readOptionalString(payload.paths?.csContextsDir),
      allowedRoots: readOptionalStringArray(payload.paths?.allowedRoots),
    });

    return Response.json(getRuntimeSummary());
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON 형식이 올바르지 않습니다.", 400);
    }

    return jsonError(
      "RUNTIME_SETTINGS_SAVE_FAILED",
      getErrorMessage(error, "런타임 설정을 저장하지 못했습니다."),
      400,
    );
  }
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readOptionalStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
