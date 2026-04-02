import { CopyButton } from "@/components/ui/CopyButton";
import type { ProjectsResponse } from "@/lib/types";

interface ProjectStatsProps {
  data: ProjectsResponse;
}

export function ProjectStats({ data }: ProjectStatsProps) {
  const nodeModulesCommand = data.projects
    .flatMap((project) =>
      project.cleanupActions
        .filter((action) => action.command.includes("/node_modules"))
        .map((action) => action.command),
    )
    .join(" && ");
  const nextCacheCommand = data.projects
    .flatMap((project) =>
      project.cleanupActions
        .filter((action) => action.command.includes("/.next"))
        .map((action) => action.command),
    )
    .join(" && ");

  return (
    <div className="panel flex flex-col gap-4 p-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
        <span>총 {data.totalProjects}개 프로젝트</span>
        <span>디스크 사용 {data.totalDiskUsage}</span>
        <span>정리 가능 {data.cleanableSize}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {nodeModulesCommand ? (
          <CopyButton value={nodeModulesCommand} label="전체 node_modules 복사" />
        ) : null}
        {nextCacheCommand ? (
          <CopyButton value={nextCacheCommand} label="전체 .next 복사" />
        ) : null}
      </div>
    </div>
  );
}
