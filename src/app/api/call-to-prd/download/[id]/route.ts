import { NextResponse } from "next/server";

import { routeIdParamSchema } from "@/lib/api/schemas";
import { isZodError, parseRouteParams } from "@/lib/api/validation";
import { getRecord } from "@/lib/call-to-prd/call-store";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = readLocaleFromHeaders(request.headers);
  let id = "";

  try {
    ({ id } = await parseRouteParams(params, routeIdParamSchema));
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "INVALID_INPUT", locale === "en" ? "Invalid record id." : "유효하지 않은 기록 ID입니다.") },
        { status: 400 },
      );
    }

    throw error;
  }

  const record = getRecord(id);

  if (!record?.prdMarkdown) {
    return NextResponse.json({ error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "PRD not found." : "PRD 없음") }, { status: 404 });
  }

  const fileName = `PRD-${record.projectName ?? "call"}-${record.callDate}.md`;

  return new NextResponse(record.prdMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
