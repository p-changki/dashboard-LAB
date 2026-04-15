import { checkCommandAvailable } from "@/lib/command-availability";
import { buildDashboardLabCodexExecArgs } from "@/lib/codex-cli";
import { generateOpenAiText, hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { persistJson, readPersistentJson } from "@/lib/storage/persistent-json";
import { runSpawnTask } from "@/lib/ai-skills/runner";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/locale";
import type {
  CsAiRunner,
  CsHistoryResponse,
  CsHistoryItem,
  CsRegenerateRequest,
  CsRequest,
  CsResponse,
} from "@/lib/types";

import { buildAnalysisPrompt, buildCsPrompt } from "./cs-prompt-builder";
import { loadContext } from "./cs-context-loader";
import { getCsValidationMessage } from "./messages";

const MAX_HISTORY = 100;
const CS_TIMEOUT_MS = 30_000;
const MAX_CUSTOMER_MESSAGE = 2000;
const MAX_ADDITIONAL_CONTEXT = 1000;
const CS_STORE_FILE = "cs-history.json";
const csStore = getCsStore();

export class CsRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsRequestError";
  }
}

export async function generateCsReply(request: CsRequest, locale: AppLocale = DEFAULT_LOCALE) {
  validateCsRequest(request, locale);
  const context = await loadContext(request.projectId, locale);
  const resolvedRunner = await resolveCsRunner(request.runner, locale);
  const promptUsed = buildCsPrompt(request, context.content, locale);
  const replyResult = await runCsModel(resolvedRunner, promptUsed, locale);
  let analysis: string | null = null;

  if (request.includeAnalysis) {
    const analysisPrompt = buildAnalysisPrompt(request, context.content, locale);
    analysis = await runCsModel(resolvedRunner, analysisPrompt, locale);
  }

  const response: CsResponse = {
    id: crypto.randomUUID(),
    reply: replyResult,
    analysis,
    includeAnalysis: request.includeAnalysis,
    runner: resolvedRunner,
    projectId: request.projectId,
    channel: request.channel,
    tone: request.tone,
    inputMode: request.inputMode,
    customerMessage: request.customerMessage,
    additionalContext: request.additionalContext,
    createdAt: new Date().toISOString(),
    promptUsed,
  };

  rememberCsResponse(response);
  return response;
}

export async function generateCsAnalysis(request: CsRequest, locale: AppLocale = DEFAULT_LOCALE) {
  validateCsRequest(request, locale);
  const context = await loadContext(request.projectId, locale);
  const resolvedRunner = await resolveCsRunner(request.runner, locale);
  const promptUsed = buildAnalysisPrompt(request, context.content, locale);
  const analysis = await runCsModel(resolvedRunner, promptUsed, locale);
  return {
    id: crypto.randomUUID(),
    analysis,
    runner: resolvedRunner,
    projectId: request.projectId,
    inputMode: request.inputMode,
    customerMessage: request.customerMessage,
    createdAt: new Date().toISOString(),
  };
}

export async function regenerateCsReply(request: CsRegenerateRequest, locale: AppLocale = DEFAULT_LOCALE) {
  const original = csStore.get(request.originalId);

  if (!original) {
    throw new CsRequestError(getCsValidationMessage(locale, "originalNotFound"));
  }

  return generateCsReply({
    projectId: original.projectId,
    runner: request.runner ?? original.runner,
    channel: original.channel,
    tone: request.tone ?? original.tone,
    inputMode: original.inputMode ?? "customer",
    customerMessage: original.customerMessage,
    additionalContext: original.additionalContext,
    includeAnalysis: request.includeAnalysis ?? original.includeAnalysis,
  }, locale);
}

export function getCsHistory(): CsHistoryResponse {
  const items = [...csStore.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_HISTORY)
    .map(toHistoryItem);

  return {
    items,
    totalCount: csStore.size,
  };
}

export function getCsResponse(id: string) {
  return csStore.get(id) ?? null;
}

