import { NextResponse } from "next/server";

import { callObsidianExportRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { exportCallToPrdToObsidian, getCallToPrdObsidianStatus } from "@/lib/call-to-prd/obsidian-export";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  readLocaleFromHeaders(request.headers);
  return NextResponse.json(getCallToPrdObsidianStatus());
}

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const body = await parseJsonBody(request, callObsidianExportRequestSchema);
    const result = exportCallToPrdToObsidian({
      title: body.title ?? null,
      bundleId: body.bundleId ?? null,
      projectName: body.projectName ?? null,
      customerName: body.customerName ?? null,
      createdAt: body.createdAt ?? null,
      markdown: body.markdown,
    });

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
                ? "The Obsidian export request body is invalid."
                : "옵시디언 export 요청 형식이 올바르지 않습니다.",
            ),
          ),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: getCallToPrdApiError(
          locale,
          "NEXT_ACTION_FAILED",
          error instanceof Error ? error.message : undefined,
        ),
      },
      { status: 500 },
    );
  }
}
