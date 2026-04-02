"use client";

import { useEffect, useState } from "react";
import { PenSquare } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { getInfoHubCopy } from "@/features/info-hub/copy";
import {
  readSignalWriterPicks,
  subscribeSignalWriterPicks,
  toggleSignalWriterPick,
} from "@/lib/info-hub/local-state";
import type { AiSkillRecommendationsResponse } from "@/lib/types";

export function AiSkillRecommendations({ data }: { data: AiSkillRecommendationsResponse | null }) {
  const { locale } = useLocale();
  const copy = getInfoHubCopy(locale);
  const [signalWriterPicks, setSignalWriterPicks] = useState(() => readSignalWriterPicks());

  useEffect(() => {
    return subscribeSignalWriterPicks(() => {
      setSignalWriterPicks(readSignalWriterPicks());
    });
  }, []);

  if (!data || data.sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {data.projectSignals.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.projectSignals.map((signal) => (
            <Badge key={signal} variant="success" size="sm">
              {copy.currentProject}: {signal}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {data.sections.map((section) => (
          <article key={section.model} className="rounded-2xl border border-border-base bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{section.model}</h3>
              <Badge variant="neutral" size="sm">{copy.recommendationsCount(section.items.length)}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/55">{section.summary}</p>

            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border-base bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info" size="sm">
                        {item.extra?.skillType === "npm-package" ? "npm" : "GitHub"}
                      </Badge>
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="neutral" size="sm">{tag}</Badge>
                      ))}
                    </div>
                    <SignalWriterPickButton
                      active={Boolean(signalWriterPicks[item.id])}
                      label={Boolean(signalWriterPicks[item.id]) ? copy.signalWriterPicked : copy.signalWriterPick}
                      onClick={() => setSignalWriterPicks(toggleSignalWriterPick(item))}
                    />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-white">{locale === "en" ? item.title : item.titleKo || item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-white/65">{item.summary}</p>
                  {item.extra?.recommendationReason ? (
                    <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                      {copy.recommendationReason}: {item.extra.recommendationReason}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200"
                    >
                      {copy.openNow}
                    </a>
                    {typeof item.extra?.stars === "number" ? (
                      <span className="text-xs text-white/45">Stars {item.extra.stars.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}</span>
                    ) : null}
                    {typeof item.extra?.weeklyDownloads === "number" ? (
                      <span className="text-xs text-white/45">Score {item.extra.weeklyDownloads.toLocaleString(locale === "en" ? "en-US" : "ko-KR")}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SignalWriterPickButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-1 rounded-full border px-3 py-1 text-xs transition",
        active
          ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
          : "border-border-base bg-black/20 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      <PenSquare className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
