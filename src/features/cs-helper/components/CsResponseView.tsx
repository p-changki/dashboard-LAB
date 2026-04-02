"use client";

import { useEffect, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { getCsChannelLabel, getCsInputModeLabel, getCsToneLabel } from "@/lib/cs-helper/messages";
import type { CsAiRunner, CsResponse, CsTone } from "@/lib/types";

interface CsResponseViewProps {
  response: CsResponse | null;
  loading: boolean;
  copy: {
    emptyTitle: string;
    emptyMessage: string;
    title: string;
    copy: string;
    loading: string;
    regenerateTone: string;
    regenerateRunner: string;
  };
  onRegenerate: (options: { tone?: CsTone; runner?: CsAiRunner }) => void;
}

export function CsResponseView({ response, loading, copy, onRegenerate }: CsResponseViewProps) {
  const { locale } = useLocale();
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
        title={copy.emptyTitle}
        message={copy.emptyMessage}
      />
    );
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{copy.title}</p>
          {response ? (
            <p className="mt-1 text-xs text-text-muted">
              {response.runner} · {getCsChannelLabel(response.channel, locale)} · {getCsToneLabel(response.tone, locale)} · {getCsInputModeLabel(response.inputMode ?? "customer", locale)} · {new Date(response.createdAt).toLocaleString(locale === "en" ? "en-US" : "ko-KR")}
            </p>
          ) : null}
        </div>
        {response ? <CopyButton value={response.reply} label={copy.copy} /> : null}
      </div>
      <div className="mt-4 min-h-40 rounded-3xl border border-border-base bg-black/15 p-5 text-sm leading-7 text-white/85">
        {loading ? copy.loading : response?.reply}
      </div>
      {response ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value as CsTone)}
            className="rounded-full border border-border-base bg-white/6 px-4 py-2 text-sm text-white"
          >
            <option value="friendly">{locale === "en" ? "Friendly tone" : "친절 톤"}</option>
            <option value="formal">{locale === "en" ? "Formal tone" : "공식 톤"}</option>
            <option value="casual">{locale === "en" ? "Casual tone" : "캐주얼 톤"}</option>
          </select>
          <select
            value={runner}
            onChange={(event) => setRunner(event.target.value as CsAiRunner)}
            className="rounded-full border border-border-base bg-white/6 px-4 py-2 text-sm text-white"
          >
            <option value="claude">Claude</option>
            <option value="codex">Codex</option>
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI API</option>
          </select>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onRegenerate({ tone })}
          >
            {copy.regenerateTone}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onRegenerate({ runner })}
          >
            {copy.regenerateRunner}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
