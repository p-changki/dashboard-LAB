"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { FileTypeIcon } from "@/components/common/FileTypeIcon";
import { Pagination } from "@/components/common/Pagination";
import { formatDocHubDate, getDocHubCopy, getDocTypeLabel } from "@/features/doc-hub/copy";
import type { DocType, ProjectDoc } from "@/lib/types";

interface DocHubListProps {
  docs: ProjectDoc[];
  filters: DocType[];
  onToggleFilter: (type: DocType) => void;
  onSelectDoc: (project: string, file: string) => void;
}

const DOC_TYPE_CLASS: Record<DocType, string> = {
  claude: "bg-purple-900/30 text-purple-300",
  codex: "bg-green-900/30 text-green-300",
  gemini: "bg-blue-900/30 text-blue-300",
  general: "bg-gray-700 text-text-secondary",
};

export function DocHubList({
  docs,
  filters,
  onToggleFilter,
  onSelectDoc,
}: DocHubListProps) {
  const { locale } = useLocale();
  const copy = getDocHubCopy(locale);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "name">("latest");
  const pageSize = 8;
  const grouped = groupDocs(sortDocs(docs.filter((doc) => filters.includes(doc.type)), sortBy, locale));
  const entries = Object.entries(grouped);
  const pagedEntries = entries.slice((page - 1) * pageSize, page * pageSize);
  const filterKey = filters.join(",");

  useEffect(() => {
    setPage(1);
  }, [filterKey, docs.length, sortBy]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["claude", "codex", "gemini", "general"] as const).map((type) => {
          const active = filters.includes(type as DocType);

          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleFilter(type as DocType)}
              className={[
                "rounded-full px-2.5 py-1 text-xs font-medium transition",
                active ? DOC_TYPE_CLASS[type as DocType] : "bg-gray-800 text-text-muted",
              ].join(" ")}
            >
              {active ? "✓ " : ""}{getDocTypeLabel(type)}
            </button>
          );
        })}
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as "latest" | "oldest" | "name")}
          className="rounded-full border border-border-base bg-black/15 px-3 py-1 text-xs text-white"
        >
          <option value="latest">{copy.sortLatest}</option>
          <option value="oldest">{copy.sortOldest}</option>
          <option value="name">{copy.sortName}</option>
        </select>
      </div>

      <div className="space-y-3">
        {pagedEntries.map(([projectName, projectDocs]) => {
          const isOpen = expanded.has(projectName);

          return (
            <article key={projectName} className="rounded-2xl border border-gray-800 bg-gray-800/40">
              <button
                type="button"
                onClick={() => toggleExpanded(projectName, setExpanded)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-gray-800/60"
              >
                <span className="text-sm font-medium text-white">
                  {isOpen ? "▼" : "▶"} {projectName}
                </span>
                <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs text-text-muted">
                  {copy.documentCount(projectDocs.length)}
                </span>
              </button>
              {isOpen ? (
                <div className="space-y-2 border-t border-gray-800 px-4 py-3">
                  {projectDocs.map((doc) => (
                    <button
                      key={`${doc.projectName}-${doc.filePath}`}
                      type="button"
                      onClick={() => onSelectDoc(doc.projectName, doc.filePath)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <FileTypeIcon extension={doc.fileName.split(".").pop() ?? "md"} />
                        <div>
                          <p className="text-sm text-white">{doc.filePath}</p>
                          <p className="mt-1 text-xs text-text-muted">
                            {formatDocHubDate(locale, doc.lastModified)}
                          </p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DOC_TYPE_CLASS[doc.type]}`}>
                        {getDocTypeLabel(doc.type)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <Pagination
        page={page}
        totalItems={entries.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </section>
  );
}

function groupDocs(docs: ProjectDoc[]) {
  return docs.reduce<Record<string, ProjectDoc[]>>((acc, doc) => {
    const current = acc[doc.projectName] ?? [];
    return { ...acc, [doc.projectName]: [...current, doc] };
  }, {});
}

function sortDocs(
  docs: ProjectDoc[],
  sortBy: "latest" | "oldest" | "name",
  locale: "ko" | "en",
) {
  return [...docs].sort((left, right) => {
    if (sortBy === "oldest") {
      return left.lastModifiedTimestamp - right.lastModifiedTimestamp;
    }

    if (sortBy === "name") {
      return left.filePath.localeCompare(right.filePath, locale === "en" ? "en-US" : "ko-KR");
    }

    return right.lastModifiedTimestamp - left.lastModifiedTimestamp;
  });
}

function toggleExpanded(
  projectName: string,
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  setExpanded((current) => {
    const next = new Set(current);

    if (next.has(projectName)) {
      next.delete(projectName);
    } else {
      next.add(projectName);
    }

    return next;
  });
}
