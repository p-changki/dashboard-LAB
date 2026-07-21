// Pure document construction for Meeting Hub: markdown rendering, note
// parsing, action-item shaping, id/slug utilities, and weekly-brief and
// decision-log aggregation. No filesystem access — callers persist the result.
import { randomUUID } from "node:crypto";

import type {
  MeetingHubActionItem,
  MeetingHubDecisionEntry,
  MeetingHubMeeting,
  MeetingHubMeetingType,
  MeetingHubProcessedMeeting,
  MeetingHubTeam,
  MeetingHubWeeklyBrief,
} from "@/lib/types";

export function buildMeetingMarkdown(team: MeetingHubTeam, meeting: MeetingHubMeeting) {
  const lines = [
    `# ${meeting.title}`,
    "",
    `- Date: ${meeting.date}`,
    `- Team: ${team.name}`,
    `- Type: ${meeting.type}`,
    `- Input Source: ${meeting.inputSource}`,
    `- Participants: ${meeting.participants.join(", ") || "None recorded"}`,
    `- Linked Projects: ${meeting.linkedProjectIds.join(", ") || "None"}`,
    `- Linked Repository: ${meeting.linkedRepository ?? "None"}`,
    `- Source File: ${meeting.sourceFileName ?? "None"}`,
    `- Source Path: ${meeting.sourceFilePath ?? "None"}`,
    "",
    "## Summary",
    `- ${meeting.summary || "No summary generated."}`,
    "",
    "## Discussion",
    ...(meeting.discussion.length > 0
      ? meeting.discussion.map((item) => `- ${item}`)
      : ["- No discussion points extracted."]),
    "",
    "## Decisions",
    ...(meeting.decisions.length > 0
      ? meeting.decisions.map((item) => `- ${item}`)
      : ["- No decisions extracted."]),
    "",
    "## Action Items",
    ...(meeting.actionItems.length > 0
      ? meeting.actionItems.map((item) => {
          const owner = item.owner ?? "Unassigned";
          const due = item.dueDate ? ` — Due ${item.dueDate}` : "";
          const checkbox = item.status === "done" ? "[x]" : item.status === "in_progress" ? "[~]" : "[ ]";
          return `- ${checkbox} ${owner} — ${item.title}${due}`;
        })
      : ["- [ ] No action items extracted."]),
    "",
    "## Risks",
    ...(meeting.risks.length > 0
      ? meeting.risks.map((item) => `- ${item}`)
      : ["- No risks extracted."]),
    "",
    "## Follow-up",
    ...(meeting.followUp.length > 0
      ? meeting.followUp.map((item) => `- ${item}`)
      : ["- No follow-up notes extracted."]),
    "",
    "## Raw Notes",
    "```text",
    meeting.rawNotes,
    "```",
    "",
  ];

  return lines.join("\n");
}

export function parseMeetingNotes(
  notes: string,
  repository: string | null,
  teamId: string,
  meetingId: string,
): MeetingHubProcessedMeeting {
  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const decisions = extractByPrefixes(lines, ["decision:", "결정:", "decide:"]);
  const risks = extractByPrefixes(lines, ["risk:", "리스크:", "blocker:", "블로커:"]);
  const followUp = extractByPrefixes(lines, ["follow-up:", "후속:", "next:", "다음:"]);
  const actionLines = extractByPrefixes(lines, [
    "action:",
    "todo:",
    "task:",
    "할 일:",
    "- [ ]",
  ]);
  const actionItems = actionLines.map((line, index) =>
    buildActionItem(line, index, repository, teamId, meetingId),
  );

  const reserved = new Set([
    ...decisions,
    ...risks,
    ...followUp,
    ...actionLines,
  ]);
  const discussion = lines.filter((line) => !reserved.has(line)).slice(0, 8);
  const summarySource = discussion[0] ?? decisions[0] ?? actionLines[0] ?? notes;
  const summary = truncate(summarySource.replace(/^[-*]\s*/, ""), 220);

  return {
    summary,
    discussion: discussion.map((item) => item.replace(/^[-*]\s*/, "")),
    decisions: decisions.map(stripStructuredPrefix),
    actionItems: actionItems.map((item) => ({
      title: item.title,
      owner: item.owner,
      dueDate: item.dueDate,
      status: "open",
      sourceLine: item.sourceLine,
    })),
    risks: risks.map(stripStructuredPrefix),
    followUp: followUp.map(stripStructuredPrefix),
    processingMode: "rule",
    processingRunner: "rule",
  };
}

export function buildActionItem(
  sourceLine: string,
  index: number,
  repository: string | null,
  teamId: string,
  meetingId: string,
): MeetingHubActionItem {
  const cleaned = stripStructuredPrefix(sourceLine);
  const dueMatch = cleaned.match(/(?:due|by)\s+(\d{4}-\d{2}-\d{2})/i);
  const ownerMatch = cleaned.match(/@([a-z0-9_-]+)/i);
  const title = cleaned
    .replace(/(?:due|by)\s+\d{4}-\d{2}-\d{2}/gi, "")
    .replace(/@([a-z0-9_-]+)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: `${meetingId}-action-${index + 1}`,
    meetingId,
    teamId,
    title,
    owner: ownerMatch?.[1] ?? null,
    dueDate: dueMatch?.[1] ?? null,
    status: "open",
    repository: normalizeNullableString(repository),
    issueNumber: null,
    issueUrl: null,
    issueState: null,
    prNumbers: [],
    sourceLine: cleaned,
    syncedAt: null,
  };
}

