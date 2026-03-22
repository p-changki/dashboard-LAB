import {
  getErrorMessage,
  isJsonParseError,
  jsonError,
} from "@/lib/api/error-response";
import { processMeetingHubNotes } from "@/lib/meeting-hub/processor";
import { buildRuleBasedMeetingProcessing } from "@/lib/meeting-hub/storage";
import type { CreateMeetingHubMeetingInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateMeetingHubMeetingInput;

    if (!payload?.notes?.trim()) {
      return jsonError("INVALID_PAYLOAD", "Meeting notes are required.", 400);
    }

    const processed =
      payload.runner === "rule"
        ? buildRuleBasedMeetingProcessing(
            payload.notes,
            payload.linkedRepository ?? null,
            payload.teamId ?? "preview",
            "preview",
          )
        : await processMeetingHubNotes({
            title: payload.title,
            type: payload.type,
            date: payload.date,
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

    return jsonError(
      "MEETING_HUB_PROCESS_FAILED",
      getErrorMessage(error, "Failed to process Meeting Hub notes."),
      400,
    );
  }
}
