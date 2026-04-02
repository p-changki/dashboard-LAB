import { getErrorMessage, isJsonParseError, jsonError } from "@/lib/api/error-response";
import { autoOrganizeRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { autoOrganize } from "@/lib/parsers/file-manager-auto-organize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, autoOrganizeRequestSchema);
    return Response.json(
      await autoOrganize({
        target: payload.target ?? "both",
        dryRun: payload.dryRun ?? true,
      }),
    );
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    if (isZodError(error)) {
      return jsonError("INVALID_INPUT", getZodErrorMessage(error, "자동 정리 요청 형식이 올바르지 않습니다."), 400);
    }

    return jsonError("AUTO_ORGANIZE_FAILED", getErrorMessage(error, "자동 정리에 실패했습니다."), 500);
  }
}
