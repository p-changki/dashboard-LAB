"use client";

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

const CHANNEL_LABELS: Record<CsChannel, string> = {
  kakao: "카카오톡",
  email: "이메일",
  instagram: "인스타그램",
  phone: "전화",
  other: "기타",
};

const TONE_LABELS: Record<CsTone, string> = {
  friendly: "친절",
  formal: "공식",
  casual: "캐주얼",
};

export function CsSettingsBar(props: CsSettingsBarProps) {
  return (
    <section className="panel p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField
          label="프로젝트"
          value={props.projectId}
          onChange={props.onProjectChange}
          options={props.projects.map((project) => ({
            value: project.id,
            label: project.name,
          }))}
        />
        <SelectField
          label="AI"
          value={props.runner}
          onChange={(value) => props.onRunnerChange(value as CsAiRunner)}
          options={[
            { value: "claude", label: "Claude" },
            { value: "codex", label: "Codex" },
            { value: "gemini", label: "Gemini" },
          ]}
        />
        <SelectField
          label="채널"
          value={props.channel}
          onChange={(value) => props.onChannelChange(value as CsChannel)}
          options={Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <SelectField
          label="톤"
          value={props.tone}
          onChange={(value) => props.onToneChange(value as CsTone)}
          options={Object.entries(TONE_LABELS).map(([value, label]) => ({ value, label }))}
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
    <label className="block">
      <p className="mb-2 text-sm text-[var(--color-muted)]">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
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
