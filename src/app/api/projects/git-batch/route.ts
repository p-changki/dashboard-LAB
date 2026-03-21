import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { getGitBatchStatus } from "@/lib/parsers/projects-maintenance-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getGitBatchStatus());
  } catch (error) {
    return jsonError("GIT_BATCH_FAILED", getErrorMessage(error, "Git 일괄 상태를 불러오지 못했습니다."), 500);
  }
}
