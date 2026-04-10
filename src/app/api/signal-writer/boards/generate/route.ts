import { signalWriterTrendBoardGenerateRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { readLocaleFromHeaders } from "@/lib/locale";
import {
  getSignalWriterCodexOutputErrorFromMessage,
  isSignalWriterCodexOutputError,
} from "@/lib/signal-writer/codex";
import { generateSignalWriterTrendBoardDraft } from "@/lib/signal-writer/trend-board-generator";
import type {
  SignalWriterApiErrorResponse,
  SignalWriterTrendBoardGenerateRequest,
  SignalWriterTrendBoardGenerateResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, signalWriterTrendBoardGenerateRequestSchema);
    const channel = normalizeChannel(payload.channel);
    const runner = normalizeRunner(payload.runner);

    const response: SignalWriterTrendBoardGenerateResponse = {
      draft: await generateSignalWriterTrendBoardDraft(payload.board, locale, runner, channel),
    };

    return Response.json(response);
  } catch (error) {
    if (isZodError(error)) {
      return Response.json(
        {
          error: getZodErrorMessage(
            error,
            locale === "en" ? "A valid trend board is required." : "유효한 트렌드 보드 정보가 필요합니다.",
          ),
        },
        { status: 400 },
      );
    }

    if (isSignalWriterCodexOutputError(error)) {
      const response: SignalWriterApiErrorResponse = {
        error: error.message,
        errorCode: error.code,
      };

      return Response.json(response, { status: 502 });
    }

    if (error instanceof Error) {
      const transcriptError = getSignalWriterCodexOutputErrorFromMessage(
        error.message,
        locale,
        "trend-board",
      );

      if (transcriptError) {
        const response: SignalWriterApiErrorResponse = {
          error: transcriptError.message,
          errorCode: transcriptError.code,
        };

        return Response.json(response, { status: 502 });
      }
    }

    return Response.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : locale === "en"
              ? "Failed to generate the trend board draft."
              : "트렌드 보드 초안 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

function normalizeChannel(value: SignalWriterTrendBoardGenerateRequest["channel"]) {
  switch (value) {
    case "x":
    case "linkedin":
      return value;
    default:
      return "threads";
  }
}

function normalizeRunner(value: SignalWriterTrendBoardGenerateRequest["runner"]) {
  switch (value) {
    case "claude":
    case "codex":
    case "gemini":
    case "openai":
    case "template":
      return value;
    default:
      return "auto";
  }
}
