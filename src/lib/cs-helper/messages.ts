import { pickLocale, type AppLocale } from "@/lib/locale";
import type { CsChannel, CsTone } from "@/lib/types";

export function getCsToneLabel(tone: CsTone, locale: AppLocale) {
  return pickLocale(locale, {
    ko: {
      friendly: "친절",
      formal: "공식",
      casual: "캐주얼",
    }[tone],
    en: {
      friendly: "Friendly",
      formal: "Formal",
      casual: "Casual",
    }[tone],
  });
}

export function getCsChannelLabel(channel: CsChannel, locale: AppLocale) {
  return pickLocale(locale, {
    ko: {
      kakao: "카카오톡",
      email: "이메일",
      instagram: "인스타그램",
      phone: "전화",
      other: "기타",
    }[channel],
    en: {
      kakao: "KakaoTalk",
      email: "Email",
      instagram: "Instagram",
      phone: "Phone",
      other: "Other",
    }[channel],
  });
}

export function getCsToneInstruction(tone: CsTone, locale: AppLocale) {
  return pickLocale(locale, {
    ko: {
      friendly: "친절하고 따뜻하게, 이모지를 적절히 사용하여",
      formal: "공식적이고 정중하게, 존댓말을 사용하여",
      casual: "편안하고 캐주얼하게, 하지만 예의 바르게",
    }[tone],
    en: {
      friendly: "Use a warm and friendly tone, with light emojis only if they fit naturally.",
      formal: "Use a formal and polite tone with clear professional wording.",
      casual: "Use a casual and approachable tone while staying respectful.",
    }[tone],
  });
}

export function getCsChannelInstruction(channel: CsChannel, locale: AppLocale) {
  return pickLocale(locale, {
    ko: {
      kakao: "카카오톡 메시지 형식으로 짧은 문단과 줄바꿈을 활용해 작성하세요.",
      email: "이메일 형식으로 인사, 본문, 마무리 순서를 지켜 작성하세요.",
      instagram: "Instagram DM 형식으로 짧고 간결하게 작성하세요.",
      phone: "전화 응대 스크립트처럼 한 문장씩 또렷하게 작성하세요.",
      other: "일반 텍스트 형식으로 자연스럽게 작성하세요.",
    }[channel],
    en: {
      kakao: "Write it like a KakaoTalk message with short paragraphs and clean line breaks.",
      email: "Write it in an email format with greeting, body, and closing.",
      instagram: "Write it like an Instagram DM: brief, clear, and conversational.",
      phone: "Write it like a phone support script with short, clear lines.",
      other: "Write it as natural plain text.",
    }[channel],
  });
}

export function getCsValidationMessage(
  locale: AppLocale,
  key:
    | "originalNotFound"
    | "openAiKeyMissing"
    | "runnerMissing"
    | "projectRequired"
    | "customerRequired"
    | "customerTooLong"
    | "additionalTooLong"
    | "emptyResponse"
    | "contextNameRequired"
    | "contextNameInvalid"
    | "pathNotAllowed"
    | "contextTooLarge",
  options?: { label?: string },
) {
  return pickLocale(locale, {
    ko: {
      originalNotFound: "원본 히스토리를 찾을 수 없습니다.",
      openAiKeyMissing: "OpenAI API 키가 설정되어 있지 않습니다. 온보딩에서 API 키를 저장해 주세요.",
      runnerMissing: `${options?.label ?? "선택한 AI"}가 설치되어 있지 않습니다. CLI를 설치하거나 온보딩에서 OpenAI API 키를 저장해 주세요.`,
      projectRequired: "프로젝트를 선택해 주세요.",
      customerRequired: "고객 메시지를 입력해 주세요.",
      customerTooLong: "고객 메시지는 2000자 이하로 입력해 주세요.",
      additionalTooLong: "추가 맥락은 1000자 이하로 입력해 주세요.",
      emptyResponse: "AI 응답이 비어 있습니다.",
      contextNameRequired: "프로젝트 이름이 비어 있습니다.",
      contextNameInvalid: "프로젝트 이름에 허용되지 않는 문자가 포함되어 있습니다.",
      pathNotAllowed: "허용되지 않는 경로입니다.",
      contextTooLarge: "컨텍스트 파일은 50KB 이하여야 합니다.",
    }[key],
    en: {
      originalNotFound: "The original history item could not be found.",
      openAiKeyMissing: "No OpenAI API key is configured. Save an API key in onboarding first.",
      runnerMissing: `${options?.label ?? "The selected AI runner"} is not installed. Install the CLI or save an OpenAI API key in onboarding.`,
      projectRequired: "Select a project first.",
      customerRequired: "Enter a customer message.",
      customerTooLong: "Customer messages must be 2000 characters or fewer.",
      additionalTooLong: "Additional context must be 1000 characters or fewer.",
      emptyResponse: "The AI response was empty.",
      contextNameRequired: "Project name is required.",
      contextNameInvalid: "The project name contains unsupported characters.",
      pathNotAllowed: "That path is not allowed.",
      contextTooLarge: "Context files must be 50KB or smaller.",
    }[key],
  });
}

