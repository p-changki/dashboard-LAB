"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { Pagination } from "@/components/common/Pagination";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectFilters } from "@/features/projects/components/ProjectFilters";
import { ProjectStats } from "@/features/projects/components/ProjectStats";
import type { ProjectInfo, ProjectsResponse } from "@/lib/types";

interface ProjectGridProps {
  data: ProjectsResponse;
}

export function ProjectGrid({ data }: ProjectGridProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProjectInfo["type"] | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "size" | "modified" | "commit">(
    "name",
  );
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const pageSize = 6;
  const filteredProjects = sortProjects(
    data.projects.filter((project) => {
      const matchesType = typeFilter === "all" || project.type === typeFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${project.name} ${project.techStack.join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    }),
    sortBy,
  );
  const pagedProjects = filteredProjects.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery, typeFilter, sortBy]);

  return (
    <section className="space-y-4">
      <ProjectStats data={data} />
      <ProjectFilters
        query={query}
        onQueryChange={setQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {filteredProjects.length === 0 ? (
          <div className="panel p-6 text-sm text-text-secondary">
            설정 없음
          </div>
        ) : null}
        {pagedProjects.map((project) => (
          <ProjectCard key={project.path} project={project} />
        ))}
      </div>
      <Pagination
        page={page}
        totalItems={filteredProjects.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </section>
  );
}

function sortProjects(
  projects: ProjectInfo[],
  sortBy: "name" | "size" | "modified" | "commit",
) {
  return [...projects].sort((left, right) => {
    if (sortBy === "size") {
      return right.diskUsage.totalBytes - left.diskUsage.totalBytes;
    }

    if (sortBy === "modified") {
      return right.lastModifiedTimestamp - left.lastModifiedTimestamp;
    }

    if (sortBy === "commit") {
      return (right.lastCommitTimestamp ?? 0) - (left.lastCommitTimestamp ?? 0);
    }

    return left.name.localeCompare(right.name);
  });
}
