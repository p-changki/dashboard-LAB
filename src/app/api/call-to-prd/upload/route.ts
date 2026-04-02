import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { createRecord, updateStatus } from "@/lib/call-to-prd/call-store";
import {
  buildGeneratedDocTitle,
  isCallDocPreset,
  normalizeSelectedDocTypes,
  type CallDocPreset,
} from "@/lib/call-to-prd/document-config";
import {
  buildCallIntakeMetadataMarkdown,
  normalizeCallIntakeMetadata,
  type CallIntakeMetadata,
} from "@/lib/call-to-prd/intake-config";
import { analyzePdf } from "@/lib/call-to-prd/pdf-analyzer";
import { extractPdfText } from "@/lib/call-to-prd/pdf-extractor";
import { formatPrdMarkdown } from "@/lib/call-to-prd/prd-markdown-formatter";
import { buildCallToPrdPrompt } from "@/lib/call-to-prd/prd-prompt-builder";
import { inspectLocalProjectContext } from "@/lib/call-to-prd/project-context";
import { checkCodexInstalled, runCodexPrd } from "@/lib/call-to-prd/codex-runner";
import { mergeDualPrd } from "@/lib/call-to-prd/prd-merger";
import { checkClaudeInstalled, runClaudePrd } from "@/lib/call-to-prd/prd-runner";
import { resolveChangeRequestBaseline, saveGeneratedDocsBundle } from "@/lib/call-to-prd/saved-bundles";
import { generateSupportingDocument } from "@/lib/call-to-prd/supporting-documents";
import { buildCallWorkingContext } from "@/lib/call-to-prd/working-context";
import { getWhisperSetupError, transcribeAudio } from "@/lib/call-to-prd/whisper-runner";
import {
  formatKnownCallToPrdRuntimeMessage,
  getCallToPrdApiError,
  getCallToPrdDirectInputLabel,
  getCallToPrdDocLabel,
} from "@/lib/call-to-prd/messages";
import { hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { readLocaleFromHeaders } from "@/lib/locale";
import type { CallGenerationMode, GeneratedDoc, ProjectContextSnapshot } from "@/lib/types/call-to-prd";

const ALLOWED_AUDIO = [".m4a", ".mp3", ".wav", ".webm"];
const ALLOWED_PDF = [".pdf"];
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  try {
    const locale = readLocaleFromHeaders(request.headers);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pdfFile = formData.get("pdfFile") as File | null;
    const projectPath = (formData.get("projectPath") as string) || null;
    const customerName = (formData.get("customerName") as string) || null;
    const callDate = (formData.get("callDate") as string) || new Date().toISOString().slice(0, 10);
    const additionalContext = (formData.get("additionalContext") as string) || null;
    const directTranscript = (formData.get("directTranscript") as string) || null;
    const baselineEntryName = (formData.get("baselineEntryName") as string) || null;
    const rawGenerationMode = (formData.get("generationMode") as string) || "claude";
    const generationMode: CallGenerationMode = isCallGenerationMode(rawGenerationMode) ? rawGenerationMode : "claude";
    const rawGenerationPreset = (formData.get("generationPreset") as string) || "core";
    const generationPreset: CallDocPreset = isCallDocPreset(rawGenerationPreset) ? rawGenerationPreset : "core";
    const intake = normalizeCallIntakeMetadata({
      inputKind: (formData.get("inputKind") as string) || undefined,
      severity: (formData.get("severity") as string) || undefined,
      customerImpact: (formData.get("customerImpact") as string) || undefined,
      urgency: (formData.get("urgency") as string) || undefined,
      reproducibility: (formData.get("reproducibility") as string) || undefined,
      currentWorkaround: (formData.get("currentWorkaround") as string) || undefined,
      separateExternalDocs: (() => {
        const value = formData.get("separateExternalDocs");
        if (typeof value !== "string") {
          return undefined;
        }
        return value === "true";
      })(),
    });
    const selectedDocTypes = normalizeSelectedDocTypes(
      formData.getAll("selectedDocTypes").filter((value): value is string => typeof value === "string"),
      generationPreset,
    );

    const id = randomUUID();

    if (!file && !directTranscript) {
      return NextResponse.json({ error: getCallToPrdApiError(locale, "NO_INPUT") }, { status: 400 });
    }

    if (!projectPath) {
      return NextResponse.json({ error: getCallToPrdApiError(locale, "PROJECT_REQUIRED") }, { status: 400 });
    }

    const inspectedProjectContext = await inspectLocalProjectContext(projectPath);
    if (!inspectedProjectContext.context) {
      return NextResponse.json(
        {
          error: getCallToPrdApiError(
            locale,
            "PROJECT_CONTEXT_UNAVAILABLE",
            inspectedProjectContext.error ?? undefined,
          ),
        },
        { status: 400 },
      );
    }

    const resolvedProjectName = inspectedProjectContext.context.projectName;

    let filePath: string | null = null;
    let fileName = getCallToPrdDirectInputLabel(locale);
    let fileSize = "0B";
    let pdfPath: string | null = null;
    let pdfFileName: string | null = null;
    const dir = path.join(tmpdir(), "dashboard-lab-calls", id);

    if (file) {
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_AUDIO.includes(ext)) {
        return NextResponse.json({ error: getCallToPrdApiError(locale, "INVALID_FORMAT", ALLOWED_AUDIO.join(", ")) }, { status: 400 });
      }
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: getCallToPrdApiError(locale, "TOO_LARGE", locale === "en" ? "Maximum 50MB" : "최대 50MB") }, { status: 400 });
      }

      await mkdir(dir, { recursive: true });
      filePath = path.join(dir, path.basename(file.name));
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      fileName = file.name;
      fileSize = formatSize(file.size);
    }

    if (pdfFile) {
      const ext = path.extname(pdfFile.name).toLowerCase();
      if (!ALLOWED_PDF.includes(ext)) {
        return NextResponse.json({ error: getCallToPrdApiError(locale, "INVALID_PDF") }, { status: 400 });
      }
      if (pdfFile.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: getCallToPrdApiError(locale, "PDF_TOO_LARGE", locale === "en" ? "Maximum PDF size is 20MB" : "PDF 최대 20MB") }, { status: 400 });
      }

      await mkdir(dir, { recursive: true });
      pdfPath = path.join(dir, path.basename(pdfFile.name));
      const buffer = Buffer.from(await pdfFile.arrayBuffer());
      await writeFile(pdfPath, buffer);
      pdfFileName = pdfFile.name;
    }

    createRecord({
      id,
      savedEntryName: null,
      fileName,
      fileSize,
      duration: null,
      projectName: resolvedProjectName,
      projectPath,
      customerName,
      additionalContext,
      inputKind: intake.inputKind,
      severity: intake.severity,
      customerImpact: intake.customerImpact,
      urgency: intake.urgency,
      reproducibility: intake.reproducibility,
      currentWorkaround: intake.currentWorkaround,
      separateExternalDocs: intake.separateExternalDocs,
      baselineEntryName,
      callDate,
      status: "uploading",
      createdAt: new Date().toISOString(),
      completedAt: null,
      transcript: directTranscript,
      prdMarkdown: null,
      pdfFileName,
      pdfContent: null,
      pdfAnalysis: null,
      projectContext: inspectedProjectContext.context.summary,
      projectContextSources: inspectedProjectContext.context.sources,
      projectContextError: null,
      baselineTitle: null,
      claudePrd: null,
      codexPrd: null,
      diffReport: null,
      generationMode,
      generationPreset,
      selectedDocTypes,
      generatedDocs: [],
      nextActions: [],
      docGenerationProgress: null,
      generationWarnings: [],
      error: null,
    });

    void processCallAsync(id, filePath, directTranscript, pdfPath, pdfFileName, {
      projectName: resolvedProjectName,
      projectPath,
      customerName,
      additionalContext,
      intake,
      baselineEntryName,
      callDate,
      locale,
      projectContextSnapshot: inspectedProjectContext.context,
      generationMode,
      generationPreset,
      selectedDocTypes,
    });

    return NextResponse.json({ id, status: "uploading" });
  } catch {
    const locale = readLocaleFromHeaders(request.headers);
    return NextResponse.json({ error: getCallToPrdApiError(locale, "UPLOAD_FAILED") }, { status: 500 });
  }
}

