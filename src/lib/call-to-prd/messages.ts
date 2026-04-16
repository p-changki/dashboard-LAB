import type { CallDocType } from "@/lib/call-to-prd/document-config";
import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";

type CallToPrdErrorCode =
  | "NO_INPUT"
  | "PROJECT_REQUIRED"
  | "PROJECT_CONTEXT_UNAVAILABLE"
  | "INVALID_FORMAT"
  | "TOO_LARGE"
  | "INVALID_PDF"
  | "PDF_TOO_LARGE"
  | "UPLOAD_FAILED"
  | "INVALID_INPUT"
  | "DELETE_FAILED"
  | "NOT_FOUND"
  | "NEXT_ACTION_FAILED";

const docLabels: Record<CallDocType, { ko: string; en: string }> = {
  prd: { ko: "PRD", en: "PRD" },
  "problem-statement": { ko: "문제정의서", en: "Problem Statement" },
  "client-brief": { ko: "고객 전달용 기획안", en: "Client Brief" },
  "open-questions": { ko: "미확정 사항", en: "Open Questions" },
  "acceptance-criteria": { ko: "Acceptance Criteria", en: "Acceptance Criteria" },
  "user-flow": { ko: "유저 플로우", en: "User Flow" },
  "task-breakdown": { ko: "개발 태스크 분해", en: "Task Breakdown" },
  "change-request-diff": { ko: "변경요청 Diff", en: "Change Request Diff" },
  "api-contract": { ko: "API 계약서", en: "API Contract" },
  "data-schema": { ko: "데이터 스키마", en: "Data Schema" },
  "prompt-spec": { ko: "Prompt Spec", en: "Prompt Spec" },
  "evaluation-plan": { ko: "평가 계획", en: "Evaluation Plan" },
  "qa-checklist": { ko: "QA 체크리스트", en: "QA Checklist" },
  "release-runbook": { ko: "릴리즈 런북", en: "Release Runbook" },
};

const warningMap = {
  "Claude CLI가 없어 OpenAI API 생성으로 전환했습니다.": {
    ko: "Claude CLI가 없어 OpenAI API 생성으로 전환했습니다.",
    en: "Claude CLI is unavailable, so generation switched to the OpenAI API.",
  },
  "Claude 사용량 제한으로 OpenAI API 생성으로 전환했습니다.": {
    ko: "Claude 사용량 제한으로 OpenAI API 생성으로 전환했습니다.",
    en: "Claude usage limit was reached, so generation switched to the OpenAI API.",
  },
  "Codex CLI가 없어 OpenAI API 생성으로 전환했습니다.": {
    ko: "Codex CLI가 없어 OpenAI API 생성으로 전환했습니다.",
    en: "Codex CLI is unavailable, so generation switched to the OpenAI API.",
  },
  "Claude CLI가 없어 OpenAI API + Codex 조합으로 생성했습니다.": {
    ko: "Claude CLI가 없어 OpenAI API + Codex 조합으로 생성했습니다.",
    en: "Claude CLI is unavailable, so generation used the OpenAI API + Codex combination.",
  },
  "Claude 사용량 제한으로 OpenAI API + Codex 조합으로 생성했습니다.": {
    ko: "Claude 사용량 제한으로 OpenAI API + Codex 조합으로 생성했습니다.",
    en: "Claude usage limit was reached, so generation used the OpenAI API + Codex combination.",
  },
  "Claude CLI가 없어 Codex 단일 생성으로 전환했습니다.": {
    ko: "Claude CLI가 없어 Codex 단일 생성으로 전환했습니다.",
    en: "Claude CLI is unavailable, so generation switched to Codex only.",
  },
  "Claude 사용량 제한으로 Codex 단일 생성으로 전환했습니다.": {
    ko: "Claude 사용량 제한으로 Codex 단일 생성으로 전환했습니다.",
    en: "Claude usage limit was reached, so generation switched to Codex only.",
  },
  "Codex가 설치되어 있지 않아 Claude 단일 생성으로 전환했습니다.": {
    ko: "Codex가 설치되어 있지 않아 Claude 단일 생성으로 전환했습니다.",
    en: "Codex is not installed, so generation switched to Claude only.",
  },
  "Codex와 Claude CLI가 없어 OpenAI API 단일 생성으로 전환했습니다.": {
    ko: "Codex와 Claude CLI가 없어 OpenAI API 단일 생성으로 전환했습니다.",
    en: "Neither Codex nor Claude CLI is available, so generation switched to the OpenAI API only.",
  },
} as const;

