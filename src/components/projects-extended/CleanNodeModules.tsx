"use client";

import { useMemo, useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import type { NodeModulesCleanupResponse } from "@/lib/types";

export function CleanNodeModules() {
  const [preview, setPreview] = useState<NodeModulesCleanupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedItems = useMemo(
    () => preview?.items.filter((item) => selected.includes(item.projectPath)) ?? [],
    [preview, selected],
  );
  const selectedSize = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.sizeBytes, 0),
    [selectedItems],
  );

  return (
    <section className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 transition-all duration-[150ms] hover:bg-[#242424]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Node Modules 정리</p>
          <p className="mt-2 text-sm text-gray-400">미리보기 후 한 번에 정리할 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void runCleanup(true, [], setPreview, setSelected, setLoading)}
            className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
          >
            미리보기
          </button>
          <button
            type="button"
            onClick={() => void runCleanup(false, selected, setPreview, setSelected, setLoading)}
            disabled={loading || selected.length === 0}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
          >
            실행
          </button>
        </div>
      </div>
      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span>대상 {preview.totalTargets}개</span>
            <span>선택 {selected.length}개</span>
            <span>선택 용량 {formatSize(selectedSize)}</span>
            <CopyButton value={preview.commandPreview.join("\n")} label="명령어 복사" />
          </div>
          <div className="space-y-2">
            {preview.items.map((item) => (
              <label key={item.targetPath} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-gray-300">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.projectPath)}
                    onChange={() => toggleSelected(item.projectPath, setSelected)}
                    className="h-4 w-4 accent-purple-400"
                  />
                  <span>{item.project}</span>
                </div>
                <span className="text-xs text-white/55">{item.sizeHuman}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

async function runCleanup(
  dryRun: boolean,
  projectPaths: string[],
  setPreview: (value: NodeModulesCleanupResponse) => void,
  setSelected: (value: string[]) => void,
  setLoading: (value: boolean) => void,
) {
  setLoading(true);

  try {
    const response = await fetch("/api/projects/clean-nm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun, projectPaths }),
    });

     if (!response.ok) {
      throw new Error("node_modules 정리 요청에 실패했습니다.");
    }

    const payload = (await response.json()) as NodeModulesCleanupResponse;
    setPreview(payload);
    setSelected(payload.selectedPaths ?? payload.items.map((item) => item.projectPath));
  } finally {
    setLoading(false);
  }
}

function toggleSelected(
  projectPath: string,
  setSelected: React.Dispatch<React.SetStateAction<string[]>>,
) {
  setSelected((current) =>
    current.includes(projectPath)
      ? current.filter((item) => item !== projectPath)
      : [...current, projectPath],
  );
}

function formatSize(bytes: number) {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
