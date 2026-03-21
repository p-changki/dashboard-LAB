import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { getDocContent } from "@/lib/parsers/doc-hub-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project")?.trim() ?? "";
  const file = searchParams.get("file")?.trim() ?? "";

  if (!project || !file || project.includes("..") || file.includes("..")) {
    return jsonError("INVALID_PATH", "유효하지 않은 문서 경로입니다.", 400);
  }

  try {
    return Response.json(await getDocContent(project, file));
  } catch (error) {
    const message = getErrorMessage(error, "문서를 불러오지 못했습니다.");

    if (message === "DOC_NOT_FOUND") {
      return jsonError("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404);
    }

    return jsonError("DOC_CONTENT_FAILED", message, 400);
  }
}