export function getCallToPrdDocLabel(docType: CallDocType, locale: AppLocale) {
  return pickLocale(locale, docLabels[docType]);
}

export function getCallToPrdDirectInputLabel(locale: AppLocale) {
  return pickLocale(locale, {
    ko: "직접 입력",
    en: "Direct input",
  });
}

export function getCallToPrdApiError(
  locale: AppLocale,
  code: CallToPrdErrorCode,
  detail?: string,
) {
  switch (code) {
    case "NO_INPUT":
      return {
        code,
        message: pickLocale(locale, {
          ko: "파일 또는 텍스트를 입력해주세요.",
          en: "Please provide an audio file or text input.",
        }),
      };
    case "PROJECT_REQUIRED":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ?? "프로젝트를 선택하고 컨텍스트 준비가 완료된 뒤 다시 시도해 주세요.",
          en: detail ?? "Select a project and wait for project context to be ready before trying again.",
        }),
      };
    case "PROJECT_CONTEXT_UNAVAILABLE":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ?? "프로젝트 컨텍스트를 준비하지 못했습니다.",
          en: detail ?? "Failed to prepare the project context.",
        }),
      };
    case "INVALID_FORMAT":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ? `허용 형식: ${detail}` : "허용되지 않는 파일 형식입니다.",
          en: detail ? `Allowed formats: ${detail}` : "Unsupported file format.",
        }),
      };
    case "TOO_LARGE":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ?? "최대 50MB",
          en: detail ?? "Maximum 50MB",
        }),
      };
    case "INVALID_PDF":
      return {
        code,
        message: pickLocale(locale, {
          ko: "PDF 파일만 허용됩니다.",
          en: "Only PDF files are allowed.",
        }),
      };
    case "PDF_TOO_LARGE":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ?? "PDF 최대 20MB",
          en: detail ?? "Maximum PDF size is 20MB",
        }),
      };
    case "UPLOAD_FAILED":
      return {
        code,
        message: pickLocale(locale, {
          ko: "업로드 실패",
          en: "Upload failed.",
        }),
      };
    case "INVALID_INPUT":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ?? "요청 값이 올바르지 않습니다.",
          en: detail ?? "The request input is invalid.",
        }),
      };
    case "DELETE_FAILED":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ?? "삭제 실패",
          en: detail ?? "Delete failed.",
        }),
      };
    case "NOT_FOUND":
      return {
        code,
        message: pickLocale(locale, {
          ko: detail ?? "대상 항목을 찾을 수 없습니다.",
          en: detail ?? "The requested item could not be found.",
        }),
      };
    case "NEXT_ACTION_FAILED":
      return {
        code,
        message: detail
          ? formatKnownCallToPrdRuntimeMessage(detail, locale)
          : pickLocale(locale, {
              ko: "다음 액션 생성에 실패했습니다.",
              en: "Failed to generate the next action.",
            }),
      };
  }
}

