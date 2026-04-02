import { jsonError } from "@/lib/api/error-response";
import { docHubSearchQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { searchDocs } from "@/lib/parsers/doc-hub-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { q } = parseSearchParams(request, docHubSearchQuerySchema);
    const results = await searchDocs(q);
    return Response.json({ results, total: results.length });
  } catch (error) {
    if (isZodError(error)) {
      return jsonError(
        "INVALID_QUERY",
        getZodErrorMessage(
          error,
          locale === "en" ? "The search query `q` is required." : "검색어 q가 필요합니다.",
        ),
        400,
      );
    }

    throw error;
  }
}
