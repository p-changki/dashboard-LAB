"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DevPorts } from "@/features/system/components/DevPorts";
import { SystemOverview } from "@/features/system/components/SystemOverview";
import type {
  FileAction,
  FileActionResponse,
  FileManagerResponse,
  InstalledApp,
  ProcessCategory,
  ProcessResponse,
  SystemInfo,
} from "@/lib/types";

const AppLauncher = dynamic(
  () => import("@/features/system/components/AppLauncher").then((module) => module.AppLauncher),
  {
    ssr: false,
    loading: () => <TabContentMessage message="앱 목록을 불러오는 중입니다." />,
  },
);

const FileActions = dynamic(
  () => import("@/features/system/components/FileActions").then((module) => module.FileActions),
  {
    ssr: false,
    loading: () => <TabContentMessage message="정리 액션을 불러오는 중입니다." />,
  },
);

const FileActionResultPanel = dynamic(
  () => import("@/features/system/components/FileActions").then((module) => module.FileActionResultPanel),
  {
    ssr: false,
  },
);

const ProcessTable = dynamic(
  () => import("@/features/system/components/ProcessTable").then((module) => module.ProcessTable),
  {
    ssr: false,
    loading: () => <TabContentMessage message="프로세스 테이블을 불러오는 중입니다." />,
  },
);

const SUB_TABS = [
  { id: "overview", label: "Overview" },
  { id: "files", label: "File Actions" },
  { id: "processes", label: "Processes" },
  { id: "apps", label: "App Launcher" },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export function SystemTab() {
  const [active, setActive] = useState<SubTabId>("overview");
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [processes, setProcesses] = useState<ProcessResponse | null>(null);
  const [apps, setApps] = useState<{ apps: InstalledApp[] } | null>(null);
  const [appsLoading, setAppsLoading] = useState(false);
  const [fileManager, setFileManager] = useState<FileManagerResponse | null>(null);
  const [fileManagerLoading, setFileManagerLoading] = useState(false);
  const [result, setResult] = useState<FileActionResponse | null>(null);
  const [processFilter, setProcessFilter] = useState<ProcessCategory | "all">("all");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    const [infoResponse, processesResponse] = await Promise.all([
      fetch("/api/system/info", { cache: "no-store" }),
      fetch("/api/system/processes", { cache: "no-store" }),
    ]);

    const [nextInfo, nextProcesses] = await Promise.all([
      infoResponse.json() as Promise<SystemInfo>,
      processesResponse.json() as Promise<ProcessResponse>,
    ]);

    setInfo(nextInfo);
    setProcesses(nextProcesses);
    setLastUpdatedAt(new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }));
  }, []);

  const loadApps = useCallback(async () => {
    setAppsLoading(true);

    try {
      const response = await fetch("/api/system/apps", { cache: "no-store" });
      setApps((await response.json()) as { apps: InstalledApp[] });
    } finally {
      setAppsLoading(false);
    }
  }, []);

  const loadFileManager = useCallback(async () => {
    setFileManagerLoading(true);

    try {
      const response = await fetch("/api/file-manager", { cache: "no-store" });
      setFileManager((await response.json()) as FileManagerResponse);
    } finally {
      setFileManagerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active !== "overview" && active !== "processes") {
      return;
    }

    void loadOverview();
  }, [active, loadOverview]);

  useEffect(() => {
    if (active !== "overview" && active !== "processes") {
      return;
    }

    const interval = window.setInterval(() => {
      void loadOverview();
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [active, loadOverview]);

  useEffect(() => {
    if (active !== "files" || fileManager || fileManagerLoading) {
      return;
    }

    void loadFileManager();
  }, [active, fileManager, fileManagerLoading, loadFileManager]);

  useEffect(() => {
    if (active !== "apps" || apps || appsLoading) {
      return;
    }

    void loadApps();
  }, [active, apps, appsLoading, loadApps]);

  const actions = useMemo(() => {
    const suggestions = [
      ...(fileManager?.downloads.suggestions ?? []),
      ...(fileManager?.desktop.suggestions ?? []),
    ].slice(0, 10);

    return suggestions.map((suggestion) => ({
      type: suggestion.action === "delete" ? "delete" : "move",
      sourcePath: suggestion.file.path,
      destinationPath:
        suggestion.action === "move" && suggestion.destination
          ? suggestion.command.match(/&& mv '.*' '([^']+)'$/)?.[1] ?? null
          : null,
      command: suggestion.command,
    })) as FileAction[];
  }, [fileManager]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={[
              "rounded-full px-3 py-2 text-sm transition",
              active === tab.id ? "bg-blue-900/40 text-blue-300" : "bg-gray-800 text-text-muted",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "overview" ? (
        <div className="space-y-4">
          <SystemOverview data={info} lastUpdatedAt={lastUpdatedAt} />
          <DevPorts ports={processes?.devPorts ?? []} />
        </div>
      ) : null}

      {active === "files" ? (
        <div>
          {fileManagerLoading && !fileManager ? <TabContentMessage message="파일 액션을 계산하는 중입니다." /> : null}
          {fileManager ? (
            <>
              <FileActions actions={actions} />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void executeFileActions(actions, true, setResult)}
                  className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-text-secondary hover:bg-gray-800"
                >
                  미리보기
                </button>
                <button
                  type="button"
                  onClick={() => void executeFileActions(actions, false, setResult)}
                  className="rounded-xl border border-gray-800 bg-blue-900/40 px-3 py-2 text-sm text-blue-300 hover:bg-blue-900/60"
                >
                  실행
                </button>
              </div>
              <FileActionResultPanel result={result} />
            </>
          ) : null}
        </div>
      ) : null}

      {active === "processes" ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["all", "dev-tool", "ai-cli", "browser", "editor", "app"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setProcessFilter(item)}
                className={[
                  "rounded-full px-3 py-2 text-xs transition",
                  processFilter === item ? "bg-blue-900/40 text-blue-300" : "bg-gray-800 text-text-muted",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
          <ProcessTable
            data={processes}
            filter={processFilter}
            onKill={(pid) => void killProcess(pid, setProcesses)}
          />
        </div>
      ) : null}

      {active === "apps" ? (
        apps ? (
          <AppLauncher
            apps={apps.apps}
            onLaunch={(appPath) => void launchApp(appPath)}
          />
        ) : (
          <TabContentMessage message="앱 목록을 준비하는 중입니다." />
        )
      ) : null}
    </div>
  );
}

async function executeFileActions(
  actions: FileAction[],
  dryRun: boolean,
  setResult: (value: FileActionResponse | null) => void,
) {
  const response = await fetch("/api/file-manager/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions, dryRun }),
  });

  if (!response.ok) {
    setResult(null);
    return;
  }

  setResult((await response.json()) as FileActionResponse);
}

async function killProcess(
  pid: number,
  setProcesses: (value: ProcessResponse) => void,
) {
  await fetch("/api/system/processes/kill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pid, signal: "SIGTERM" }),
  });

  const refreshed = await fetch("/api/system/processes", { cache: "no-store" });
  setProcesses((await refreshed.json()) as ProcessResponse);
}

async function launchApp(appPath: string) {
  await fetch("/api/system/apps/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appPath }),
  });
}

function TabContentMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5 text-sm text-text-muted">
      {message}
    </div>
  );
}
