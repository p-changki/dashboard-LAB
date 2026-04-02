import { NextResponse } from "next/server";

import { callProjectContextQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { inspectLocalProjectContext } from "@/lib/call-to-prd/project-context";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import type { CallProjectContextResponse } from "@/lib/types/call-to-prd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = readLocaleFromHeaders(request.headers);

  try {
    const { projectPath } = parseSearchParams(request, callProjectContextQuerySchema);
    const inspected = await inspectLocalProjectContext(projectPath);

    const payload: CallProjectContextResponse = inspected.context
      ? {
          status: "ready",
          projectPath: inspected.context.projectPath,
          projectName: inspected.context.projectName,
          summary: inspected.context.summary,
          sources: inspected.context.sources,
          error: null,
        }
      : {
          status: "failed",
          projectPath,
          projectName: null,
          summary: null,
          sources: [],
          error: inspected.error ?? getCallToPrdApiError(locale, "PROJECT_CONTEXT_UNAVAILABLE").message,
        };

    return NextResponse.json(payload);
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        {
          error: getCallToPrdApiError(
            locale,
            "INVALID_INPUT",
            getZodErrorMessage(
              error,
              locale === "en"
                ? "The project context request is invalid."
                : "프로젝트 컨텍스트 요청 형식이 올바르지 않습니다.",
            ),
          ),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        status: "failed",
        projectPath: "",
        projectName: null,
        summary: null,
        sources: [],
        error: getCallToPrdApiError(locale, "PROJECT_CONTEXT_UNAVAILABLE").message,
      } satisfies CallProjectContextResponse,
    );
  }
}
