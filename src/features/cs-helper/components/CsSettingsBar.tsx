"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { getCsHelperCopy } from "@/features/cs-helper/copy";
import type { CsAiRunner, CsChannel, CsProject, CsTone } from "@/lib/types";

interface CsSettingsBarProps {
  projects: CsProject[];
  projectId: string;
  runner: CsAiRunner;
  channel: CsChannel;
  tone: CsTone;
  onProjectChange: (value: string) => void;
  onRunnerChange: (value: CsAiRunner) => void;
  onChannelChange: (value: CsChannel) => void;
  onToneChange: (value: CsTone) => void;
}

export function CsSettingsBar(props: CsSettingsBarProps) {
  const { locale } = useLocale();
  const copy = getCsHelperCopy(locale);

  return (
    <section className="panel p-5 lg:p-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <SelectField
          label={copy.settings.project}
          value={props.projectId}
          onChange={props.onProjectChange}
          options={props.projects.map((project) => ({
            value: project.id,
            label: project.name,
          }))}
        />
        <SelectField
          label={copy.settings.ai}
          value={props.runner}
          onChange={(value) => props.onRunnerChange(value as CsAiRunner)}
          options={[
            { value: "claude", label: "Claude" },
            { value: "codex", label: "Codex" },
            { value: "gemini", label: "Gemini" },
            { value: "openai", label: "OpenAI API" },
          ]}
        />
        <SelectField
          label={copy.settings.channel}
          value={props.channel}
          onChange={(value) => props.onChannelChange(value as CsChannel)}
          options={[
            { value: "kakao", label: copy.getChannelLabel("kakao") },
            { value: "email", label: copy.getChannelLabel("email") },
            { value: "instagram", label: copy.getChannelLabel("instagram") },
            { value: "phone", label: copy.getChannelLabel("phone") },
            { value: "other", label: copy.getChannelLabel("other") },
          ]}
        />
        <SelectField
          label={copy.settings.tone}
          value={props.tone}
          onChange={(value) => props.onToneChange(value as CsTone)}
          options={[
            { value: "friendly", label: copy.getToneLabel("friendly") },
            { value: "formal", label: copy.getToneLabel("formal") },
            { value: "casual", label: copy.getToneLabel("casual") },
          ]}
        />
      </div>
    </section>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-2">
      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-border-base bg-black/15 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-950 text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