async function runCsModel(runner: CsAiRunner, prompt: string, locale: AppLocale) {
  if (runner === "openai") {
    return generateOpenAiText(prompt);
  }

  if (runner === "claude") {
    const result = await runSpawnTask({
      command: "claude",
      args: ["-p"],
      cwd: process.env.HOME || "/",
      input: prompt,
      timeoutMs: CS_TIMEOUT_MS,
    });
    return unwrapOutput(result.output, result.error, locale);
  }

  if (runner === "codex") {
    const outputPath = `/tmp/dashboard-lab-cs-${crypto.randomUUID()}.txt`;
    const result = await runSpawnTask({
      command: "codex",
      args: buildDashboardLabCodexExecArgs(prompt, { outputPath }),
      cwd: process.env.HOME || "/",
      outputPath,
      timeoutMs: CS_TIMEOUT_MS,
    });
    return unwrapOutput(result.output, result.error, locale);
  }

  const result = await runSpawnTask({
    command: "gemini",
    args: ["-p", prompt],
    cwd: process.env.HOME || "/",
    timeoutMs: CS_TIMEOUT_MS,
  });
  return unwrapOutput(result.output, result.error, locale);
}

async function resolveCsRunner(requestedRunner: CsAiRunner, locale: AppLocale): Promise<CsAiRunner> {
  if (requestedRunner === "openai") {
    if (!hasOpenAiApiFallback()) {
      throw new Error(getCsValidationMessage(locale, "openAiKeyMissing"));
    }

    return "openai";
  }

  if (requestedRunner === "claude") {
    if (await checkCommandAvailable("claude")) {
      return "claude";
    }

    return fallbackToOpenAiOrThrow("Claude CLI", locale);
  }

  if (requestedRunner === "codex") {
    if (await checkCommandAvailable("codex")) {
      return "codex";
    }

    return fallbackToOpenAiOrThrow("Codex CLI", locale);
  }

  if (await checkCommandAvailable("gemini")) {
    return "gemini";
  }

  return fallbackToOpenAiOrThrow("Gemini CLI", locale);
}

function fallbackToOpenAiOrThrow(label: string, locale: AppLocale): CsAiRunner {
  if (hasOpenAiApiFallback()) {
    return "openai";
  }

  throw new Error(getCsValidationMessage(locale, "runnerMissing", { label }));
}

function validateCsRequest(request: CsRequest, locale: AppLocale) {
  if (!request.projectId.trim()) {
    throw new CsRequestError(getCsValidationMessage(locale, "projectRequired"));
  }

  if (!request.customerMessage.trim()) {
    throw new CsRequestError(getCsValidationMessage(locale, "contentRequired"));
  }

  if (request.customerMessage.trim().length > MAX_CUSTOMER_MESSAGE) {
    throw new CsRequestError(getCsValidationMessage(locale, "contentTooLong"));
  }

  if (request.additionalContext.trim().length > MAX_ADDITIONAL_CONTEXT) {
    throw new CsRequestError(getCsValidationMessage(locale, "additionalTooLong"));
  }
}

function unwrapOutput(output: string | null, error: string | null, locale: AppLocale) {
  if (error) {
    throw new Error(error);
  }

  if (!output) {
    throw new Error(getCsValidationMessage(locale, "emptyResponse"));
  }

  return output;
}

function rememberCsResponse(response: CsResponse) {
  csStore.set(response.id, response);
  const entries = [...csStore.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  csStore.clear();
  entries.slice(-MAX_HISTORY).forEach((item) => csStore.set(item.id, item));
  persistJson(CS_STORE_FILE, [...csStore.values()]);
}

function getCsStore() {
  const globalStore = globalThis as typeof globalThis & {
    __dashboardLabCsStore?: Map<string, CsResponse>;
  };

  if (!globalStore.__dashboardLabCsStore) {
    const items = readPersistentJson<CsResponse[]>(CS_STORE_FILE, [])
      .map((item) => ({
        ...item,
        inputMode: item.inputMode ?? "customer",
        includeAnalysis: item.includeAnalysis ?? Boolean(item.analysis),
      }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(-MAX_HISTORY);
    globalStore.__dashboardLabCsStore = new Map<string, CsResponse>(
      items.map((item) => [item.id, item]),
    );
  }

  return globalStore.__dashboardLabCsStore;
}

function toHistoryItem(item: CsResponse): CsHistoryItem {
  return {
    id: item.id,
    projectId: item.projectId,
    channel: item.channel,
    inputMode: item.inputMode ?? "customer",
    customerMessagePreview: item.customerMessage.slice(0, 50),
    replyPreview: item.reply.slice(0, 50),
    customerMessage: item.customerMessage,
    additionalContext: item.additionalContext,
    reply: item.reply,
    analysis: item.analysis ?? null,
    includeAnalysis: item.includeAnalysis,
    runner: item.runner,
    tone: item.tone,
    createdAt: item.createdAt,
  };
}
