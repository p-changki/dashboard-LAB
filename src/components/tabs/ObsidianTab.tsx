"use client";

import { useEffect, useState } from "react";

import { NotePreview } from "@/components/obsidian/NotePreview";
import { NoteSearch } from "@/components/obsidian/NoteSearch";
import { ObsidianTree } from "@/components/obsidian/ObsidianTree";
import { TagCloud } from "@/components/obsidian/TagCloud";
import type { ObsidianNoteContent, ObsidianTreeResponse } from "@/lib/types";

export function ObsidianTab() {
  const [treeData, setTreeData] = useState<ObsidianTreeResponse | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedNote, setSelectedNote] = useState<ObsidianNoteContent | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadTree(setTreeData, setSelectedPath, setSelectedNote);
  }, []);

  async function handleSelectNote(notePath: string) {
    setSelectedPath(notePath);
    setSelectedNote(await fetchNote(notePath));
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="총 노트" value={String(treeData?.totalFiles ?? 0)} />
        <SummaryCard label="폴더 수" value={String(treeData?.totalFolders ?? 0)} />
        <SummaryCard label="상위 태그" value={treeData?.tags[0]?.name ?? "없음"} />
      </section>

      <NoteSearch
        query={query}
        onQueryChange={setQuery}
        onSelectNote={(notePath) => void handleSelectNote(notePath)}
      />

      <div className="grid gap-4 xl:grid-cols-[0.3fr_0.7fr]">
        <ObsidianTree
          tree={treeData?.tree ?? []}
          selectedPath={selectedPath}
          onSelectNote={(notePath) => void handleSelectNote(notePath)}
        />
        <div className="grid gap-4">
          <NotePreview note={selectedNote} />
          <TagCloud
            tags={treeData?.tags ?? []}
            onSelectTag={(tag) => setQuery(tag)}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

async function loadTree(
  setTreeData: (value: ObsidianTreeResponse) => void,
  setSelectedPath: (value: string) => void,
  setSelectedNote: (value: ObsidianNoteContent | null) => void,
) {
  const response = await fetch("/api/obsidian/tree", { cache: "no-store" });

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as ObsidianTreeResponse;
  setTreeData(payload);
  const initialPath = payload.recentNotes[0]?.path ?? "";

  if (!initialPath) {
    return;
  }

  setSelectedPath(initialPath);
  setSelectedNote(await fetchNote(initialPath));
}

async function fetchNote(notePath: string) {
  const response = await fetch(`/api/obsidian/note?path=${encodeURIComponent(notePath)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ObsidianNoteContent;
}
