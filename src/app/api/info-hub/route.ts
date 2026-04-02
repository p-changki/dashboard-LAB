import { getInfoHubFeed } from "@/lib/info-hub/feed-service";
import { jsonError } from "@/lib/api/error-response";
import { infoHubFeedQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { category, page, limit, q, refresh } = parseSearchParams(request, infoHubFeedQuerySchema);
    return Response.json(await getInfoHubFeed(category, page, limit, q, { forceRefresh: refresh }));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError("INVALID_QUERY", getZodErrorMessage(error, "Info Hub query 형식이 올바르지 않습니다."), 400);
    }

    throw error;
  }
}
