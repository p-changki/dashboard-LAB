"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { ProjectGrid } from "@/features/projects/components/ProjectGrid";
import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import type { ProjectsResponse } from "@/lib/types";

interface ProjectsTabProps {
  initialData?: ProjectsResponse | null;
  mode?: DashboardNavigationMode;
}

const CleanNodeModules = dynamic(
  () => import("@/features/projects/components/advanced/CleanNodeModules").then((module) => module.CleanNodeModules),
  {
    ssr: false,
    loading: () => <TabPanelMessage title="Node Modules 정리" message="도구를 불러오는 중입니다." />,
  },
);

const GitBatchStatus = dynamic(
  () => import("@/features/projects/components/advanced/GitBatchStatus").then((module) => module.GitBatchStatus),
  {
    ssr: false,
    loading: () => <SectionLoading message="Git 상태를 불러오는 중입니다." />,
  },
);

const GitTimeline = dynamic(
  () => import("@/features/projects/components/advanced/GitTimeline").then((module) => module.GitTimeline),
  {
    ssr: false,
    loading: () => <SectionLoading message="Git 타임라인을 불러오는 중입니다." />,
  },
);

const PortUsage = dynamic(
  () => import("@/features/projects/components/advanced/PortUsage").then((module) => module.PortUsage),
  {
    ssr: false,
    loading: () => <SectionLoading message="포트 정보를 불러오는 중입니다." />,
  },
);

const EnvMap = dynamic(
  () => import("@/features/projects/components/advanced/EnvMap").then((module) => module.EnvMap),
  {
    ssr: false,
    loading: () => <SectionLoading message="환경 변수 맵을 불러오는 중입니다." />,
  },
);

const SECTIONS = [
  {
    id: "git-overview",
    label: "Git Overview",
    description: "프로젝트별 git 상태를 한 번에 확인합니다.",
  },
  { id: "timeline", label: "Git Timeline" },
  { id: "ports", label: "Port Usage" },
  { id: "env", label: "Env Map" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function ProjectsTab({ initialData = null, mode = "advanced" }: ProjectsTabProps) {
  const [data, setData] = useState<ProjectsResponse | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set());
  const [loadedSections, setLoadedSections] = useState<Set<SectionId>>(new Set());

  useEffect(() => {
    if (initialData) {
      return;
    }

    void loadProjects(setData, setLoading, setError);
  }, [initialData]);

  if (loading) {
    return <TabPanelMessage title="프로젝트" message="프로젝트 데이터를 불러오는 중입니다." />;
  }

  if (error || !data) {
    return <TabPanelMessage title="프로젝트" message={error || "프로젝트 데이터를 불러오지 못했습니다."} />;
  }

  return (
    <div className="space-y-6">
      {mode === "advanced" ? <CleanNodeModules /> : null}
      <ProjectGrid data={data} />
      {mode === "advanced" ? (
        <section className="space-y-3">
          <div className="rounded-2xl border border-dashed border-border-base bg-bg-surface px-4 py-3 text-sm text-text-muted">
            추가 진단 섹션은 필요할 때만 열도록 바꿨습니다. 숨겨진 패널은 열기 전까지 API와 무거운 코드 로드를 시작하지 않습니다.
          </div>
          {SECTIONS.map((section) => (
            <article key={section.id} className="rounded-2xl border border-border-base bg-bg-card transition-all duration-[150ms] hover:bg-bg-card-hover">
              <button
                type="button"
                onClick={() => toggleSection(section.id, setOpenSections, setLoadedSections)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <span className="text-lg font-semibold text-text-primary">
                    {openSections.has(section.id) ? "▼" : "▶"} {section.label}
                  </span>
                  {"description" in section ? (
                    <p className="mt-1 text-sm text-text-muted">{section.description}</p>
                  ) : null}
                </div>
              </button>
              {loadedSections.has(section.id) ? (
                <div className={openSections.has(section.id) ? "border-t border-gray-800 p-5" : "hidden"}>
                  {section.id === "git-overview" ? <GitBatchStatus /> : null}
                  {section.id === "timeline" ? <GitTimeline /> : null}
                  {section.id === "ports" ? <PortUsage /> : null}
                  {section.id === "env" ? <EnvMap /> : null}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-cyan-400/15 bg-cyan-950/10 px-4 py-4 text-sm text-cyan-100">
          간단 모드에서는 프로젝트 목록과 기본 상태만 보여줍니다. Node Modules 정리, Git 타임라인, 포트 사용량, Env Map은 전체 모드에서 확인할 수 있습니다.
        </section>
      )}
    </div>
  );
}

async function loadProjects(
  setData: (value: ProjectsResponse) => void,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
) {
  try {
    const response = await fetch("/api/projects", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("프로젝트 API 응답이 올바르지 않습니다.");
    }

    setData((await response.json()) as ProjectsResponse);
  } catch {
    setError("프로젝트 데이터를 불러오지 못했습니다.");
  } finally {
    setLoading(false);
  }
}

function toggleSection(
  sectionId: SectionId,
  setOpenSections: React.Dispatch<React.SetStateAction<Set<SectionId>>>,
  setLoadedSections: React.Dispatch<React.SetStateAction<Set<SectionId>>>,
) {
  setOpenSections((current) => {
    const next = new Set(current);
    const isOpening = !next.has(sectionId);

    if (isOpening) {
      setLoadedSections((loadedCurrent) => new Set(loadedCurrent).add(sectionId));
      next.add(sectionId);
    } else {
      next.delete(sectionId);
    }

    return next;
  });
}

function TabPanelMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-6">
      <p className="text-sm uppercase tracking-[0.24em] text-text-muted">{title}</p>
      <p className="mt-4 text-sm text-text-secondary">{message}</p>
    </section>
  );
}

function SectionLoading({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5 text-sm text-text-muted">
      {message}
    </div>
  );
}
