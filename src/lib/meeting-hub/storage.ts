import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getRuntimeConfig } from "@/lib/runtime/config";
import { persistJson, readPersistentJson } from "@/lib/storage/persistent-json";
import type {
  CreateMeetingHubMeetingInput,
  CreateMeetingHubTeamInput,
  MeetingHubActionItem,
  MeetingHubDecisionEntry,
  MeetingHubProcessedMeeting,
  MeetingHubMeeting,
  MeetingHubMeetingType,
  MeetingHubSummaryResponse,
  MeetingHubTeam,
  MeetingHubTeamMember,
  MeetingHubWeeklyBrief,
} from "@/lib/types";

const TEAM_STORE_FILE = "meeting-hub-teams.json";
const MEETING_STORE_FILE = "meeting-hub-meetings.json";

export function getMeetingHubSummary(): MeetingHubSummaryResponse {
  const teams = readTeams();
  const meetings = readMeetings();
  const actions = meetings
    .flatMap((meeting) => meeting.actionItems)
    .sort((left, right) => {
      const leftDate = left.dueDate ?? "9999-12-31";
      const rightDate = right.dueDate ?? "9999-12-31";
      return leftDate.localeCompare(rightDate);
    });

  return {
    teams,
    meetings: meetings.sort((left, right) => right.date.localeCompare(left.date)),
    actions,
    stats: {
      totalTeams: teams.length,
      totalMeetings: meetings.length,
      openActionItems: actions.filter((item) => item.status !== "done").length,
      linkedRepositories: new Set(
        meetings.map((meeting) => meeting.linkedRepository).filter(Boolean),
      ).size,
    },
    decisionLog: buildDecisionEntries(teams, meetings),
    weeklyBriefs: buildWeeklyBriefs(teams, meetings),
  };
}

export function buildRuleBasedMeetingProcessing(
  notes: string,
  repository: string | null,
  teamId: string,
  meetingId: string,
) {
  return parseMeetingNotes(notes, repository, teamId, meetingId);
}

export function createMeetingHubTeam(input: CreateMeetingHubTeamInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Team name is required.");
  }

  const now = new Date().toISOString();
  const teams = readTeams();
  const teamId = createUniqueId(name, teams.map((team) => team.id));
  const members = (input.members ?? [])
    .map<MeetingHubTeamMember | null>((member) => {
      const memberName = member.name.trim();
      if (!memberName) {
        return null;
      }

      return {
        id: slugify(memberName),
        name: memberName,
        role: member.role?.trim() || "Member",
        email: member.email?.trim() || null,
        githubLogin: member.githubLogin?.trim() || null,
      };
    })
    .filter((member): member is MeetingHubTeamMember => Boolean(member));

  const nextTeam: MeetingHubTeam = {
    id: teamId,
    name,
    description: input.description?.trim() || "",
    members,
    connectedProjectIds: uniqueStrings(input.connectedProjectIds ?? []),
    defaultRepository: normalizeNullableString(input.defaultRepository ?? null),
    createdAt: now,
    updatedAt: now,
  };

  const nextTeams = [...teams, nextTeam].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  persistJson(TEAM_STORE_FILE, nextTeams);
  writeTeamArtifacts(nextTeam, []);

  return nextTeam;
}

export function createMeetingHubMeeting(
  input: CreateMeetingHubMeetingInput,
  processed?: MeetingHubProcessedMeeting,
  options?: {
    audioArtifact?: {
      fileName: string;
      bytes: Uint8Array;
    };
  },
) {
  const teams = readTeams();
  const team = teams.find((candidate) => candidate.id === input.teamId);

  if (!team) {
    throw new Error("Selected team was not found.");
  }

  const title = input.title.trim();
  const notes = input.notes.trim();
  const date = input.date.trim();

  if (!title) {
    throw new Error("Meeting title is required.");
  }

  if (!date) {
    throw new Error("Meeting date is required.");
  }

  if (!notes) {
    throw new Error("Meeting notes are required.");
  }

  const meetings = readMeetings();
  const meetingId = createMeetingId(date, title, meetings.map((meeting) => meeting.id));
  const resolvedRepository = normalizeNullableString(
    input.linkedRepository ?? team.defaultRepository,
  );
  const parsed =
    processed ?? parseMeetingNotes(notes, resolvedRepository, input.teamId, meetingId);
  const now = new Date().toISOString();
  const artifactPaths = buildMeetingArtifactPaths(
    team.id,
    meetingId,
    normalizeNullableString(input.sourceFileName ?? null),
  );

  const nextMeeting: MeetingHubMeeting = {
    id: meetingId,
    teamId: input.teamId,
    title,
    type: normalizeMeetingType(input.type),
    date,
    inputSource: input.inputSource === "audio" ? "audio" : "text",
    participants: uniqueStrings(input.participants ?? []),
    linkedProjectIds: uniqueStrings(input.linkedProjectIds ?? []),
    linkedRepository: resolvedRepository,
    sourceFileName: normalizeNullableString(input.sourceFileName ?? null),
    sourceFilePath: options?.audioArtifact ? artifactPaths.audioRelative : null,
    rawNotes: notes,
    summary: parsed.summary,
    discussion: parsed.discussion,
    decisions: parsed.decisions,
    actionItems: parsed.actionItems.map((item, index) =>
      materializeActionItem(item, index, resolvedRepository, input.teamId, meetingId),
    ),
    risks: parsed.risks,
    followUp: parsed.followUp,
    processingMode: parsed.processingMode,
    processingRunner: parsed.processingRunner,
    markdownPath: artifactPaths.markdownRelative,
    jsonPath: artifactPaths.jsonRelative,
    rawPath: artifactPaths.rawRelative,
    createdAt: now,
    updatedAt: now,
  };

  const nextMeetings = [...meetings, nextMeeting].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  persistJson(MEETING_STORE_FILE, nextMeetings);
  writeMeetingArtifacts(
    team,
    nextMeeting,
    nextMeetings.filter((meeting) => meeting.teamId === team.id),
    options,
  );

  return nextMeeting;
}

