import { parseTeams } from "@/lib/parsers/claude-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await parseTeams());
}
