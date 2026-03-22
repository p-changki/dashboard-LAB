import { jsonError } from "@/lib/api/error-response";
import { getMeetingHubOverview } from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(getMeetingHubOverview());
  } catch (error) {
    return jsonError(
      "MEETING_HUB_OVERVIEW_FAILED",
      error instanceof Error ? error.message : "Failed to load Meeting Hub overview.",
      500,
    );
  }
}
