"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { FileTypeIcon } from "@/components/common/FileTypeIcon";
import type { ObsidianNote } from "@/lib/types";

interface ObsidianTreeProps {
  tree: ObsidianNote[];
  selectedPath: string;
  onSelectNote: (path: string) => void;
}

export function ObsidianTree({
  tree,
  selectedPath,
  onSelectNote,
}: ObsidianTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(new Set(collectFolderPaths(tree)));
  }, [tree]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-white">노트 트리</p>
        <span className="text-xs text-gray-500">{tree.length}개 루트</span>
      </div>
      <div className="space-y-1 overflow-auto">
        {tree.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-800 px-3 py-4 text-sm text-gray-500">
            표시할 노트가 없습니다.
          </p>
        ) : null}
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            selectedPath={selectedPath}
            onToggle={(path) => toggleExpanded(path, setExpanded)}
            onSelectNote={onSelectNote}
          />
        ))}
      </div>
    </section>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  selectedPath,
  onToggle,
  onSelectNote,
}: TreeNodeProps) {
  const isFolder = node.type === "folder";
  const isOpen = expanded.has(node.path);
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        type="button"
        onClick={() => (isFolder ? onToggle(node.path) : onSelectNote(node.path))}
        className={[
          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
          isSelected
            ? "bg-blue-900/50 text-blue-200"
            : "text-gray-300 hover:bg-gray-800 hover:text-white",
        ].join(" ")}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span aria-hidden className="w-4 text-center text-base">
          {isFolder ? (isOpen ? "▾" : "▸") : "·"}
        </span>
        {isFolder ? (
          <span aria-hidden className="text-xs text-gray-500">
            폴더
          </span>
        ) : (
          <FileTypeIcon extension="md" size={20} />
        )}
        <span className="truncate">{node.name}</span>
        <span
          className={[
            "ml-auto h-2 w-2 rounded-full transition",
            isSelected ? "bg-blue-400" : "bg-transparent",
          ].join(" ")}
        />
      </button>
      {isFolder && isOpen ? (
        <div className="mt-1 space-y-1">
          {(node.children ?? []).map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelectNote={onSelectNote}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function toggleExpanded(
  targetPath: string,
  setExpanded: Dispatch<SetStateAction<Set<string>>>,
) {
  setExpanded((current) => {
    const next = new Set(current);

    if (next.has(targetPath)) {
      next.delete(targetPath);
    } else {
      next.add(targetPath);
    }

    return next;
  });
}

function collectFolderPaths(nodes: ObsidianNote[]): string[] {
  return nodes.flatMap((node) =>
    node.type === "folder"
      ? [node.path, ...collectFolderPaths(node.children ?? [])]
      : [],
  );
}

interface TreeNodeProps {
  node: ObsidianNote;
  depth: number;
  expanded: Set<string>;
  selectedPath: string;
  onToggle: (path: string) => void;
  onSelectNote: (path: string) => void;
}
