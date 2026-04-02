"use client";

import type { ProcessCategory, ProcessResponse } from "@/lib/types";

interface ProcessTableProps {
  data: ProcessResponse | null;
  filter: ProcessCategory | "all";
  onKill: (pid: number) => void;
}

export function ProcessTable({ data, filter, onKill }: ProcessTableProps) {
  const processes = (data?.processes ?? []).filter((process) =>
    filter === "all" ? true : process.category === filter,
  );

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-text-primary">Processes</p>
      <div className="mt-4 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-text-muted">
            <tr>
              <th className="pb-2">PID</th>
              <th className="pb-2">Name</th>
              <th className="pb-2">CPU</th>
              <th className="pb-2">Memory</th>
              <th className="pb-2">Category</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {processes.map((process) => (
              <tr key={process.pid} className="border-t border-gray-800 text-text-secondary">
                <td className="py-3">{process.pid}</td>
                <td className="py-3">{process.name}</td>
                <td className="py-3">{process.cpu}%</td>
                <td className="py-3">{process.memory}MB</td>
                <td className="py-3">{process.category}</td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onKill(process.pid)}
                    disabled={process.category === "system"}
                    className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-text-secondary hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-text-disabled"
                  >
                    kill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
