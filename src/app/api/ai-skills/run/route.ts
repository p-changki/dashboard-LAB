import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { skillRunRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { getAiSkillApiError } from "@/lib/ai-skills/messages";
import { queueSkillRun } from "@/lib/ai-skills/runner";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, skillRunRequestSchema);
    return Response.json(await queueSkillRun(payload, locale));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", getAiSkillApiError(locale, "invalidBody"), 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, getAiSkillApiError(locale, "invalidBody")),
        400,
      );
    }

    if (error instanceof Error && error.name === "SkillRunnerInputError") {
      return jsonError("INVALID_INPUT", error.message, 400);
    }

    return jsonError(
      "AI_SKILL_RUN_FAILED",
      getErrorMessage(error, getAiSkillApiError(locale, "runFailed")),
      500,
    );
  }
}
