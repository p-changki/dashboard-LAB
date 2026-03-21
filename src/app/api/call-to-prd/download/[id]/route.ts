import { NextResponse } from "next/server";

import { getRecord } from "@/lib/call-to-prd/call-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getRecord(id);

  if (!record?.prdMarkdown) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "PRD 없음" } }, { status: 404 });
  }

  const fileName = `PRD-${record.projectName ?? "call"}-${record.callDate}.md`;

  return new NextResponse(record.prdMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
