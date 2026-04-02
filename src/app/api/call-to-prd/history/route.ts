import { NextResponse } from "next/server";

import { callHistoryDeleteSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { deleteRecord, getAllRecords } from "@/lib/call-to-prd/call-store";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";

export async function GET() {
  const records = getAllRecords();
  return NextResponse.json({ records, totalCount: records.length });
}

export async function DELETE(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const body = await parseJsonBody(request, callHistoryDeleteSchema);

    const deleted = deleteRecord(body.id);

    if (!deleted) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "The history record to delete was not found." : "삭제할 기록을 찾을 수 없습니다.") },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true, id: body.id });
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
                ? "The history delete request body is invalid."
                : "기록 삭제 요청 형식이 올바르지 않습니다.",
            ),
          ),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: getCallToPrdApiError(locale, "DELETE_FAILED", locale === "en" ? "Failed to delete the current session record." : "현재 세션 기록 삭제에 실패했습니다.") },
      { status: 500 },
    );
  }
}
