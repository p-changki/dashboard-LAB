import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { generateCsAnalysis } from "@/lib/cs-helper/cs-runner";
import type { CsRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CsRequest;
    return Response.json(await generateCsAnalysis(payload));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    if (error instanceof Error && error.name === "CsRequestError") {
      return jsonError("INVALID_INPUT", error.message, 400);
    }

    return jsonError("CS_ANALYZE_FAILED", getErrorMessage(error, "내부 분석 생성에 실패했습니다."), 500);
  }
}
