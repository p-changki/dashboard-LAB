import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { createMeetingHubGithubIssue } from "@/lib/meeting-hub/github";
import { getMeetingHubSummary, linkMeetingHubActionItemToIssue } from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      actionId?: string;
      repo?: string;
      title?: string;
      body?: string;
    };

    if (!payload?.actionId || !payload.repo || !payload.title || !payload.body) {
      return jsonError("INVALID_PAYLOAD", "actionId, repo, title, and body are required.", 400);
    }

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

    return jsonError(
      "MEETING_HUB_GITHUB_ISSUE_CREATE_FAILED",
      getErrorMessage(error, "Failed to create the GitHub issue."),
      400,
    );
  }
}
