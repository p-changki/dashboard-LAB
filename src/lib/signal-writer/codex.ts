import path from "node:path";

import { containsCliTranscriptLeak } from "@/lib/ai/structured-output";
import { buildDashboardLabCodexExecArgs } from "@/lib/codex-cli";
import type { SpawnTaskResult } from "@/lib/ai-skills/runner";
import type { AppLocale } from "@/lib/locale";
import { recordSignalWriterCodexHealthEvent } from "@/lib/signal-writer/runner-health";
import type { SignalWriterActionErrorCode } from "@/lib/types";

export type SignalWriterSchemaName = "draft" | "fact-check" | "research" | "trend-board";

const SIGNAL_WRITER_SCHEMA_FILES: Record<SignalWriterSchemaName, string> = {
  draft: "draft-output.schema.json",
  "fact-check": "fact-check-output.schema.json",
  research: "research-output.schema.json",
  "trend-board": "trend-board-output.schema.json",
};

export function buildSignalWriterCodexArgs(
  prompt: string,
  outputPath: string,
  schemaName: SignalWriterSchemaName,
) {
  return buildDashboardLabCodexExecArgs(prompt, {
    outputPath,
    outputSchemaPath: getSignalWriterSchemaPath(schemaName),
  });
}

export class SignalWriterCodexOutputError extends Error {
  code: SignalWriterActionErrorCode;

  constructor(message: string, code: SignalWriterActionErrorCode) {
    super(message);
    this.name = "SignalWriterCodexOutputError";
    this.code = code;
  }
}

export function throwIfSignalWriterCodexOutputCorrupted(
  raw: string,
  locale: AppLocale,
  schemaName: SignalWriterSchemaName,
) {
  if (containsCliTranscriptLeak(raw)) {
    throw createSignalWriterCodexCorruptedOutputError(locale, schemaName);
  }
}

export function createSignalWriterCodexInvalidOutputError(
  locale: AppLocale,
  schemaName: SignalWriterSchemaName,
) {
  recordSignalWriterCodexHealthEvent(schemaName, "invalid");

  return new SignalWriterCodexOutputError(
    getSignalWriterCodexOutputMessage(locale, schemaName, "invalid"),
    "codex_output_invalid",
  );
}

export function createSignalWriterCodexCorruptedOutputError(
  locale: AppLocale,
  schemaName: SignalWriterSchemaName,
) {
  recordSignalWriterCodexHealthEvent(schemaName, "corrupted");

  return new SignalWriterCodexOutputError(
    getSignalWriterCodexOutputMessage(locale, schemaName, "corrupted"),
    "codex_output_corrupted",
  );
}

export function unwrapSignalWriterCodexResult(
  result: SpawnTaskResult,
  locale: AppLocale,
  schemaName: SignalWriterSchemaName,
  emptyMessage: string,
) {
  if (result.output) {
    throwIfSignalWriterCodexOutputCorrupted(result.output, locale, schemaName);
    return result.output;
  }

  if (result.error) {
    if (containsCliTranscriptLeak(result.error)) {
      throw createSignalWriterCodexCorruptedOutputError(locale, schemaName);
    }

    throw new Error(result.error);
  }

  throw new Error(emptyMessage);
}

export function getSignalWriterCodexOutputErrorFromMessage(
  message: string,
  locale: AppLocale,
  schemaName: SignalWriterSchemaName,
) {
  if (!containsCliTranscriptLeak(message)) {
    return null;
  }

  return createSignalWriterCodexCorruptedOutputError(locale, schemaName);
}

export function isSignalWriterCodexOutputError(error: unknown): error is SignalWriterCodexOutputError {
  return error instanceof SignalWriterCodexOutputError;
}

function getSignalWriterSchemaPath(schemaName: SignalWriterSchemaName) {
  return path.join(
    process.cwd(),
    "src",
    "lib",
    "signal-writer",
    "schemas",
    SIGNAL_WRITER_SCHEMA_FILES[schemaName],
  );
}

function getSignalWriterCodexOutputMessage(
  locale: AppLocale,
  schemaName: SignalWriterSchemaName,
  reason: "corrupted" | "invalid",
) {
  const label = locale === "en"
    ? {
        draft: "draft",
        "fact-check": "fact-check result",
        research: "research result",
        "trend-board": "Trend Board draft",
      }[schemaName]
    : {
        draft: "초안",
        "fact-check": "팩트체크 결과",
        research: "리서치 결과",
        "trend-board": "Trend Board 초안",
      }[schemaName];

  if (locale === "en") {
    if (reason === "corrupted") {
      return `Codex response for the ${label} included session logs, so it was not saved. Try again once, or switch runners if it repeats.`;
    }

    return `Codex did not return a valid structured response for the ${label}, so it was not saved. Try again once, or switch runners if it repeats.`;
  }

  if (reason === "corrupted") {
    return `Codex 응답에 세션 로그가 섞여 ${label}을 저장하지 않았습니다. 한 번 더 시도하고, 반복되면 다른 러너로 전환하세요.`;
  }

  return `Codex가 ${label}용 구조화 응답을 올바르게 반환하지 못해 저장하지 않았습니다. 한 번 더 시도하고, 반복되면 다른 러너로 전환하세요.`;
}
