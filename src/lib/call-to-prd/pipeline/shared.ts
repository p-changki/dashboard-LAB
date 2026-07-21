import { readLocaleFromHeaders } from "@/lib/locale";
import { formatKnownCallToPrdRuntimeMessage } from "@/lib/call-to-prd/messages";
import type { CallGenerationMode } from "@/lib/types/call-to-prd";

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function buildFallbackDiffReport(options: {
  locale: ReturnType<typeof readLocaleFromHeaders>;
  generationMode: CallGenerationMode;
  claudePrd: string | null;
  codexPrd: string | null;
  openAiPrd: string | null;
  claudeError: string | null;
  codexError: string | null;
  openAiError: string | null;
}): string | null {
  const { generationMode, claudePrd, codexPrd, openAiPrd, claudeError, codexError, openAiError, locale } = options;

  if (generationMode === "claude") {
    return locale === "en" ? "(Claude single-generation mode)" : "(Claude 단일 생성 모드)";
  }

  if (generationMode === "codex") {
    return locale === "en" ? "(Codex single-generation mode)" : "(Codex 단일 생성 모드)";
  }

  if (generationMode === "openai") {
    return locale === "en" ? "(OpenAI API single-generation mode)" : "(OpenAI API 단일 생성 모드)";
  }

  if ((claudePrd || openAiPrd) && !codexPrd) {
    if (codexError === "Codex 미설치") {
      return locale === "en" ? "(Codex not installed)" : "(Codex 미설치)";
    }
    return formatKnownCallToPrdRuntimeMessage(`Codex 실패: ${codexError ?? getErrorMessage(null, locale)}`, locale);
  }

  if (!claudePrd && !openAiPrd && codexPrd) {
    if (openAiError) {
      return formatKnownCallToPrdRuntimeMessage(`OpenAI API 실패: ${openAiError}`, locale);
    }

    return formatKnownCallToPrdRuntimeMessage(`Claude 실패: ${claudeError ?? getErrorMessage(null, locale)}`, locale);
  }

  return null;
}

export function getErrorMessage(error: unknown, locale: ReturnType<typeof readLocaleFromHeaders>): string {
  return error instanceof Error ? error.message : (locale === "en" ? "Unknown error" : "알 수 없는 오류");
}

export function isCallGenerationMode(value: string): value is CallGenerationMode {
  return value === "claude" || value === "codex" || value === "dual" || value === "openai";
}

export function buildGenerationFailureMessage(options: {
  locale: ReturnType<typeof readLocaleFromHeaders>;
  generationMode: CallGenerationMode;
  claudeError: string | null;
  codexError: string | null;
  openAiError: string | null;
}): string {
  const { locale, generationMode, claudeError, codexError, openAiError } = options;

  if (generationMode === "claude") {
    return formatKnownCallToPrdRuntimeMessage(`Claude 실패: ${claudeError ?? getErrorMessage(null, locale)}`, locale);
  }

  if (generationMode === "codex") {
    return formatKnownCallToPrdRuntimeMessage(`Codex 실패: ${codexError ?? getErrorMessage(null, locale)}`, locale);
  }

  if (generationMode === "openai") {
    return formatKnownCallToPrdRuntimeMessage(`OpenAI API 실패: ${openAiError ?? getErrorMessage(null, locale)}`, locale);
  }

  const messages = [
    claudeError ? formatKnownCallToPrdRuntimeMessage(`Claude 실패: ${claudeError}`, locale) : null,
    openAiError ? formatKnownCallToPrdRuntimeMessage(`OpenAI API 실패: ${openAiError}`, locale) : null,
    codexError ? formatKnownCallToPrdRuntimeMessage(`Codex 실패: ${codexError}`, locale) : null,
  ].filter((message): message is string => Boolean(message));

  return messages.join(" / ") || (locale === "en" ? "AI generation failed" : "AI 생성 실패");
}

export function isClaudeUsageLimitError(message: string | null) {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return [
    "you've hit your limit",
    "you have hit your limit",
    "usage limit",
    "rate limit",
    "quota",
    "resets 12am",
    "resets at",
  ].some((pattern) => normalized.includes(pattern));
}
