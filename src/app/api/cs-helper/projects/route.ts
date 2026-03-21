import { scanCsProjects } from "@/lib/cs-helper/cs-context-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ projects: await scanCsProjects() });
}
