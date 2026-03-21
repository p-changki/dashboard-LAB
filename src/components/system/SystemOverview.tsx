import type { SystemInfo } from "@/lib/types";

interface SystemOverviewProps {
  data: SystemInfo | null;
  lastUpdatedAt?: string | null;
}

export function SystemOverview({ data, lastUpdatedAt = null }: SystemOverviewProps) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold text-gray-100">System Overview</p>
        <p className="text-xs text-gray-500">
          약 15초마다 갱신
          {lastUpdatedAt ? ` · 최근 갱신 ${lastUpdatedAt}` : ""}
        </p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Gauge title="CPU" value={data?.cpu.usage ?? 0} meta={data?.cpu.model ?? "-"} />
        <Gauge title="Memory" value={data?.memory.percent ?? 0} meta={`${data?.memory.used ?? "-"} / ${data?.memory.total ?? "-"}`} />
        <Gauge title="Disk" value={data?.disk.percent ?? 0} meta={`${data?.disk.used ?? "-"} / ${data?.disk.total ?? "-"}`} />
      </div>
      <div className="mt-4 space-y-1 text-sm text-gray-400">
        <p>OS: {data?.os ?? "-"}</p>
        <p>Uptime: {data?.uptime ?? "-"}</p>
        <p>IP: {data?.network.localIP ?? "-"}</p>
      </div>
    </section>
  );
}

function Gauge({ title, value, meta }: { title: string; value: number; meta: string }) {
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{meta}</p>
      <div className="mt-3 h-2 rounded-full bg-gray-800">
        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-gray-500">{value}%</p>
    </article>
  );
}
