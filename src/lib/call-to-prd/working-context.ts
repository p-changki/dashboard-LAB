import {
  buildCallIntakeMetadataMarkdown,
  normalizeCallIntakeMetadata,
  type CallIntakeMetadata,
} from "@/lib/call-to-prd/intake-config";
import type { GeneratedDoc } from "@/lib/types/call-to-prd";

interface WorkingContextOptions {
  projectName?: string | null;
  customerName?: string | null;
  additionalContext?: string | null;
  intake?: Partial<CallIntakeMetadata> | null;
  projectContext?: string | null;
  projectContextSources?: string[] | null;
  baselineTitle?: string | null;
  baselinePrd?: string | null;
  pdfAnalysis?: string | null;
  pdfFileName?: string | null;
  prdMarkdown: string;
  relatedDocs?: GeneratedDoc[];
}

const ELLIPSIS = "\n\n(요약 생략)";

export function buildCallWorkingContext(options: WorkingContextOptions): string {
  const intake = normalizeCallIntakeMetadata(options.intake);
  const blocks = [
    formatNamedSection("프로젝트", options.projectName),
    formatNamedSection("고객", options.customerName),
    formatNamedSection("입력 메타", buildCallIntakeMetadataMarkdown(intake)),
    formatNamedSection("추가 맥락", options.additionalContext),
    formatNamedSection("프로젝트 기준 정보 요약", compactMarkdown(options.projectContext, 900)),
    formatNamedSection("프로젝트 기준 파일", formatSourceList(options.projectContextSources)),
    formatNamedSection(
      `기존 기준 문서 요약${options.baselineTitle ? ` (${options.baselineTitle})` : ""}`,
      compactMarkdown(options.baselinePrd, 1_000),
    ),
    formatNamedSection(
      `첨부 자료 분석 요약${options.pdfFileName ? ` (${options.pdfFileName})` : ""}`,
      compactMarkdown(options.pdfAnalysis, 900),
    ),
    formatNamedSection("최종 PRD 요약", compactMarkdown(options.prdMarkdown, 2_200)),
    formatRelatedDocsSection(options.relatedDocs),
  ].filter((block): block is string => Boolean(block));

  return blocks.join("\n\n");
}

function formatRelatedDocsSection(relatedDocs: GeneratedDoc[] | undefined) {
  if (!relatedDocs?.length) {
    return null;
  }

  const compactDocs = relatedDocs
    .filter((doc) => doc.type !== "prd")
    .slice(0, 4)
    .map((doc) => `### ${doc.title}\n${compactMarkdown(doc.markdown, 700)}`)
    .join("\n\n")
    .trim();

  if (!compactDocs) {
    return null;
  }

  return `## 참고 문서 요약\n${compactDocs}`;
}

function formatNamedSection(title: string, content: string | null | undefined) {
  const normalized = content?.trim();
  if (!normalized) {
    return null;
  }

  return `## ${title}\n${normalized}`;
}

function compactMarkdown(content: string | null | undefined, maxChars: number) {
  const normalized = content?.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxChars) {
    return normalized;
  }

  const lines = normalized.split("\n");
  const compactLines: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const nextLength = currentLength + line.length + 1;
    if (compactLines.length > 0 && nextLength > maxChars) {
      break;
    }

    compactLines.push(line);
    currentLength = nextLength;
  }

  const compact = compactLines.join("\n").trim();
  if (!compact) {
    return `${normalized.slice(0, maxChars).trim()}${ELLIPSIS}`;
  }

  return compact.endsWith(ELLIPSIS) ? compact : `${compact}${ELLIPSIS}`;
}

function formatSourceList(sources: string[] | null | undefined) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return sources.map((source) => `- ${source}`).join("\n");
}
