import { splitMarkdownIntoSections } from "@/lib/call-to-prd/prd-markdown-formatter";

interface BuildGithubIssueDraftInput {
  projectName?: string | null;
  customerName?: string | null;
  prdMarkdown: string;
}

const SUMMARY_SECTION_PATTERN = /(요약|summary|배경|context|문제|problem|목표|goal)/i;
const ACCEPTANCE_SECTION_PATTERN = /(acceptance|criteria|완료 기준|수용 기준|requirements?|요구사항)/i;

export function buildGithubIssueDraft({
  projectName,
  customerName,
  prdMarkdown,
}: BuildGithubIssueDraftInput) {
  const sections = splitMarkdownIntoSections(prdMarkdown);
  const summary = buildSummary(projectName, customerName, sections);
  const acceptanceCriteria = buildAcceptanceCriteria(sections);

  return [
    "## Summary",
    summary,
    "",
    "## Acceptance Criteria",
    ...acceptanceCriteria.map((item) => `- ${item}`),
  ].join("\n");
}

function buildSummary(
  projectName: string | null | undefined,
  customerName: string | null | undefined,
  sections: ReturnType<typeof splitMarkdownIntoSections>,
) {
  const targetSection = sections.find((section) => SUMMARY_SECTION_PATTERN.test(section.title))
    ?? sections[0]
    ?? null;
  const sentences = extractMeaningfulLines(targetSection?.content ?? "").slice(0, 4);
  const summaryText = sentences.join(" ");
  const subject = [projectName?.trim(), customerName?.trim()].filter(Boolean).join(" / ");

  if (subject && summaryText) {
    return `${subject}: ${summaryText}`;
  }

  if (summaryText) {
    return summaryText;
  }

  return "Review the PRD and break the work into implementation tickets.";
}

function buildAcceptanceCriteria(
  sections: ReturnType<typeof splitMarkdownIntoSections>,
) {
  const acceptanceSection = sections.find((section) => ACCEPTANCE_SECTION_PATTERN.test(section.title)) ?? null;
  const preferredItems = extractBulletItems(acceptanceSection?.content ?? "");

  if (preferredItems.length > 0) {
    return preferredItems.slice(0, 6);
  }

  const fallbackItems = sections
    .flatMap((section) => extractBulletItems(section.content))
    .filter(Boolean);

  if (fallbackItems.length > 0) {
    return fallbackItems.slice(0, 6);
  }

  return [
    "Review the generated PRD with PM and FE owners.",
    "Convert confirmed requirements into implementation tasks.",
    "Add QA coverage for the primary success and failure cases.",
  ];
}

function extractBulletItems(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => stripMarkdown(line.replace(/^[-*]\s+/, "")))
    .filter(Boolean);
}

function extractMeaningfulLines(content: string) {
  return content
    .split("\n")
    .map((line) => stripMarkdown(line))
    .filter((line) => line.length > 0);
}

function stripMarkdown(value: string) {
  return value
    .replace(/^#{1,6}\s+/g, "")
    .replace(/`+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
