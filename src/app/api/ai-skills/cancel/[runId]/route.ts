import { jsonError } from "@/lib/api/error-response";
import { cancelSkillRun } from "@/lib/skill-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const run = cancelSkillRun(runId);

  if (!run) {
    return jsonError("AI_SKILL_NOT_FOUND", "취소할 실행 항목이 없습니다.", 404);
  }

  return Response.json(run);
}
