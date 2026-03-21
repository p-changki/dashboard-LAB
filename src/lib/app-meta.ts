export const APP_META = {
  slug: "dashboard-lab",
  displayName: "dashboard-LAB",
  shortName: "DL",
  tagline: "Local Workspace Dashboard Lab",
  description:
    "Configurable local-first AI workspace dashboard boilerplate.",
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
