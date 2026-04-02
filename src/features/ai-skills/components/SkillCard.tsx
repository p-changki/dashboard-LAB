"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { getAiSkillsCopy } from "@/features/ai-skills/copy";
import type { SkillTemplate } from "@/lib/types";

interface SkillCardProps {
  skill: SkillTemplate;
  selected: boolean;
  onSelect: (skill: SkillTemplate) => void;
}

export function SkillCard({ skill, selected, onSelect }: SkillCardProps) {
  const { locale } = useLocale();
  const copy = getAiSkillsCopy(locale);

  return (
    <button
      type="button"
      onClick={() => onSelect(skill)}
      className={[
        "flex h-full flex-col rounded-3xl border p-5 text-left transition",
        selected
          ? "border-cyan-400/35 bg-cyan-400/10"
          : "border-border-base bg-white/5 hover:border-white/20 hover:bg-white/8",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="neutral">{skill.runner}</Badge>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{copy.categories[skill.category]}</Badge>
          <span className="text-xs text-text-muted">
            {skill.builtin ? copy.builtin : copy.custom}
          </span>
        </div>
      </div>
      <p className="mt-4 break-words text-lg font-semibold text-white">{skill.name}</p>
      <p className="mt-3 overflow-hidden text-sm leading-6 text-text-secondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
        {skill.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="neutral">
          {locale === "ko" ? `${skill.inputs.length}개 입력` : `${skill.inputs.length} inputs`}
        </Badge>
      </div>
    </button>
  );
}
