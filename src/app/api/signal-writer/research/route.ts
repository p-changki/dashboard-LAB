import { signalWriterResearchRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { runSignalWriterResearch } from "@/lib/signal-writer/research";
import type { SignalWriterResearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, signalWriterResearchRequestSchema);
    const channel = payload.channel === "x" || payload.channel === "linkedin" ? payload.channel : "threads";
    const research = await runSignalWriterResearch(payload.signal, locale, channel);

    const response: SignalWriterResearchResponse = { research };
    return Response.json(response);
  } catch (error) {
    if (isZodError(error)) {
      return Response.json(
        {
          error: getZodErrorMessage(
            error,
            locale === "en" ? "A valid signal is required." : "유효한 시그널 정보가 필요합니다.",
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
              ? "Failed to run the research desk."
              : "리서치 실행에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
