import { PinButton } from "@/components/PinButton";
import type { Agent } from "@/lib/types";

interface AgentGridProps {
  agents: Agent[];
}

export function AgentGrid({ agents }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-6 text-center text-sm text-gray-500">
        에이전트가 없습니다
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <article key={agent.name} className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-white/[.14] hover:bg-[#242424]">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium text-[#f0f0f0]">{agent.name}</h3>
            <div className="flex items-center gap-2">
              {agent.model ? (
                <span className="rounded-full border border-white/12 bg-white/6 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
                  {agent.model}
                </span>
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
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">
            {agent.description}
          </p>
        </article>
      ))}
    </div>
  );
}
