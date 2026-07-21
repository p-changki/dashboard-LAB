// Per-channel prompt guidance strings. Pure lookups with no I/O, split out of
// generator.ts so the prompt-building surface is readable on its own.
import type { SignalWriterTargetChannel } from "@/lib/types/signal-writer";

export function getChannelLabelEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "X";
    case "linkedin":
      return "LinkedIn";
    default:
      return "Threads";
  }
}

export function getChannelLabelKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "X / Twitter";
    case "linkedin":
      return "LinkedIn";
    default:
      return "Threads";
  }
}

export function getChannelPromptGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "Write tighter than Threads. The first line should work as a standalone X post, and the follow-up sequence should feel quotable.";
    case "linkedin":
      return "Write with a more professional, operator-facing tone. Translate the story into workflow, product, or business impact.";
    default:
      return "Keep the tone conversational and skim-friendly, with a flow that feels easy to save and share.";
  }
}

export function getChannelPromptGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "Threads보다 더 짧고 날카롭게 쓰세요. 첫 줄은 단독 X 포스트로도 설 수 있어야 하고, 이어지는 문장도 인용되기 쉬워야 합니다.";
    case "linkedin":
      return "조금 더 실무형이고 전문적인 톤으로 쓰세요. 기사를 업무 흐름, 제품, 비즈니스 영향으로 번역하세요.";
    default:
      return "대화체 흐름을 유지하면서 저장하고 공유하기 쉬운 밀도로 쓰세요.";
  }
}

export function getShortPostGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "one publishable X post with a concrete point of view";
    case "linkedin":
      return "one publishable LinkedIn post with clearer structure and a professional tone";
    default:
      return "one publishable Threads post with a concrete point of view";
  }
}

export function getShortPostGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "바로 올릴 수 있는 한 개의 X 포스트여야 합니다";
    case "linkedin":
      return "전문적인 톤과 구조를 갖춘 한 개의 LinkedIn 포스트여야 합니다";
    default:
      return "바로 올릴 수 있는 한 개의 Threads 포스트여야 합니다";
  }
}

export function getSeriesGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "3 or 4 sequenced X posts max";
    case "linkedin":
      return "3 or 4 sequenced LinkedIn follow-up blocks max";
    default:
      return "4 or 5 posts max";
  }
}

export function getSeriesGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "x":
      return "3~4개 X 포스트까지만 작성하세요";
    case "linkedin":
      return "3~4개 LinkedIn 연속 블록까지만 작성하세요";
    default:
      return "4~5개 포스트까지만 작성하세요";
  }
}

export function getHashtagGuideEn(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "linkedin":
      return "1 to 3 specific tags";
    default:
      return "2 to 4 specific tags";
  }
}

export function getHashtagGuideKo(channel: SignalWriterTargetChannel) {
  switch (channel) {
    case "linkedin":
      return "1~3개 정도의 구체적인 태그여야 합니다";
    default:
      return "2~4개의 구체적인 태그여야 합니다";
  }
}

