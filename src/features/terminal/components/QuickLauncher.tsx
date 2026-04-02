"use client";

import { useEffect, useState } from "react";

import type { ProjectsResponse } from "@/lib/types";

interface QuickLauncherProps {
  onLaunch: (cwd: string, command?: string) => void;
}

export function QuickLauncher({ onLaunch }: QuickLauncherProps) {
  const [projects, setProjects] = useState<ProjectsResponse | null>(null);

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: ProjectsResponse) => setProjects(payload))
      .catch(() => setProjects(null));
  }, []);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-text-primary">Quick Launcher</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(projects?.projects ?? []).slice(0, 12).map((project) => (
          <article key={project.path} className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <p className="text-sm text-white">{project.name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onLaunch(project.path, "claude")} className="rounded-full bg-purple-900/30 px-3 py-1 text-xs text-purple-300">claude</button>
              <button type="button" onClick={() => onLaunch(project.path, "codex")} className="rounded-full bg-green-900/30 px-3 py-1 text-xs text-green-300">codex</button>
              <button type="button" onClick={() => onLaunch(project.path, "pnpm dev")} className="rounded-full bg-blue-900/30 px-3 py-1 text-xs text-blue-300">pnpm dev</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
