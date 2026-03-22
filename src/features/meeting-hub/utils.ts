import { pickLocale, type AppLocale } from "@/lib/locale";
import type {
  CreateMeetingHubTeamInput,
  MeetingHubAiRunner,
  MeetingHubMeetingType,
  MeetingHubOverviewResponse,
  MeetingHubSummaryResponse,
} from "@/lib/types";

export function parseMembers(value: string): CreateMeetingHubTeamInput["members"] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, rolePart] = line.split(/\s+-\s+/, 2);
      return {
        name: namePart?.trim() || line,
        role: rolePart?.trim() || "Member",
      };
    });
}

export function splitCommaValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatMeetingType(locale: AppLocale, type: MeetingHubMeetingType) {
  return pickLocale(locale, {
    ko: {
      standup: "스탠드업",
      planning: "플래닝",
      review: "리뷰",
      retro: "회고",
      client: "고객 미팅",
    },
    en: {
      standup: "Standup",
      planning: "Planning",
      review: "Review",
      retro: "Retro",
      client: "Client Meeting",
    },
  })[type];
}

export function formatRunner(locale: AppLocale, runner: MeetingHubAiRunner) {
  return pickLocale(locale, {
    ko: {
      auto: "자동 선택",
      claude: "Claude CLI",
      codex: "Codex CLI",
      gemini: "Gemini CLI",
      openai: "OpenAI",
      rule: "규칙 기반",
    },
    en: {
      auto: "Auto",
      claude: "Claude CLI",
      codex: "Codex CLI",
      gemini: "Gemini CLI",
      openai: "OpenAI",
      rule: "Rule-based",
    },
  })[runner];
}

export function getLinkedRepositories(
  overview: MeetingHubOverviewResponse | null,
  summary: MeetingHubSummaryResponse | null,
) {
  const repositories = [
    ...(summary?.teams.map((team) => team.defaultRepository).filter(Boolean) ??
      overview?.teams.map((team) => team.defaultRepository).filter(Boolean) ??
      []),
    ...(summary?.meetings.map((meeting) => meeting.linkedRepository).filter(Boolean) ??
      overview?.linkedRepositories ??
      []),
  ];

  return [...new Set(repositories)] as string[];
}