export function formatKnownCallToPrdRuntimeMessage(message: string, locale: AppLocale) {
  const exact = warningMap[message as keyof typeof warningMap];
  if (exact) {
    return pickLocale(locale, exact);
  }

  const normalized = message.trim();
  const unknownError = pickLocale(locale, {
    ko: "알 수 없는 오류",
    en: "Unknown error",
  });

  const generatingReady = normalized.match(/^실무 문서 생성 준비 \((\d+)개\)$/) ?? normalized.match(/^Preparing working docs \((\d+)\)$/);
  if (generatingReady) {
    const count = generatingReady[1];
    return pickLocale(locale, {
      ko: `실무 문서 생성 준비 (${count}개)`,
      en: `Preparing support docs (${count})`,
    });
  }

  const generating = normalized.match(/^(\d+)\/(\d+) · (.+) 생성 중$/) ?? normalized.match(/^(\d+)\/(\d+) · (.+) generating$/);
  if (generating) {
    const [, index, total, rawLabel] = generating;
    return pickLocale(locale, {
      ko: `${index}/${total} · ${localizeDocLabel(rawLabel, "ko")} 생성 중`,
      en: `${index}/${total} · Generating ${localizeDocLabel(rawLabel, "en")}`,
    });
  }

  const completed = normalized.match(/^(\d+)\/(\d+) · (.+) 완료$/) ?? normalized.match(/^(\d+)\/(\d+) · (.+) completed$/);
  if (completed) {
    const [, index, total, rawTitle] = completed;
    return pickLocale(locale, {
      ko: `${index}/${total} · ${localizeDocLabel(rawTitle, "ko")} 완료`,
      en: `${index}/${total} · Completed ${localizeDocLabel(rawTitle, "en")}`,
    });
  }

  const skipped = normalized.match(/^(\d+)\/(\d+) · (.+) 건너뜀$/) ?? normalized.match(/^(\d+)\/(\d+) · (.+) skipped$/);
  if (skipped) {
    const [, index, total, rawLabel] = skipped;
    return pickLocale(locale, {
      ko: `${index}/${total} · ${localizeDocLabel(rawLabel, "ko")} 건너뜀`,
      en: `${index}/${total} · Skipped ${localizeDocLabel(rawLabel, "en")}`,
    });
  }

  const docWarning = normalized.match(/^(.+): (.+)$/);
  if (docWarning) {
    const [, rawLabel, detail] = docWarning;
    const localizedLabel = localizeDocLabel(rawLabel, locale);
    return `${localizedLabel}: ${detail || unknownError}`;
  }

  const claudeFailure = normalized.match(/^Claude 실패: (.+)$/) ?? normalized.match(/^Claude failed: (.+)$/);
  if (claudeFailure) {
    return pickLocale(locale, {
      ko: `Claude 실패: ${claudeFailure[1] || unknownError}`,
      en: `Claude failed: ${claudeFailure[1] || unknownError}`,
    });
  }

  const codexFailure = normalized.match(/^Codex 실패: (.+)$/) ?? normalized.match(/^Codex failed: (.+)$/);
  if (codexFailure) {
    return pickLocale(locale, {
      ko: `Codex 실패: ${codexFailure[1] || unknownError}`,
      en: `Codex failed: ${codexFailure[1] || unknownError}`,
    });
  }

  const openAiFailure = normalized.match(/^OpenAI API 실패: (.+)$/) ?? normalized.match(/^OpenAI API failed: (.+)$/);
  if (openAiFailure) {
    return pickLocale(locale, {
      ko: `OpenAI API 실패: ${openAiFailure[1] || unknownError}`,
      en: `OpenAI API failed: ${openAiFailure[1] || unknownError}`,
    });
  }

  if (normalized === "AI 생성 실패" || normalized === "AI generation failed") {
    return pickLocale(locale, {
      ko: "AI 생성 실패",
      en: "AI generation failed",
    });
  }

  if (normalized.includes("Codex CLI가 설치되어 있지 않습니다.")) {
    return pickLocale(locale, {
      ko: "Codex CLI가 설치되어 있지 않습니다. Codex를 설치하거나 OpenAI API 키를 저장한 뒤 다시 시도해 주세요.",
      en: "Codex CLI is not installed. Install Codex or save an OpenAI API key, then try again.",
    });
  }

  if (normalized.includes("Dual AI를 사용하려면")) {
    return pickLocale(locale, {
      ko: "Dual AI를 사용하려면 Claude 또는 Codex 중 하나 이상이 준비되어 있어야 합니다. CLI를 설치하거나 OpenAI API 키를 저장해 주세요.",
      en: "Dual mode requires at least one of Claude or Codex to be available. Install the CLI or save an OpenAI API key.",
    });
  }

  return message;
}

function localizeDocLabel(label: string, locale: AppLocale) {
  const resolved = resolveDocTypeFromLabel(label);
  if (!resolved) {
    return label;
  }
  return getCallToPrdDocLabel(resolved, locale);
}

function resolveDocTypeFromLabel(label: string): CallDocType | null {
  const normalized = label.trim();
  for (const [docType, labels] of Object.entries(docLabels) as Array<[CallDocType, { ko: string; en: string }]>) {
    if (normalized === labels.ko || normalized === labels.en) {
      return docType;
    }
  }
  return null;
}
