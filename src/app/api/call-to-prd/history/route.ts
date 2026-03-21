import { NextResponse } from "next/server";

import { deleteRecord, getAllRecords } from "@/lib/call-to-prd/call-store";

export async function GET() {
  const records = getAllRecords();
  return NextResponse.json({ records, totalCount: records.length });
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };

    if (!body.id?.trim()) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "삭제할 기록 ID가 필요합니다." } },
        { status: 400 },
      );
    }

    const deleted = deleteRecord(body.id);

    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "삭제할 기록을 찾을 수 없습니다." } },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true, id: body.id });
  } catch {
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: "현재 세션 기록 삭제에 실패했습니다." } },
      { status: 500 },
    );
  }
}
