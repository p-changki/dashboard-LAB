import { hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { updateStatus } from "@/lib/call-to-prd/call-store";
import { checkCodexInstalled, runCodexPrd } from "@/lib/call-to-prd/codex-runner";
import { formatKnownCallToPrdRuntimeMessage } from "@/lib/call-to-prd/messages";
import { formatPrdMarkdown } from "@/lib/call-to-prd/prd-markdown-formatter";
import { checkClaudeInstalled, runClaudePrd } from "@/lib/call-to-prd/prd-runner";
import {
  buildGenerationFailureMessage,
  getErrorMessage,
  isClaudeUsageLimitError,
} from "@/lib/call-to-prd/pipeline/shared";
import { readLocaleFromHeaders } from "@/lib/locale";
import type { CallGenerationMode } from "@/lib/types/call-to-prd";

interface AiGenerationInput {
  id: string;
  prompt: string;
  runnerCwd: string | undefined;
  generationMode: CallGenerationMode;
  locale: ReturnType<typeof readLocaleFromHeaders>;
  generationWarnings: string[];
  transcript: string;
  pdfContent: string | null;
  pdfAnalysis: string | null;
  effectiveProjectName: string | null;
  projectPath: string | null;
  projectContext: string | null;
  projectContextSources: string[];
  projectContextError: string | null;
  baselineEntryName: string | null;
  baselineTitle: string | null;
}

export interface AiGenerationResult {
  claudePrd: string | null;
  codexPrd: string | null;
  openAiPrd: string | null;
  claudeError: string | null;
  codexError: string | null;
  openAiError: string | null;
  effectiveGenerationMode: CallGenerationMode;
}

// Runs the configured generation mode (claude / codex / dual / openai) with
// availability and usage-limit fallbacks. Returns null after recording a
// failed status when no output could be produced, so the caller can stop.
export async function runAiGeneration(input: AiGenerationInput): Promise<AiGenerationResult | null> {
  const {
    id,
    prompt,
    runnerCwd,
    generationMode,
    locale,
    generationWarnings,
    transcript,
    pdfContent,
    pdfAnalysis,
    effectiveProjectName,
    projectPath,
    projectContext,
    projectContextSources,
    projectContextError,
    baselineEntryName,
    baselineTitle,
  } = input;

    let effectiveGenerationMode: CallGenerationMode = generationMode;
    const openAiAvailable = hasOpenAiApiFallback();
    const claudeAvailable = generationMode === "openai" ? false : await checkClaudeInstalled();
    const codexAvailable = generationMode === "openai" ? false : await checkCodexInstalled();
    let claudeResult: PromiseSettledResult<string> | null = null;
    let codexResult: PromiseSettledResult<string> | null = null;
    let openAiResult: PromiseSettledResult<string> | null = null;

    if (generationMode === "openai") {
      [openAiResult] = await Promise.allSettled([
        runClaudePrd(prompt, {
          cwd: runnerCwd,
          provider: "openai",
          allowOpenAiFallback: false,
        }),
      ]);
    } else if (generationMode === "claude") {
      if (claudeAvailable) {
        [claudeResult] = await Promise.allSettled([runClaudePrd(prompt, { cwd: runnerCwd, allowOpenAiFallback: false })]);
      } else if (openAiAvailable) {
        effectiveGenerationMode = "openai";
        generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Claude CLI가 없어 OpenAI API 생성으로 전환했습니다.", locale));
        [openAiResult] = await Promise.allSettled([
          runClaudePrd(prompt, {
            cwd: runnerCwd,
            provider: "openai",
            allowOpenAiFallback: false,
          }),
        ]);
      } else {
        [claudeResult] = await Promise.allSettled([runClaudePrd(prompt, { cwd: runnerCwd, allowOpenAiFallback: false })]);
      }
    } else if (generationMode === "codex") {
      if (!codexAvailable) {
        if (openAiAvailable) {
          effectiveGenerationMode = "openai";
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Codex CLI가 없어 OpenAI API 생성으로 전환했습니다.", locale));
          [openAiResult] = await Promise.allSettled([
            runClaudePrd(prompt, {
              cwd: runnerCwd,
              provider: "openai",
              allowOpenAiFallback: false,
            }),
          ]);
        } else {
          updateStatus(id, "failed", {
            transcript,
            pdfContent,
            pdfAnalysis,
            projectName: effectiveProjectName,
            projectPath: projectPath,
            projectContext,
            projectContextSources,
            projectContextError,
            baselineEntryName,
            baselineTitle,
            generationMode: generationMode,
            error: formatKnownCallToPrdRuntimeMessage(
              "Codex CLI가 설치되어 있지 않습니다. Codex를 설치하거나 OpenAI API 키를 저장한 뒤 다시 시도해 주세요.",
              locale,
            ),
          });
          return null;
        }
      } else {
        [codexResult] = await Promise.allSettled([runCodexPrd(prompt, { cwd: runnerCwd })]);
      }
    } else {
      if (codexAvailable) {
        if (claudeAvailable) {
          [claudeResult, codexResult] = await Promise.allSettled([
            runClaudePrd(prompt, { cwd: runnerCwd, allowOpenAiFallback: false }),
            runCodexPrd(prompt, { cwd: runnerCwd }),
          ]);
        } else if (openAiAvailable) {
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Claude CLI가 없어 OpenAI API + Codex 조합으로 생성했습니다.", locale));
          [openAiResult, codexResult] = await Promise.allSettled([
            runClaudePrd(prompt, {
              cwd: runnerCwd,
              provider: "openai",
              allowOpenAiFallback: false,
            }),
            runCodexPrd(prompt, { cwd: runnerCwd }),
          ]);
        } else {
          effectiveGenerationMode = "codex";
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Claude CLI가 없어 Codex 단일 생성으로 전환했습니다.", locale));
          [codexResult] = await Promise.allSettled([runCodexPrd(prompt, { cwd: runnerCwd })]);
        }
      } else if (claudeAvailable) {
        effectiveGenerationMode = "claude";
        generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Codex가 설치되어 있지 않아 Claude 단일 생성으로 전환했습니다.", locale));
        [claudeResult] = await Promise.allSettled([runClaudePrd(prompt, { cwd: runnerCwd, allowOpenAiFallback: false })]);
      } else if (openAiAvailable) {
        effectiveGenerationMode = "openai";
        generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Codex와 Claude CLI가 없어 OpenAI API 단일 생성으로 전환했습니다.", locale));
        [openAiResult] = await Promise.allSettled([
          runClaudePrd(prompt, {
            cwd: runnerCwd,
            provider: "openai",
            allowOpenAiFallback: false,
          }),
        ]);
      } else {
        updateStatus(id, "failed", {
          transcript,
          pdfContent,
          pdfAnalysis,
          projectName: effectiveProjectName,
          projectPath: projectPath,
          projectContext,
          projectContextSources,
          projectContextError,
          baselineEntryName,
          baselineTitle,
          generationMode: generationMode,
          error: formatKnownCallToPrdRuntimeMessage(
            "Dual AI를 사용하려면 Claude 또는 Codex 중 하나 이상이 준비되어 있어야 합니다. CLI를 설치하거나 OpenAI API 키를 저장해 주세요.",
            locale,
          ),
        });
        return null;
      }
    }

    const initialClaudeError =
      claudeResult?.status === "rejected" ? getErrorMessage(claudeResult.reason, locale) : null;

    if (initialClaudeError && isClaudeUsageLimitError(initialClaudeError)) {
      if (effectiveGenerationMode === "claude") {
        if (codexAvailable) {
          effectiveGenerationMode = "codex";
          generationWarnings.push(
            formatKnownCallToPrdRuntimeMessage("Claude 사용량 제한으로 Codex 단일 생성으로 전환했습니다.", locale),
          );
          [codexResult] = await Promise.allSettled([runCodexPrd(prompt, { cwd: runnerCwd })]);
        } else if (openAiAvailable) {
          effectiveGenerationMode = "openai";
          generationWarnings.push(
            formatKnownCallToPrdRuntimeMessage("Claude 사용량 제한으로 OpenAI API 생성으로 전환했습니다.", locale),
          );
          [openAiResult] = await Promise.allSettled([
            runClaudePrd(prompt, {
              cwd: runnerCwd,
              provider: "openai",
              allowOpenAiFallback: false,
            }),
          ]);
        }
      } else if (effectiveGenerationMode === "dual") {
        if (codexResult?.status === "fulfilled" && openAiAvailable) {
          generationWarnings.push(
            formatKnownCallToPrdRuntimeMessage("Claude 사용량 제한으로 OpenAI API + Codex 조합으로 생성했습니다.", locale),
          );
          [openAiResult] = await Promise.allSettled([
            runClaudePrd(prompt, {
              cwd: runnerCwd,
              provider: "openai",
              allowOpenAiFallback: false,
            }),
          ]);

          if (openAiResult.status !== "fulfilled") {
            openAiResult = null;
            effectiveGenerationMode = "codex";
            generationWarnings.push(
              formatKnownCallToPrdRuntimeMessage("Claude 사용량 제한으로 Codex 단일 생성으로 전환했습니다.", locale),
            );
          }
        } else if (codexResult?.status === "fulfilled") {
          effectiveGenerationMode = "codex";
          generationWarnings.push(
            formatKnownCallToPrdRuntimeMessage("Claude 사용량 제한으로 Codex 단일 생성으로 전환했습니다.", locale),
          );
        } else if (openAiAvailable) {
          effectiveGenerationMode = "openai";
          generationWarnings.push(
            formatKnownCallToPrdRuntimeMessage("Claude 사용량 제한으로 OpenAI API 생성으로 전환했습니다.", locale),
          );
          [openAiResult] = await Promise.allSettled([
            runClaudePrd(prompt, {
              cwd: runnerCwd,
              provider: "openai",
              allowOpenAiFallback: false,
            }),
          ]);
        }
      }
    }

    const claudePrd = claudeResult?.status === "fulfilled" ? formatPrdMarkdown(claudeResult.value) : null;
    const codexPrd = codexResult?.status === "fulfilled" ? formatPrdMarkdown(codexResult.value) : null;
    const openAiPrd = openAiResult?.status === "fulfilled" ? formatPrdMarkdown(openAiResult.value) : null;
    const claudeError = claudeResult?.status === "rejected" ? getErrorMessage(claudeResult.reason, locale) : null;
    const codexError = codexResult?.status === "rejected" ? getErrorMessage(codexResult.reason, locale) : null;
    const openAiError = openAiResult?.status === "rejected" ? getErrorMessage(openAiResult.reason, locale) : null;

    if (!claudePrd && !codexPrd && !openAiPrd) {
      updateStatus(id, "failed", {
        transcript,
        pdfContent,
        pdfAnalysis,
        projectName: effectiveProjectName,
        projectPath: projectPath,
        projectContext,
        projectContextSources,
        projectContextError,
        baselineEntryName,
        baselineTitle,
        generationMode: effectiveGenerationMode,
        error: buildGenerationFailureMessage({
          locale: locale,
          generationMode: effectiveGenerationMode,
          claudeError,
          codexError,
          openAiError,
        }),
      });
      return null;
    }

  return {
    claudePrd,
    codexPrd,
    openAiPrd,
    claudeError,
    codexError,
    openAiError,
    effectiveGenerationMode,
  };
}
