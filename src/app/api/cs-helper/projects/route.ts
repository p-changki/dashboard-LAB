import { scanCsProjects } from "@/lib/cs-helper/cs-context-loader";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);
  return Response.json({ projects: await scanCsProjects(locale) });
}
