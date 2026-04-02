import { jsonError } from "@/lib/api/error-response";
import { routeRunIdParamSchema } from "@/lib/api/schemas";
import { isZodError, parseRouteParams } from "@/lib/api/validation";
import { getAiSkillApiError } from "@/lib/ai-skills/messages";
import { cancelSkillRun } from "@/lib/ai-skills/runner";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const locale = readLocaleFromHeaders(request.headers);
  let runId = "";

  try {
    ({ runId } = await parseRouteParams(context.params, routeRunIdParamSchema));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError(
        "INVALID_RUN_ID",
        locale === "en" ? "The run id is not valid." : "유효하지 않은 실행 ID입니다.",
        400,
      );
    }

    throw error;
  }

  const run = cancelSkillRun(runId, locale);

  if (!run) {
    return jsonError("AI_SKILL_NOT_FOUND", getAiSkillApiError(locale, "notFound"), 404);
  }

  return Response.json(run);
}
