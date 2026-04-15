import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { AppLocale } from "@/lib/locale";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { getAiSkillApiError } from "@/lib/ai-skills/messages";
import {
  checkCommandAvailable,
  getCommandEnvironment,
  resolveCommandPath,
  resolveCommandPathSync,
} from "@/lib/command-availability";
import { buildDashboardLabCodexExecArgs } from "@/lib/codex-cli";
import { getRuntimeConfig } from "@/lib/runtime/config";
import { getSkillTemplates } from "@/lib/ai-skills/templates";
import { persistJson, readPersistentJson } from "@/lib/storage/persistent-json";
import type { SkillRun, SkillRunRequest, SkillRunResponse, SkillTemplate } from "@/lib/types";

const HOME_DIR = os.homedir();
const MAX_CONCURRENT = 3;
const MAX_HISTORY = 50;
const MAX_STDOUT_BYTES = 1024 * 1024;
const RUN_TIMEOUT_MS = 5 * 60 * 1000;
const SKILL_RUNS_FILE = "skill-runs.json";
const RECOVERY_ERROR_MESSAGE = "The app restarted before the skill run finished.";

const runStore = getRunStore();
const processStore = getProcessStore();
const queue = getQueueStore();
const queueState = getQueueState();

export interface SpawnTaskOptions {
  command: string;
  args: string[];
  cwd: string;
  input?: string;
  outputPath?: string | null;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export interface SpawnTaskResult {
  output: string | null;
  error: string | null;
  pid: number | null;
  exitCode: number | null;
}

interface SkillRunnerGlobalStore {
  __dashboardLabAiSkillRuns?: Map<string, SkillRun>;
  __dashboardLabAiSkillProcesses?: Map<string, { child: ChildProcess; outputPath: string | null }>;
  __dashboardLabAiSkillQueue?: string[];
  __dashboardLabAiSkillQueueState?: { isProcessing: boolean };
}

export class SkillRunnerInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillRunnerInputError";
  }
}

export async function queueSkillRun(
  request: SkillRunRequest,
  locale: AppLocale = DEFAULT_LOCALE,
): Promise<SkillRunResponse> {
  const template = await getTemplateOrThrow(request.skillId, locale);
  if (!(await checkCommandAvailable(template.runner))) {
    throw new SkillRunnerInputError(`${formatRunnerLabel(template.runner)} is unavailable.`);
  }
  validateInputs(template, request.inputs, locale);
  const runId = crypto.randomUUID();
  const prompt = buildPrompt(template.promptTemplate, request.inputs);
  const cwd = resolveRunDirectory(template, request.inputs, locale);
  const run: SkillRun = {
    id: runId,
    skillId: template.id,
    skillName: template.name,
    runner: template.runner,
    prompt,
    status: "queued",
    startedAt: new Date().toISOString(),
    completedAt: null,
    output: null,
    error: null,
    pid: null,
    cwd,
  };

  runStore.set(runId, run);
  queue.push(runId);
  persistRunStore();
  processQueue();
  return { runId, status: run.status };
}

export function getSkillRun(runId: string) {
  return runStore.get(runId) ?? null;
}

export function getSkillHistory() {
  const runs = [...runStore.values()].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  return { runs: runs.slice(0, MAX_HISTORY), totalCount: runs.length };
}

export function cancelSkillRun(runId: string, locale: AppLocale = DEFAULT_LOCALE) {
  const run = runStore.get(runId);

  if (!run) {
    return null;
  }

  if (run.status === "queued") {
    queue.splice(queue.indexOf(runId), 1);
    finalizeRun(runId, { status: "failed", error: getAiSkillApiError(locale, "queuedCanceled") });
    return runStore.get(runId) ?? null;
  }

  const active = processStore.get(runId);
  active?.child.kill("SIGTERM");
  finalizeRun(runId, { status: "failed", error: getAiSkillApiError(locale, "runningCanceled") });
  processStore.delete(runId);
  processQueue();
  return runStore.get(runId) ?? null;
}

