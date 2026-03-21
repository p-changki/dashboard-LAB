import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { getNoteContent } from "@/lib/parsers/obsidian-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const notePath = searchParams.get("path")?.trim() ?? "";

  if (!notePath || notePath.includes("..")) {
    return jsonError("INVALID_PATH", "유효하지 않은 노트 경로입니다.", 400);
  }

  try {
    return Response.json(await getNoteContent(notePath));
  } catch (error) {
    const message = getErrorMessage(error, "노트를 불러오지 못했습니다.");

    if (message === "FORBIDDEN_PATH") {
      return jsonError("FORBIDDEN_PATH", "허용되지 않은 노트 경로입니다.", 403);
    }

    return jsonError("NOTE_CONTENT_FAILED", message, 400);
  }
}
