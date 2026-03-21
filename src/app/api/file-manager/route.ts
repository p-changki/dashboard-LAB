import { scanFileManager } from "@/lib/parsers/file-manager-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await scanFileManager());
}
