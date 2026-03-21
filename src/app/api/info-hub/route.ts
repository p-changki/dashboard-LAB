import { getInfoHubFeed } from "@/lib/info-hub/feed-service";
import type { FeedCategoryId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? "all") as FeedCategoryId | "all";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20;
  const query = searchParams.get("q")?.trim() ?? "";
  const forceRefresh = searchParams.get("refresh") === "1";
  return Response.json(await getInfoHubFeed(category, page, limit, query, { forceRefresh }));
}
