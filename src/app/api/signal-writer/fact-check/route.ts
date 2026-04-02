import { signalWriterFactCheckRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { runSignalWriterFactCheck } from "@/lib/signal-writer/fact-check";
import type { SignalWriterFactCheckResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, signalWriterFactCheckRequestSchema);
    const factCheck = await runSignalWriterFactCheck(
      payload.signal,
      payload.draft,
      locale,
      payload.runner,
    );

    const response: SignalWriterFactCheckResponse = { factCheck };
    return Response.json(response);
  } catch (error) {
    if (isZodError(error)) {
      return Response.json(
        {
          error: getZodErrorMessage(
            error,
            locale === "en"
              ? "A valid signal draft is required."
              : "유효한 시그널 초안 정보가 필요합니다.",
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
              ? "Failed to fact-check the draft."
              : "초안 팩트체크에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
