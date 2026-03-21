import { getTagCloud } from "@/lib/parsers/obsidian-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ tags: await getTagCloud() });
}
