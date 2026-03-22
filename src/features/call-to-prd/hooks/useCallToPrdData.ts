"use client";

import { useCallback, useEffect, useRef } from "react";

import { readCallDocTemplateSets } from "@/lib/call-to-prd/template-sets";
import type { ProjectSummary } from "@/lib/types";
import type {
  CallRecord,
  CallStatus,
  CallDocTemplateSet,
  SavedCallBundleListResponse,
  SavedCallBundleIndexItem,
} from "@/lib/types/call-to-prd";

import type { CallToPrdProjectsResponse } from "../state";
import { SAVED_PAGE_SIZE } from "../state";

type UseCallToPrdDataParams = {
  savedPage: number;
  deferredSavedQuery: string;
  setHistory: (records: CallRecord[]) => void;
  setSavedBundles: (items: SavedCallBundleIndexItem[]) => void;
  setSavedTotalCount: (count: number) => void;
  setSavedTotalPages: (count: number) => void;
  setSavedPage: (page: number) => void;
  setProjects: (projects: ProjectSummary[]) => void;
  setCurrentProjectPath: (path: string) => void;
  setTemplateSets: (sets: CallDocTemplateSet[]) => void;
  setCurrent: (record: CallRecord | null) => void;
};

export function useCallToPrdData({
  savedPage,
  deferredSavedQuery,
  setHistory,
  setSavedBundles,
  setSavedTotalCount,
  setSavedTotalPages,
  setSavedPage,
  setProjects,
  setCurrentProjectPath,
  setTemplateSets,
  setCurrent,
}: UseCallToPrdDataParams) {
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/call-to-prd/history");
      const data = await res.json();
      setHistory(data.records ?? []);
    } catch {
      /* ignore */
    }
  }, [setHistory]);

  const fetchSaved = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(savedPage),
        pageSize: String(SAVED_PAGE_SIZE),
      });

      if (deferredSavedQuery.trim()) {
        params.set("query", deferredSavedQuery.trim());
      }

      const res = await fetch(`/api/call-to-prd/saved?${params.toString()}`);
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
    savedPage,
    setSavedBundles,
    setSavedPage,
    setSavedTotalCount,
    setSavedTotalPages,
  ]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/call-to-prd/projects", { cache: "no-store" });
      const data: CallToPrdProjectsResponse = await res.json();
      setProjects(data.projects ?? []);
      setCurrentProjectPath(data.currentProjectPath ?? "");
    } catch {
      setProjects([]);
      setCurrentProjectPath("");
    }
  }, [setCurrentProjectPath, setProjects]);

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

    const poll = async () => {
      const res = await fetch(`/api/call-to-prd/status/${id}`);
      const record: CallRecord = await res.json();
      setCurrent(record);

      if (record.status === "completed" || record.status === "failed") {
        stopPolling();
        fetchHistory();
        fetchSaved();
        return;
      }

      pollingRef.current = setTimeout(poll, getPollingDelay(record.status));
    };

    void poll();
  }, [fetchHistory, fetchSaved, getPollingDelay, setCurrent, stopPolling]);

  useEffect(() => {
    void fetchHistory();
    void fetchSaved();
    void fetchProjects();
    setTemplateSets(readCallDocTemplateSets());
  }, [fetchHistory, fetchProjects, fetchSaved, setTemplateSets]);

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
