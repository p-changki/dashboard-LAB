import { getAiSkillRecommendations } from "@/lib/info-hub/feed-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";
  return Response.json(await getAiSkillRecommendations({ forceRefresh }));
}
