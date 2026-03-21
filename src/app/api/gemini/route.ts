import { parseGeminiInfo } from "@/lib/parsers/gemini-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await parseGeminiInfo());
}
