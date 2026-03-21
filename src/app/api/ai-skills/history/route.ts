import { getSkillHistory } from "@/lib/skill-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getSkillHistory());
}
