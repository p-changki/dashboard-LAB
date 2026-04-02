import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { csRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { generateCsReply } from "@/lib/cs-helper/cs-runner";
import { getCsApiError } from "@/lib/cs-helper/messages";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);
  try {
    const payload = await parseJsonBody(request, csRequestSchema);
    return Response.json(await generateCsReply(payload, locale));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", getCsApiError(locale, "INVALID_BODY"), 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, getCsApiError(locale, "INVALID_BODY")),
        400,
      );
    }

    if (error instanceof Error && error.name === "CsRequestError") {
      return jsonError("INVALID_INPUT", error.message, 400);
    }

    return jsonError("CS_GENERATE_FAILED", getErrorMessage(error, getCsApiError(locale, "GENERATE_FAILED")), 500);
  }
}
