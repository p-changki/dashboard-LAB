import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { getMeetingHubSummary, updateMeetingHubActionItem } from "@/lib/meeting-hub/storage";
import type { MeetingHubActionStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  try {
    const { actionId } = await context.params;
    const payload = (await request.json()) as {
      status?: MeetingHubActionStatus;
    };

    if (!actionId.trim()) {
      return jsonError("INVALID_ACTION_ID", "Action id is required.", 400);
    }

    if (!payload.status || !["open", "in_progress", "done"].includes(payload.status)) {
      return jsonError("INVALID_STATUS", "A valid action status is required.", 400);
    }

    updateMeetingHubActionItem(actionId, {
      status: payload.status,
    });

    return Response.json({ summary: getMeetingHubSummary() });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON payload is invalid.", 400);
    }

    return jsonError(
      "MEETING_HUB_ACTION_UPDATE_FAILED",
      getErrorMessage(error, "Failed to update the action item."),
      400,
    );
  }
}
