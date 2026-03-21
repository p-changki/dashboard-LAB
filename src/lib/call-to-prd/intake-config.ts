export const CALL_INPUT_KINDS = [
  "meeting",
  "complaint",
  "incident",
  "change-request",
  "new-feature",
] as const;

export type CallInputKind = (typeof CALL_INPUT_KINDS)[number];

export const CALL_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type CallSeverity = (typeof CALL_SEVERITIES)[number];

export const CALL_CUSTOMER_IMPACTS = [
  "unknown",
  "single",
  "multiple",
  "broad",
] as const;
export type CallCustomerImpact = (typeof CALL_CUSTOMER_IMPACTS)[number];

export const CALL_URGENCY_LEVELS = ["low", "medium", "high", "asap"] as const;
export type CallUrgency = (typeof CALL_URGENCY_LEVELS)[number];

export const CALL_REPRODUCIBILITY_STATES = [
  "unknown",
  "confirmed",
  "intermittent",
  "not-reproduced",
] as const;
export type CallReproducibility = (typeof CALL_REPRODUCIBILITY_STATES)[number];

export interface CallIntakeMetadata {
  inputKind: CallInputKind;
  severity: CallSeverity;
  customerImpact: CallCustomerImpact;
  urgency: CallUrgency;
  reproducibility: CallReproducibility;
  currentWorkaround: string | null;
  separateExternalDocs: boolean;
}

export interface CallIntakeMetadataInput {
  inputKind?: string;
  severity?: string;
  customerImpact?: string;
  urgency?: string;
  reproducibility?: string;
  currentWorkaround?: string | null;
  separateExternalDocs?: boolean;
}

export const CALL_INPUT_KIND_LABELS: Record<CallInputKind, string> = {
  meeting: "회의 메모",
  complaint: "고객 불만 / VOC",
  incident: "운영 이슈 / 장애",
  "change-request": "변경 요청",
  "new-feature": "신규 기능 요청",
};

export const CALL_SEVERITY_LABELS: Record<CallSeverity, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  critical: "치명적",
};

export const CALL_CUSTOMER_IMPACT_LABELS: Record<CallCustomerImpact, string> = {
  unknown: "아직 모름",
  single: "소수 고객",
  multiple: "여러 고객",
  broad: "핵심 고객군 / 광범위",
};

export const CALL_URGENCY_LABELS: Record<CallUrgency, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  asap: "즉시 대응",
};

export const CALL_REPRODUCIBILITY_LABELS: Record<CallReproducibility, string> = {
  unknown: "아직 모름",
  confirmed: "재현됨",
  intermittent: "간헐 재현",
  "not-reproduced": "아직 재현 안 됨",
};

export const DEFAULT_CALL_INTAKE_METADATA: CallIntakeMetadata = {
  inputKind: "meeting",
  severity: "medium",
  customerImpact: "unknown",
  urgency: "medium",
  reproducibility: "unknown",
  currentWorkaround: null,
  separateExternalDocs: true,
};

export function isCallInputKind(value: string): value is CallInputKind {
  return CALL_INPUT_KINDS.includes(value as CallInputKind);
}

export function isCallSeverity(value: string): value is CallSeverity {
  return CALL_SEVERITIES.includes(value as CallSeverity);
}

export function isCallCustomerImpact(value: string): value is CallCustomerImpact {
  return CALL_CUSTOMER_IMPACTS.includes(value as CallCustomerImpact);
}

export function isCallUrgency(value: string): value is CallUrgency {
  return CALL_URGENCY_LEVELS.includes(value as CallUrgency);
}

export function isCallReproducibility(value: string): value is CallReproducibility {
  return CALL_REPRODUCIBILITY_STATES.includes(value as CallReproducibility);
}

export function normalizeCallIntakeMetadata(
  metadata?: CallIntakeMetadataInput | Partial<CallIntakeMetadata> | null,
): CallIntakeMetadata {
  const workaround = metadata?.currentWorkaround?.trim();

  return {
    inputKind: metadata?.inputKind && isCallInputKind(metadata.inputKind)
      ? metadata.inputKind
      : DEFAULT_CALL_INTAKE_METADATA.inputKind,
    severity: metadata?.severity && isCallSeverity(metadata.severity)
      ? metadata.severity
      : DEFAULT_CALL_INTAKE_METADATA.severity,
    customerImpact: metadata?.customerImpact && isCallCustomerImpact(metadata.customerImpact)
      ? metadata.customerImpact
      : DEFAULT_CALL_INTAKE_METADATA.customerImpact,
    urgency: metadata?.urgency && isCallUrgency(metadata.urgency)
      ? metadata.urgency
      : DEFAULT_CALL_INTAKE_METADATA.urgency,
    reproducibility: metadata?.reproducibility && isCallReproducibility(metadata.reproducibility)
      ? metadata.reproducibility
      : DEFAULT_CALL_INTAKE_METADATA.reproducibility,
    currentWorkaround: workaround ? workaround : null,
    separateExternalDocs: metadata?.separateExternalDocs ?? DEFAULT_CALL_INTAKE_METADATA.separateExternalDocs,
  };
}

export function buildCallIntakeMetadataMarkdown(metadata: CallIntakeMetadata): string {
  return [
    `- 입력 유형: ${CALL_INPUT_KIND_LABELS[metadata.inputKind]}`,
    `- 심각도: ${CALL_SEVERITY_LABELS[metadata.severity]}`,
    `- 영향 범위: ${CALL_CUSTOMER_IMPACT_LABELS[metadata.customerImpact]}`,
    `- 긴급도: ${CALL_URGENCY_LABELS[metadata.urgency]}`,
    `- 재현 상태: ${CALL_REPRODUCIBILITY_LABELS[metadata.reproducibility]}`,
    `- 현재 우회책: ${metadata.currentWorkaround ?? "없음 또는 미정"}`,
    `- 고객 공유 문서 정책: ${metadata.separateExternalDocs ? "내부 메모 제외" : "내부 메모 포함 가능"}`,
  ].join("\n");
}
