import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { regenerateCsReply } from "@/lib/cs-helper/cs-runner";
import type { CsRegenerateRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CsRegenerateRequest;
    return Response.json(await regenerateCsReply(payload));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    if (error instanceof Error && error.name === "CsRequestError") {
      return jsonError("INVALID_INPUT", error.message, 400);
    }

    return jsonError("CS_REGENERATE_FAILED", getErrorMessage(error, "CS 응답 재생성에 실패했습니다."), 500);
  }
}
