import { NextResponse } from "next/server";

import { generateNextActionDraft } from "@/lib/call-to-prd/next-actions";
import { saveNextActionDraft } from "@/lib/call-to-prd/saved-bundles";
import type { CallNextActionRequest } from "@/lib/types/call-to-prd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CallNextActionRequest>;

    if (!body.actionType || !body.prdMarkdown?.trim()) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "액션 타입과 PRD 본문이 필요합니다." } },
        { status: 400 },
      );
    }

    const result = await generateNextActionDraft({
      actionType: body.actionType,
      savedEntryName: body.savedEntryName ?? null,
      projectName: body.projectName ?? null,
      customerName: body.customerName ?? null,
      projectContext: body.projectContext ?? null,
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
    return NextResponse.json(
      {
        error: {
          code: "NEXT_ACTION_FAILED",
          message: error instanceof Error ? error.message : "다음 액션 생성에 실패했습니다.",
        },
      },
      { status: 500 },
    );
  }
}
