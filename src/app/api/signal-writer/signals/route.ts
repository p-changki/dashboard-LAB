import { getSignalWriterSignals } from "@/lib/signal-writer/ranker";
import { refreshOnlyQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { refresh } = parseSearchParams(request, refreshOnlyQuerySchema);
    return Response.json(await getSignalWriterSignals(locale, { forceRefresh: refresh }));
  } catch (error) {
    if (isZodError(error)) {
      return Response.json(
        {
          error: getZodErrorMessage(
            error,
            locale === "en" ? "The signal query is not valid." : "시그널 조회 쿼리 형식이 올바르지 않습니다.",
          ),
        },
        { status: 400 },
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : locale === "en"
              ? "Failed to load the signal list."
              : "시그널 목록을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
