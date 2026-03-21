"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { Pagination } from "@/components/common/Pagination";
import { CopyButton } from "@/components/CopyButton";
import { PinButton } from "@/components/PinButton";
import type { Command, CodexSkill, Skill } from "@/lib/types";

type SkillLike = Skill | Command | CodexSkill;

interface SkillListProps {
  items: SkillLike[];
  title: string;
  placeholder: string;
}

export function SkillList({ items, title, placeholder }: SkillListProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const pageSize = 8;
  const filteredItems = items.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }

    return `${item.name} ${item.description}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery, items.length]);

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-[var(--color-muted)]">{title}</p>
          <p className="mt-2 text-sm text-[var(--color-text-soft)]">
            {filteredItems.length} / {items.length}
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/50 lg:max-w-sm"
        />
      </div>

      <div className="mt-5 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-[var(--color-text-soft)]">
            설정 없음
          </div>
        ) : null}
        {pagedItems.map((item) => {
          const command = "command" in item ? item.command : `/${item.name}`;

          return (
            <div
              key={`${item.name}-${item.filePath}`}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{item.name}</p>
                  {"source" in item ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                      {item.source}
                    </span>
                  ) : null}
                  {isPinnable(item) ? (
                    <PinButton
                      item={{
                        id: `${item.source === "claude-command" ? "command" : "skill"}:${item.name}`,
                        type: item.source === "claude-command" ? "command" : "skill",
                        name: item.name,
                        tab: "home",
                        action: command,
                        actionMode: "copy",
                      }}
                    />
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">
                  {item.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <code className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-cyan-100">
                  {command}
                </code>
                <CopyButton
                  value={command}
                  recentItem={{
                    id: `${item.source}:${item.name}`,
                    name: item.name,
                    type: item.source === "claude-command" ? "command" : "skill",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <Pagination
        page={page}
        totalItems={filteredItems.length}
        pageSize={pageSize}
        onChange={setPage}
      />
    </section>
  );
}

function isPinnable(item: SkillLike) {
  return item.source === "claude-skill" || item.source === "claude-command";
}
