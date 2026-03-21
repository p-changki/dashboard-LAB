"use client";

import { useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import type { AutoOrganizeResponse, AutoOrganizeTarget } from "@/lib/types";

export function AutoOrganize() {
  const [target, setTarget] = useState<AutoOrganizeTarget>("both");
  const [preview, setPreview] = useState<AutoOrganizeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">자동 정리</p>
          <p className="mt-2 text-sm text-gray-400">먼저 미리보기 후, move 작업만 실행합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={target}
            onChange={(event) => setTarget(event.target.value as AutoOrganizeTarget)}
            className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-300"
          >
            <option value="desktop">Desktop</option>
            <option value="downloads">Downloads</option>
            <option value="both">둘 다</option>
          </select>
          <button
            type="button"
            onClick={() => void runAutoOrganize(target, true, setPreview, setLoading)}
            className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
          >
            자동 정리
          </button>
        </div>
      </div>
      {preview ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <PanelList
              title={`이동 예정 ${preview.summary.totalMoved}개`}
              items={preview.moved.slice(0, 12).map((item) => `${item.from} → ${item.to}`)}
              empty="이동할 파일이 없습니다."
            />
            <PanelList
              title={`건너뜀 ${preview.summary.totalSkipped}개`}
              items={preview.skipped.slice(0, 12).map((item) => `${item.path} — ${item.reason}`)}
              empty="건너뜀 항목이 없습니다."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs text-gray-300">
              총 이동 용량 {preview.summary.totalSize}
            </span>
            <button
              type="button"
              onClick={() => void runAutoOrganize(target, false, setPreview, setLoading)}
              disabled={loading || preview.moved.length === 0}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
            >
              실행
            </button>
            <CopyButton value={preview.undoScript} label="되돌리기 스크립트 복사" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PanelList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : null}
        {items.map((item) => (
          <p key={item} className="text-xs leading-6 text-gray-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

async function runAutoOrganize(
  target: AutoOrganizeTarget,
  dryRun: boolean,
  setPreview: (value: AutoOrganizeResponse) => void,
  setLoading: (value: boolean) => void,
) {
  setLoading(true);

  try {
    const response = await fetch("/api/file-manager/auto-organize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, dryRun }),
    });
    setPreview((await response.json()) as AutoOrganizeResponse);
  } finally {
    setLoading(false);
  }
}
