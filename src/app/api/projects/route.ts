import { parseProjects } from "@/lib/parsers/projects-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await parseProjects());
}
