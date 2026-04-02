import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { meetingHubProcessRequestSchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseJsonBody } from "@/lib/api/validation";
import { processMeetingHubNotes } from "@/lib/meeting-hub/processor";
import { buildRuleBasedMeetingProcessing } from "@/lib/meeting-hub/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, meetingHubProcessRequestSchema);
    const previewDate = new Date().toISOString().slice(0, 10);
    const previewTitle = payload.title ?? "Preview meeting";
    const previewType = payload.type ?? "client";
    const previewDateValue = payload.date ?? previewDate;

    const processed =
      payload.runner === "rule"
        ? buildRuleBasedMeetingProcessing(
            payload.notes,
            payload.linkedRepository ?? null,
            payload.teamId ?? "preview",
            "preview",
          )
        : await processMeetingHubNotes({
            title: previewTitle,
            type: previewType,
            date: previewDateValue,
            participants: payload.participants,
            linkedRepository: payload.linkedRepository,
            notes: payload.notes,
            runner: payload.runner,
          }).catch(() =>
            buildRuleBasedMeetingProcessing(
              payload.notes,
              payload.linkedRepository ?? null,
              payload.teamId ?? "preview",
              "preview",
            ),
          );

    return Response.json({ processed });
  } catch (error) {
    if (isJsonParseError(error)) {
      return jsonError("INVALID_JSON", "JSON payload is invalid.", 400);
    }

    if (isZodError(error)) {
      return jsonError(
        "INVALID_INPUT",
        getZodErrorMessage(error, "Meeting Hub processing payload is invalid."),
        400,
      );
    }

    return jsonError(
      "MEETING_HUB_PROCESS_FAILED",
      getErrorMessage(error, "Failed to process Meeting Hub notes."),
      400,
    );
  }
}
