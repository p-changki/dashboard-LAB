import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import type { CallGenerationMode } from "@/lib/types/call-to-prd";

const generationModeCopy: Record<CallGenerationMode, {
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  stepLabel: { ko: string; en: string };
}> = {
  claude: {
    label: { ko: "Claude 단일", en: "Claude only" },
    description: {
      ko: "기본 추천. 가장 비용이 안정적입니다.",
      en: "Default recommendation with the most predictable cost.",
    },
    stepLabel: { ko: "PRD 생성 (Claude 단일)", en: "Generate PRD (Claude only)" },
  },
  codex: {
    label: { ko: "Codex 단일", en: "Codex only" },
    description: {
      ko: "Codex CLI가 준비된 경우에만 사용합니다.",
      en: "Use only when Codex CLI is available.",
    },
    stepLabel: { ko: "PRD 생성 (Codex 단일)", en: "Generate PRD (Codex only)" },
  },
  dual: {
    label: { ko: "Dual AI", en: "Dual AI" },
    description: {
      ko: "Claude + Codex 생성 후 머지합니다. 비용이 가장 큽니다.",
      en: "Generates with Claude and Codex, then merges them. Highest cost.",
    },
    stepLabel: { ko: "PRD 생성 (Claude + Codex 병렬)", en: "Generate PRD (Claude + Codex in parallel)" },
  },
  openai: {
    label: { ko: "OpenAI API", en: "OpenAI API" },
    description: {
      ko: "CLI 없이 API key만으로 문서를 생성합니다.",
      en: "Generates docs with an API key only, without a CLI.",
    },
    stepLabel: { ko: "PRD 생성 (OpenAI API)", en: "Generate PRD (OpenAI API)" },
  },
};


export function getCallGenerationModeLabel(mode: CallGenerationMode, locale: AppLocale) {
  return pickLocale(locale, generationModeCopy[mode].label);
}

// Internal: only getCallGenerationModeOptions consumes this.
function getCallGenerationModeDescription(mode: CallGenerationMode, locale: AppLocale) {
  return pickLocale(locale, generationModeCopy[mode].description);
}

export function getCallGenerationStepLabel(mode: CallGenerationMode, locale: AppLocale) {
  return pickLocale(locale, generationModeCopy[mode].stepLabel);
}

export function getCallGenerationModeOptions(locale: AppLocale): Array<{
  value: CallGenerationMode;
  label: string;
  description: string;
}> {
  return (Object.keys(generationModeCopy) as CallGenerationMode[]).map((value) => ({
    value,
    label: getCallGenerationModeLabel(value, locale),
    description: getCallGenerationModeDescription(value, locale),
  }));
}

