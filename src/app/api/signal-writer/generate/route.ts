import { generateSignalWriterDraft } from "@/lib/signal-writer/generator";
import { readLocaleFromHeaders } from "@/lib/locale";
import { persistSignalWriterDraft } from "@/lib/signal-writer/storage";
import type { SignalWriterGenerateRequest, SignalWriterGenerateResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const payload = (await request.json()) as Partial<SignalWriterGenerateRequest>;
    const signal = payload.signal;
    const mode = normalizeMode(payload.mode);

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

    const draft = await generateSignalWriterDraft(signal, locale, mode);
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