export function getCsApiError(
  locale: AppLocale,
  code:
    | "INVALID_BODY"
    | "GENERATE_FAILED"
    | "ANALYZE_FAILED"
    | "REGENERATE_FAILED"
    | "CONTEXT_INIT_FAILED",
) {
  return pickLocale(locale, {
    ko: {
      INVALID_BODY: "요청 본문 JSON 형식이 올바르지 않습니다.",
      GENERATE_FAILED: "CS 응답 생성에 실패했습니다.",
      ANALYZE_FAILED: "내부 분석 생성에 실패했습니다.",
      REGENERATE_FAILED: "CS 응답 재생성에 실패했습니다.",
      CONTEXT_INIT_FAILED: "컨텍스트 파일 생성에 실패했습니다.",
    }[code],
    en: {
      INVALID_BODY: "The request body is not valid JSON.",
      GENERATE_FAILED: "Failed to generate the CS response.",
      ANALYZE_FAILED: "Failed to generate the internal analysis.",
      REGENERATE_FAILED: "Failed to regenerate the CS response.",
      CONTEXT_INIT_FAILED: "Failed to create the context file.",
    }[code],
  });
}

export function getCsContextWarning(locale: AppLocale) {
  return pickLocale(locale, {
    ko: "컨텍스트 파일이 없어 기본 프롬프트로 동작합니다.",
    en: "No context file was found, so the helper is using the default prompt.",
  });
}

export function getCsContextSummaryFallback(locale: AppLocale) {
  return pickLocale(locale, {
    ko: "컨텍스트 요약 없음",
    en: "No context summary",
  });
}

export function getCsContextMissing(locale: AppLocale) {
  return pickLocale(locale, {
    ko: "컨텍스트 없음",
    en: "No context available",
  });
}

export function getCsContextBaselineHeading(locale: AppLocale) {
  return pickLocale(locale, {
    ko: "## 프로젝트 기준 정보",
    en: "## Project baseline",
  });
}

export function createCsContextTemplate(projectName: string, locale: AppLocale) {
  return pickLocale(locale, {
    ko: `# ${projectName} CS 컨텍스트

## 서비스 개요
- 서비스 설명을 여기에 작성하세요.
- 주요 기능을 2~3개 정리하세요.
- 대상 고객을 적어 주세요.

## FAQ
### Q: 자주 받는 질문
A: 안내할 답변을 작성하세요.

## 응답 정책
- 톤앤매너:
- 환불 정책:
- 버그 대응:
- 에스컬레이션:

## 알려진 이슈
- 현재 알려진 이슈가 없으면 "없음"으로 기록하세요.
`,
    en: `# ${projectName} CS Context

## Service Overview
- Describe the service here.
- List 2-3 key features.
- Note the target customer.

## FAQ
### Q: Common customer question
A: Write the approved answer here.

## Response Policy
- Tone and style:
- Refund policy:
- Bug handling:
- Escalation:

## Known Issues
- If there are no known issues, write "None".
`,
  });
}
