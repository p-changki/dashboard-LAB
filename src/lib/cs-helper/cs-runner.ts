import { checkCommandAvailable } from "@/lib/command-availability";
import { generateOpenAiText, hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { pathExists } from "@/lib/parsers/shared";
import { persistJson, readPersistentJson } from "@/lib/storage/persistent-json";
import { runSpawnTask } from "@/lib/ai-skills/runner";
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

export async function generateCsReply(request: CsRequest) {
  validateCsRequest(request);
  const context = await loadContext(request.projectId);
  const resolvedRunner = await resolveCsRunner(request.runner);
  const promptUsed = buildCsPrompt(request, context.content);
  const replyResult = await runCsModel(resolvedRunner, promptUsed);
  let analysis: string | null = null;

  if (request.includeAnalysis) {
    const analysisPrompt = buildAnalysisPrompt(request, context.content);
    analysis = await runCsModel(resolvedRunner, analysisPrompt);
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
    customerMessage: request.customerMessage,
    additionalContext: request.additionalContext,
    createdAt: new Date().toISOString(),
    promptUsed,
  };

  rememberCsResponse(response);
  return response;
}

export async function generateCsAnalysis(request: CsRequest) {
  validateCsRequest(request);
  const context = await loadContext(request.projectId);
  const resolvedRunner = await resolveCsRunner(request.runner);
  const promptUsed = buildAnalysisPrompt(request, context.content);
  const analysis = await runCsModel(resolvedRunner, promptUsed);
  return {
    id: crypto.randomUUID(),
    analysis,
    runner: resolvedRunner,
    projectId: request.projectId,
    customerMessage: request.customerMessage,
    createdAt: new Date().toISOString(),
  };
}

export async function regenerateCsReply(request: CsRegenerateRequest) {
  const original = csStore.get(request.originalId);

  if (!original) {
    throw new CsRequestError("원본 히스토리를 찾을 수 없습니다.");
  }

  return generateCsReply({
    projectId: original.projectId,
    runner: request.runner ?? original.runner,
    channel: original.channel,
    tone: request.tone ?? original.tone,
    customerMessage: original.customerMessage,
    additionalContext: original.additionalContext,
    includeAnalysis: request.includeAnalysis ?? original.includeAnalysis,
  });
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

async function runCsModel(runner: CsAiRunner, prompt: string) {
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
    return unwrapOutput(result.output, result.error);
  }

  if (runner === "codex") {
    const outputPath = `/tmp/dashboard-lab-cs-${crypto.randomUUID()}.txt`;
    const result = await runSpawnTask({
      command: "codex",
      args: ["exec", "-o", outputPath, prompt],
      cwd: process.env.HOME || "/",
      outputPath,
      timeoutMs: CS_TIMEOUT_MS,
    });
    return unwrapOutput(result.output, result.error);
  }

  const geminiCommand = (await pathExists("/opt/homebrew/bin/gemini")) ? "/opt/homebrew/bin/gemini" : "gemini";
  const result = await runSpawnTask({
    command: geminiCommand,
    args: ["-p", prompt],
    cwd: process.env.HOME || "/",
    timeoutMs: CS_TIMEOUT_MS,
  });
  return unwrapOutput(result.output, result.error);
}

async function resolveCsRunner(requestedRunner: CsAiRunner): Promise<CsAiRunner> {
  if (requestedRunner === "openai") {
    if (!hasOpenAiApiFallback()) {
      throw new Error("OpenAI API 키가 설정되어 있지 않습니다. 온보딩에서 API 키를 저장해 주세요.");
    }

    return "openai";
  }

  if (requestedRunner === "claude") {
    if (await checkCommandAvailable("claude")) {
      return "claude";
    }

    return fallbackToOpenAiOrThrow("Claude CLI");
  }

  if (requestedRunner === "codex") {
    if (await checkCommandAvailable("codex")) {
      return "codex";
    }

    return fallbackToOpenAiOrThrow("Codex CLI");
  }

  if (await pathExists("/opt/homebrew/bin/gemini") || await checkCommandAvailable("gemini")) {
    return "gemini";
  }

  return fallbackToOpenAiOrThrow("Gemini CLI");
}

function fallbackToOpenAiOrThrow(label: string): CsAiRunner {
  if (hasOpenAiApiFallback()) {
    return "openai";
  }

  throw new Error(`${label}가 설치되어 있지 않습니다. CLI를 설치하거나 온보딩에서 OpenAI API 키를 저장해 주세요.`);
}

function validateCsRequest(request: CsRequest) {
  if (!request.projectId.trim()) {
    throw new CsRequestError("프로젝트를 선택해 주세요.");
  }

  if (!request.customerMessage.trim()) {
    throw new CsRequestError("고객 메시지를 입력해 주세요.");
  }

  if (request.customerMessage.trim().length > MAX_CUSTOMER_MESSAGE) {
    throw new CsRequestError("고객 메시지는 2000자 이하로 입력해 주세요.");
  }

  if (request.additionalContext.trim().length > MAX_ADDITIONAL_CONTEXT) {
    throw new CsRequestError("추가 맥락은 1000자 이하로 입력해 주세요.");
  }
}

function unwrapOutput(output: string | null, error: string | null) {
  if (error) {
    throw new Error(error);
  }

  if (!output) {
    throw new Error("AI 응답이 비어 있습니다.");
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
