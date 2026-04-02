import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { csContextInitRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { initProjectContext } from "@/lib/cs-helper/cs-context-loader";
import { getCsApiError } from "@/lib/cs-helper/messages";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);
  try {
    const payload = await parseJsonBody(request, csContextInitRequestSchema);
    return Response.json(await initProjectContext(payload.projectName, locale));
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

    return jsonError("CS_CONTEXT_INIT_FAILED", getErrorMessage(error, getCsApiError(locale, "CONTEXT_INIT_FAILED")), 500);
  }
}
