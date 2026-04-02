import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { getHomeCopy } from "@/features/home/copy";
import type { ToolInfo } from "@/lib/types";

interface ToolCardProps {
  tool: ToolInfo;
  accent: string;
}

export function ToolCard({ tool, accent }: ToolCardProps) {
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);
  const isConnected = tool.exists && tool.version !== "unknown";

  return (
    <article className="rounded-2xl border border-border-base bg-bg-card p-5 shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-border-hover hover:bg-bg-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-disabled">
            {tool.name}
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-text-primary">
            {tool.version}
          </p>
          <Badge
            variant={isConnected ? "success" : "warning"}
            className="mt-3"
          >
            {isConnected ? copy.tool.connected : copy.tool.unavailable}
          </Badge>
        </div>
        <span
          className="h-3 w-3 rounded-full shadow-lg"
          style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}40` }}
          aria-hidden
        />
      </div>
      <div className="mt-5 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
          {copy.tool.configPath}
        </p>
        {tool.configPath ? (
          <p className="break-all font-mono text-xs leading-6 text-text-muted">
            {tool.configPath}
          </p>
        ) : (
          <p className="text-sm leading-6 text-text-secondary">{copy.tool.unavailableHint}</p>
        )}
      </div>
    </article>
  );
}
