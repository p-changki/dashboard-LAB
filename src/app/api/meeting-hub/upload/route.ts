import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { getWhisperSetupError, transcribeAudio } from "@/lib/call-to-prd/whisper-runner";
import { processMeetingHubNotes } from "@/lib/meeting-hub/processor";
import { createMeetingHubMeeting, getMeetingHubSummary } from "@/lib/meeting-hub/storage";
import type { CreateMeetingHubMeetingInput, MeetingHubAiRunner, MeetingHubMeetingType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_AUDIO = new Set([".m4a", ".mp3", ".wav", ".webm", ".aac", ".flac", ".ogg"]);
const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  let tempDir: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("MEETING_HUB_AUDIO_REQUIRED", "Audio file is required.", 400);
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_AUDIO.has(extension)) {
      return jsonError(
        "MEETING_HUB_INVALID_AUDIO",
        `Unsupported audio format. Allowed: ${[...ALLOWED_AUDIO].join(", ")}`,
        400,
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      return jsonError("MEETING_HUB_AUDIO_TOO_LARGE", "Audio files must be 50MB or smaller.", 400);
    }

    const whisperSetupError = await getWhisperSetupError();
    if (whisperSetupError) {
      return jsonError("MEETING_HUB_TRANSCRIPTION_UNAVAILABLE", whisperSetupError, 400);
    }

    const payload = parseMultipartPayload(formData, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    tempDir = path.join(tmpdir(), "dashboard-lab-meeting-hub", randomUUID());
    await mkdir(tempDir, { recursive: true });
    const tempAudioPath = path.join(tempDir, path.basename(file.name));
    await writeFile(tempAudioPath, buffer);

    const transcript = await transcribeAudio(tempAudioPath);
    const notes = buildMeetingNotesFromTranscript(transcript, payload.notes);

    const processed =
      payload.useAi === false
        ? undefined
        : await processMeetingHubNotes({
            title: payload.title,
            type: payload.type,
            date: payload.date,
            participants: payload.participants,
            linkedRepository: payload.linkedRepository,
            notes,
            runner: payload.runner,
          }).catch(() => undefined);

    const meeting = createMeetingHubMeeting(
      {
        ...payload,
        inputSource: "audio",
        sourceFileName: file.name,
        notes,
      },
      processed,
      {
        audioArtifact: {
          fileName: file.name,
          bytes: new Uint8Array(buffer),
        },
      },
    );

    return Response.json({
      meeting,
      transcript,
      summary: getMeetingHubSummary(),
    });
  } catch (error) {
    return jsonError(
      "MEETING_HUB_AUDIO_UPLOAD_FAILED",
      getErrorMessage(error, "Failed to upload and transcribe the meeting audio."),
      400,
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

function parseMultipartPayload(formData: FormData, sourceFileName: string): CreateMeetingHubMeetingInput {
  const teamId = String(formData.get("teamId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const type = normalizeMeetingType(String(formData.get("type") ?? "planning"));
  const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10)).trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const linkedRepository = String(formData.get("linkedRepository") ?? "").trim() || null;
  const useAiValue = String(formData.get("useAi") ?? "true").trim().toLowerCase();
  const runner = normalizeRunner(String(formData.get("runner") ?? "auto"));

  return {
    teamId,
    title: title || path.basename(sourceFileName, path.extname(sourceFileName)),
    type,
    date,
    participants: splitCommaValues(String(formData.get("participants") ?? "")),
    linkedProjectIds: splitCommaValues(String(formData.get("linkedProjects") ?? "")),
    linkedRepository,
    notes,
    useAi: useAiValue !== "false",
    runner,
  };
}

function buildMeetingNotesFromTranscript(transcript: string, notes: string) {
  if (!notes.trim()) {
    return transcript.trim();
  }

  return `Transcript:\n${transcript.trim()}\n\nAdditional Notes:\n${notes.trim()}`.trim();
}

function splitCommaValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMeetingType(value: string): MeetingHubMeetingType {
  switch (value) {
    case "standup":
    case "planning":
    case "review":
    case "retro":
    case "client":
      return value;
    default:
      return "planning";
  }
}

function normalizeRunner(value: string): MeetingHubAiRunner {
  switch (value) {
    case "claude":
    case "codex":
    case "gemini":
    case "openai":
    case "rule":
      return value;
    default:
      return "auto";
  }
}
