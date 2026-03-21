import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { browseICloud } from "@/lib/parsers/projects-extended-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const relativePath = searchParams.get("path")?.trim() ?? "";

  try {
    return Response.json(await browseICloud(relativePath));
  } catch (error) {
    const message = getErrorMessage(error, "iCloud 폴더를 불러오지 못했습니다.");

    if (message === "FORBIDDEN_PATH") {
      return jsonError("FORBIDDEN_PATH", "허용되지 않은 iCloud 경로입니다.", 403);
    }

    return jsonError("ICLOUD_BROWSE_FAILED", message, 400);
  }
}
