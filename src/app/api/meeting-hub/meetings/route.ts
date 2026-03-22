import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import {
  createMeetingHubMeeting,
  getMeetingHubSummary,
} from "@/lib/meeting-hub/storage";
import { processMeetingHubNotes } from "@/lib/meeting-hub/processor";
import type { CreateMeetingHubMeetingInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ meetings: getMeetingHubSummary().meetings });
  } catch (error) {
    return jsonError(
      "MEETING_HUB_MEETINGS_FAILED",
      getErrorMessage(error, "Failed to load Meeting Hub meetings."),
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateMeetingHubMeetingInput;
    const processed =
      payload.useAi === false
        ? undefined
        : await processMeetingHubNotes({
            title: payload.title,
            type: payload.type,
            date: payload.date,
            participants: payload.participants,
            linkedRepository: payload.linkedRepository,
            notes: payload.notes,
            runner: payload.runner,
          }).catch(() => undefined);
    const meeting = createMeetingHubMeeting(payload, processed);
    return Response.json({ meeting, summary: getMeetingHubSummary() });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON payload is invalid.", 400);
    }

    return jsonError(
      "MEETING_HUB_MEETING_CREATE_FAILED",
      getErrorMessage(error, "Failed to create Meeting Hub meeting."),
      400,
    );
  }
}
