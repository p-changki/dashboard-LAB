import { jsonError } from "@/lib/api/error-response";
import { refreshOnlyQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { getPackageUpdates } from "@/lib/info-hub/package-checker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { refresh } = parseSearchParams(request, refreshOnlyQuerySchema);
    return Response.json(await getPackageUpdates({ forceRefresh: refresh }));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError("INVALID_QUERY", getZodErrorMessage(error, "Info Hub query 형식이 올바르지 않습니다."), 400);
    }

    throw error;
  }
}