export function linkMeetingHubActionItemToIssue(
  actionId: string,
  payload: { repository: string; issueNumber: number; issueUrl: string },
) {
  const meetings = readMeetings();
  const teams = readTeams();
  let updatedMeeting: MeetingHubMeeting | null = null;

  const nextMeetings = meetings.map<MeetingHubMeeting>((meeting) => {
    let changed = false;

    const nextActionItems = meeting.actionItems.map<MeetingHubActionItem>((item) => {
      if (item.id !== actionId) {
        return item;
      }

      changed = true;
      return {
        ...item,
        repository: payload.repository,
        issueNumber: payload.issueNumber,
        issueUrl: payload.issueUrl,
        issueState: "open" as const,
        syncedAt: new Date().toISOString(),
      };
    });

    if (!changed) {
      return meeting;
    }

    updatedMeeting = {
      ...meeting,
      actionItems: nextActionItems,
      updatedAt: new Date().toISOString(),
    };

    return updatedMeeting;
  });

  if (!updatedMeeting) {
    throw new Error("Action item was not found.");
  }

  const resolvedMeeting = updatedMeeting as MeetingHubMeeting;
  persistJson(MEETING_STORE_FILE, nextMeetings);
  const team = teams.find((candidate) => candidate.id === resolvedMeeting.teamId);

  if (team) {
    writeMeetingArtifacts(
      team,
      resolvedMeeting,
      nextMeetings.filter((meeting) => meeting.teamId === team.id),
    );
  }

  return resolvedMeeting;
}

export function updateMeetingHubActionItem(
  actionId: string,
  patch: {
    status?: MeetingHubActionItem["status"];
    owner?: string | null;
    dueDate?: string | null;
    issueState?: MeetingHubActionItem["issueState"];
    syncedAt?: string | null;
  },
) {
  const meetings = readMeetings();
  const teams = readTeams();
  let updatedMeeting: MeetingHubMeeting | null = null;

  const nextMeetings = meetings.map((meeting) => {
    let changed = false;

    const nextActionItems = meeting.actionItems.map((item) => {
      if (item.id !== actionId) {
        return item;
      }

      changed = true;
      return {
        ...item,
        status: patch.status ?? item.status,
        owner: patch.owner ?? item.owner,
        dueDate: patch.dueDate ?? item.dueDate,
        issueState: patch.issueState ?? item.issueState,
        syncedAt: patch.syncedAt ?? item.syncedAt,
      };
    });

    if (!changed) {
      return meeting;
    }

    updatedMeeting = {
      ...meeting,
      actionItems: nextActionItems,
      updatedAt: new Date().toISOString(),
    };

    return updatedMeeting;
  });

  if (!updatedMeeting) {
    throw new Error("Action item was not found.");
  }

  const resolvedMeeting = updatedMeeting as MeetingHubMeeting;
  persistJson(MEETING_STORE_FILE, nextMeetings);
  const team = teams.find((candidate) => candidate.id === resolvedMeeting.teamId);

  if (team) {
    writeMeetingArtifacts(
      team,
      resolvedMeeting,
      nextMeetings.filter((meeting) => meeting.teamId === team.id),
    );
  }

  return resolvedMeeting;
}

