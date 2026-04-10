import "server-only";

import { pickLocale, type AppLocale } from "@/lib/locale";
import { persistJson, readPersistentJson } from "@/lib/storage/persistent-json";
import type { DashboardLabRuntimeRunnerHealthEntry } from "@/lib/types";

const SIGNAL_WRITER_RUNNER_HEALTH_FILE = "signal-writer-runner-health.json";
const HEALTH_WINDOW_MS = 24 * 60 * 60 * 1000;
const FAIL_WINDOW_MS = 2 * 60 * 60 * 1000;
const MAX_EVENT_COUNT = 50;

type SignalWriterCodexHealthScope = "draft" | "fact-check" | "research" | "trend-board";
type SignalWriterCodexHealthReason = "corrupted" | "invalid";

type SignalWriterCodexHealthEvent = {
  occurredAt: string;
  scope: SignalWriterCodexHealthScope;
  reason: SignalWriterCodexHealthReason;
};

type SignalWriterRunnerHealthState = {
  codex: {
    events: SignalWriterCodexHealthEvent[];
  };
};

export function recordSignalWriterCodexHealthEvent(
  scope: SignalWriterCodexHealthScope,
  reason: SignalWriterCodexHealthReason,
) {
  const state = readSignalWriterRunnerHealthState();
  const nextEvents = pruneHealthEvents([
    {
      occurredAt: new Date().toISOString(),
      scope,
      reason,
    },
    ...state.codex.events,
  ]).slice(0, MAX_EVENT_COUNT);

  persistJson(SIGNAL_WRITER_RUNNER_HEALTH_FILE, {
    codex: {
      events: nextEvents,
    },
  } satisfies SignalWriterRunnerHealthState);
}

export function getSignalWriterCodexRunnerHealth(
  locale: AppLocale,
): DashboardLabRuntimeRunnerHealthEntry {
  const events = pruneHealthEvents(readSignalWriterRunnerHealthState().codex.events);
  const lastIssue = events[0] ?? null;
  const now = Date.now();
  const recentIssueCount = events.length;
  const status =
    recentIssueCount === 0
      ? "pass"
      : recentIssueCount >= 3
          && lastIssue
          && now - new Date(lastIssue.occurredAt).getTime() <= FAIL_WINDOW_MS
        ? "fail"
        : "warn";

  return {
    runner: "codex",
    status,
    detail: buildCodexHealthDetail(locale, status, recentIssueCount, lastIssue),
    recentIssueCount,
    lastIssueAt: lastIssue?.occurredAt ?? null,
    lastIssueScope: lastIssue?.scope ?? null,
    lastIssueReason: lastIssue?.reason ?? null,
  };
}

function readSignalWriterRunnerHealthState(): SignalWriterRunnerHealthState {
  const fallback: SignalWriterRunnerHealthState = {
    codex: {
      events: [],
    },
  };
  const state = readPersistentJson<SignalWriterRunnerHealthState>(
    SIGNAL_WRITER_RUNNER_HEALTH_FILE,
    fallback,
  );

  return {
    codex: {
      events: Array.isArray(state?.codex?.events) ? pruneHealthEvents(state.codex.events) : [],
    },
  };
}

function pruneHealthEvents(events: SignalWriterCodexHealthEvent[]) {
  const cutoff = Date.now() - HEALTH_WINDOW_MS;

  return events.filter((event) => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= cutoff;
  });
}

function buildCodexHealthDetail(
  locale: AppLocale,
  status: "pass" | "warn" | "fail",
  recentIssueCount: number,
  lastIssue: SignalWriterCodexHealthEvent | null,
) {
  if (!lastIssue || status === "pass") {
    return pickLocale(locale, {
      ko: "최근 24시간 동안 Signal Writer에서 Codex 구조화 출력 이상이 감지되지 않았습니다.",
      en: "No Codex structured-output issues were detected in Signal Writer during the last 24 hours.",
    });
  }

  const scopeLabel = formatScope(locale, lastIssue.scope);
  const reasonLabel = formatReason(locale, lastIssue.reason);

  if (status === "fail") {
    return pickLocale(locale, {
      ko: `최근 24시간 동안 Signal Writer의 Codex 출력 이상이 ${recentIssueCount}회 감지되었습니다. 마지막 감지: ${scopeLabel} · ${reasonLabel}.`,
      en: `${recentIssueCount} Codex output issues were detected in Signal Writer during the last 24 hours. Last issue: ${scopeLabel} · ${reasonLabel}.`,
    });
  }

  return pickLocale(locale, {
    ko: `최근 24시간 동안 Signal Writer의 Codex 출력 이상이 ${recentIssueCount}회 감지되었습니다. 마지막 감지: ${scopeLabel} · ${reasonLabel}.`,
    en: `${recentIssueCount} Codex output issue${recentIssueCount > 1 ? "s were" : " was"} detected in Signal Writer during the last 24 hours. Last issue: ${scopeLabel} · ${reasonLabel}.`,
  });
}

function formatScope(locale: AppLocale, scope: SignalWriterCodexHealthScope) {
  return pickLocale(locale, {
    ko: {
      draft: "초안 생성",
      "fact-check": "팩트체크",
      research: "리서치",
      "trend-board": "Trend Board",
    }[scope],
    en: {
      draft: "Draft generation",
      "fact-check": "Fact-check",
      research: "Research",
      "trend-board": "Trend Board",
    }[scope],
  });
}

function formatReason(locale: AppLocale, reason: SignalWriterCodexHealthReason) {
  return pickLocale(locale, {
    ko: reason === "corrupted" ? "CLI transcript 오염" : "구조화 응답 invalid",
    en: reason === "corrupted" ? "CLI transcript leak" : "Invalid structured response",
  });
}
