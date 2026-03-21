import { NextResponse } from "next/server";

import { listSavedBundles } from "@/lib/call-to-prd/saved-bundles";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? "";
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const pageSize = parsePositiveInteger(searchParams.get("pageSize"), 6);
    const result = await listSavedBundles({ query, page, pageSize });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 6, totalPages: 0, query: "" });
  }
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
