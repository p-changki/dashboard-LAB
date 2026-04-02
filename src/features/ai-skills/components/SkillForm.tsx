"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getAiSkillsCopy } from "@/features/ai-skills/copy";
import type { SkillRun, SkillTemplate } from "@/lib/types";

interface SkillFormProps {
  skill: SkillTemplate | null;
  values: Record<string, string>;
  runningRun: SkillRun | null;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  onCancel: (runId: string) => void;
}

export function SkillForm({
  skill,
  values,
  runningRun,
  onChange,
  onSubmit,
  onCancel,
}: SkillFormProps) {
  const { locale } = useLocale();
  const copy = getAiSkillsCopy(locale);
  const disabled = useMemo(
    () => runningRun?.status === "running" || runningRun?.status === "queued",
    [runningRun],
  );
  const helperDescription = locale === "ko"
    ? `${skill?.inputs.length ?? 0}개의 입력만 채우면 바로 실행됩니다. 긴 설명은 아래 결과 패널에서 다시 확인할 수 있습니다.`
    : `Fill in the ${skill?.inputs.length ?? 0} inputs and run it right away. You can review the full output again in the result panel below.`;
  const helperResultDescription = locale === "ko"
    ? `${skill?.runner ?? ""} 기반 실행 결과는 아래 히스토리와 결과 패널에서 이어집니다.`
    : `Results from ${skill?.runner ?? ""} continue in the history and result panel below.`;

  if (!skill) {
    return null;
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-text-muted">
            {copy.formTitle}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{skill.name}</h3>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {skill.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="info">{skill.runner}</Badge>
            <Badge variant="neutral">{copy.categories[skill.category]}</Badge>
            <Badge variant="neutral">{skill.builtin ? copy.builtin : copy.custom}</Badge>
          </div>
        </div>
        {runningRun ? (
          <Badge variant="warning">{copy.status[runningRun.status]}</Badge>
        ) : null}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {skill.inputs.filter((input) => input.type !== "textarea").map((input) => (
              <label key={input.name} className="grid gap-2">
                <span className="text-sm font-medium text-white">
                  {input.label}
                  {input.required ? <span className="ml-1 text-cyan-200">*</span> : null}
                </span>
                <Input
                  type={input.type === "url" ? "url" : "text"}
                  variant="ghost"
                  size="lg"
                  value={values[input.name] ?? ""}
                  onChange={(event) => onChange(input.name, event.target.value)}
                  placeholder={input.placeholder}
                  className="rounded-3xl"
                />
              </label>
            ))}
          </div>
          {skill.inputs.filter((input) => input.type === "textarea").map((input) => (
            <label key={input.name} className="grid gap-2">
              <span className="text-sm font-medium text-white">
                {input.label}
                {input.required ? <span className="ml-1 text-cyan-200">*</span> : null}
              </span>
              <textarea
                value={values[input.name] ?? ""}
                onChange={(event) => onChange(input.name, event.target.value)}
                placeholder={input.placeholder}
                className="min-h-40 rounded-3xl border border-border-base bg-black/15 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
              />
            </label>
          ))}
        </div>
        <div className="rounded-3xl border border-border-base bg-black/15 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{copy.formTitle}</p>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {helperDescription}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={onSubmit}
              disabled={disabled}
              className="rounded-full px-5"
            >
              {disabled ? copy.running : copy.run}
            </Button>
            {runningRun ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onCancel(runningRun.id)}
                className="rounded-full px-5"
              >
                {copy.cancel}
              </Button>
            ) : null}
          </div>
          {runningRun ? (
            <div className="mt-5 rounded-2xl border border-border-base bg-white/5 px-4 py-3 text-sm text-text-secondary">
              {runningRun.skillName} · {runningRun.runner} · {copy.status[runningRun.status]}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-border-base bg-white/5 px-4 py-3 text-sm text-text-secondary">
              {helperResultDescription}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
