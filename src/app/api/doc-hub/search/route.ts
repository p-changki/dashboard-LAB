import { jsonError } from "@/lib/api/error-response";
import { searchDocs } from "@/lib/parsers/doc-hub-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return jsonError("INVALID_QUERY", "검색어 q가 필요합니다.", 400);
  }

  const results = await searchDocs(query);
  return Response.json({ results, total: results.length });
}
