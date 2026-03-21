import { jsonError } from "@/lib/api/error-response";
import { getSkillRun } from "@/lib/skill-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const run = getSkillRun(runId);

  if (!run) {
    return jsonError("AI_SKILL_NOT_FOUND", "실행 이력을 찾을 수 없습니다.", 404);
  }

  return Response.json(run);
}
