import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import type {
  CallCustomerImpact,
  CallInputKind,
  CallReproducibility,
  CallSeverity,
  CallUrgency,
} from "@/lib/call-to-prd/intake-config";

const inputKindLabels: Record<CallInputKind, { ko: string; en: string }> = {
  meeting: { ko: "회의 메모", en: "Meeting notes" },
  complaint: { ko: "고객 불만 / VOC", en: "Customer complaint / VOC" },
  incident: { ko: "운영 이슈 / 장애", en: "Operational issue / incident" },
  "change-request": { ko: "변경 요청", en: "Change request" },
  "new-feature": { ko: "신규 기능 요청", en: "New feature request" },
};

const severityLabels: Record<CallSeverity, { ko: string; en: string }> = {
  low: { ko: "낮음", en: "Low" },
  medium: { ko: "보통", en: "Medium" },
  high: { ko: "높음", en: "High" },
  critical: { ko: "치명적", en: "Critical" },
};

const customerImpactLabels: Record<CallCustomerImpact, { ko: string; en: string }> = {
  unknown: { ko: "아직 모름", en: "Unknown" },
  single: { ko: "소수 고객", en: "Single customer" },
  multiple: { ko: "여러 고객", en: "Multiple customers" },
  broad: { ko: "핵심 고객군 / 광범위", en: "Broad / key segment" },
};

const urgencyLabels: Record<CallUrgency, { ko: string; en: string }> = {
  low: { ko: "낮음", en: "Low" },
  medium: { ko: "보통", en: "Medium" },
  high: { ko: "높음", en: "High" },
  asap: { ko: "즉시 대응", en: "ASAP" },
};

const reproducibilityLabels: Record<CallReproducibility, { ko: string; en: string }> = {
  unknown: { ko: "아직 모름", en: "Unknown" },
  confirmed: { ko: "재현됨", en: "Confirmed" },
  intermittent: { ko: "간헐 재현", en: "Intermittent" },
  "not-reproduced": { ko: "아직 재현 안 됨", en: "Not reproduced yet" },
};

// Doc-type labels live in @/lib/call-to-prd/doc-labels (shared with the server);
// docCopy only owns the UI-specific shortLabel and description.

export function getCallInputKindLabel(value: CallInputKind, locale: AppLocale) {
  return pickLocale(locale, inputKindLabels[value]);
}

export function getCallSeverityLabel(value: CallSeverity, locale: AppLocale) {
  return pickLocale(locale, severityLabels[value]);
}

export function getCallCustomerImpactLabel(value: CallCustomerImpact, locale: AppLocale) {
  return pickLocale(locale, customerImpactLabels[value]);
}

export function getCallUrgencyLabel(value: CallUrgency, locale: AppLocale) {
  return pickLocale(locale, urgencyLabels[value]);
}

export function getCallReproducibilityLabel(value: CallReproducibility, locale: AppLocale) {
  return pickLocale(locale, reproducibilityLabels[value]);
}

