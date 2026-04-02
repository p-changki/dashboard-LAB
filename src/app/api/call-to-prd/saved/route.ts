import { NextResponse } from "next/server";

import { callSavedBundlesQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { listSavedBundles } from "@/lib/call-to-prd/saved-bundles";

export async function GET(request: Request) {
  try {
    const { query, page, pageSize } = parseSearchParams(request, callSavedBundlesQuerySchema);
    const result = await listSavedBundles({ query, page, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 6,
          totalPages: 0,
          query: "",
          error: getZodErrorMessage(error, "저장된 번들 조회 쿼리 형식이 올바르지 않습니다."),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ items: [], totalCount: 0, page: 1, pageSize: 6, totalPages: 0, query: "" });
  }
}
