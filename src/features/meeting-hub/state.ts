import type { MeetingHubAiRunner, MeetingHubMeetingType } from "@/lib/types";

import type { MeetingInputMode } from "./copy";

export type TeamDraft = {
  name: string;
  description: string;
  membersText: string;
  connectedProjectsText: string;
  defaultRepository: string;
};

export type MeetingDraft = {
  teamId: string;
  title: string;
  type: MeetingHubMeetingType;
  date: string;
  inputMode: MeetingInputMode;
  participantsText: string;
  linkedProjectsText: string;
  linkedRepository: string;
  notes: string;
  useAi: boolean;
  runner: MeetingHubAiRunner;
};

export const EMPTY_TEAM_DRAFT: TeamDraft = {
  name: "",
  description: "",
  membersText: "",
  connectedProjectsText: "",
  defaultRepository: "",
};

export function createEmptyMeetingDraft(): MeetingDraft {
  return {
    teamId: "",
    title: "",
    type: "planning",
    date: new Date().toISOString().slice(0, 10),
    inputMode: "text",
    participantsText: "",
    linkedProjectsText: "",
    linkedRepository: "",
    notes: "",
    useAi: true,
    runner: "auto",
  };
}

export const MEETING_TYPES: MeetingHubMeetingType[] = [
  "standup",
  "planning",
  "review",
  "retro",
  "client",
];
