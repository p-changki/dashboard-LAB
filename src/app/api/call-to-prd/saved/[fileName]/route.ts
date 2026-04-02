import { NextResponse } from "next/server";

import { savedBundleFileNameParamSchema } from "@/lib/api/schemas";
import { isZodError, parseRouteParams } from "@/lib/api/validation";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import { deleteSavedBundle, loadSavedBundle } from "@/lib/call-to-prd/saved-bundles";

export async function GET(request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { fileName } = await parseRouteParams(params, savedBundleFileNameParamSchema);
    const decoded = decodeURIComponent(fileName);
    savedBundleFileNameParamSchema.parse({ fileName: decoded });
    const bundle = await loadSavedBundle(decoded);
    if (!bundle) {
      return NextResponse.json({ error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Saved bundle not found." : "파일 없음") }, { status: 404 });
    }

    return NextResponse.json(bundle);
  } catch (error) {
    if (isZodError(error) || error instanceof URIError) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "INVALID_INPUT", locale === "en" ? "Invalid saved bundle file name." : "유효하지 않은 저장 번들 파일명입니다.") },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Saved bundle not found." : "파일 없음") }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { fileName } = await parseRouteParams(params, savedBundleFileNameParamSchema);
    const decoded = decodeURIComponent(fileName);
    savedBundleFileNameParamSchema.parse({ fileName: decoded });
    const deleted = await deleteSavedBundle(decoded);

    if (!deleted) {
      return NextResponse.json({ error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Saved bundle not found." : "파일 없음") }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, entryName: decoded });
  } catch (error) {
    if (isZodError(error) || error instanceof URIError) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "INVALID_INPUT", locale === "en" ? "Invalid saved bundle file name." : "유효하지 않은 저장 번들 파일명입니다.") },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: getCallToPrdApiError(locale, "DELETE_FAILED") }, { status: 500 });
  }
}
