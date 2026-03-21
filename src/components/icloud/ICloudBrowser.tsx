"use client";

import { useEffect, useState } from "react";

import { FileTypeIcon } from "@/components/common/FileTypeIcon";
import type { ICloudBrowseResponse } from "@/lib/types";

export function ICloudBrowser() {
  const [data, setData] = useState<ICloudBrowseResponse | null>(null);

  useEffect(() => {
    void loadICloud("", setData);
  }, []);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-gray-100">iCloud Browser</p>
      <div className="mt-4 space-y-2">
        {data?.entries.map((entry) => (
          <button
            key={entry.path}
            type="button"
            onClick={() =>
              entry.type === "folder"
                ? void loadICloud(entry.path.replace(`${data.rootPath}/`, ""), setData)
                : undefined
            }
            className={[
              "flex w-full items-center justify-between rounded-xl border border-gray-800 px-3 py-3 text-left",
              entry.isDownloaded ? "bg-gray-900/70 text-gray-200" : "bg-gray-900/40 text-gray-500",
            ].join(" ")}
          >
            <span className="flex items-center gap-3">
              {entry.type === "folder" ? (
                <span className="text-sm text-gray-400">📁</span>
              ) : (
                <FileTypeIcon extension={entry.name.split(".").pop() ?? "txt"} />
              )}
              {entry.name}
            </span>
            {!entry.isDownloaded ? (
              <span className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs text-blue-300">
                iCloud
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

async function loadICloud(relativePath: string, setData: (value: ICloudBrowseResponse) => void) {
  const response = await fetch(`/api/icloud?path=${encodeURIComponent(relativePath)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    setData({ rootPath: "", currentPath: "", entries: [] });
    return;
  }

  setData((await response.json()) as ICloudBrowseResponse);
}
