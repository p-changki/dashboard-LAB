import { getEnvMap } from "@/lib/parsers/projects-extended-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getEnvMap());
}
