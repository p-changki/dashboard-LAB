import { parseCodexInfo } from "@/lib/parsers/codex-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await parseCodexInfo());
}
