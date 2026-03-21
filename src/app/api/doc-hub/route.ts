import { collectDocs } from "@/lib/parsers/doc-hub-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await collectDocs());
}
