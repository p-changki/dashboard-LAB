import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { createRecord, updateStatus } from "@/lib/call-to-prd/call-store";
import {
  buildGeneratedDocTitle,
  CALL_DOC_DEFINITIONS,
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
import { summarizeLocalProject } from "@/lib/call-to-prd/project-context";
import { checkCodexInstalled, runCodexPrd } from "@/lib/call-to-prd/codex-runner";
import { mergeDualPrd } from "@/lib/call-to-prd/prd-merger";
import { checkClaudeInstalled, runClaudePrd } from "@/lib/call-to-prd/prd-runner";
import { resolveChangeRequestBaseline, saveGeneratedDocsBundle } from "@/lib/call-to-prd/saved-bundles";
import { generateSupportingDocument } from "@/lib/call-to-prd/supporting-documents";
import { buildCallWorkingContext } from "@/lib/call-to-prd/working-context";
import { getWhisperSetupError, transcribeAudio } from "@/lib/call-to-prd/whisper-runner";
import { hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import type { CallGenerationMode, GeneratedDoc } from "@/lib/types/call-to-prd";

const ALLOWED_AUDIO = [".m4a", ".mp3", ".wav", ".webm"];
const ALLOWED_PDF = [".pdf"];
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pdfFile = formData.get("pdfFile") as File | null;
    const projectName = (formData.get("projectName") as string) || null;
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
      return NextResponse.json({ error: { code: "NO_INPUT", message: "파일 또는 텍스트를 입력해주세요" } }, { status: 400 });
    }

    let filePath: string | null = null;
    let fileName = "직접 입력";
    let fileSize = "0B";
    let pdfPath: string | null = null;
    let pdfFileName: string | null = null;
    const dir = path.join(tmpdir(), "dashboard-lab-calls", id);

    if (file) {
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_AUDIO.includes(ext)) {
        return NextResponse.json({ error: { code: "INVALID_FORMAT", message: `허용 형식: ${ALLOWED_AUDIO.join(", ")}` } }, { status: 400 });
      }
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: { code: "TOO_LARGE", message: "최대 50MB" } }, { status: 400 });
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
        return NextResponse.json({ error: { code: "INVALID_PDF", message: "PDF 파일만 허용됩니다" } }, { status: 400 });
      }
      if (pdfFile.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: { code: "PDF_TOO_LARGE", message: "PDF 최대 20MB" } }, { status: 400 });
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
      projectName,
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
      projectContext: null,
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
      projectName,
      projectPath,
      customerName,
      additionalContext,
      intake,
      baselineEntryName,
      callDate,
      generationMode,
      generationPreset,
      selectedDocTypes,
    });

    return NextResponse.json({ id, status: "uploading" });
  } catch {
    return NextResponse.json({ error: { code: "UPLOAD_FAILED", message: "업로드 실패" } }, { status: 500 });
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
    intake: CallIntakeMetadata;
    baselineEntryName: string | null;
    callDate: string;
    generationMode: CallGenerationMode;
    generationPreset: CallDocPreset;
    selectedDocTypes: ReturnType<typeof normalizeSelectedDocTypes>;
  },
) {
  let savedEntryName: string | null = null;

  try {
    let transcript = directTranscript || "";
    let effectiveProjectName = options.projectName;
    let projectContext: string | null = null;
    let runnerCwd: string | undefined;
    let baselineEntryName: string | null = null;
    let baselineTitle: string | null = null;
    let baselinePrd: string | null = null;

    if (filePath && !directTranscript) {
      const whisperSetupError = await getWhisperSetupError();
      if (whisperSetupError) {
        updateStatus(id, "failed", {
          error: whisperSetupError,
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

    if (options.projectPath) {
      const projectSummary = await summarizeLocalProject(options.projectPath).catch(() => null);
      if (projectSummary) {
        effectiveProjectName = effectiveProjectName ?? projectSummary.projectName;
        projectContext = projectSummary.summary;
        runnerCwd = projectSummary.projectPath;
      }
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
      baselineEntryName,
      baselineTitle,
      generationMode: options.generationMode,
    });

    const prompt = buildCallToPrdPrompt({
      transcript,
      projectName: effectiveProjectName ?? undefined,
      projectContext: projectContext ?? undefined,
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
        generationWarnings.push("Claude CLI가 없어 OpenAI API 생성으로 전환했습니다.");
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
          generationWarnings.push("Codex CLI가 없어 OpenAI API 생성으로 전환했습니다.");
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
            baselineEntryName,
            baselineTitle,
            generationMode: options.generationMode,
            error: "Codex CLI가 설치되어 있지 않습니다. Codex를 설치하거나 OpenAI API 키를 저장한 뒤 다시 시도해 주세요.",
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
          generationWarnings.push("Claude CLI가 없어 OpenAI API + Codex 조합으로 생성했습니다.");
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
          generationWarnings.push("Claude CLI가 없어 Codex 단일 생성으로 전환했습니다.");
          [codexResult] = await Promise.allSettled([runCodexPrd(prompt, { cwd: runnerCwd })]);
        }
      } else if (claudeAvailable) {
        effectiveGenerationMode = "claude";
        generationWarnings.push("Codex가 설치되어 있지 않아 Claude 단일 생성으로 전환했습니다.");
        [claudeResult] = await Promise.allSettled([runClaudePrd(prompt, { cwd: runnerCwd, allowOpenAiFallback: false })]);
      } else if (openAiAvailable) {
        effectiveGenerationMode = "openai";
        generationWarnings.push("Codex와 Claude CLI가 없어 OpenAI API 단일 생성으로 전환했습니다.");
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
          baselineEntryName,
          baselineTitle,
          generationMode: options.generationMode,
          error: "Dual AI를 사용하려면 Claude 또는 Codex 중 하나 이상이 준비되어 있어야 합니다. CLI를 설치하거나 OpenAI API 키를 저장해 주세요.",
        });
        return;
      }
    }

    const claudePrd = claudeResult?.status === "fulfilled" ? formatPrdMarkdown(claudeResult.value) : null;
    const codexPrd = codexResult?.status === "fulfilled" ? formatPrdMarkdown(codexResult.value) : null;
    const openAiPrd = openAiResult?.status === "fulfilled" ? formatPrdMarkdown(openAiResult.value) : null;
    const claudeError = claudeResult?.status === "rejected" ? getErrorMessage(claudeResult.reason) : null;
    const codexError = codexResult?.status === "rejected" ? getErrorMessage(codexResult.reason) : null;
    const openAiError = openAiResult?.status === "rejected" ? getErrorMessage(openAiResult.reason) : null;

    if (!claudePrd && !codexPrd && !openAiPrd) {
      updateStatus(id, "failed", {
        transcript,
        pdfContent,
        pdfAnalysis,
        projectName: effectiveProjectName,
        projectPath: options.projectPath,
        projectContext,
        baselineEntryName,
        baselineTitle,
        generationMode: effectiveGenerationMode,
        error: buildGenerationFailureMessage({
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
          "## 입력 메타",
          buildCallIntakeMetadataMarkdown(options.intake),
          "",
          "## 원문 입력 내용",
          transcript,
          pdfAnalysis ? `\n## PDF 분석\n${pdfAnalysis}` : "",
        ].join("\n");
        const merged = await mergeDualPrd(primaryPrd, codexPrd, originalContext);
        finalPrd = formatPrdMarkdown(merged.mergedPrd);
        diffReport = merged.diffReport;
      } catch (err) {
        console.error("PRD merge failed:", err);
        finalPrd = formatPrdMarkdown(primaryPrd);
        diffReport = `(머지 실패: ${getErrorMessage(err)} / ${claudePrd ? "Claude" : "OpenAI API"} 결과 사용)`;
      }
    } else {
      finalPrd = formatPrdMarkdown(primaryPrd ?? codexPrd ?? "");
      diffReport = buildFallbackDiffReport({
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
      customerName: options.customerName,
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
        baselineEntryName,
        baselineTitle,
        claudePrd,
        codexPrd,
        diffReport,
        generationMode: effectiveGenerationMode,
        generatedDocs: [...generatedDocs],
        docGenerationProgress: `실무 문서 생성 준비 (${supportingDocTypes.length}개)`,
        generationWarnings: [...generationWarnings],
      });

      for (let index = 0; index < supportingDocTypes.length; index += 1) {
        const docType = supportingDocTypes[index];
        const docLabel = CALL_DOC_DEFINITIONS[docType].label;

        updateStatus(id, "generating-docs", {
          generatedDocs: [...generatedDocs],
          docGenerationProgress: `${index + 1}/${supportingDocTypes.length} · ${docLabel} 생성 중`,
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
            customerName: options.customerName,
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
            docGenerationProgress: `${index + 1}/${supportingDocTypes.length} · ${generatedDoc.title} 완료`,
            generationWarnings: [...generationWarnings],
          });
        } catch (err) {
          generationWarnings.push(`${docLabel}: ${getErrorMessage(err)}`);
          savedEntryName = await persistGeneratedDocsSnapshot({
            id,
            savedEntryName,
            projectName: effectiveProjectName,
            customerName: options.customerName,
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
            docGenerationProgress: `${index + 1}/${supportingDocTypes.length} · ${docLabel} 건너뜀`,
            generationWarnings: [...generationWarnings],
          });
        }
      }
    }

    savedEntryName = await saveGeneratedDocsBundle({
      id,
      projectName: effectiveProjectName,
      customerName: options.customerName,
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
      error: err instanceof Error ? err.message : "알 수 없는 오류",
    });
  }
}

async function persistGeneratedDocsSnapshot(options: {
  id: string;
  savedEntryName: string | null;
  projectName: string | null;
  customerName: string | null;
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
      customerName: options.customerName,
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
  generationMode: CallGenerationMode;
  claudePrd: string | null;
  codexPrd: string | null;
  openAiPrd: string | null;
  claudeError: string | null;
  codexError: string | null;
  openAiError: string | null;
}): string | null {
  const { generationMode, claudePrd, codexPrd, openAiPrd, claudeError, codexError, openAiError } = options;

  if (generationMode === "claude") {
    return "(Claude 단일 생성 모드)";
  }

  if (generationMode === "codex") {
    return "(Codex 단일 생성 모드)";
  }

  if (generationMode === "openai") {
    return "(OpenAI API 단일 생성 모드)";
  }

  if ((claudePrd || openAiPrd) && !codexPrd) {
    if (codexError === "Codex 미설치") {
      return "(Codex 미설치)";
    }
    return `(Codex 실패: ${codexError ?? "알 수 없는 오류"})`;
  }

  if (!claudePrd && !openAiPrd && codexPrd) {
    if (openAiError) {
      return `(OpenAI API 실패: ${openAiError})`;
    }

    return `(Claude 실패: ${claudeError ?? "알 수 없는 오류"})`;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

function isCallGenerationMode(value: string): value is CallGenerationMode {
  return value === "claude" || value === "codex" || value === "dual" || value === "openai";
}

function buildGenerationFailureMessage(options: {
  generationMode: CallGenerationMode;
  claudeError: string | null;
  codexError: string | null;
  openAiError: string | null;
}): string {
  const { generationMode, claudeError, codexError, openAiError } = options;

  if (generationMode === "claude") {
    return `Claude 실패: ${claudeError ?? "알 수 없는 오류"}`;
  }

  if (generationMode === "codex") {
    return `Codex 실패: ${codexError ?? "알 수 없는 오류"}`;
  }

  if (generationMode === "openai") {
    return `OpenAI API 실패: ${openAiError ?? "알 수 없는 오류"}`;
  }

  const messages = [
    claudeError ? `Claude 실패: ${claudeError}` : null,
    openAiError ? `OpenAI API 실패: ${openAiError}` : null,
    codexError ? `Codex 실패: ${codexError}` : null,
  ].filter((message): message is string => Boolean(message));

  return messages.join(" / ") || "AI 생성 실패";
}
