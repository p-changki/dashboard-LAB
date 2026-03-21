"use client";

import { useEffect, useState } from "react";

import { DocHubList } from "@/components/doc-hub/DocHubList";
import { DocSearch } from "@/components/doc-hub/DocSearch";
import { DocViewer } from "@/components/doc-hub/DocViewer";
import type { DocContent, DocHubResponse, DocType } from "@/lib/types";

const DEFAULT_FILTERS: DocType[] = ["claude", "codex", "gemini", "general"];

export function DocHubTab() {
  const [data, setData] = useState<DocHubResponse | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<DocType[]>(DEFAULT_FILTERS);
  const [selectedDoc, setSelectedDoc] = useState<DocContent | null>(null);

  useEffect(() => {
    void fetch("/api/doc-hub", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: DocHubResponse) => setData(payload))
      .catch(() => setData({ docs: [], totalDocs: 0, projectNames: [], byType: { claude: 0, codex: 0, gemini: 0, general: 0 } }));
  }, []);

  return (
    <div className="space-y-4">
      <DocSearch
        query={query}
        onQueryChange={setQuery}
        onSelectDoc={(project, file) => void handleSelectDoc(project, file, setSelectedDoc)}
      />
      <DocHubList
        docs={data?.docs ?? []}
        filters={filters}
        onToggleFilter={(type) => setFilters(toggleFilter(filters, type))}
        onSelectDoc={(project, file) => void handleSelectDoc(project, file, setSelectedDoc)}
      />
      <DocViewer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
    </div>
  );
}

async function handleSelectDoc(
  project: string,
  file: string,
  setSelectedDoc: (value: DocContent | null) => void,
) {
  const response = await fetch(
    `/api/doc-hub/content?project=${encodeURIComponent(project)}&file=${encodeURIComponent(file)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    setSelectedDoc(null);
    return;
  }

  setSelectedDoc((await response.json()) as DocContent);
}

function toggleFilter(filters: DocType[], type: DocType) {
  return filters.includes(type)
    ? filters.filter((item) => item !== type)
    : [...filters, type];
}
