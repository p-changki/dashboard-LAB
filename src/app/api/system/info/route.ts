import { getSystemInfo } from "@/lib/parsers/system-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getSystemInfo());
}
