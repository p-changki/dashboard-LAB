import { getErrorMessage, isJsonParseError, jsonError } from "@/lib/api/error-response";
import { cleanNodeModules } from "@/lib/parsers/projects-maintenance-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { dryRun?: boolean; projectPaths?: string[] };
    return Response.json(await cleanNodeModules(payload.dryRun ?? true, payload.projectPaths ?? []));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    return jsonError("NODE_MODULES_CLEAN_FAILED", getErrorMessage(error, "node_modules 정리에 실패했습니다."), 500);
  }
}
