import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { callSectionRegenerateRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { formatPrdMarkdown, joinSectionsIntoMarkdown, splitMarkdownIntoSections, type PrdSection } from "@/lib/call-to-prd/prd-markdown-formatter";
import { buildSectionRegeneratePrompt } from "@/lib/call-to-prd/prd-prompt-builder";
import { runClaudePrd } from "@/lib/call-to-prd/prd-runner";
import { loadSavedBundle } from "@/lib/call-to-prd/saved-bundles";
import { buildCallWorkingContext } from "@/lib/call-to-prd/working-context";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import { getRuntimeConfig } from "@/lib/runtime/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BundleManifest {
  version: number;
  summary?: {
    preview: string;
    sizeBytes: number;
    docCount: number;
    docTypes: string[];
  };
  generatedDocs: Array<{
    type: string;
    title: string;
    fileName: string;
    sections?: Array<{ id: string; title: string }>;
  }>;
}

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const body = await parseJsonBody(request, callSectionRegenerateRequestSchema);
    const detail = await loadSavedBundle(body.bundleId);

    if (!detail || detail.kind !== "bundle") {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Bundle not found." : "저장된 번들을 찾을 수 없습니다.") },
        { status: 404 },
      );
    }

    const targetDoc = detail.generatedDocs.find((doc) => doc.type === body.docType);
    if (!targetDoc) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Document not found in bundle." : "번들 안에서 대상 문서를 찾지 못했습니다.") },
        { status: 404 },
      );
    }

    const currentSections = splitMarkdownIntoSections(targetDoc.markdown);
    const currentSection = currentSections.find((section) => section.id === body.sectionId);
    if (!currentSection) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Section not found." : "대상 섹션을 찾지 못했습니다.") },
        { status: 404 },
      );
    }

    const context = buildCallWorkingContext({
      projectName: detail.projectName,
      customerName: detail.customerName,
      intake: {
        inputKind: detail.inputKind,
        severity: detail.severity,
        customerImpact: detail.customerImpact,
        urgency: detail.urgency,
        reproducibility: detail.reproducibility,
        currentWorkaround: detail.currentWorkaround,
        separateExternalDocs: detail.separateExternalDocs,
      },
      projectContext: detail.projectContext,
      projectContextSources: detail.projectContextSources,
      baselineTitle: detail.baselineTitle,
      prdMarkdown: detail.prdMarkdown ?? targetDoc.markdown,
      relatedDocs: detail.generatedDocs,
    });

    const regenerated = await runClaudePrd(
      buildSectionRegeneratePrompt({
        title: currentSection.title,
        content: currentSection.content,
        context,
        hint: body.hint,
      }),
      {
        cwd: detail.projectPath ?? undefined,
        provider: detail.generationMode === "openai" ? "openai" : "claude",
      },
    );

    const nextSection = normalizeSectionMarkdown(currentSection, regenerated);
    const nextSections = currentSections.map((section) => (
      section.id === nextSection.id ? nextSection : section
    ));
    const nextMarkdown = joinSectionsIntoMarkdown(nextSections);

    await persistUpdatedBundleDoc(body.bundleId, body.docType, nextMarkdown, nextSections);

    return NextResponse.json({ section: nextSection });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        {
          error: getCallToPrdApiError(
            locale,
            "INVALID_INPUT",
            getZodErrorMessage(
              error,
              locale === "en"
                ? "The section-regeneration request body is invalid."
                : "섹션 재생성 요청 형식이 올바르지 않습니다.",
            ),
          ),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: getCallToPrdApiError(locale, "NEXT_ACTION_FAILED", error instanceof Error ? error.message : undefined),
      },
      { status: 500 },
    );
  }
}

function normalizeSectionMarkdown(section: PrdSection, markdown: string): PrdSection {
  const formatted = formatPrdMarkdown(markdown);
  const generatedSections = splitMarkdownIntoSections(formatted);
  const matched = generatedSections.find((item) => item.title === section.title) ?? generatedSections[0];
  const content = matched
    ? matched.content.trim()
    : formatted.replace(/^##\s+.+$/m, "").trim();

  return {
    id: section.id,
    title: section.title,
    content: content || section.content,
  };
}

async function persistUpdatedBundleDoc(
  bundleId: string,
  docType: string,
  markdown: string,
  sections: PrdSection[],
) {
  const bundlePath = path.join(getPrdSaveDir(), bundleId);
  const manifestPath = path.join(bundlePath, "manifest.json");
  const rawManifest = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(rawManifest) as BundleManifest;
  const targetDoc = manifest.generatedDocs.find((doc) => doc.type === docType);

  if (!targetDoc) {
    throw new Error("저장된 manifest에서 대상 문서를 찾지 못했습니다.");
  }

  await writeFile(path.join(bundlePath, targetDoc.fileName), markdown, "utf-8");

  const updatedDocs = manifest.generatedDocs.map((doc) => (
    doc.type === docType
      ? {
          ...doc,
          sections: sections.map(({ id, title }) => ({ id, title })),
        }
      : doc
  ));
  const previewDoc = updatedDocs.find((doc) => doc.type === "prd") ?? targetDoc;
  const previewSource = await readFile(path.join(bundlePath, previewDoc.fileName), "utf-8").catch(() => markdown);
  const nextManifest: BundleManifest = {
    ...manifest,
    version: Math.max(manifest.version, 6),
    generatedDocs: updatedDocs,
    summary: {
      preview: previewSource.replace(/\n+/g, " ").slice(0, 120),
      sizeBytes: await getDirectorySize(bundlePath),
      docCount: updatedDocs.length,
      docTypes: updatedDocs.map((doc) => doc.type),
    },
  };

  await writeFile(manifestPath, JSON.stringify(nextManifest, null, 2), "utf-8");
}

async function getDirectorySize(directoryPath: string): Promise<number> {
  const entries = await readdir(directoryPath, { withFileTypes: true }).catch(() => []);
  const sizes = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return getDirectorySize(fullPath);
    }

    if (entry.isFile()) {
      const fileStat = await stat(fullPath).catch(() => null);
      return fileStat?.size ?? 0;
    }

    return 0;
  }));

  return sizes.reduce((sum, size) => sum + size, 0);
}

function getPrdSaveDir() {
  return getRuntimeConfig().paths.prdSaveDir;
}
