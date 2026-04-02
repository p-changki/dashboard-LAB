import type { PortEntry } from "@/lib/types";

interface DevPortsProps {
  ports: PortEntry[];
}

export function DevPorts({ ports }: DevPortsProps) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-text-primary">Dev Ports</p>
      <div className="mt-4 space-y-2 text-sm text-text-secondary">
        {ports.map((port) => (
          <div key={`${port.port}-${port.pid}`} className="rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-3">
            :{port.port} → {port.processName} ({port.project ?? "미상"})
          </div>
        ))}
      </div>
    </section>
  );
}
