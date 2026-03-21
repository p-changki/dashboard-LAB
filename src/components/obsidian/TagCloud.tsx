"use client";

import type { TagInfo } from "@/lib/types";

interface TagCloudProps {
  tags: TagInfo[];
  onSelectTag: (tag: string) => void;
}

export function TagCloud({ tags, onSelectTag }: TagCloudProps) {
  return (
    <section className="panel p-5">
      <p className="text-sm font-medium text-white">태그 클라우드</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.slice(0, 30).map((tag) => (
          <button
            key={tag.name}
            type="button"
            onClick={() => onSelectTag(tag.name)}
            className="rounded-full bg-blue-900/20 px-3 py-1 text-xs text-blue-200 transition hover:bg-blue-900/35"
            style={{ fontSize: `${12 + Math.min(tag.count, 8)}px` }}
          >
            {tag.name} {tag.count}
          </button>
        ))}
      </div>
    </section>
  );
}
