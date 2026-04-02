"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { PinButton } from "@/components/ui/PinButton";
import { getHomeCopy } from "@/features/home/copy";
import { HomeEmptyCard } from "@/features/home/components/HomeEmptyCard";
import type { Team } from "@/lib/types";

interface TeamGridProps {
  teams: Team[];
}

export function TeamGrid({ teams }: TeamGridProps) {
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);

  if (teams.length === 0) {
    return <HomeEmptyCard message={copy.noTeams} />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {teams.map((team) => (
        <article key={team.name} className="rounded-2xl border border-border-base bg-bg-card p-5 transition-all duration-[150ms] hover:-translate-y-0.5 hover:border-border-hover hover:bg-bg-card-hover">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary">{team.name}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {team.purpose}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{copy.memberCount(team.memberCount)}</Badge>
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
              <Badge
                key={`${team.name}-${member.role}-${member.model}`}
                variant="claude"
              >
                {member.role} · {member.model}
              </Badge>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
