import { randomUUID } from "node:crypto";

import { signalWriterPerformanceRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import { persistSignalWriterPerformance } from "@/lib/signal-writer/storage";
import type { SignalWriterPerformanceEntry, SignalWriterPerformanceResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, signalWriterPerformanceRequestSchema);
    const entry: SignalWriterPerformanceEntry = {
      id: randomUUID(),
      draftId: payload.draftId,
      signalId: payload.signalId,
      channel: payload.channel,
      hook: payload.hook,
      postUrl: payload.postUrl || null,
      postedAt: payload.postedAt ? new Date(payload.postedAt).toISOString() : null,
      views: payload.views,
      likes: payload.likes,
      replies: payload.replies,
      reposts: payload.reposts,
      saves: payload.saves,
      notes: payload.notes,
      capturedAt: new Date().toISOString(),
    };

    const result = persistSignalWriterPerformance(payload.jsonPath, entry);
    const response: SignalWriterPerformanceResponse = {
      entry: result.entry,
      totalEntries: result.totalEntries,
    };

    return Response.json(response);
  } catch (error) {
    if (isZodError(error)) {
      return Response.json(
        {
          error: getZodErrorMessage(
            error,
            locale === "en"
              ? "A valid performance entry is required."
              : "유효한 성과 기록 정보가 필요합니다.",
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
              ? "Failed to save the performance entry."
              : "성과 기록 저장에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
