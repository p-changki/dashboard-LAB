import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { generateCsAnalysis } from "@/lib/cs-helper/cs-runner";
import { getCsApiError } from "@/lib/cs-helper/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import type { CsRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);
  try {
    const payload = (await request.json()) as CsRequest;
    return Response.json(await generateCsAnalysis(payload, locale));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", getCsApiError(locale, "INVALID_BODY"), 400);
    }

    if (error instanceof Error && error.name === "CsRequestError") {
      return jsonError("INVALID_INPUT", error.message, 400);
    }

    return jsonError("CS_ANALYZE_FAILED", getErrorMessage(error, getCsApiError(locale, "ANALYZE_FAILED")), 500);
  }
}
