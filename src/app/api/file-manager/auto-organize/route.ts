import { getErrorMessage, isJsonParseError, jsonError } from "@/lib/api/error-response";
import { autoOrganize } from "@/lib/parsers/file-manager-auto-organize";
import type { AutoOrganizeRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<AutoOrganizeRequest>;
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

    return jsonError("AUTO_ORGANIZE_FAILED", getErrorMessage(error, "자동 정리에 실패했습니다."), 500);
  }
}
