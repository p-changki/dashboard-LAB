"use client";

export type DashboardLabAutoRefreshMode = "standard" | "realtime";

const DAILY_AUTO_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REALTIME_AUTO_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const AUTO_REFRESH_MODE_KEY = "dashboard-lab:auto-refresh:mode";
const autoRefreshInFlight = new Set<string>();

export function getDailyAutoRefreshKey(scope: string, locale: "ko" | "en") {
  return `dashboard-lab:auto-refresh:${scope}:${locale}`;
}

export function readDashboardLabAutoRefreshMode(): DashboardLabAutoRefreshMode {
  if (typeof window === "undefined") {
    return "realtime";
  }

  const value = window.localStorage.getItem(AUTO_REFRESH_MODE_KEY);
  return value === "standard" || value === "realtime" ? value : "realtime";
}

export function writeDashboardLabAutoRefreshMode(mode: DashboardLabAutoRefreshMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTO_REFRESH_MODE_KEY, mode);
}

export function getDashboardLabAutoRefreshIntervalMs(
  mode: DashboardLabAutoRefreshMode,
) {
  return mode === "realtime"
    ? REALTIME_AUTO_REFRESH_INTERVAL_MS
    : DAILY_AUTO_REFRESH_INTERVAL_MS;
}

export async function runDailyAutoRefresh(
  key: string,
  task: () => Promise<void>,
  intervalMs = DAILY_AUTO_REFRESH_INTERVAL_MS,
) {
  if (!shouldRunDailyAutoRefresh(key, intervalMs)) {
    return false;
  }

  autoRefreshInFlight.add(key);

  try {
    await task();
    window.localStorage.setItem(key, `${Date.now()}`);
    return true;
  } finally {
    autoRefreshInFlight.delete(key);
  }
}

export function scheduleIdleRefresh(task: () => void, delayMs = 180) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const idleWindow = window as Window &
    typeof globalThis & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(() => task(), { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timeoutId = window.setTimeout(task, delayMs);
  return () => window.clearTimeout(timeoutId);
}

function shouldRunDailyAutoRefresh(key: string, intervalMs: number) {
  if (typeof window === "undefined" || autoRefreshInFlight.has(key)) {
    return false;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return true;
  }

  const lastRefreshedAt = Number.parseInt(raw, 10);
  if (!Number.isFinite(lastRefreshedAt)) {
    return true;
  }

  return Date.now() - lastRefreshedAt >= intervalMs;
}
