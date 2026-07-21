import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { createRecord, updateStatus } from "@/lib/call-to-prd/call-store";
import {
  buildGeneratedDocTitle,
  normalizeCallDocPreset,
  normalizeSelectedDocTypes,
  type CallDocPreset,
} from "@/lib/call-to-prd/document-config";
import {
  normalizeCallIntakeMetadata,
  type CallIntakeMetadata,
} from "@/lib/call-to-prd/intake-config";
import { formatPrdMarkdown } from "@/lib/call-to-prd/prd-markdown-formatter";
import { buildCallToPrdPrompt } from "@/lib/call-to-prd/prd-prompt-builder";
import { inspectLocalProjectContext } from "@/lib/call-to-prd/project-context";
import { mergeDualPrd } from "@/lib/call-to-prd/prd-merger";
import { resolveChangeRequestBaseline, saveGeneratedDocsBundle } from "@/lib/call-to-prd/saved-bundles";
import { generateSupportingDocument } from "@/lib/call-to-prd/supporting-documents";
import { buildCallWorkingContext, buildOriginalCallContext } from "@/lib/call-to-prd/working-context";
import { getWhisperSetupError, transcribeAudio } from "@/lib/call-to-prd/whisper-runner";
import {
  formatCallToPrdMergeFailedMessage,
  formatCallToPrdProjectContextFailed,
  formatKnownCallToPrdRuntimeMessage,
  getCallToPrdApiError,
  getCallToPrdDirectInputLabel,
  getCallToPrdDocLabel,
} from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import type { CallGenerationMode, GeneratedDoc, ProjectContextSnapshot } from "@/lib/types/call-to-prd";
import {
  buildFallbackDiffReport,
  formatSize,
  getErrorMessage,
  isCallGenerationMode,
} from "@/lib/call-to-prd/pipeline/shared";
import { runPdfPipeline } from "@/lib/call-to-prd/pipeline/run-pdf";
import { runAiGeneration } from "@/lib/call-to-prd/pipeline/run-ai-generation";

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
    const generationPreset: CallDocPreset = normalizeCallDocPreset(rawGenerationPreset);
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

    const inspectedProjectContext = await inspectLocalProjectContext(projectPath, locale);
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
  const generationWarnings: string[] = [];
  let currentPrdMarkdown: string | null = null;
  let currentGeneratedDocs: GeneratedDoc[] = [];

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

    const pdfResult = await runPdfPipeline(id, pdfPath, pdfFileName, options.locale);
    const pdfContent = pdfResult.pdfContent;
    const pdfAnalysis = pdfResult.pdfAnalysis;
    generationWarnings.push(...pdfResult.warnings);

    if (options.projectContextSnapshot) {
      effectiveProjectName = effectiveProjectName ?? options.projectContextSnapshot.projectName;
      projectContext = options.projectContextSnapshot.summary;
      projectContextSources = options.projectContextSnapshot.sources;
      runnerCwd = options.projectContextSnapshot.projectPath;
    } else if (options.projectPath) {
      const inspected = await inspectLocalProjectContext(options.projectPath, options.locale).catch(() => ({
        context: null,
        error: formatCallToPrdProjectContextFailed(options.locale),
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
      generationWarnings: [...generationWarnings],
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


    const aiResult = await runAiGeneration({
      id,
      prompt,
      runnerCwd,
      generationMode: options.generationMode,
      locale: options.locale,
      generationWarnings,
      transcript,
      pdfContent,
      pdfAnalysis,
      effectiveProjectName,
      projectPath: options.projectPath,
      projectContext,
      projectContextSources,
      projectContextError,
      baselineEntryName,
      baselineTitle,
    });
    if (!aiResult) {
      return;
    }
    const { claudePrd, codexPrd, openAiPrd, claudeError, codexError, openAiError, effectiveGenerationMode } = aiResult;
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
        const originalContext = buildOriginalCallContext({
          projectContext,
          projectContextSources,
          additionalContext: options.additionalContext,
          baselineTitle,
          baselinePrd,
          intake: options.intake,
          transcript,
          pdfAnalysis,
        });
        const merged = await mergeDualPrd(primaryPrd, codexPrd, originalContext, { cwd: runnerCwd });
        finalPrd = formatPrdMarkdown(merged.mergedPrd);
        diffReport = merged.diffReport;
      } catch (err) {
        console.error("PRD merge failed:", err);
        finalPrd = formatPrdMarkdown(primaryPrd);
        diffReport = options.locale === "en"
          ? `(Merge failed: ${getErrorMessage(err, options.locale)} / using ${claudePrd ? "Claude" : "OpenAI API"} result)`
          : `(머지 실패: ${getErrorMessage(err, options.locale)} / ${claudePrd ? "Claude" : "OpenAI API"} 결과 사용)`;
        generationWarnings.push(
          formatCallToPrdMergeFailedMessage(getErrorMessage(err, options.locale), options.locale),
        );
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

    currentPrdMarkdown = finalPrd;

    const generatedDocs: GeneratedDoc[] = [
      {
        type: "prd",
        title: buildGeneratedDocTitle("prd", effectiveProjectName),
        markdown: finalPrd,
      },
    ];

    currentGeneratedDocs = [...generatedDocs];

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

        let docSucceeded = true;

        try {
          const generatedDoc = await generateSupportingDocument({
            type: docType,
            projectName: effectiveProjectName,
            workingContext,
            separateExternalDocs: options.intake.separateExternalDocs,
          });

          generatedDocs.push(generatedDoc);
          currentGeneratedDocs = [...generatedDocs];
        } catch (err) {
          docSucceeded = false;
          generationWarnings.push(formatKnownCallToPrdRuntimeMessage(`${docLabel}: ${getErrorMessage(err, options.locale)}`, options.locale));
        }

        // Snapshot persistence stays outside the try so a write failure reaches the outer
        // catch as a pipeline failure instead of being reported as a doc generation error.
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
            `${index + 1}/${supportingDocTypes.length} · ${docLabel} ${docSucceeded ? "완료" : "건너뜀"}`,
            options.locale,
          ),
          generationWarnings: [...generationWarnings],
        });
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
      prdMarkdown: currentPrdMarkdown,
      generatedDocs: currentGeneratedDocs,
      generationWarnings: [...generationWarnings],
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
    throw error;
  }
}

