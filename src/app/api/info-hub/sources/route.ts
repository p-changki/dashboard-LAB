import { getInfoHubSources } from "@/lib/info-hub/feed-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getInfoHubSources());
}