export function syncMeetingHubActionItems(
  updates: Array<{
    actionId: string;
    issueState: "open" | "closed";
    issueUrl?: string | null;
    issueNumber?: number | null;
    repository?: string | null;
  }>,
) {
  const meetings = readMeetings();
  const teams = readTeams();
  const updateMap = new Map(updates.map((item) => [item.actionId, item]));
  const touchedTeams = new Set<string>();
  const touchedMeetingIds = new Set<string>();

  const nextMeetings = meetings.map<MeetingHubMeeting>((meeting) => {
    let changed = false;

    const nextActionItems = meeting.actionItems.map<MeetingHubActionItem>((item) => {
      const update = updateMap.get(item.id);
      if (!update) {
        return item;
      }

      changed = true;
      touchedTeams.add(meeting.teamId);
      touchedMeetingIds.add(meeting.id);
      const nextStatus: MeetingHubActionItem["status"] =
        update.issueState === "closed"
          ? "done"
          : item.status === "open"
            ? "in_progress"
            : item.status;
      return {
        ...item,
        repository: update.repository ?? item.repository,
        issueNumber: update.issueNumber ?? item.issueNumber,
        issueUrl: update.issueUrl ?? item.issueUrl,
        issueState: update.issueState,
        status: nextStatus,
        syncedAt: new Date().toISOString(),
      };
    });

    if (!changed) {
      return meeting;
    }

    return {
      ...meeting,
      actionItems: nextActionItems,
      updatedAt: new Date().toISOString(),
    };
  });

  persistJson(MEETING_STORE_FILE, nextMeetings);

  for (const teamId of touchedTeams) {
    const team = teams.find((candidate) => candidate.id === teamId);
    if (!team) {
      continue;
    }

    const teamMeetings = nextMeetings.filter((meeting) => meeting.teamId === teamId);
    for (const meeting of teamMeetings) {
      if (!touchedMeetingIds.has(meeting.id)) {
        continue;
      }

      writeMeetingArtifacts(team, meeting, teamMeetings);
    }
  }

  return getMeetingHubSummary();
}

function readTeams() {
  return readPersistentJson<MeetingHubTeam[]>(TEAM_STORE_FILE, []);
}

function readMeetings() {
  return readPersistentJson<MeetingHubMeeting[]>(MEETING_STORE_FILE, []).map((meeting) => ({
    ...meeting,
    inputSource: meeting.inputSource ?? "text",
    sourceFileName: meeting.sourceFileName ?? null,
    sourceFilePath: meeting.sourceFilePath ?? null,
    actionItems: (meeting.actionItems ?? []).map((item) => ({
      ...item,
      issueUrl: item.issueUrl ?? null,
      issueState: item.issueState ?? null,
      syncedAt: item.syncedAt ?? null,
      prNumbers: item.prNumbers ?? [],
    })),
    processingMode: meeting.processingMode ?? "rule",
    processingRunner: meeting.processingRunner ?? "rule",
  }));
}

function writeTeamArtifacts(team: MeetingHubTeam, meetings: MeetingHubMeeting[]) {
  const { teamDir } = getTeamPaths(team.id);
  mkdirSync(teamDir, { recursive: true });
  writeJsonFile(path.join(teamDir, "team.json"), team);
  writeActionItemsArtifact(team.id, meetings);
  writeDecisionLogArtifact(team, meetings);
  writeWeeklyBriefArtifact(team, meetings);
}

function writeMeetingArtifacts(
  team: MeetingHubTeam,
  meeting: MeetingHubMeeting,
  teamMeetings: MeetingHubMeeting[],
  options?: {
    audioArtifact?: {
      fileName: string;
      bytes: Uint8Array;
    };
  },
) {
  const { meetingsDir } = getTeamPaths(team.id);
  const artifactPaths = buildMeetingArtifactPaths(team.id, meeting.id, meeting.sourceFileName);

  mkdirSync(meetingsDir, { recursive: true });
  writeFileSync(artifactPaths.rawAbsolute, meeting.rawNotes, "utf-8");
  if (options?.audioArtifact) {
    writeFileSync(artifactPaths.audioAbsolute, Buffer.from(options.audioArtifact.bytes));
  }
  writeJsonFile(artifactPaths.jsonAbsolute, meeting);
  writeFileSync(artifactPaths.markdownAbsolute, buildMeetingMarkdown(team, meeting), "utf-8");
  writeTeamArtifacts(team, teamMeetings);
}

function writeActionItemsArtifact(teamId: string, meetings: MeetingHubMeeting[]) {
  const { actionsDir } = getTeamPaths(teamId);
  mkdirSync(actionsDir, { recursive: true });
  const items = meetings.flatMap((meeting) => meeting.actionItems);
  writeJsonFile(path.join(actionsDir, "open-items.json"), { items });
}

