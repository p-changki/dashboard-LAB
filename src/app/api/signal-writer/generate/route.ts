import { signalWriterGenerateRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import {
  buildSignalWriterTimingRecommendation,
  loadSignalWriterPerformanceInsights,
} from "@/lib/signal-writer/analytics";
import {
  getSignalWriterCodexOutputErrorFromMessage,
  isSignalWriterCodexOutputError,
} from "@/lib/signal-writer/codex";
import { generateSignalWriterDraft } from "@/lib/signal-writer/generator";
import { readLocaleFromHeaders } from "@/lib/locale";
import { persistSignalWriterDraft } from "@/lib/signal-writer/storage";
import type {
  SignalWriterApiErrorResponse,
  SignalWriterGenerateRequest,
  SignalWriterGenerateResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = await parseJsonBody(request, signalWriterGenerateRequestSchema);
    const signal = payload.signal;
    const channel = normalizeChannel(payload.channel);
    const mode = normalizeMode(payload.mode);
    const runner = normalizeRunner(payload.runner);
    const preferredHook = payload.preferredHook?.trim() || undefined;
    const researchContext = payload.researchContext;
    const factCheckContext = payload.factCheckContext;

    if (
      !signal ||
      typeof signal.id !== "string" ||
      typeof signal.title !== "string" ||
      typeof signal.summary !== "string" ||
      typeof signal.sourceName !== "string" ||
      typeof signal.link !== "string"
    ) {
      return Response.json(
        {
          error:
            locale === "en"
              ? "A valid signal is required."
              : "유효한 시그널 정보가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const performanceInsights = loadSignalWriterPerformanceInsights();
    const timingRecommendation = buildSignalWriterTimingRecommendation(
      signal,
      channel,
      locale,
      performanceInsights,
    );

    const draft = await generateSignalWriterDraft(
      signal,
      locale,
      mode,
      runner,
      channel,
      preferredHook,
      timingRecommendation,
      researchContext,
      factCheckContext,
    );
    const artifacts = persistSignalWriterDraft(signal, draft);

    const response: SignalWriterGenerateResponse = {
      draft: {
        ...draft,
        markdownPath: artifacts.markdownPath,
        jsonPath: artifacts.jsonPath,
      },
    };

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

    if (isSignalWriterCodexOutputError(error)) {
      const response: SignalWriterApiErrorResponse = {
        error: error.message,
        errorCode: error.code,
      };

      return Response.json(response, { status: 502 });
    }

    if (error instanceof Error) {
      const transcriptError = getSignalWriterCodexOutputErrorFromMessage(error.message, locale, "draft");

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
              ? "Failed to generate the draft."
              : "초안 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

function normalizeMode(value: SignalWriterGenerateRequest["mode"]) {
  switch (value) {
    case "news-brief":
    case "insight":
    case "opinion":
      return value;
    default:
      return "viral";
  }
}

function normalizeChannel(value: SignalWriterGenerateRequest["channel"]) {
  switch (value) {
    case "x":
    case "linkedin":
      return value;
    default:
      return "threads";
  }
}

function normalizeRunner(value: SignalWriterGenerateRequest["runner"]) {
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