async function processCallAsync(
  id: string,
  filePath: string | null,
  directTranscript: string | null,
  pdfPath: string | null,
  pdfFileName: string | null,
  options: {
    projectName: string | null;
    projectPath: string | null;
    customerName: string | null;
    additionalContext: string | null;
    projectContextSnapshot: ProjectContextSnapshot | null;
    intake: CallIntakeMetadata;
    baselineEntryName: string | null;
    callDate: string;
    locale: ReturnType<typeof readLocaleFromHeaders>;
    generationMode: CallGenerationMode;
    generationPreset: CallDocPreset;
    selectedDocTypes: ReturnType<typeof normalizeSelectedDocTypes>;
  },
) {
  let savedEntryName: string | null = null;
  let projectContext: string | null = null;
  let projectContextSources: string[] = [];
  const projectContextError: string | null = null;

  try {
    let transcript = directTranscript || "";
    let effectiveProjectName = options.projectName;
    let runnerCwd: string | undefined;
    let baselineEntryName: string | null = null;
    let baselineTitle: string | null = null;
    let baselinePrd: string | null = null;

    if (filePath && !directTranscript) {
      const whisperSetupError = await getWhisperSetupError();
      if (whisperSetupError) {
        updateStatus(id, "failed", {
          error: formatKnownCallToPrdRuntimeMessage(whisperSetupError, options.locale),
        });
        return;
      }
      updateStatus(id, "transcribing");
      transcript = await transcribeAudio(filePath);
    }

    let pdfContent: string | null = null;
    let pdfAnalysis: string | null = null;

    if (pdfPath) {
      try {
        updateStatus(id, "extracting-pdf");
        const extracted = await extractPdfText(pdfPath);
        pdfContent = extracted.text;
        updateStatus(id, "analyzing-pdf", { pdfContent });

        if (pdfContent) {
          try {
            pdfAnalysis = await analyzePdf(
              pdfContent,
              pdfFileName ?? "document.pdf",
              ({ current, total }) => {
                updateStatus(id, "analyzing-pdf", {
                  pdfContent,
                  pdfAnalysis: `PDF 분석 중... (${current}/${total} 파트)`,
                });
              },
            );
          } catch (err) {
            console.error("PDF analysis failed:", err);
          }
        }
      } catch (err) {
        console.error("PDF extraction failed:", err);
      }
    }

    if (options.projectContextSnapshot) {
      effectiveProjectName = effectiveProjectName ?? options.projectContextSnapshot.projectName;
      projectContext = options.projectContextSnapshot.summary;
      projectContextSources = options.projectContextSnapshot.sources;
      runnerCwd = options.projectContextSnapshot.projectPath;
    } else if (options.projectPath) {
      const inspected = await inspectLocalProjectContext(options.projectPath).catch(() => ({
        context: null,
        error: "프로젝트 컨텍스트를 준비하지 못했습니다.",
      }));

      if (!inspected.context) {
        updateStatus(id, "failed", {
          projectName: effectiveProjectName,
          projectPath: options.projectPath,
          projectContext: null,
          projectContextSources: [],
          projectContextError: inspected.error,
          error: formatKnownCallToPrdRuntimeMessage(
            inspected.error ?? getCallToPrdApiError(options.locale, "PROJECT_CONTEXT_UNAVAILABLE").message,
            options.locale,
          ),
        });
        return;
      }

      effectiveProjectName = effectiveProjectName ?? inspected.context.projectName;
      projectContext = inspected.context.summary;
      projectContextSources = inspected.context.sources;
      runnerCwd = inspected.context.projectPath;
    }

    if (options.selectedDocTypes.includes("change-request-diff")) {
      const baseline = await resolveChangeRequestBaseline({
        entryName: options.baselineEntryName,
        projectName: effectiveProjectName,
      }).catch(() => null);

      if (baseline?.prdMarkdown) {
        baselineEntryName = baseline.entryName;
        baselineTitle = baseline.title;
        baselinePrd = baseline.prdMarkdown;
      }
    }

    updateStatus(id, "analyzing", {
      transcript,
      pdfContent,
      pdfAnalysis,
      projectName: effectiveProjectName,
      projectPath: options.projectPath,
      projectContext,
      projectContextSources,
      projectContextError,
      baselineEntryName,
      baselineTitle,
      generationMode: options.generationMode,
    });

    const prompt = buildCallToPrdPrompt({
      transcript,
      projectName: effectiveProjectName ?? undefined,
      projectContext: projectContext ?? undefined,
      projectContextSources,
      baselineTitle: baselineTitle ?? undefined,
      baselinePrd: baselinePrd ?? undefined,
      customerName: options.customerName ?? undefined,
      additionalContext: options.additionalContext ?? undefined,
      intake: options.intake,
      pdfAnalysis: pdfAnalysis ?? undefined,
      pdfFileName: pdfFileName ?? undefined,
    });

    let effectiveGenerationMode: CallGenerationMode = options.generationMode;
    const generationWarnings: string[] = [];
    const openAiAvailable = hasOpenAiApiFallback();
    const claudeAvailable = options.generationMode === "openai" ? false : await checkClaudeInstalled();
    const codexAvailable =
      options.generationMode === "claude" || options.generationMode === "openai"
        ? false
        : await checkCodexInstalled();
    let claudeResult: PromiseSettledResult<string> | null = null;
    let codexResult: PromiseSettledResult<string> | null = null;
    let openAiResult: PromiseSettledResult<string> | null = null;

    if (options.generationMode === "openai") {
      [openAiResult] = await Promise.allSettled([
        runClaudePrd(prompt, {
          cwd: runnerCwd,
          provider: "openai",
          allowOpenAiFallback: false,
        }),
      ]);
    } else if (options.generationMode === "claude") {
      if (claudeAvailable) {
        [claudeResult] = await Promise.allSettled([runClaudePrd(prompt, { cwd: runnerCwd, allowOpenAiFallback: false })]);
      } else if (openAiAvailable) {
        effectiveGenerationMode = "openai";
        generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Claude CLI가 없어 OpenAI API 생성으로 전환했습니다.", options.locale));
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
    } else if (options.generationMode === "codex") {
      if (!codexAvailable) {
        if (openAiAvailable) {
          effectiveGenerationMode = "openai";
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Codex CLI가 없어 OpenAI API 생성으로 전환했습니다.", options.locale));
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
            projectPath: options.projectPath,
            projectContext,
            projectContextSources,
            projectContextError,
            baselineEntryName,
            baselineTitle,
            generationMode: options.generationMode,
            error: formatKnownCallToPrdRuntimeMessage(
              "Codex CLI가 설치되어 있지 않습니다. Codex를 설치하거나 OpenAI API 키를 저장한 뒤 다시 시도해 주세요.",
              options.locale,
            ),
          });
          return;
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
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Claude CLI가 없어 OpenAI API + Codex 조합으로 생성했습니다.", options.locale));
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
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Claude CLI가 없어 Codex 단일 생성으로 전환했습니다.", options.locale));
          [codexResult] = await Promise.allSettled([runCodexPrd(prompt, { cwd: runnerCwd })]);
        }
      } else if (claudeAvailable) {
        effectiveGenerationMode = "claude";
        generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Codex가 설치되어 있지 않아 Claude 단일 생성으로 전환했습니다.", options.locale));
        [claudeResult] = await Promise.allSettled([runClaudePrd(prompt, { cwd: runnerCwd, allowOpenAiFallback: false })]);
      } else if (openAiAvailable) {
        effectiveGenerationMode = "openai";
        generationWarnings.push(formatKnownCallToPrdRuntimeMessage("Codex와 Claude CLI가 없어 OpenAI API 단일 생성으로 전환했습니다.", options.locale));
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
          projectPath: options.projectPath,
          projectContext,
          projectContextSources,
          projectContextError,
          baselineEntryName,
          baselineTitle,
          generationMode: options.generationMode,
          error: formatKnownCallToPrdRuntimeMessage(
            "Dual AI를 사용하려면 Claude 또는 Codex 중 하나 이상이 준비되어 있어야 합니다. CLI를 설치하거나 OpenAI API 키를 저장해 주세요.",
            options.locale,
          ),
        });
        return;
      }
    }

    const claudePrd = claudeResult?.status === "fulfilled" ? formatPrdMarkdown(claudeResult.value) : null;
    const codexPrd = codexResult?.status === "fulfilled" ? formatPrdMarkdown(codexResult.value) : null;
    const openAiPrd = openAiResult?.status === "fulfilled" ? formatPrdMarkdown(openAiResult.value) : null;
    const claudeError = claudeResult?.status === "rejected" ? getErrorMessage(claudeResult.reason, options.locale) : null;
    const codexError = codexResult?.status === "rejected" ? getErrorMessage(codexResult.reason, options.locale) : null;
    const openAiError = openAiResult?.status === "rejected" ? getErrorMessage(openAiResult.reason, options.locale) : null;

    if (!claudePrd && !codexPrd && !openAiPrd) {
      updateStatus(id, "failed", {
        transcript,
        pdfContent,
        pdfAnalysis,
        projectName: effectiveProjectName,
        projectPath: options.projectPath,
        projectContext,
        projectContextSources,
        projectContextError,
        baselineEntryName,
        baselineTitle,
        generationMode: effectiveGenerationMode,
        error: buildGenerationFailureMessage({
          locale: options.locale,
          generationMode: effectiveGenerationMode,
          claudeError,
          codexError,
          openAiError,
        }),
      });
      return;
    }

    let finalPrd: string;
    let diffReport: string | null = null;
    const primaryPrd = claudePrd ?? openAiPrd;

    if (effectiveGenerationMode === "dual" && primaryPrd && codexPrd) {
      updateStatus(id, "merging", {
        transcript,
        pdfContent,
        pdfAnalysis,
        claudePrd: primaryPrd,
        codexPrd,
        baselineEntryName,
        baselineTitle,
        generationMode: effectiveGenerationMode,
        generationWarnings: [...generationWarnings],
      });
      try {
        const originalContext = [
          projectContext ? "## 프로젝트 기준 정보\n" : "",
          projectContext ?? "",
          projectContextSources.length > 0 ? `\n## 프로젝트 기준 파일\n${projectContextSources.map((source) => `- ${source}`).join("\n")}` : "",
          options.additionalContext ? `\n## 추가 맥락\n${options.additionalContext}` : "",
          baselinePrd ? `\n## 기존 기준 문서${baselineTitle ? ` (${baselineTitle})` : ""}\n${baselinePrd}` : "",
          "## 입력 메타",
          buildCallIntakeMetadataMarkdown(options.intake),
          "",
          "## 원문 입력 내용",
          transcript,
          pdfAnalysis ? `\n## PDF 분석\n${pdfAnalysis}` : "",
        ].join("\n");
        const merged = await mergeDualPrd(primaryPrd, codexPrd, originalContext, { cwd: runnerCwd });
        finalPrd = formatPrdMarkdown(merged.mergedPrd);
        diffReport = merged.diffReport;
      } catch (err) {
        console.error("PRD merge failed:", err);
        finalPrd = formatPrdMarkdown(primaryPrd);
        diffReport = options.locale === "en"
          ? `(Merge failed: ${getErrorMessage(err, options.locale)} / using ${claudePrd ? "Claude" : "OpenAI API"} result)`
          : `(머지 실패: ${getErrorMessage(err, options.locale)} / ${claudePrd ? "Claude" : "OpenAI API"} 결과 사용)`;
      }
    } else {
      finalPrd = formatPrdMarkdown(primaryPrd ?? codexPrd ?? "");
      diffReport = buildFallbackDiffReport({
        locale: options.locale,
        generationMode: effectiveGenerationMode,
        claudePrd,
        codexPrd,
        openAiPrd,
        claudeError,
        codexError,
        openAiError,
      });
    }

    const workingContext = buildCallWorkingContext({
      projectName: effectiveProjectName,
      customerName: options.customerName,
      additionalContext: options.additionalContext,
      intake: options.intake,
      projectContext,
      projectContextSources,
      baselineTitle,
      baselinePrd,
      pdfAnalysis,
      pdfFileName,
      prdMarkdown: finalPrd,
    });

    const generatedDocs: GeneratedDoc[] = [
      {
        type: "prd",
        title: buildGeneratedDocTitle("prd", effectiveProjectName),
        markdown: finalPrd,
      },
    ];

    savedEntryName = await persistGeneratedDocsSnapshot({
      id,
      savedEntryName,
      projectName: effectiveProjectName,
      projectPath: options.projectPath,
      customerName: options.customerName,
      projectContext,
      projectContextSources,
      projectContextError,
      baselineEntryName,
      baselineTitle,
      callDate: options.callDate,
      generationMode: effectiveGenerationMode,
      generationPreset: options.generationPreset,
      generatedDocs,
      selectedDocTypes: options.selectedDocTypes,
      intake: options.intake,
      generationWarnings,
      claudePrd,
      codexPrd,
      diffReport,
    });

    const supportingDocTypes = options.selectedDocTypes.filter((docType) => docType !== "prd");

    if (supportingDocTypes.length > 0) {
      updateStatus(id, "generating-docs", {
        savedEntryName,
        transcript,
        prdMarkdown: finalPrd,
        pdfContent,
        pdfAnalysis,
        projectName: effectiveProjectName,
        projectPath: options.projectPath,
        projectContext,
        projectContextSources,
        projectContextError,
        baselineEntryName,
        baselineTitle,
        claudePrd,
        codexPrd,
        diffReport,
        generationMode: effectiveGenerationMode,
        generatedDocs: [...generatedDocs],
        docGenerationProgress: formatKnownCallToPrdRuntimeMessage(`실무 문서 생성 준비 (${supportingDocTypes.length}개)`, options.locale),
        generationWarnings: [...generationWarnings],
      });

      for (let index = 0; index < supportingDocTypes.length; index += 1) {
        const docType = supportingDocTypes[index];
        const docLabel = getCallToPrdDocLabel(docType, options.locale);

        updateStatus(id, "generating-docs", {
          generatedDocs: [...generatedDocs],
          docGenerationProgress: formatKnownCallToPrdRuntimeMessage(
            `${index + 1}/${supportingDocTypes.length} · ${docLabel} 생성 중`,
            options.locale,
          ),
          generationWarnings: [...generationWarnings],
        });

        try {
          const generatedDoc = await generateSupportingDocument({
            type: docType,
            projectName: effectiveProjectName,
            workingContext,
            separateExternalDocs: options.intake.separateExternalDocs,
          });

          generatedDocs.push(generatedDoc);
          savedEntryName = await persistGeneratedDocsSnapshot({
            id,
            savedEntryName,
            projectName: effectiveProjectName,
            projectPath: options.projectPath,
            customerName: options.customerName,
            projectContext,
            projectContextSources,
            projectContextError,
            baselineEntryName,
            baselineTitle,
            callDate: options.callDate,
            generationMode: effectiveGenerationMode,
            generationPreset: options.generationPreset,
            generatedDocs,
            selectedDocTypes: options.selectedDocTypes,
            intake: options.intake,
            generationWarnings,
            claudePrd,
            codexPrd,
            diffReport,
          });
          updateStatus(id, "generating-docs", {
            savedEntryName,
            generatedDocs: [...generatedDocs],
            docGenerationProgress: formatKnownCallToPrdRuntimeMessage(
              `${index + 1}/${supportingDocTypes.length} · ${docLabel} 완료`,
              options.locale,
            ),
            generationWarnings: [...generationWarnings],
          });
        } catch (err) {
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage(`${docLabel}: ${getErrorMessage(err, options.locale)}`, options.locale));
          savedEntryName = await persistGeneratedDocsSnapshot({
            id,
            savedEntryName,
            projectName: effectiveProjectName,
            projectPath: options.projectPath,
            customerName: options.customerName,
            projectContext,
            projectContextSources,
            projectContextError,
            baselineEntryName,
            baselineTitle,
            callDate: options.callDate,
            generationMode: effectiveGenerationMode,
            generationPreset: options.generationPreset,
            generatedDocs,
            selectedDocTypes: options.selectedDocTypes,
            intake: options.intake,
            generationWarnings,
            claudePrd,
            codexPrd,
            diffReport,
          });
          updateStatus(id, "generating-docs", {
            savedEntryName,
            generatedDocs: [...generatedDocs],
            docGenerationProgress: formatKnownCallToPrdRuntimeMessage(
              `${index + 1}/${supportingDocTypes.length} · ${docLabel} 건너뜀`,
              options.locale,
            ),
            generationWarnings: [...generationWarnings],
          });
        }
      }
    }

    savedEntryName = await saveGeneratedDocsBundle({
      id,
      projectName: effectiveProjectName,
      projectPath: options.projectPath,
      customerName: options.customerName,
      projectContext,
      projectContextSources,
      projectContextError,
      baselineEntryName,
      baselineTitle,
      callDate: options.callDate,
      generationMode: effectiveGenerationMode,
      generationPreset: options.generationPreset,
      generatedDocs,
      selectedDocTypes: options.selectedDocTypes,
      intake: options.intake,
      generationWarnings,
      claudePrd,
      codexPrd,
      diffReport,
    });

    updateStatus(id, "completed", {
      savedEntryName,
      transcript,
      prdMarkdown: finalPrd,
      pdfContent,
      pdfAnalysis,
      projectName: effectiveProjectName,
      projectPath: options.projectPath,
      projectContext,
      projectContextSources,
      projectContextError,
      baselineEntryName,
      baselineTitle,
      claudePrd,
      codexPrd,
      diffReport,
      generationMode: effectiveGenerationMode,
      generatedDocs,
      nextActions: [],
      docGenerationProgress: null,
      generationWarnings,
      completedAt: new Date().toISOString(),
    });

  } catch (err) {
    updateStatus(id, "failed", {
      savedEntryName,
      projectPath: options.projectPath,
      projectContext,
      projectContextSources,
      projectContextError,
      error: formatKnownCallToPrdRuntimeMessage(getErrorMessage(err, options.locale), options.locale),
    });
  }
}

