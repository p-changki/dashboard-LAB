import { CopyButton } from "@/components/CopyButton";
import { PinButton } from "@/components/PinButton";
import { ProjectMemo } from "@/components/projects-extended/ProjectMemo";
import type { ProjectInfo } from "@/lib/types";

interface ProjectCardProps {
  project: ProjectInfo;
}

const TYPE_LABELS: Record<ProjectInfo["type"], string> = {
  nextjs: "Next.js",
  turbo: "Turbo 모노레포",
  "node-backend": "Node 백엔드",
  document: "문서",
  other: "기타",
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-white">{project.name}</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {TYPE_LABELS[project.type]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/80">
            {project.diskUsage.total}
          </span>
          <PinButton
            item={{
              id: `project:${project.name}`,
              type: "project",
              name: project.name,
              tab: "projects",
              action: project.path,
              actionMode: "navigate",
            }}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--color-text-soft)]">
        {project.techStack.length > 0
          ? project.techStack.join(", ")
          : "감지된 기술 스택 없음"}
      </p>

      <div className="mt-5 space-y-2 text-sm text-[var(--color-text-soft)]">
        <p>{project.hasGit ? `🔀 ${project.gitBranch ?? "알 수 없음"}` : "📂 git 없음"}</p>
        <p>
          {project.lastCommitDate
            ? `${project.lastCommitDate} · ${project.lastCommitMessage ?? "최근 커밋"}`
            : "최근 커밋 정보 없음"}
        </p>
        <p>{project.hasUncommitted ? "⚠️ 미커밋 변경 있음" : "✅ 클린"}</p>
        <p>수정일 {new Date(project.lastModified).toLocaleDateString("ko-KR")}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.cleanupActions.length > 0 ? (
          project.cleanupActions.map((action) => (
            <div key={`${project.path}-${action.label}`} className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-cyan-100">
                {action.label}
              </span>
              <CopyButton
                value={action.command}
                label="📋"
                recentItem={{
                  id: `project:${project.name}:${action.label}`,
                  name: `${project.name} ${action.label}`,
                  type: "project",
                }}
              />
            </div>
          ))
        ) : (
          <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/60">
            정리 항목 없음
          </span>
        )}
      </div>

      <div className="mt-5">
        <ProjectMemo projectPath={project.path} />
      </div>
    </article>
  );
}
