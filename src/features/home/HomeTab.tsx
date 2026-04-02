"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { AgentGrid } from "@/features/home/components/AgentGrid";
import { CommandPalette } from "@/features/home/components/CommandPalette";
import { HomeEmptyCard } from "@/features/home/components/HomeEmptyCard";
import { McpPanel } from "@/features/home/components/McpPanel";
import { PinnedBar } from "@/features/home/components/PinnedBar";
import { SkillList } from "@/features/home/components/SkillList";
import { TeamGrid } from "@/features/home/components/TeamGrid";
import { ToolCard } from "@/features/home/components/ToolCard";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { formatHomeTime, formatTodayWorkSummary, getHomeCopy } from "@/features/home/copy";
import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import { CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import type { OverviewResponse } from "@/lib/types";

const HOME_SECTION_KEY = CLIENT_STORAGE_KEYS.homeSections;

interface HomeTabProps {
  data: OverviewResponse | null;
  loading?: boolean;
  error?: string | null;
  mode?: DashboardNavigationMode;
}

const ADVANCED_HOME_SECTIONS = new Set(["agents", "teams", "commands", "mcp", "summary"]);

export function HomeTab({
  data,
  loading = false,
  error = null,
  mode = "advanced",
}: HomeTabProps) {
  const { locale } = useLocale();
  const copy = getHomeCopy(locale);
  const safeData = data ?? createEmptyOverviewData();
  const [openSections, setOpenSections] = useState<string[]>(defaultHomeSections(mode));
  const combinedClaudeItems = [...safeData.skills, ...safeData.commands];
  const readyToolCount = Object.values(safeData.tools).filter(
    (tool) => tool.exists && tool.version !== "unknown",
  ).length;
  const totalSkillCount =
    combinedClaudeItems.length + safeData.codex.skills.length + safeData.codex.promptSkills.length;
  const quickCommands = [
    ...safeData.commands.slice(0, 4).map((command) => ({
      label: command.name,
      value: command.command,
      description: command.description,
    })),
    {
      label: copy.quickCommand.label,
      value: 'codex exec -o /tmp/codex-output.txt "..."',
      description: copy.quickCommand.description,
    },
  ];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOME_SECTION_KEY);
      setOpenSections(raw ? (JSON.parse(raw) as string[]) : defaultHomeSections(mode));
    } catch {
      setOpenSections(defaultHomeSections(mode));
    }
  }, [mode]);

  const isAdvancedMode = mode === "advanced";
  const quickStartTracks = isAdvancedMode ? copy.advancedTracks : copy.coreTracks;

  return (
    <div className="flex flex-col gap-8">
      <PinnedBar />
      {loading || error ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
            {copy.pulse.eyebrow}
          </div>
          <p className="mt-4 text-base font-semibold text-white">
            {loading ? copy.loadingOverview : copy.failedOverview}
          </p>
          {error ? <p className="mt-2 text-sm leading-6 text-text-secondary">{error}</p> : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(180deg,_rgba(18,18,18,0.94),_rgba(12,12,12,0.98))] p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{copy.pulse.eyebrow}</p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{copy.pulse.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
              {copy.pulse.description(
                readyToolCount,
                Object.keys(safeData.tools).length,
                safeData.todayWork.length,
                totalSkillCount,
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <PulseBadge>{copy.pulse.readyTools(readyToolCount, Object.keys(safeData.tools).length)}</PulseBadge>
              <PulseBadge>{copy.pulse.todayWork(safeData.todayWork.length)}</PulseBadge>
              <PulseBadge>{copy.pulse.skills(totalSkillCount)}</PulseBadge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <PulseMetric
              label={copy.pulse.modeTitle}
              value={isAdvancedMode ? copy.pulse.advancedMode : copy.pulse.coreMode}
              description={isAdvancedMode ? copy.pulse.advancedHint : copy.pulse.coreHint}
            />
            <PulseMetric
              label={copy.todayWorkPanelTitle}
              value={copy.todayWorkCount(safeData.todayWork.length)}
              description={copy.todayWorkPanelDescription}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard label={copy.stats.agents} value={safeData.stats.totalAgents} accent="purple" />
        <StatCard label={copy.stats.teams} value={safeData.stats.totalTeams} accent="purple" />
        <StatCard label={copy.stats.claudeSkills} value={safeData.stats.totalSkills} accent="purple" />
        <StatCard label={copy.stats.codexSkills} value={safeData.stats.totalCodexSkills} accent="emerald" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ToolCard tool={safeData.tools.claude} accent="var(--color-accent-claude)" />
        <ToolCard tool={safeData.tools.codex} accent="var(--color-accent-codex)" />
        <ToolCard tool={safeData.tools.gemini} accent="var(--color-accent-gemini)" />
      </section>

      <section className="rounded-3xl border border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.1),_transparent_42%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Workspace Flow</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{copy.flowTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
          {copy.flowDescription}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {quickStartTracks.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/70">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-text-secondary">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {!isAdvancedMode ? (
        <section className="rounded-2xl border border-cyan-400/15 bg-cyan-950/10 px-4 py-4 text-sm text-cyan-100">
          {copy.coreModeMessage}
        </section>
      ) : null}

      <HomeSection
        id="today-work"
        eyebrow="Today"
        title={copy.todayWorkTitle}
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{copy.todayWorkPanelTitle}</p>
              <p className="mt-1 text-xs text-text-muted">
                {copy.todayWorkPanelDescription}
              </p>
            </div>
            <Badge variant="neutral">{copy.todayWorkCount(safeData.todayWork.length)}</Badge>
          </div>

          {safeData.todayWork.length > 0 ? (
            <div className="mt-4 space-y-3">
              {safeData.todayWork.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={todayWorkSourceVariant(item.source)} size="sm">
                          {item.badge}
                        </Badge>
                        <Badge variant={todayWorkStatusVariant(item.status)} size="sm">
                          {copy.status[item.status as keyof typeof copy.status] ?? item.status}
                        </Badge>
                      </div>
                      <p className="mt-3 truncate text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-6 text-text-secondary">
                        {formatTodayWorkSummary(locale, item.summary)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">{formatHomeTime(locale, item.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <HomeEmptyCard message={copy.noTodayWork} />
            </div>
          )}
        </section>
      </HomeSection>

      {isAdvancedMode ? (
        <>
          <HomeSection
            id="agents"
            eyebrow={copy.sections.agentsEyebrow}
            title={copy.sections.agentsTitle}
            openSections={openSections}
            setOpenSections={setOpenSections}
          >
            <AgentGrid agents={safeData.agents} />
          </HomeSection>

          <HomeSection
            id="teams"
            eyebrow={copy.sections.teamsEyebrow}
            title={copy.sections.teamsTitle}
            openSections={openSections}
            setOpenSections={setOpenSections}
          >
            <TeamGrid teams={safeData.teams} />
          </HomeSection>

          <HomeSection
            id="commands"
            eyebrow={copy.sections.commandsEyebrow}
            title={copy.sections.commandsTitle}
            openSections={openSections}
            setOpenSections={setOpenSections}
          >
            <CommandPalette commands={quickCommands} />
          </HomeSection>
        </>
      ) : null}

      <HomeSection
        id="skills"
        eyebrow={copy.sections.skillsEyebrow}
        title={copy.sections.skillsTitle}
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <section className="grid gap-4 xl:grid-cols-2">
          <SkillList
            items={combinedClaudeItems}
            title={copy.sections.claudeSkillListTitle}
            placeholder={copy.sections.claudeSkillPlaceholder}
          />
          <SkillList
            items={[...safeData.codex.skills, ...safeData.codex.promptSkills]}
            title={copy.sections.codexSkillListTitle}
            placeholder={copy.sections.codexSkillPlaceholder}
          />
        </section>
      </HomeSection>

      {isAdvancedMode ? (
        <>
          <HomeSection
            id="mcp"
            eyebrow={copy.sections.mcpEyebrow}
            title={copy.sections.mcpTitle}
            openSections={openSections}
            setOpenSections={setOpenSections}
          >
            <McpPanel servers={safeData.mcpServers} />
          </HomeSection>

          <HomeSection
            id="summary"
            eyebrow={copy.sections.summaryEyebrow}
            title={copy.sections.summaryTitle}
            openSections={openSections}
            setOpenSections={setOpenSections}
          >
            <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <SummaryPanel title={copy.sections.codexRoleSummary} body={safeData.codex.roleSummary || copy.noRoleFile} />
              <SummaryPanel title={copy.sections.geminiPolicy} body={safeData.gemini.policySummary || copy.noGeminiPolicy} />
            </section>
          </HomeSection>
        </>
      ) : null}
    </div>
  );
}

function createEmptyOverviewData(): OverviewResponse {
  return {
    timestamp: "",
    tools: {
      claude: { name: "Claude Code", version: "unknown", configPath: "", exists: false },
      codex: { name: "Codex CLI", version: "unknown", configPath: "", exists: false },
      gemini: { name: "Gemini CLI", version: "unknown", configPath: "", exists: false },
    },
    agents: [],
    teams: [],
    skills: [],
    commands: [],
    mcpServers: [],
    codex: {
      version: "unknown",
      skills: [],
      promptSkills: [],
      hasRoleFile: false,
      roleSummary: "",
      roleFilePath: "",
    },
    gemini: {
      version: "unknown",
      authType: "unknown",
      policySummary: "",
      settings: {},
      settingsPath: "",
      policyPath: "",
    },
    stats: {
      totalAgents: 0,
      totalTeams: 0,
      totalSkills: 0,
      totalCommands: 0,
      totalMcpServers: 0,
      totalCodexSkills: 0,
    },
    todayWork: [],
  };
}

function HomeSection({
  id,
  eyebrow,
  title,
  openSections,
  setOpenSections,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  openSections: string[];
  setOpenSections: React.Dispatch<React.SetStateAction<string[]>>;
  children: React.ReactNode;
}) {
  const isOpen = openSections.includes(id);

  return (
    <section className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        onClick={() => toggleHomeSection(id, setOpenSections)}
        className="flex w-full items-center justify-between rounded-2xl border border-border-base bg-bg-card px-5 py-4 text-left hover:border-border-hover hover:bg-bg-card-hover h-auto"
      >
        <SectionHeader eyebrow={eyebrow} title={title} />
        <ChevronDown className={`h-5 w-5 text-text-muted transition-transform duration-[150ms] ${isOpen ? "rotate-180" : ""}`} />
      </Button>
      {isOpen ? children : null}
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-text-disabled">
        {eyebrow}
      </p>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  const accentMap: Record<string, string> = {
    purple: "border-purple-500/25 bg-purple-950/20 text-purple-400",
    emerald: "border-emerald-500/25 bg-emerald-950/20 text-emerald-400",
    blue: "border-blue-500/25 bg-blue-950/20 text-blue-400",
  };
  return (
    <div className={`rounded-2xl border p-5 transition-all duration-[150ms] hover:-translate-y-0.5 ${accentMap[accent] ?? accentMap.purple}`}>
      <p className="text-[10px] uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{value}</p>
    </div>
  );
}

function SummaryPanel({ title, body }: { title: string; body: string }) {
  return (
    <article className="panel p-6">
      <p className="text-sm text-text-muted">{title}</p>
      <p className="mt-4 text-sm leading-7 text-text-secondary">{body}</p>
    </article>
  );
}

function PulseMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-text-secondary">{description}</p>
    </article>
  );
}

function PulseBadge({ children }: { children: React.ReactNode }) {
  return <Badge variant="neutral">{children}</Badge>;
}

function toggleHomeSection(
  sectionId: string,
  setOpenSections: React.Dispatch<React.SetStateAction<string[]>>,
) {
  setOpenSections((current) => {
    const next = current.includes(sectionId)
      ? current.filter((item) => item !== sectionId)
      : [...current, sectionId];
    localStorage.setItem(HOME_SECTION_KEY, JSON.stringify(next));
    return next;
  });
}

function defaultHomeSections(mode: DashboardNavigationMode) {
  const sections = ["today-work", "agents", "teams", "commands", "skills", "mcp", "summary"];
  return mode === "advanced"
    ? sections
    : sections.filter((section) => !ADVANCED_HOME_SECTIONS.has(section));
}

function todayWorkSourceVariant(
  source: OverviewResponse["todayWork"][number]["source"],
): BadgeVariant {
  if (source === "call-to-prd") return "claude";
  if (source === "cs-helper") return "info";
  return "success"; // ai-skill
}

function todayWorkStatusVariant(status: string): BadgeVariant {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  return "warning";
}
