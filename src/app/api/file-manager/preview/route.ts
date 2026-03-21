import { jsonError } from "@/lib/api/error-response";
import { getExecutePreview } from "@/lib/parsers/file-manager-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action")?.trim() ?? "review";
  const files = (searchParams.get("files") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!["move", "delete", "review", "keep"].includes(action)) {
    return jsonError("INVALID_ACTION", "유효하지 않은 파일 작업입니다.", 400);
  }

  return Response.json(await getExecutePreview(action as "move" | "delete" | "review" | "keep", files));
}
