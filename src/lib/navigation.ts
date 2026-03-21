"use client";

import type { DashboardTabId } from "@/components/TabNav";
import { CLIENT_EVENTS, CLIENT_STORAGE_KEYS } from "@/lib/client-keys";

export interface DashboardNavigationTarget {
  tab: DashboardTabId | "info-hub" | "obsidian" | "terminal";
  payload?: Record<string, string>;
}

const NAV_EVENT = CLIENT_EVENTS.navigate;
const NAV_STORAGE_KEY = CLIENT_STORAGE_KEYS.navigationTarget;

export function navigateDashboard(target: DashboardNavigationTarget) {
  if (typeof window === "undefined") {
    return;
  }

  const tab = normalizeTab(target.tab);
  const nextTarget = { ...target, tab };
  localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(nextTarget));
  window.location.hash = tab;
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: nextTarget }));
}

export function consumeStoredNavigation() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(NAV_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  localStorage.removeItem(NAV_STORAGE_KEY);

  try {
    return JSON.parse(raw) as DashboardNavigationTarget;
  } catch {
    return null;
  }
}

export function subscribeDashboardNavigation(
  callback: (target: DashboardNavigationTarget) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<DashboardNavigationTarget>;
    callback(customEvent.detail);
  };

  window.addEventListener(NAV_EVENT, handler);
  return () => window.removeEventListener(NAV_EVENT, handler);
}

function normalizeTab(tab: DashboardNavigationTarget["tab"]) {
  if (tab === "info-hub") {
    return "infohub";
  }

  if (tab === "obsidian" || tab === "terminal") {
    return "home";
  }

  return tab;
}
