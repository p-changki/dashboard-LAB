export const APP_META = {
  slug: "dashboard-lab",
  displayName: "dashboard-LAB",
  shortName: "DL",
  tagline: "Local-first AI workspace for Claude, Codex, and Gemini",
  description:
    "Local-first AI workspace for Claude, Codex, and Gemini with meeting notes, PRDs, customer replies, and daily signals in one desktop-ready app.",
  repositoryUrl: "https://github.com/p-changki/dashboard-LAB",
  sessionFileName: ".dashboard-lab-dev-session.json",
  launcherFileName: "Run-Dashboard-LAB.command",
} as const;

export function buildStorageKey(suffix: string) {
  return `${APP_META.slug}-${suffix}`;
}

export function buildEventName(name: string) {
  return `${APP_META.slug}:${name}`;
}

export function buildLogPrefix() {
  return `[${APP_META.slug}]`;
}
