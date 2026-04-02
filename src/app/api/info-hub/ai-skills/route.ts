import { getAiSkillRecommendations } from "@/lib/info-hub/feed-service";
import { jsonError } from "@/lib/api/error-response";
import { refreshOnlyQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { refresh } = parseSearchParams(request, refreshOnlyQuerySchema);
    return Response.json(await getAiSkillRecommendations({ forceRefresh: refresh, locale }));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError("INVALID_QUERY", getZodErrorMessage(error, "Info Hub query 형식이 올바르지 않습니다."), 400);
    }

    throw error;
  }
}
