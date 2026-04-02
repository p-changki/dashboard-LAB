import { NextResponse } from "next/server";

import { callNextActionRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { generateNextActionDraft } from "@/lib/call-to-prd/next-actions";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { saveNextActionDraft } from "@/lib/call-to-prd/saved-bundles";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const body = await parseJsonBody(request, callNextActionRequestSchema);

    const result = await generateNextActionDraft({
      actionType: body.actionType,
      savedEntryName: body.savedEntryName ?? null,
      projectName: body.projectName ?? null,
      customerName: body.customerName ?? null,
      projectContext: body.projectContext ?? null,
      projectContextSources: body.projectContextSources ?? [],
      baselineTitle: body.baselineTitle ?? null,
      baselinePrd: body.baselinePrd ?? null,
      additionalContext: body.additionalContext ?? null,
      inputKind: body.inputKind,
      severity: body.severity,
      customerImpact: body.customerImpact,
      urgency: body.urgency,
      reproducibility: body.reproducibility,
      currentWorkaround: body.currentWorkaround ?? null,
      separateExternalDocs: body.separateExternalDocs,
      prdMarkdown: body.prdMarkdown,
      generatedDocs: body.generatedDocs ?? [],
    });

    if (body.savedEntryName) {
      const savedDraft = await saveNextActionDraft(body.savedEntryName, {
        actionType: result.actionType,
        title: result.title,
        markdown: result.markdown,
        createdAt: result.createdAt,
      });

      if (savedDraft) {
        return NextResponse.json({
          ...result,
          ...savedDraft,
          saved: true,
          savedEntryName: body.savedEntryName,
        });
      }
    }

    return NextResponse.json(result);
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
                ? "The next-action request body is invalid."
                : "다음 액션 요청 형식이 올바르지 않습니다.",
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