export function materializeActionItem(
  item:
    | MeetingHubActionItem
    | MeetingHubProcessedMeeting["actionItems"][number],
  index: number,
  repository: string | null,
  teamId: string,
  meetingId: string,
): MeetingHubActionItem {
  if ("meetingId" in item) {
    return item;
  }

  return {
    id: `${meetingId}-action-${index + 1}`,
    meetingId,
    teamId,
    title: item.title,
    owner: item.owner,
    dueDate: item.dueDate,
    status: item.status,
    repository: normalizeNullableString(repository),
    issueNumber: null,
    issueUrl: null,
    issueState: null,
    prNumbers: [],
    sourceLine: item.sourceLine,
    syncedAt: null,
  };
}

export function extractByPrefixes(lines: string[], prefixes: string[]) {
  return lines.filter((line) =>
    prefixes.some((prefix) => line.toLowerCase().startsWith(prefix.toLowerCase())),
  );
}

export function stripStructuredPrefix(line: string) {
  return line
    .replace(/^-\s*\[\s?\]\s*/i, "")
    .replace(/^(decision|decide|action|todo|task|risk|blocker|follow-up|next|결정|할 일|리스크|블로커|후속|다음)\s*:\s*/i, "")
    .trim();
}

export function createMeetingId(date: string, title: string, existingIds: string[]) {
  const base = `${date}-${slugify(title)}`;
  if (!existingIds.includes(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export function createUniqueId(source: string, existingIds: string[]) {
  const base = slugify(source) || randomUUID();
  if (!existingIds.includes(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeMeetingType(type: MeetingHubMeetingType) {
  const allowed: MeetingHubMeetingType[] = [
    "standup",
    "planning",
    "review",
    "retro",
    "client",
  ];

  return allowed.includes(type) ? type : "planning";
}

export function normalizeNullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}


export function buildDecisionEntries(
  teams: MeetingHubTeam[],
  meetings: MeetingHubMeeting[],
): MeetingHubDecisionEntry[] {
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  return meetings
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .flatMap((meeting) =>
      meeting.decisions.map((decision, index) => ({
        id: `${meeting.id}-decision-${index + 1}`,
        teamId: meeting.teamId,
        teamName: teamMap.get(meeting.teamId)?.name ?? meeting.teamId,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        date: meeting.date,
        decision,
      })),
    );
}

export function buildWeeklyBriefs(
  teams: MeetingHubTeam[],
  meetings: MeetingHubMeeting[],
): MeetingHubWeeklyBrief[] {
  return teams
    .map((team) =>
      buildWeeklyBrief(
        team,
        meetings.filter((meeting) => meeting.teamId === team.id),
      ),
    )
    .filter((brief) => brief.meetingCount > 0)
    .sort((left, right) => right.toDate.localeCompare(left.toDate));
}

export function buildWeeklyBrief(team: MeetingHubTeam, meetings: MeetingHubMeeting[]): MeetingHubWeeklyBrief {
  const sorted = meetings.slice().sort((left, right) => right.date.localeCompare(left.date));
  const latest = sorted[0];

  if (!latest) {
    return {
      id: `${team.id}-weekly-brief-empty`,
      teamId: team.id,
      teamName: team.name,
      fromDate: "",
      toDate: "",
      meetingCount: 0,
      openActionItems: 0,
      decisions: [],
      risks: [],
      followUp: [],
      linkedProjectIds: [],
    };
  }

  const endDate = latest.date;
  const startDate = formatDateOffset(endDate, -6);
  const weeklyMeetings = sorted.filter((meeting) => meeting.date >= startDate && meeting.date <= endDate);

  return {
    id: `${team.id}-weekly-brief-${endDate}`,
    teamId: team.id,
    teamName: team.name,
    fromDate: startDate,
    toDate: endDate,
    meetingCount: weeklyMeetings.length,
    openActionItems: weeklyMeetings
      .flatMap((meeting) => meeting.actionItems)
      .filter((item) => item.status !== "done").length,
    decisions: uniqueStrings(weeklyMeetings.flatMap((meeting) => meeting.decisions)).slice(0, 8),
    risks: uniqueStrings(weeklyMeetings.flatMap((meeting) => meeting.risks)).slice(0, 6),
    followUp: uniqueStrings(weeklyMeetings.flatMap((meeting) => meeting.followUp)).slice(0, 6),
    linkedProjectIds: uniqueStrings(weeklyMeetings.flatMap((meeting) => meeting.linkedProjectIds)),
  };
}

export function formatDateOffset(baseDate: string, offsetDays: number) {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
