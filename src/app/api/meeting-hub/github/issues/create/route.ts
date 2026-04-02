import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { meetingHubGithubIssueCreateSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { createMeetingHubGithubIssue } from "@/lib/meeting-hub/github";
import { getMeetingHubSummary, linkMeetingHubActionItemToIssue } from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, meetingHubGithubIssueCreateSchema);

    const issue = await createMeetingHubGithubIssue({
      repo: payload.repo,
      title: payload.title,
      body: payload.body,
    });

    linkMeetingHubActionItemToIssue(payload.actionId, {
      repository: payload.repo,
      issueNumber: issue.issueNumber,
      issueUrl: issue.issueUrl,
    });

    return Response.json({
      issue,
      summary: getMeetingHubSummary(),
    });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON payload is invalid.", 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, "Meeting Hub GitHub issue payload is invalid."),
        400,
      );
    }

    return jsonError(
      "MEETING_HUB_GITHUB_ISSUE_CREATE_FAILED",
      getErrorMessage(error, "Failed to create the GitHub issue."),
      400,
    );
  }
}