async function persistGeneratedDocsSnapshot(options: {
  id: string;
  savedEntryName: string | null;
  projectName: string | null;
  projectPath: string | null;
  customerName: string | null;
  projectContext: string | null;
  projectContextSources: string[];
  projectContextError: string | null;
  baselineEntryName: string | null;
  baselineTitle: string | null;
  callDate: string;
  generationMode: CallGenerationMode;
  generationPreset: CallDocPreset;
  generatedDocs: GeneratedDoc[];
  selectedDocTypes: ReturnType<typeof normalizeSelectedDocTypes>;
  intake: CallIntakeMetadata;
  generationWarnings: string[];
  claudePrd: string | null;
  codexPrd: string | null;
  diffReport: string | null;
}): Promise<string | null> {
  try {
    return await saveGeneratedDocsBundle({
      id: options.id,
      projectName: options.projectName,
      projectPath: options.projectPath,
      customerName: options.customerName,
      projectContext: options.projectContext,
      projectContextSources: options.projectContextSources,
      projectContextError: options.projectContextError,
      baselineEntryName: options.baselineEntryName,
      baselineTitle: options.baselineTitle,
      callDate: options.callDate,
      generationMode: options.generationMode,
      generationPreset: options.generationPreset,
      generatedDocs: options.generatedDocs,
      selectedDocTypes: options.selectedDocTypes,
      intake: options.intake,
      generationWarnings: options.generationWarnings,
      claudePrd: options.claudePrd,
      codexPrd: options.codexPrd,
      diffReport: options.diffReport,
    });
  } catch (error) {
    console.error("Failed to persist generated docs snapshot:", error);
    return options.savedEntryName;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function buildFallbackDiffReport(options: {
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

function getErrorMessage(error: unknown, locale: ReturnType<typeof readLocaleFromHeaders>): string {
  return error instanceof Error ? error.message : (locale === "en" ? "Unknown error" : "알 수 없는 오류");
}

function isCallGenerationMode(value: string): value is CallGenerationMode {
  return value === "claude" || value === "codex" || value === "dual" || value === "openai";
}

function buildGenerationFailureMessage(options: {
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
