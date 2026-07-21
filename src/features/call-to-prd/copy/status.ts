import type { AppLocale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";
import type { CallRecord } from "@/lib/types/call-to-prd";

const statusCopy: Record<CallRecord["status"], { ko: string; en: string }> = {
  uploading: { ko: "업로드 준비 중", en: "Preparing upload" },
  transcribing: { ko: "음성 텍스트 변환 중", en: "Transcribing audio" },
  "extracting-pdf": { ko: "PDF 텍스트 추출 중", en: "Extracting PDF text" },
  "analyzing-pdf": { ko: "PDF 구조 분석 중", en: "Analyzing PDF structure" },
  analyzing: { ko: "PRD 생성 중", en: "Generating PRD" },
  merging: { ko: "Dual-AI 머지 중", en: "Merging dual-AI output" },
  "generating-docs": { ko: "실무 문서 생성 중", en: "Generating working docs" },
  completed: { ko: "완료", en: "Completed" },
  failed: { ko: "실패", en: "Failed" },
};


export function getCallStatusLabel(status: CallRecord["status"], locale: AppLocale) {
  return pickLocale(locale, statusCopy[status]);
}

