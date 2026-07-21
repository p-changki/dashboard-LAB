import type { AppLocale } from "@/lib/locale";
import { baseCopy } from "@/features/call-to-prd/copy/base-copy";
import { tabCopy } from "@/features/call-to-prd/copy/tab";
import {
  docGuideCopy,
  presetGuide,
  scenarioGuideCopy,
} from "@/features/call-to-prd/copy/guides";

export function getCallToPrdCopy(locale: AppLocale) {
  const base = locale === "en" ? baseCopy.en : baseCopy.ko;
  const tab = locale === "en" ? tabCopy.en : tabCopy.ko;
  const resolvedPresetGuide = locale === "en" ? presetGuide.en : presetGuide.ko;
  const resolvedDocGuide = locale === "en" ? docGuideCopy.en : docGuideCopy.ko;
  const resolvedScenarioGuide = locale === "en" ? scenarioGuideCopy.en : scenarioGuideCopy.ko;

  return {
    ...base,
    tab,
    guideData: {
      presetGuide: resolvedPresetGuide,
      docGuide: resolvedDocGuide,
      scenarioGuide: resolvedScenarioGuide,
    },
  };
}

export type CallToPrdCopy = ReturnType<typeof getCallToPrdCopy>;

