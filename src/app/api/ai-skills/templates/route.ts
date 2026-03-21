import { getSkillTemplates } from "@/lib/skill-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ templates: await getSkillTemplates() });
}
