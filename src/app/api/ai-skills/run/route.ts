import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { queueSkillRun } from "@/lib/skill-runner";
import type { SkillRunRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SkillRunRequest;
    return Response.json(await queueSkillRun(payload));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", "요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    if (error instanceof Error && error.name === "SkillRunnerInputError") {
      return jsonError("INVALID_INPUT", error.message, 400);
    }

    return jsonError("AI_SKILL_RUN_FAILED", getErrorMessage(error, "실행 요청을 처리하지 못했습니다."), 500);
  }
}
