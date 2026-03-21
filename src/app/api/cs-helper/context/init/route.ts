import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { initProjectContext } from "@/lib/cs-helper/cs-context-loader";
import type { CsContextInitRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CsContextInitRequest;
    return Response.json(await initProjectContext(payload.projectName));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    return jsonError("CS_CONTEXT_INIT_FAILED", getErrorMessage(error, "컨텍스트 파일 생성에 실패했습니다."), 500);
  }
}
