import type { ToolInfo } from "@/lib/types";

interface ToolCardProps {
  tool: ToolInfo;
  accent: string;
}

export function ToolCard({ tool, accent }: ToolCardProps) {
  return (
    <article className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-white/[.14] hover:bg-[#242424]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            {tool.name}
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-[#f0f0f0]">
            {tool.version}
          </p>
        </div>
        <span
          className="h-3 w-3 rounded-full shadow-lg"
          style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}40` }}
          aria-hidden
        />
      </div>
      <p className="mt-5 break-all font-mono text-xs leading-6 text-gray-400">
        {tool.configPath}
      </p>
    </article>
  );
}
