import { buildEventName, buildStorageKey } from "@/lib/app-meta";

export const CLIENT_STORAGE_KEYS = {
  homeSections: buildStorageKey("home-sections"),
  locale: buildStorageKey("locale-v1"),
  navigationTarget: buildStorageKey("nav-target"),
  navigationMode: buildStorageKey("nav-mode-v1"),
  onboardingDismissed: buildStorageKey("onboarding-dismissed-v1"),
  pinned: buildStorageKey("pinned"),
  projectMemo: buildStorageKey("project-memo"),
  recent: buildStorageKey("recent"),
  terminalBookmarks: buildStorageKey("terminal-bookmarks"),
} as const;

export const CLIENT_EVENTS = {
  navigate: buildEventName("navigate"),
  pinned: buildEventName("pinned"),
  recent: buildEventName("recent"),
} as const;
