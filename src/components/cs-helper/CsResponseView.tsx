"use client";

import { useEffect, useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import type { CsAiRunner, CsResponse, CsTone } from "@/lib/types";

interface CsResponseViewProps {
  response: CsResponse | null;
  loading: boolean;
  onRegenerate: (options: { tone?: CsTone; runner?: CsAiRunner }) => void;
}

export function CsResponseView({ response, loading, onRegenerate }: CsResponseViewProps) {
  const [tone, setTone] = useState<CsTone>("friendly");
  const [runner, setRunner] = useState<CsAiRunner>("claude");

  useEffect(() => {
    if (!response) {
      return;
    }

    setTone(response.tone);
    setRunner(response.runner);
  }, [response]);

  if (!response && !loading) {
    return (
      <EmptyStateCard
        title="아직 생성된 CS 응답이 없습니다."
        message="프로젝트를 고른 뒤 고객 메시지를 입력하고 응답을 생성하면, 여기서 고객 응답과 내부 분석을 바로 확인할 수 있습니다."
      />
    );
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">AI 응답</p>
          {response ? (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {response.runner} · {response.channel} · {response.tone} · {new Date(response.createdAt).toLocaleString("ko-KR")}
            </p>
          ) : null}
        </div>
        {response ? <CopyButton value={response.reply} label="응답 복사" /> : null}
      </div>
      <div className="mt-4 min-h-40 rounded-3xl border border-white/10 bg-black/15 p-5 text-sm leading-7 text-white/85">
        {loading ? "응답을 생성하는 중입니다..." : response?.reply}
      </div>
      {response ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value as CsTone)}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white"
          >
            <option value="friendly">친절 톤</option>
            <option value="formal">공식 톤</option>
            <option value="casual">캐주얼 톤</option>
          </select>
          <select
            value={runner}
            onChange={(event) => setRunner(event.target.value as CsAiRunner)}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white"
          >
            <option value="claude">Claude</option>
            <option value="codex">Codex</option>
            <option value="gemini">Gemini</option>
          </select>
          <button
            type="button"
            onClick={() => onRegenerate({ tone })}
            className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            톤만 바꿔 재생성
          </button>
          <button
            type="button"
            onClick={() => onRegenerate({ runner })}
            className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            AI 바꿔 재생성
          </button>
        </div>
      ) : null}
    </section>
  );
}