export async function runSpawnTask({
  command,
  args,
  cwd,
  input,
  outputPath = null,
  timeoutMs = RUN_TIMEOUT_MS,
  maxOutputBytes = MAX_STDOUT_BYTES,
}: SpawnTaskOptions): Promise<SpawnTaskResult> {
  const commandPath = await resolveCommandPath(command);

  if (!commandPath) {
    return {
      output: null,
      error: `${command} is unavailable.`,
      pid: null,
      exitCode: null,
    };
  }

  const child = spawn(commandPath, args, {
    cwd,
    env: getCommandEnvironment({ TERM: "dumb" }),
    stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let stdoutBytes = 0;

  const timeout = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
  child.stdout?.on("data", (chunk: Buffer) => {
    stdoutBytes += chunk.byteLength;
    stdout += chunk.toString("utf8");
    if (stdoutBytes > maxOutputBytes) {
      stderr = getAiSkillApiError(DEFAULT_LOCALE, "outputLimit");
      child.kill("SIGTERM");
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });

  if (input) {
    child.stdin?.write(input);
    child.stdin?.end();
  }

  return new Promise((resolve) => {
    child.on("close", async (code) => {
      clearTimeout(timeout);
      resolve({
        output: outputPath ? await readCodexOutput(outputPath) : normalizeOutput(stdout),
        error: code === 0 ? null : stderr.trim() || getAiSkillApiError(DEFAULT_LOCALE, "abnormalExit"),
        pid: child.pid ?? null,
        exitCode: code,
      });
    });
  });
}

function getRunStore() {
  const globalStore = globalThis as typeof globalThis & SkillRunnerGlobalStore;
  globalStore.__dashboardLabAiSkillRuns ??= new Map<string, SkillRun>(
    hydrateRunHistory(readPersistentJson<SkillRun[]>(SKILL_RUNS_FILE, [])).map((run) => [run.id, run]),
  );
  return globalStore.__dashboardLabAiSkillRuns;
}

function getProcessStore() {
  const globalStore = globalThis as typeof globalThis & SkillRunnerGlobalStore;
  globalStore.__dashboardLabAiSkillProcesses ??= new Map<
    string,
    { child: ChildProcess; outputPath: string | null }
  >();
  return globalStore.__dashboardLabAiSkillProcesses;
}

function getQueueStore() {
  const globalStore = globalThis as typeof globalThis & SkillRunnerGlobalStore;
  globalStore.__dashboardLabAiSkillQueue ??= [];
  return globalStore.__dashboardLabAiSkillQueue;
}

function getQueueState() {
  const globalStore = globalThis as typeof globalThis & SkillRunnerGlobalStore;
  globalStore.__dashboardLabAiSkillQueueState ??= { isProcessing: false };
  return globalStore.__dashboardLabAiSkillQueueState;
}

async function processQueue() {
  if (queueState.isProcessing) {
    return;
  }

  queueState.isProcessing = true;

  try {
    while (processStore.size < MAX_CONCURRENT && queue.length > 0) {
      const runId = queue.shift();

      if (!runId) {
        return;
      }

      const run = runStore.get(runId);

      if (!run || run.status !== "queued") {
        continue;
      }

      const template = await getTemplateOrThrow(run.skillId, DEFAULT_LOCALE);
      void executeRun(run, template);
    }
  } finally {
    queueState.isProcessing = false;

    if (processStore.size < MAX_CONCURRENT && queue.length > 0) {
      void processQueue();
    }
  }
}

async function executeRun(run: SkillRun, template: SkillTemplate) {
  const outputPath = template.runner === "codex" ? path.join("/tmp", `dashboard-lab-${run.id}.txt`) : null;
  let child: ChildProcess;
  try {
    child = spawnRunner(template, run.prompt, run.cwd, outputPath);
  } catch (error) {
    finalizeRun(run.id, {
      status: "failed",
      output: null,
      error: error instanceof Error ? error.message : getAiSkillApiError(DEFAULT_LOCALE, "abnormalExit"),
    });
    void processQueue();
    return;
  }
  let stdout = "";
  let stderr = "";
  let stdoutBytes = 0;

  processStore.set(run.id, { child, outputPath });
  updateRun(run.id, { status: "running", pid: child.pid ?? null });
  const timeout = setTimeout(() => child.kill("SIGTERM"), RUN_TIMEOUT_MS);

  child.stdout?.on("data", (chunk: Buffer) => {
    stdoutBytes += chunk.byteLength;
    stdout += chunk.toString("utf8");
    if (stdoutBytes > MAX_STDOUT_BYTES) {
      stderr = getAiSkillApiError(DEFAULT_LOCALE, "outputLimitHard");
      child.kill("SIGTERM");
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });

  child.on("close", async (code) => {
    clearTimeout(timeout);
    processStore.delete(run.id);
    const output = template.runner === "codex" ? await readCodexOutput(outputPath) : normalizeOutput(stdout);
    const error = code === 0 ? null : stderr.trim() || getAiSkillApiError(DEFAULT_LOCALE, "abnormalExit");
    finalizeRun(run.id, { status: code === 0 ? "completed" : "failed", output, error });
    void processQueue();
  });

  if (template.runner === "claude") {
    child.stdin?.write(run.prompt);
    child.stdin?.end();
  }
}

function spawnRunner(template: SkillTemplate, prompt: string, cwd: string, outputPath: string | null) {
  if (template.runner === "codex" && outputPath) {
    const commandPath = resolveCommandPathSync("codex");
    if (!commandPath) {
      throw new Error("Codex CLI is unavailable.");
    }

    return spawn(commandPath, buildDashboardLabCodexExecArgs(prompt, { outputPath }), {
      cwd,
      env: getCommandEnvironment({ TERM: "dumb" }),
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  const commandPath = resolveCommandPathSync("claude");
  if (!commandPath) {
    throw new Error("Claude CLI is unavailable.");
  }

  return spawn(commandPath, ["-p", "--output-format", "json"], {
    cwd,
    env: getCommandEnvironment({ TERM: "dumb" }),
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function formatRunnerLabel(runner: SkillTemplate["runner"]) {
  return runner === "codex" ? "Codex CLI" : "Claude CLI";
}

async function getTemplateOrThrow(skillId: string, locale: AppLocale) {
  const templates = await getSkillTemplates(locale);
  const template = templates.find((entry) => entry.id === skillId);

  if (!template) {
    throw new SkillRunnerInputError(getAiSkillApiError(locale, "missingTemplate"));
  }

  return template;
}

function validateInputs(
  template: SkillTemplate,
  inputs: Record<string, string>,
  locale: AppLocale,
) {
  template.inputs.forEach((input) => {
    const value = inputs[input.name]?.trim() ?? "";

    if (input.required && !value) {
      throw new SkillRunnerInputError(getAiSkillApiError(locale, "missingInput", input.label));
    }

    if (value && input.type === "url" && !/^https?:\/\//.test(value)) {
      throw new SkillRunnerInputError(getAiSkillApiError(locale, "invalidUrl", input.label));
    }
  });
}

function buildPrompt(template: string, inputs: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => inputs[key]?.trim() ?? "").trim();
}

function resolveRunDirectory(
  template: SkillTemplate,
  inputs: Record<string, string>,
  locale: AppLocale,
) {
  const requested = template.runner === "codex" ? inputs.directory?.trim() ?? HOME_DIR : HOME_DIR;
  const normalized = requested.startsWith("~/") ? path.join(HOME_DIR, requested.slice(2)) : requested || HOME_DIR;
  const resolved = path.resolve(normalized);
  const runtimeConfig = getRuntimeConfig();
  const allowedRoots = [
    HOME_DIR,
    runtimeConfig.paths.projectsRoot,
    ...runtimeConfig.paths.allowedRoots,
  ];

  if (allowedRoots.some((allowedRoot) => isInsidePath(resolved, allowedRoot))) {
    return resolved;
  }

  throw new SkillRunnerInputError(getAiSkillApiError(locale, "invalidPath"));
}

async function readCodexOutput(outputPath: string | null) {
  if (!outputPath) {
    return null;
  }

  try {
    return normalizeOutput(await readFile(outputPath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeOutput(output: string) {
  const trimmed = output.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed;
  }
}

function isInsidePath(targetPath: string, rootPath: string) {
  const normalizedRoot = path.resolve(rootPath);
  return targetPath === normalizedRoot || targetPath.startsWith(`${normalizedRoot}${path.sep}`);
}

function updateRun(runId: string, patch: Partial<SkillRun>) {
  const run = runStore.get(runId);

  if (!run) {
    return;
  }

  runStore.set(runId, { ...run, ...patch });
  persistRunStore();
}

function finalizeRun(runId: string, patch: Partial<SkillRun>) {
  updateRun(runId, {
    ...patch,
    completedAt: new Date().toISOString(),
  });
}

function persistRunStore() {
  persistJson(SKILL_RUNS_FILE, [...runStore.values()]);
}

function hydrateRunHistory(runs: SkillRun[]): SkillRun[] {
  return runs
    .map((run) => recoverRun(run))
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
    .slice(-MAX_HISTORY);
}

function recoverRun(run: SkillRun): SkillRun {
  if (run.status !== "queued" && run.status !== "running") {
    return run;
  }

  return {
    ...run,
    status: "failed",
    error: run.error ?? RECOVERY_ERROR_MESSAGE,
    completedAt: run.completedAt ?? new Date().toISOString(),
    pid: null,
  };
}
