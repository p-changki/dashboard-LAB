import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { initProjectContext } from "@/lib/cs-helper/cs-context-loader";
import { getCsApiError } from "@/lib/cs-helper/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import type { CsContextInitRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);
  try {
    const payload = (await request.json()) as CsContextInitRequest;
    return Response.json(await initProjectContext(payload.projectName, locale));
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_BODY", getCsApiError(locale, "INVALID_BODY"), 400);
    }

    return jsonError("CS_CONTEXT_INIT_FAILED", getErrorMessage(error, getCsApiError(locale, "CONTEXT_INIT_FAILED")), 500);
  }
}
