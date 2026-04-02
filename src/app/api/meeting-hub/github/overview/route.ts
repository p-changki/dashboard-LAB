import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { meetingHubGithubOverviewQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { getMeetingHubGithubOverview } from "@/lib/meeting-hub/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { repos } = parseSearchParams(request, meetingHubGithubOverviewQuerySchema);
    return Response.json(await getMeetingHubGithubOverview(repos));
  } catch (error) {
    if (isZodError(error)) {
      return jsonError(
        "INVALID_QUERY",
        getZodErrorMessage(error, "GitHub overview query 형식이 올바르지 않습니다."),
        400,
      );
    }

    return jsonError(
      "MEETING_HUB_GITHUB_OVERVIEW_FAILED",
      getErrorMessage(error, "Failed to load GitHub overview."),
      400,
    );
  }
}