function writeDecisionLogArtifact(team: MeetingHubTeam, meetings: MeetingHubMeeting[]) {
  const { decisionsDir } = getTeamPaths(team.id);
  mkdirSync(decisionsDir, { recursive: true });

  const lines = meetings
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .flatMap((meeting) =>
      meeting.decisions.map((decision) => `- ${meeting.date} — ${meeting.title}: ${decision}`),
    );

  const content = [
    `# ${team.name} Decision Log`,
    "",
    ...(lines.length > 0 ? lines : ["- No decisions recorded yet."]),
    "",
  ].join("\n");

  writeFileSync(path.join(decisionsDir, "decision-log.md"), content, "utf-8");
}

function writeWeeklyBriefArtifact(team: MeetingHubTeam, meetings: MeetingHubMeeting[]) {
  const { briefsDir } = getTeamPaths(team.id);
  mkdirSync(briefsDir, { recursive: true });
  const brief = buildWeeklyBrief(team, meetings);

  const content = [
    `# ${team.name} Weekly Brief`,
    "",
    `- Range: ${brief.fromDate} → ${brief.toDate}`,
    `- Meetings: ${brief.meetingCount}`,
    `- Open Actions: ${brief.openActionItems}`,
    `- Linked Projects: ${brief.linkedProjectIds.join(", ") || "None"}`,
    "",
    "## Decisions",
    ...(brief.decisions.length > 0 ? brief.decisions.map((item) => `- ${item}`) : ["- No decisions recorded this week."]),
    "",
    "## Risks",
    ...(brief.risks.length > 0 ? brief.risks.map((item) => `- ${item}`) : ["- No active risks recorded this week."]),
    "",
    "## Follow-up",
    ...(brief.followUp.length > 0 ? brief.followUp.map((item) => `- ${item}`) : ["- No follow-up items recorded this week."]),
    "",
  ].join("\n");

  writeFileSync(path.join(briefsDir, "latest-weekly-brief.md"), content, "utf-8");
}

function buildMeetingMarkdown(team: MeetingHubTeam, meeting: MeetingHubMeeting) {
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

function parseMeetingNotes(
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

function buildActionItem(
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

function materializeActionItem(
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

function extractByPrefixes(lines: string[], prefixes: string[]) {
  return lines.filter((line) =>
    prefixes.some((prefix) => line.toLowerCase().startsWith(prefix.toLowerCase())),
  );
}

function stripStructuredPrefix(line: string) {
  return line
    .replace(/^-\s*\[\s?\]\s*/i, "")
    .replace(/^(decision|decide|action|todo|task|risk|blocker|follow-up|next|결정|할 일|리스크|블로커|후속|다음)\s*:\s*/i, "")
    .trim();
}

function createMeetingId(date: string, title: string, existingIds: string[]) {
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

function createUniqueId(source: string, existingIds: string[]) {
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMeetingType(type: MeetingHubMeetingType) {
  const allowed: MeetingHubMeetingType[] = [
    "standup",
    "planning",
    "review",
    "retro",
    "client",
  ];

  return allowed.includes(type) ? type : "planning";
}

function normalizeNullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function getMeetingHubRoot() {
  return path.join(getRuntimeConfig().paths.dataDir, "meeting-hub");
}

function getTeamPaths(teamId: string) {
  const teamDir = path.join(getMeetingHubRoot(), "teams", teamId);
  return {
    teamDir,
    meetingsDir: path.join(teamDir, "meetings"),
    actionsDir: path.join(teamDir, "actions"),
    decisionsDir: path.join(teamDir, "decisions"),
    briefsDir: path.join(teamDir, "briefs"),
  };
}

function buildMeetingArtifactPaths(
  teamId: string,
  meetingId: string,
  sourceFileName?: string | null,
) {
  const { meetingsDir } = getTeamPaths(teamId);
  const markdownAbsolute = path.join(meetingsDir, `${meetingId}.md`);
  const jsonAbsolute = path.join(meetingsDir, `${meetingId}.json`);
  const rawAbsolute = path.join(meetingsDir, `${meetingId}.raw.txt`);
  const sourceExtension = path.extname(sourceFileName ?? "").trim() || ".bin";
  const audioAbsolute = path.join(meetingsDir, `${meetingId}.source${sourceExtension}`);

  return {
    markdownAbsolute,
    jsonAbsolute,
    rawAbsolute,
    audioAbsolute,
    markdownRelative: path.relative(process.cwd(), markdownAbsolute),
    jsonRelative: path.relative(process.cwd(), jsonAbsolute),
    rawRelative: path.relative(process.cwd(), rawAbsolute),
    audioRelative: path.relative(process.cwd(), audioAbsolute),
  };
}

function writeJsonFile(targetPath: string, payload: unknown) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, JSON.stringify(payload, null, 2), "utf-8");
}

function buildDecisionEntries(
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

function buildWeeklyBriefs(
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

function buildWeeklyBrief(team: MeetingHubTeam, meetings: MeetingHubMeeting[]): MeetingHubWeeklyBrief {
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

function formatDateOffset(baseDate: string, offsetDays: number) {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
