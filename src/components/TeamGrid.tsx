import { PinButton } from "@/components/PinButton";
import type { Team } from "@/lib/types";

interface TeamGridProps {
  teams: Team[];
}

export function TeamGrid({ teams }: TeamGridProps) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-transparent p-6 text-center text-sm text-gray-500">
        팀이 없습니다
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {teams.map((team) => (
        <article key={team.name} className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-white/[.14] hover:bg-[#242424]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-[#f0f0f0]">{team.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">
                {team.purpose}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-medium text-white/80">
                {team.memberCount}명
              </span>
              <PinButton
                item={{
                  id: `team:${team.name}`,
                  type: "team",
                  name: team.name,
                  tab: "home",
                  action: team.command,
                  actionMode: "copy",
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {team.members.map((member) => (
              <span
                key={`${team.name}-${member.role}-${member.model}`}
                className="rounded-full border border-purple-500/20 bg-purple-900/30 px-3 py-1 text-xs text-purple-300"
              >
                {member.role} · {member.model}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
