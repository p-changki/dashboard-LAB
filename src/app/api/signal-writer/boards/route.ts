import { signalWriterTrendBoardQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { getSignalWriterTrendBoard } from "@/lib/signal-writer/trend-boards";
import type { SignalWriterTrendBoardResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { board, limit, refresh } = parseSearchParams(request, signalWriterTrendBoardQuerySchema);
    const payload: SignalWriterTrendBoardResponse = {
      board: await getSignalWriterTrendBoard(board, locale, limit, { forceRefresh: refresh }),
    };
    return Response.json(payload);
  } catch (error) {
    if (isZodError(error)) {
      return Response.json(
        {
          error: getZodErrorMessage(
            error,
            locale === "en" ? "The trend board query is not valid." : "트렌드 보드 조회 형식이 올바르지 않습니다.",
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
              ? "Failed to load the trend board."
              : "트렌드 보드를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
