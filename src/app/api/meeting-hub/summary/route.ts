import { jsonError } from "@/lib/api/error-response";
import { getMeetingHubSummary } from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(getMeetingHubSummary());
  } catch (error) {
    return jsonError(
      "MEETING_HUB_SUMMARY_FAILED",
      error instanceof Error ? error.message : "Failed to load Meeting Hub summary.",
      500,
    );
  }
}
