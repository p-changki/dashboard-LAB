import { NextResponse } from "next/server";

import { callSectionRegenerateRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { formatPrdMarkdown, joinSectionsIntoMarkdown, splitMarkdownIntoSections, type PrdSection } from "@/lib/call-to-prd/prd-markdown-formatter";
import { buildSectionRegeneratePrompt } from "@/lib/call-to-prd/prd-prompt-builder";
import { runClaudePrd } from "@/lib/call-to-prd/prd-runner";
import { loadSavedBundle, updateBundleDocMarkdown } from "@/lib/call-to-prd/saved-bundles";
import { buildCallWorkingContext } from "@/lib/call-to-prd/working-context";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const updated = await updateBundleDocMarkdown(body.bundleId, body.docType, nextMarkdown);
    if (!updated) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Document not found in bundle." : "번들 안에서 대상 문서를 찾지 못했습니다.") },
        { status: 404 },
      );
    }

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
