"use client";

import { useCallback, useEffect, useRef } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { readCallDocTemplateSets } from "@/lib/call-to-prd/template-sets";
import type { ProjectSummary } from "@/lib/types";
import type {
  CallProjectContextResponse,
  CallRecord,
  CallStatus,
  CallDocTemplateSet,
  SavedCallBundleListResponse,
  SavedCallBundleIndexItem,
} from "@/lib/types/call-to-prd";

import type { CallToPrdProjectsResponse } from "../state";
import { SAVED_PAGE_SIZE } from "../state";

// Give a brief network interruption a chance to recover before declaring the
// job failed — the server pipeline keeps running regardless of the client.
const POLL_MAX_FAILURES = 3;
const POLL_RETRY_DELAY_MS = 2_000;

class PollError extends Error {
  readonly recordMissing: boolean;

  constructor(message: string, recordMissing: boolean) {
    super(message);
    this.name = "PollError";
    this.recordMissing = recordMissing;
  }
}

type UseCallToPrdDataParams = {
  projectPath: string;
  savedPage: number;
  deferredSavedQuery: string;
  setHistory: (records: CallRecord[]) => void;
  setSavedBundles: (items: SavedCallBundleIndexItem[]) => void;
  setSavedTotalCount: (count: number) => void;
  setSavedTotalPages: (count: number) => void;
  setSavedPage: (page: number) => void;
  setProjects: (projects: ProjectSummary[]) => void;
  setCurrentProjectPath: (path: string) => void;
  setProjectContextStatus: (status: "idle" | "loading" | "ready" | "failed") => void;
  setProjectContextSummary: (summary: string) => void;
  setProjectContextSources: (sources: string[]) => void;
  setProjectContextError: (error: string) => void;
  setTemplateSets: (sets: CallDocTemplateSet[]) => void;
  setCurrent: (record: CallRecord | null) => void;
  setFeedbackMessage: (message: string) => void;
  setPollingError: (message: string | null) => void;
};

