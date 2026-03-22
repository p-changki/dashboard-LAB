import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { getMeetingHubGithubOverview } from "@/lib/meeting-hub/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repos = searchParams
      .get("repos")
      ?.split(",")
      .map((repo) => repo.trim())
      .filter(Boolean) ?? [];

    return Response.json(await getMeetingHubGithubOverview(repos));
  } catch (error) {
    return jsonError(
      "MEETING_HUB_GITHUB_OVERVIEW_FAILED",
      getErrorMessage(error, "Failed to load GitHub overview."),
      400,
    );
  }
}
