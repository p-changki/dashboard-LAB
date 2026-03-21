"use client";

import { useEffect, useState } from "react";

import type { PortUsageResponse } from "@/lib/types";

export function PortUsage() {
  const [data, setData] = useState<PortUsageResponse>({ ports: [], totalPorts: 0 });

  useEffect(() => {
    void loadPorts(setData);
  }, []);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-gray-100">Port Usage</p>
        <button
          type="button"
          onClick={() => void loadPorts(setData)}
          className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800"
        >
          새로고침
        </button>
      </div>
      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="pb-2">포트</th>
              <th className="pb-2">PID</th>
              <th className="pb-2">프로세스</th>
              <th className="pb-2">추정 프로젝트</th>
            </tr>
          </thead>
          <tbody>
            {data.ports.map((entry) => (
              <tr key={`${entry.port}-${entry.pid}`} className="border-t border-gray-800 text-gray-300">
                <td className="py-3">{entry.port}</td>
                <td className="py-3">{entry.pid}</td>
                <td className="py-3">{entry.processName}</td>
                <td className="py-3">{entry.project ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function loadPorts(setData: (value: PortUsageResponse) => void) {
  const response = await fetch("/api/projects/ports", { cache: "no-store" });

  if (!response.ok) {
    setData({ ports: [], totalPorts: 0 });
    return;
  }

  setData((await response.json()) as PortUsageResponse);
}