export function useCallToPrdData({
  projectPath,
  savedPage,
  deferredSavedQuery,
  setHistory,
  setSavedBundles,
  setSavedTotalCount,
  setSavedTotalPages,
  setSavedPage,
  setProjects,
  setCurrentProjectPath,
  setProjectContextStatus,
  setProjectContextSummary,
  setProjectContextSources,
  setProjectContextError,
  setTemplateSets,
  setCurrent,
  setFeedbackMessage,
  setPollingError,
}: UseCallToPrdDataParams) {
  const { locale } = useLocale();
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuccessRecordRef = useRef<CallRecord | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/call-to-prd/history", {
        headers: { "x-dashboard-locale": locale },
      });
      const data = await res.json();
      setHistory(data.records ?? []);
    } catch {
      /* ignore */
    }
  }, [locale, setHistory]);

  const fetchSaved = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(savedPage),
        pageSize: String(SAVED_PAGE_SIZE),
      });

      if (deferredSavedQuery.trim()) {
        params.set("query", deferredSavedQuery.trim());
      }

      const res = await fetch(`/api/call-to-prd/saved?${params.toString()}`, {
        headers: { "x-dashboard-locale": locale },
      });
      const data: SavedCallBundleListResponse = await res.json();
      setSavedBundles(data.items ?? []);
      setSavedTotalCount(data.totalCount ?? 0);
      setSavedTotalPages(data.totalPages ?? 0);
      if (typeof data.page === "number" && data.page !== savedPage) {
        setSavedPage(data.page);
      }
    } catch {
      /* ignore */
    }
  }, [
    deferredSavedQuery,
    locale,
    savedPage,
    setSavedBundles,
    setSavedPage,
    setSavedTotalCount,
    setSavedTotalPages,
  ]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/call-to-prd/projects", {
        cache: "no-store",
        headers: { "x-dashboard-locale": locale },
      });
      const data: CallToPrdProjectsResponse = await res.json();
      setProjects(data.projects ?? []);
      setCurrentProjectPath(data.currentProjectPath ?? "");
    } catch {
      setProjects([]);
      setCurrentProjectPath("");
    }
  }, [locale, setCurrentProjectPath, setProjects]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const getPollingDelay = useCallback((status: CallStatus) => {
    switch (status) {
      case "uploading":
      case "transcribing":
      case "extracting-pdf":
        return 2_000;
      case "analyzing-pdf":
        return 5_000;
      case "analyzing":
        return 6_000;
      case "merging":
        return 3_000;
      case "generating-docs":
        return 3_000;
      default:
        return 3_000;
    }
  }, []);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    lastSuccessRecordRef.current = null;
    setPollingError(null);

    // A record that vanished server-side (in-memory store cleared by a restart)
    // never comes back, so it is reported differently from a transient failure.
    const missingRecordMessage =
      locale === "en"
        ? "The job record is gone, likely because the app restarted. Generate again with the same input."
        : "앱이 재시작되면서 작업 기록이 사라졌습니다. 같은 입력으로 다시 생성해 주세요.";
    const pollErrorMessage =
      locale === "en"
        ? "Could not reach the server, so progress updates stopped. Refresh to check whether the job finished."
        : "서버와 통신이 끊겨 진행 상태 갱신이 중단되었습니다. 새로고침해 작업이 끝났는지 확인해 주세요.";

    let consecutiveFailures = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/call-to-prd/status/${id}`, {
          headers: { "x-dashboard-locale": locale },
        });

        if (!res.ok) {
          throw new PollError(`Status fetch failed: ${res.status}`, res.status === 404);
        }

        const record: CallRecord = await res.json();
        consecutiveFailures = 0;
        lastSuccessRecordRef.current = record;
        setCurrent(record);

        if (record.status === "completed" || record.status === "failed") {
          stopPolling();
          void fetchHistory();
          void fetchSaved();
          return;
        }

        pollingRef.current = setTimeout(poll, getPollingDelay(record.status));
      } catch (err) {
        const recordMissing = err instanceof PollError && err.recordMissing;
        consecutiveFailures += 1;

        // A transient blip must not mark a job that is still running as failed.
        // A missing record is terminal, so it skips the retries.
        if (!recordMissing && consecutiveFailures < POLL_MAX_FAILURES) {
          pollingRef.current = setTimeout(poll, POLL_RETRY_DELAY_MS);
          return;
        }

        stopPolling();
        const message = recordMissing ? missingRecordMessage : pollErrorMessage;

        if (lastSuccessRecordRef.current) {
          setCurrent({
            ...lastSuccessRecordRef.current,
            status: "failed",
            error: message,
          });
        } else {
          // No record was ever received, so the viewer has nothing to fall back to.
          // setPollingError persists; setFeedbackMessage covers the intake sub-tab.
          setPollingError(message);
          setFeedbackMessage(message);
          void fetchHistory();
        }
      }
    };

    void poll();
  }, [fetchHistory, fetchSaved, getPollingDelay, locale, setCurrent, setFeedbackMessage, setPollingError, stopPolling]);

  useEffect(() => {
    void fetchHistory();
    void fetchSaved();
    void fetchProjects();
    setTemplateSets(readCallDocTemplateSets());
  }, [fetchHistory, fetchProjects, fetchSaved, setTemplateSets]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjectContext() {
      const normalizedPath = projectPath.trim();
      if (!normalizedPath) {
        if (!cancelled) {
          setProjectContextStatus("idle");
          setProjectContextSummary("");
          setProjectContextSources([]);
          setProjectContextError("");
        }
        return;
      }

      if (!cancelled) {
        setProjectContextStatus("loading");
        setProjectContextSummary("");
        setProjectContextSources([]);
        setProjectContextError("");
      }

      try {
        const params = new URLSearchParams({ projectPath: normalizedPath });
        const response = await fetch(`/api/call-to-prd/project-context?${params.toString()}`, {
          cache: "no-store",
          headers: { "x-dashboard-locale": locale },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          if (!cancelled) {
            setProjectContextStatus("failed");
            setProjectContextSummary("");
            setProjectContextSources([]);
            setProjectContextError(errorData?.error?.message ?? "");
          }
          return;
        }

        const payload: CallProjectContextResponse = await response.json();
        if (cancelled) {
          return;
        }

        if (payload.status === "ready" && payload.summary) {
          setProjectContextStatus("ready");
          setProjectContextSummary(payload.summary);
          setProjectContextSources(payload.sources ?? []);
          setProjectContextError("");
          return;
        }

        setProjectContextStatus("failed");
        setProjectContextSummary("");
        setProjectContextSources(payload.sources ?? []);
        setProjectContextError(payload.error ?? "");
      } catch {
        if (!cancelled) {
          setProjectContextStatus("failed");
          setProjectContextSummary("");
          setProjectContextSources([]);
          setProjectContextError("");
        }
      }
    }

    void fetchProjectContext();

    return () => {
      cancelled = true;
    };
  }, [
    locale,
    projectPath,
    setProjectContextError,
    setProjectContextSources,
    setProjectContextStatus,
    setProjectContextSummary,
  ]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    fetchHistory,
    fetchSaved,
    fetchProjects,
    startPolling,
    stopPolling,
  };
}
