import {
  getErrorMessage,
  jsonError,
} from "@/lib/api/error-response";
import { syncMeetingHubGithubIssues } from "@/lib/meeting-hub/github";
import { getMeetingHubSummary, syncMeetingHubActionItems } from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const summary = getMeetingHubSummary();
    const syncResult = await syncMeetingHubGithubIssues(summary.actions);
    const nextSummary =
      syncResult.updates.length > 0
        ? syncMeetingHubActionItems(syncResult.updates)
        : summary;

    return Response.json({
      syncedCount: syncResult.updates.length,
      source: syncResult.source,
      summary: nextSummary,
    });
  } catch (error) {
    return jsonError(
      "MEETING_HUB_GITHUB_SYNC_FAILED",
      getErrorMessage(error, "Failed to sync linked GitHub issues."),
      400,
    );
  }
}
