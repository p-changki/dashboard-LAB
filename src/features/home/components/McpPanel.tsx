"use client";

import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getHomeCopy } from "@/features/home/copy";
import { HomeEmptyCard } from "@/features/home/components/HomeEmptyCard";
import type { McpServer } from "@/lib/types";

interface McpPanelProps {
  servers: McpServer[];
}

export function McpPanel({ servers }: McpPanelProps) {
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);

  if (servers.length === 0) {
    return <HomeEmptyCard message={copy.noMcp} />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {servers.map((server) => (
        <article key={server.name} className="rounded-2xl border border-border-base bg-bg-card p-5 transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-border-hover hover:bg-bg-card-hover">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary">{server.name}</h3>
              <p className="mt-2 text-sm text-text-muted">
                {server.transport}
              </p>
            </div>
            <code className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-cyan-100">
              {server.command}
            </code>
          </div>
          {server.url ? (
            <p className="mt-4 break-all text-sm leading-6 text-text-secondary">
              {server.url}
            </p>
          ) : null}
          {server.args.length > 0 ? (
            <p className="mt-4 break-all text-sm leading-6 text-text-secondary">
              args: {server.args.join(" ")}
            </p>
          ) : null}
          {server.envKeys.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {server.envKeys.map((envKey) => (
                <Badge key={`${server.name}-${envKey}`} variant="warning" size="sm">{envKey}</Badge>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
