"use client";

import { useEffect, useState } from "react";

import type { EnvMapResponse } from "@/lib/types";

export function EnvMap() {
  const [data, setData] = useState<EnvMapResponse>({ files: [], sharedKeys: [] });

  useEffect(() => {
    void fetch("/api/projects/env-map", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: EnvMapResponse) => setData(payload))
      .catch(() => setData({ files: [], sharedKeys: [] }));
  }, []);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-gray-100">Env Map</p>
      <div className="mt-4 space-y-3">
        {data.files.map((file) => (
          <article key={file.filePath} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white">{file.projectName}</p>
                <p className="mt-1 text-xs text-gray-500">{file.fileName}</p>
              </div>
              <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs text-gray-400">
                {file.keys.length}개 키
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {file.keys.map((key, index) => (
                <span
                  key={`${file.filePath}-${key}-${index}`}
                  className={[
                    "rounded-full px-2.5 py-1 text-xs",
                    data.sharedKeys.includes(key)
                      ? "bg-yellow-900/30 text-yellow-300"
                      : "bg-gray-800 text-gray-300",
                  ].join(" ")}
                >
                  {key}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
