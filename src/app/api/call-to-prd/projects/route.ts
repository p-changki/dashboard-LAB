import path from "node:path";

import type { ProjectSummary, ProjectsLiteResponse } from "@/lib/types";
import { inspectProjectSummary, parseProjectsLite } from "@/lib/parsers/projects-parser";
import { getRuntimeConfig } from "@/lib/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CallToPrdProjectsResponse extends ProjectsLiteResponse {
  currentProjectPath: string | null;
}

export async function GET() {
  const base = await parseProjectsLite();
  const currentProjectPath = path.resolve(process.cwd());
  const currentProject = isInsideProjectsRoot(currentProjectPath)
    ? await inspectProjectSummary(currentProjectPath)
    : null;
  const projects = mergeProjects(base.projects, currentProject);

  const response: CallToPrdProjectsResponse = {
    scanPath: base.scanPath,
    totalProjects: projects.length,
    projects,
    currentProjectPath: currentProject?.path ?? null,
  };

  return Response.json(response);
}

function mergeProjects(
  projects: readonly ProjectSummary[],
  currentProject: ProjectSummary | null,
): ProjectSummary[] {
  if (!currentProject) {
    return [...projects];
  }

  const currentPath = normalizePath(currentProject.path);
  const rest = projects.filter(
    (project) => normalizePath(project.path) !== currentPath,
  );

  return [currentProject, ...rest];
}

function normalizePath(targetPath: string): string {
  return path.resolve(targetPath);
}

function isInsideProjectsRoot(targetPath: string) {
  const projectsRoot = path.resolve(getRuntimeConfig().paths.projectsRoot);
  const normalizedTarget = path.resolve(targetPath);
  return normalizedTarget === projectsRoot || normalizedTarget.startsWith(`${projectsRoot}${path.sep}`);
}
