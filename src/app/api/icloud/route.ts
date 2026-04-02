import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { iCloudBrowseQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { browseICloud } from "@/lib/parsers/projects-extended-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { path: relativePath } = parseSearchParams(request, iCloudBrowseQuerySchema);
    return Response.json(await browseICloud(relativePath));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError("INVALID_PATH", getZodErrorMessage(error, "유효하지 않은 iCloud 경로입니다."), 400);
    }

    const message = getErrorMessage(error, "iCloud 폴더를 불러오지 못했습니다.");

    if (message === "FORBIDDEN_PATH") {
      return jsonError("FORBIDDEN_PATH", "허용되지 않은 iCloud 경로입니다.", 403);
    }

    return jsonError("ICLOUD_BROWSE_FAILED", message, 400);
  }
}
