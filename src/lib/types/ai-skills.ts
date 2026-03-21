export type SkillStatus = "queued" | "running" | "completed" | "failed";
export type SkillRunnerType = "claude" | "codex";
export type SkillCategory = "content" | "research" | "automation" | "custom";

export interface SkillInput {
  name: string;
  label: string;
  type: "text" | "url" | "textarea";
  placeholder: string;
  required: boolean;
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  runner: SkillRunnerType;
  promptTemplate: string;
  inputs: SkillInput[];
  icon: string;
  category: SkillCategory;
  builtin: boolean;
}

export interface SkillRun {
  id: string;
  skillId: string;
  skillName: string;
  runner: SkillRunnerType;
  prompt: string;
  status: SkillStatus;
  startedAt: string;
  completedAt: string | null;
  output: string | null;
  error: string | null;
  pid: number | null;
  cwd: string;
}

export interface SkillRunRequest {
  skillId: string;
  inputs: Record<string, string>;
}

export interface SkillRunResponse {
  runId: string;
  status: SkillStatus;
}

export interface SkillHistoryResponse {
  runs: SkillRun[];
  totalCount: number;
}
