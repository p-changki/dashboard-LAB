"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { AgentGrid } from "@/components/AgentGrid";
import { CommandPalette } from "@/components/CommandPalette";
import { McpPanel } from "@/components/McpPanel";
import { PinnedBar } from "@/components/PinnedBar";
import { SkillList } from "@/components/SkillList";
import { TeamGrid } from "@/components/TeamGrid";
import { ToolCard } from "@/components/ToolCard";
import { CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import type { OverviewResponse } from "@/lib/types";

const HOME_SECTION_KEY = CLIENT_STORAGE_KEYS.homeSections;

interface HomeTabProps {
  data: OverviewResponse;
}

export function HomeTab({ data }: HomeTabProps) {
  const [openSections, setOpenSections] = useState<string[]>(defaultHomeSections());
  const combinedClaudeItems = [...data.skills, ...data.commands];
  const quickCommands = [
    ...data.commands.slice(0, 4).map((command) => ({
      label: command.name,
      value: command.command,
      description: command.description,
    })),
    {
      label: "Codex 실행",
      value: 'codex exec -o /tmp/codex-output.txt "..."',
      description: "Codex CLI 출력을 파일로 저장하는 빠른 실행 템플릿",
    },
  ];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOME_SECTION_KEY);
      setOpenSections(raw ? (JSON.parse(raw) as string[]) : defaultHomeSections());
    } catch {
      setOpenSections(defaultHomeSections());
    }
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PinnedBar />
      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard label="에이전트" value={data.stats.totalAgents} accent="purple" />
        <StatCard label="팀" value={data.stats.totalTeams} accent="purple" />
        <StatCard label="Claude 스킬" value={data.stats.totalSkills} accent="purple" />
        <StatCard label="Codex 스킬" value={data.stats.totalCodexSkills} accent="emerald" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ToolCard tool={data.tools.claude} accent="#c084fc" />
        <ToolCard tool={data.tools.codex} accent="#34d399" />
        <ToolCard tool={data.tools.gemini} accent="#60a5fa" />
      </section>

      <HomeSection
        id="today-work"
        eyebrow="Today"
        title="오늘 작업"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">최신 작업 10건</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                오늘 진행한 `Call → PRD`, `CS Helper`, `AI Skills` 작업을 최신순으로 보여줍니다.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
              {data.todayWork.length}건
            </span>
          </div>

          {data.todayWork.length > 0 ? (
            <div className="mt-4 space-y-3">
              {data.todayWork.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${getTodayWorkBadgeClass(item.source)}`}>
                          {item.badge}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${getTodayWorkStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-3 truncate text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-6 text-[var(--color-text-soft)]">{item.summary}</p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--color-muted)]">{formatWorkTime(item.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-[var(--color-muted)]">
              오늘 기록된 작업이 없습니다.
            </div>
          )}
        </section>
      </HomeSection>

      <HomeSection
        id="agents"
        eyebrow="Claude 에이전트"
        title="전문 에이전트 목록"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <AgentGrid agents={data.agents} />
      </HomeSection>

      <HomeSection
        id="teams"
        eyebrow="Claude 팀"
        title="팀 커맨드 프리셋"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <TeamGrid teams={data.teams} />
      </HomeSection>

      <HomeSection
        id="commands"
        eyebrow="빠른 명령어"
        title="바로 복사할 수 있는 바로가기"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <CommandPalette commands={quickCommands} />
      </HomeSection>

      <HomeSection
        id="skills"
        eyebrow="스킬"
        title="Claude / Codex 스킬"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <section className="grid gap-4 xl:grid-cols-2">
          <SkillList
            items={combinedClaudeItems}
            title="Claude 스킬 + 커맨드"
            placeholder="Claude 스킬이나 커맨드 검색"
          />
          <SkillList
            items={[...data.codex.skills, ...data.codex.promptSkills]}
            title="Codex 스킬"
            placeholder="Codex 스킬 검색"
          />
        </section>
      </HomeSection>

      <HomeSection
        id="mcp"
        eyebrow="MCP 서버"
        title="연결된 연동 정보"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <McpPanel servers={data.mcpServers} />
      </HomeSection>

      <HomeSection
        id="summary"
        eyebrow="요약 문서"
        title="Codex / Gemini 정책"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <SummaryPanel title="Codex Role 요약" body={data.codex.roleSummary || "ROLE.md가 없습니다"} />
          <SummaryPanel title="Gemini 정책" body={data.gemini.policySummary || "GEMINI.md가 없습니다"} />
        </section>
      </HomeSection>
    </div>
  );
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
      <button
        type="button"
        onClick={() => toggleHomeSection(id, setOpenSections)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#1e1e1e] px-5 py-4 text-left transition-all duration-[150ms] hover:border-white/[.14] hover:bg-[#242424]"
      >
        <SectionHeader eyebrow={eyebrow} title={title} />
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-[150ms] ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? children : null}
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-gray-600">
        {eyebrow}
      </p>
      <h2 className="text-lg font-semibold text-[#f0f0f0]">{title}</h2>
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
      <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#f0f0f0]">{value}</p>
    </div>
  );
}

function SummaryPanel({ title, body }: { title: string; body: string }) {
  return (
    <article className="panel p-6">
      <p className="text-sm text-[var(--color-muted)]">{title}</p>
      <p className="mt-4 text-sm leading-7 text-[var(--color-text-soft)]">{body}</p>
    </article>
  );
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

function defaultHomeSections() {
  return ["today-work", "agents", "teams", "commands", "skills", "mcp", "summary"];
}

function formatWorkTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getTodayWorkBadgeClass(source: OverviewResponse["todayWork"][number]["source"]) {
  return {
    "call-to-prd": "border border-purple-500/20 bg-purple-900/30 text-purple-200",
    "cs-helper": "border border-cyan-500/20 bg-cyan-900/30 text-cyan-200",
    "ai-skill": "border border-emerald-500/20 bg-emerald-900/30 text-emerald-200",
  }[source];
}

function getTodayWorkStatusClass(status: string) {
  if (status === "completed") {
    return "border border-emerald-500/20 bg-emerald-900/20 text-emerald-300";
  }

  if (status === "failed") {
    return "border border-rose-500/20 bg-rose-900/20 text-rose-300";
  }

  return "border border-amber-500/20 bg-amber-900/20 text-amber-200";
}
