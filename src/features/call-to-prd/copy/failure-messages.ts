import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import {
  formatKnownCallToPrdRuntimeMessage,
  getCallToPrdApiError as getSharedCallToPrdApiError,
} from "@/lib/call-to-prd/messages";

export function formatCallToPrdFailureMessage(error: string | null, locale: AppLocale) {
  if (!error) {
    return pickLocale(locale, {
      ko: "입력값이나 로컬 실행 환경을 확인한 뒤 다시 시도해 주세요.",
      en: "Check the input and local runtime, then try again.",
    });
  }

  if (error.includes("whisper CLI") || error.includes("openai-whisper") || error.includes("whisper-cpp")) {
    return pickLocale(locale, {
      ko: "음성 변환 도구가 준비되지 않았습니다. `python3 -m pip install openai-whisper`를 설치하거나, `whisper-cpp`를 쓰는 경우 `WHISPER_MODEL_PATH`에 실제 ggml 모델 경로를 설정한 뒤 다시 시도해 주세요.",
      en: "The transcription tool is not ready. Install `python3 -m pip install openai-whisper`, or if you use `whisper-cpp`, set `WHISPER_MODEL_PATH` to a real ggml model path and try again.",
    });
  }

  if (error.includes("Claude 실패") || error.includes("Codex 실패") || error.includes("OpenAI API 실패")) {
    return pickLocale(locale, {
      ko: `AI 생성 단계에서 중단되었습니다. ${error} 입력 내용은 유지되므로 프롬프트나 실행 환경을 확인한 뒤 다시 생성하면 됩니다.`,
      en: `The AI generation step stopped. ${error} Your input is still preserved, so review the prompt or runtime setup and try again.`,
    });
  }

  // Filesystem write failures surface the raw Node error, which leaks an absolute
  // path and is not localized. Report the cause without echoing the path.
  if (/\b(EACCES|EPERM|EROFS|ENOSPC|EDQUOT|EMFILE)\b/.test(error)) {
    const diskFull = /\b(ENOSPC|EDQUOT)\b/.test(error);
    return pickLocale(locale, {
      ko: diskFull
        ? "저장 공간이 부족해 문서를 저장하지 못했습니다. 여유 공간을 확보한 뒤 다시 생성해 주세요. 생성된 문서는 화면에 남아 있으니 복사해 두면 안전합니다."
        : "저장 폴더에 쓸 권한이 없어 문서를 저장하지 못했습니다. PRD 저장 경로의 권한을 확인한 뒤 다시 생성해 주세요. 생성된 문서는 화면에 남아 있으니 복사해 두면 안전합니다.",
      en: diskFull
        ? "Saving failed because the disk is full. Free up space and generate again. The generated documents are still on screen, so copy them out first."
        : "Saving failed because the PRD save folder is not writable. Check its permissions and generate again. The generated documents are still on screen, so copy them out first.",
    });
  }

  if (error.includes("재시작")) {
    return pickLocale(locale, {
      ko: "앱이 재시작되면서 진행 중 작업이 중단되었습니다. 같은 입력값으로 다시 생성하면 저장 구조와 다음 액션까지 다시 이어집니다.",
      en: "The app restarted and interrupted the in-flight job. Regenerate with the same input to restore the saved structure and next actions.",
    });
  }

  return formatKnownCallToPrdRuntimeMessage(error, locale);
}

export function formatCallToPrdProgressMessage(message: string | null, locale: AppLocale) {
  if (!message) {
    return null;
  }

  return formatKnownCallToPrdRuntimeMessage(message, locale);
}

export function formatCallToPrdWarningMessage(message: string, locale: AppLocale) {
  return formatKnownCallToPrdRuntimeMessage(message, locale);
}

export function formatCallToPrdApiError(
  error: { code?: string; message?: string } | null | undefined,
  locale: AppLocale,
  fallback: string,
) {
  if (!error) {
    return fallback;
  }

  if (error.code) {
    const resolved = getSharedCallToPrdApiError(
      locale,
      error.code as Parameters<typeof getSharedCallToPrdApiError>[1],
      error.message,
    );

    if (resolved.message) {
      return resolved.message;
    }
  }

  return error.message ? formatKnownCallToPrdRuntimeMessage(error.message, locale) : fallback;
}
