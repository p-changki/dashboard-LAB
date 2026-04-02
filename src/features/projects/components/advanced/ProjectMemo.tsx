"use client";

import { useEffect, useState } from "react";

import { CLIENT_STORAGE_KEYS } from "@/lib/client-keys";

interface ProjectMemoProps {
  projectPath: string;
}

const STORAGE_KEY = CLIENT_STORAGE_KEYS.projectMemo;

export function ProjectMemo({ projectPath }: ProjectMemoProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    setValue(parsed[projectPath] ?? "");
  }, [projectPath]);

  function handleSave(nextValue: string) {
    setValue(nextValue);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...parsed, [projectPath]: nextValue }),
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-text-secondary hover:bg-gray-800"
      >
        메모
      </button>
      {open ? (
        <textarea
          value={value}
          onChange={(event) => handleSave(event.target.value)}
          placeholder="프로젝트 메모를 입력하세요."
          className="mt-3 min-h-24 w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-3 text-sm text-text-secondary outline-none placeholder:text-text-muted"
        />
      ) : null}
    </div>
  );
}
