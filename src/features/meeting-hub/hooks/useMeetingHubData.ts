"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { deriveMeetingHubOverview } from "@/lib/meeting-hub/overview";
import type {
  MeetingHubGithubOverviewResponse,
  MeetingHubOverviewResponse,
  MeetingHubSummaryResponse,
  MeetingHubTeam,
} from "@/lib/types";

import type { MeetingHubView } from "../copy";
import { getLinkedRepositories } from "../utils";

type UseMeetingHubDataParams = {
  loadErrorMessage: string;
  view: MeetingHubView;
  hydrateMeetingDefaults: (teams: MeetingHubTeam[]) => void;
};

export function useMeetingHubData({
  loadErrorMessage,
  view,
  hydrateMeetingDefaults,
}: UseMeetingHubDataParams) {
  const [overview, setOverview] = useState<MeetingHubOverviewResponse | null>(null);
  const [summary, setSummary] = useState<MeetingHubSummaryResponse | null>(null);
  const [githubOverview, setGithubOverview] =
    useState<MeetingHubGithubOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyOverview = useCallback(
    (payload: MeetingHubOverviewResponse) => {
      setOverview(payload);
      hydrateMeetingDefaults(payload.teams);
    },
    [hydrateMeetingDefaults],
  );

  const applySummary = useCallback(
    (payload: MeetingHubSummaryResponse) => {
      setSummary(payload);
      setOverview(deriveMeetingHubOverview(payload));
      hydrateMeetingDefaults(payload.teams);
    },
    [hydrateMeetingDefaults],
  );

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meeting-hub/overview", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("__meeting_hub_load_failed__");
      }

      const payload = (await response.json()) as MeetingHubOverviewResponse;
      applyOverview(payload);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "__meeting_hub_load_failed__",
      );
    } finally {
      setLoading(false);
    }
  }, [applyOverview]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/meeting-hub/summary", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("__meeting_hub_load_failed__");
      }

      const payload = (await response.json()) as MeetingHubSummaryResponse;
      applySummary(payload);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "__meeting_hub_load_failed__",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [applySummary]);

  const linkedRepositories = useMemo(
    () => getLinkedRepositories(overview, summary),
    [overview, summary],
  );

  const loadGithubOverview = useCallback(async () => {
    if (linkedRepositories.length === 0) {
      setGithubOverview(null);
      return;
    }

    setGithubLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        repos: linkedRepositories.join(","),
      });
      const response = await fetch(`/api/meeting-hub/github/overview?${params.toString()}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as
        | MeetingHubGithubOverviewResponse
        | { error?: { message?: string } };

      if (!response.ok || !("repos" in result)) {
        throw new Error(
          "error" in result ? result.error?.message ?? loadErrorMessage : loadErrorMessage,
        );
      }

      setGithubOverview(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : loadErrorMessage);
    } finally {
      setGithubLoading(false);
    }
  }, [linkedRepositories, loadErrorMessage]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (view === "meetings" || view === "actions") {
      if (!summary && !summaryLoading) {
        void loadSummary();
      }
    }
  }, [loadSummary, summary, summaryLoading, view]);

  useEffect(() => {
    if (linkedRepositories.length === 0) {
      setGithubOverview(null);
      return;
    }

    if (view !== "github") {
      return;
    }

    void loadGithubOverview();
  }, [linkedRepositories, loadGithubOverview, view]);

  const displayLoadError =
    error === "__meeting_hub_load_failed__" ? loadErrorMessage : error;

  return {
    overview,
    summary,
    githubOverview,
    loading,
    summaryLoading,
    githubLoading,
    error,
    displayLoadError,
    setError,
    setOverview,
    setSummary,
    loadOverview,
    loadSummary,
    loadGithubOverview,
    applyOverview,
    applySummary,
    linkedRepositories,
  };
}
