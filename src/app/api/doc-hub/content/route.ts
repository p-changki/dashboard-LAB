import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { docHubContentQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { getDocContent } from "@/lib/parsers/doc-hub-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { project, file } = parseSearchParams(request, docHubContentQuerySchema);
    return Response.json(await getDocContent(project, file));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError(
        "INVALID_PATH",
        getZodErrorMessage(
          error,
          locale === "en" ? "The document path is not valid." : "유효하지 않은 문서 경로입니다.",
        ),
        400,
      );
    }

    const message = getErrorMessage(
      error,
      locale === "en" ? "Failed to load the document." : "문서를 불러오지 못했습니다.",
    );

    if (message === "DOC_NOT_FOUND") {
      return jsonError(
        "DOC_NOT_FOUND",
        locale === "en" ? "The document could not be found." : "문서를 찾을 수 없습니다.",
        404,
      );
    }

    return jsonError("DOC_CONTENT_FAILED", message, 400);
  }
}
