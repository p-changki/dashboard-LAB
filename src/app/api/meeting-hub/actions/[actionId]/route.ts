import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { meetingHubActionUpdateSchema, routeActionIdParamSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody, parseRouteParams } from "@/lib/api/validation";
import { getMeetingHubSummary, updateMeetingHubActionItem } from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  try {
    const { actionId } = await parseRouteParams(context.params, routeActionIdParamSchema);
    const payload = await parseJsonBody(request, meetingHubActionUpdateSchema);

    updateMeetingHubActionItem(actionId, {
      status: payload.status,
    });

    return Response.json({ summary: getMeetingHubSummary() });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON payload is invalid.", 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, "Meeting Hub action request is invalid."),
        400,
      );
    }

    return jsonError(
      "MEETING_HUB_ACTION_UPDATE_FAILED",
      getErrorMessage(error, "Failed to update the action item."),
      400,
    );
  }
}
