import { jsonError } from "@/lib/api/error-response";
import { fileManagerPreviewQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { getExecutePreview } from "@/lib/parsers/file-manager-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { action, files } = parseSearchParams(request, fileManagerPreviewQuerySchema);
    return Response.json(await getExecutePreview(action, files));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError("INVALID_ACTION", getZodErrorMessage(error, "유효하지 않은 파일 작업입니다."), 400);
    }

    throw error;
  }
}
