import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import {
  createMeetingHubTeam,
  getMeetingHubSummary,
} from "@/lib/meeting-hub/storage";
import type { CreateMeetingHubTeamInput } from "@/lib/types";

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
    const payload = (await request.json()) as CreateMeetingHubTeamInput;
    const team = createMeetingHubTeam(payload);
    return Response.json({ team, summary: getMeetingHubSummary() });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON payload is invalid.", 400);
    }

    return jsonError(
      "MEETING_HUB_TEAM_CREATE_FAILED",
      getErrorMessage(error, "Failed to create Meeting Hub team."),
      400,
    );
  }
}
