import type {
  MeetingHubOverviewResponse,
  MeetingHubSummaryResponse,
} from "@/lib/types";

export function deriveMeetingHubOverview(
  summary: MeetingHubSummaryResponse,
): MeetingHubOverviewResponse {
  return {
    teams: summary.teams,
    stats: summary.stats,
    recentMeetings: summary.meetings.slice(0, 5),
    recentActions: summary.actions.slice(0, 6),
    decisionLog: summary.decisionLog.slice(0, 8),
    weeklyBriefs: summary.weeklyBriefs.slice(0, 3),
    linkedRepositories: [
      ...new Set(
        summary.meetings.map((meeting) => meeting.linkedRepository).filter(Boolean),
      ),
    ] as string[],
  };
}
