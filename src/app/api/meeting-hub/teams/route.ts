import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { meetingHubTeamInputSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import {
  createMeetingHubTeam,
  getMeetingHubSummary,
} from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ teams: getMeetingHubSummary().teams });
  } catch (error) {
    return jsonError(
      "MEETING_HUB_TEAMS_FAILED",
      getErrorMessage(error, "Failed to load Meeting Hub teams."),
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, meetingHubTeamInputSchema);
    const team = createMeetingHubTeam(payload);
    return Response.json({ team, summary: getMeetingHubSummary() });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON payload is invalid.", 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, "Meeting Hub team payload is invalid."),
        400,
      );
    }

    return jsonError(
      "MEETING_HUB_TEAM_CREATE_FAILED",
      getErrorMessage(error, "Failed to create Meeting Hub team."),
      400,
    );
  }
}
