"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { PinButton } from "@/components/ui/PinButton";
import { getHomeCopy } from "@/features/home/copy";
import { HomeEmptyCard } from "@/features/home/components/HomeEmptyCard";
import type { Agent } from "@/lib/types";

interface AgentGridProps {
  agents: Agent[];
}

export function AgentGrid({ agents }: AgentGridProps) {
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);

  if (agents.length === 0) {
    return <HomeEmptyCard message={copy.noAgents} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <article key={agent.name} className="rounded-2xl border border-border-base bg-bg-card p-5 transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-border-hover hover:bg-bg-card-hover">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium text-text-primary">{agent.name}</h3>
            <div className="flex items-center gap-2">
              {agent.model ? (
                <Badge variant="neutral" size="sm" className="uppercase tracking-[0.18em]">
                  {agent.model}
                </Badge>
              ) : null}
              <PinButton
                item={{
                  id: `agent:${agent.name}`,
                  type: "agent",
                  name: agent.name,
                  tab: "home",
                  action: agent.name,
                  actionMode: "navigate",
                }}
              />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {agent.description}
          </p>
        </article>
      ))}
    </div>
  );
}
