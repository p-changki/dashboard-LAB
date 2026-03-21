import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { executeActions } from "@/lib/parsers/file-action-engine";
import type { FileActionRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<FileActionRequest>;
    const actions = Array.isArray(payload.actions) ? payload.actions : [];
    const dryRun = payload.dryRun ?? true;

    return Response.json(await executeActions(actions, dryRun));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    return jsonError("FILE_ACTION_EXECUTE_FAILED", getErrorMessage(error, "파일 작업 실행에 실패했습니다."), 500);
  }
}
