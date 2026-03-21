import type { McpServer } from "@/lib/types";

interface McpPanelProps {
  servers: McpServer[];
}

export function McpPanel({ servers }: McpPanelProps) {
  if (servers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-6 text-center text-sm text-gray-500">
        MCP 서버가 없습니다
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {servers.map((server) => (
        <article key={server.name} className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-white/[.14] hover:bg-[#242424]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-[#f0f0f0]">{server.name}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {server.transport}
              </p>
            </div>
            <code className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-cyan-100">
              {server.command}
            </code>
          </div>
          {server.url ? (
            <p className="mt-4 break-all text-sm leading-6 text-[var(--color-text-soft)]">
              {server.url}
            </p>
          ) : null}
          {server.args.length > 0 ? (
            <p className="mt-4 break-all text-sm leading-6 text-[var(--color-text-soft)]">
              args: {server.args.join(" ")}
            </p>
          ) : null}
          {server.envKeys.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {server.envKeys.map((envKey) => (
                <span
                  key={`${server.name}-${envKey}`}
                  className="rounded-full border border-amber-300/18 bg-amber-300/8 px-3 py-1 text-xs text-amber-50"
                >
                  {envKey}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
