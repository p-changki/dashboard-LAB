"use client";

import { useMemo } from "react";

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
  const disabled = useMemo(
    () => runningRun?.status === "running" || runningRun?.status === "queued",
    [runningRun],
  );

  if (!skill) {
    return null;
  }

  return (
    <section className="panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
            실행 폼
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{skill.name}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-soft)]">
            {skill.description}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
          {skill.category}
        </span>
      </div>
      <div className="mt-6 grid gap-4">
        {skill.inputs.map((input) =>
          input.type === "textarea" ? (
            <textarea
              key={input.name}
              value={values[input.name] ?? ""}
              onChange={(event) => onChange(input.name, event.target.value)}
              placeholder={input.placeholder}
              className="min-h-32 rounded-3xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
            />
          ) : (
            <input
              key={input.name}
              type={input.type === "url" ? "url" : "text"}
              value={values[input.name] ?? ""}
              onChange={(event) => onChange(input.name, event.target.value)}
              placeholder={input.placeholder}
              className="rounded-3xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
            />
          ),
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-medium text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? "실행 중" : "실행"}
        </button>
        {runningRun ? (
          <button
            type="button"
            onClick={() => onCancel(runningRun.id)}
            className="rounded-full border border-white/12 bg-white/6 px-5 py-2 text-sm text-white transition hover:bg-white/10"
          >
            취소
          </button>
        ) : null}
      </div>
    </section>
  );
}
