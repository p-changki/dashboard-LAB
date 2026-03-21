import { NextResponse } from "next/server";

import { deleteSavedBundle, loadSavedBundle } from "@/lib/call-to-prd/saved-bundles";

export async function GET(_: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await params;
  const decoded = decodeURIComponent(fileName);

  try {
    const bundle = await loadSavedBundle(decoded);
    if (!bundle) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "파일 없음" } }, { status: 404 });
    }

    return NextResponse.json(bundle);
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "파일 없음" } }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await params;
  const decoded = decodeURIComponent(fileName);

  try {
    const deleted = await deleteSavedBundle(decoded);

    if (!deleted) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "파일 없음" } }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, entryName: decoded });
  } catch {
    return NextResponse.json({ error: { code: "DELETE_FAILED", message: "삭제 실패" } }, { status: 500 });
  }
}
