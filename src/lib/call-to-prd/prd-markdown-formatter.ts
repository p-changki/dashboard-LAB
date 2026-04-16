const SECTION_TITLES = [
  "입력 요약",
  "통화 요약",
  "고객 니즈 분석",
  "요구사항 목록",
  "PRD",
  "개발 계획서",
  "시퀀스 다이어그램",
  "우선순위 매트릭스",
  "리스크",
  "후속 질문",
  "경쟁사 참고",
] as const;

const SUBSECTION_TITLES = [
  "핵심 내용",
  "명시적 니즈",
  "숨은 니즈",
  "Pain Points",
  "기대하는 것",
  "목적",
  "범위",
  "대상 사용자",
  "성공 지표",
  "제약 조건",
  "비기능 요구사항",
  "기술적 리스크",
  "비즈니스 리스크",
  "추천 기술 스택",
] as const;

export interface PrdSection {
  id: string;
  title: string;
  content: string;
}

function isTableLine(line: string) {
  return /^\|.*\|$/.test(line);
}

function isHeadingLine(line: string) {
  return /^#{1,6}\s+/.test(line);
}

function isRuleLine(line: string) {
  return /^---+$/.test(line);
}

function normalizeLine(rawLine: string) {
  const line = rawLine.trim();

  if (!line) {
    return "";
  }

  if (isHeadingLine(line) || isRuleLine(line) || isTableLine(line) || /^```/.test(line) || /^[-*]\s+/.test(line) || /^>\s*/.test(line)) {
    return line;
  }

  const numberedSection = line.match(/^(\d+)\.\s+(.+)$/);
  if (numberedSection && SECTION_TITLES.some((title) => numberedSection[2].includes(title))) {
    return `## ${numberedSection[1]}. ${numberedSection[2]}`;
  }

  if (SECTION_TITLES.includes(line as (typeof SECTION_TITLES)[number])) {
    return `## ${line}`;
  }

  const boldLabel = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
  if (boldLabel && SUBSECTION_TITLES.includes(boldLabel[1] as (typeof SUBSECTION_TITLES)[number])) {
    return `### ${boldLabel[1]}`;
  }

  const plainLabel = line.match(/^([^:]{1,40}):\s*$/);
  if (plainLabel && SUBSECTION_TITLES.includes(plainLabel[1] as (typeof SUBSECTION_TITLES)[number])) {
    return `### ${plainLabel[1]}`;
  }

  if (SUBSECTION_TITLES.includes(line as (typeof SUBSECTION_TITLES)[number])) {
    return `### ${line}`;
  }

  return rawLine.trimEnd();
}

function addStructuralSpacing(text: string) {
  const sourceLines = text.split("\n");
  const lines: string[] = [];
  let inCodeBlock = false;

  for (let index = 0; index < sourceLines.length; index += 1) {
    const rawLine = sourceLines[index] ?? "";
    const trimmed = rawLine.trim();

    if (/^```/.test(trimmed)) {
      if (lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("");
      }

      lines.push(trimmed);
      inCodeBlock = !inCodeBlock;

      if (!inCodeBlock && sourceLines[index + 1]?.trim()) {
        lines.push("");
      }

      continue;
    }

    if (inCodeBlock) {
      lines.push(rawLine);
      continue;
    }

    const line = normalizeLine(rawLine);
    const previous = lines[lines.length - 1] ?? "";
    const nextRaw = sourceLines[index + 1] ?? "";
    const nextTrimmed = nextRaw.trim();

    if (!line) {
      if (previous !== "") {
        lines.push("");
      }
      continue;
    }

    if ((isHeadingLine(line) || isRuleLine(line)) && previous !== "") {
      lines.push("");
    }

    if (isTableLine(line) && previous !== "" && !isTableLine(previous)) {
      lines.push("");
    }

    lines.push(line);

    if ((isHeadingLine(line) || isRuleLine(line)) && nextTrimmed) {
      lines.push("");
      continue;
    }

    if (isTableLine(line) && nextTrimmed && !isTableLine(nextTrimmed)) {
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatPrdMarkdown(markdown: string): string {
  if (!markdown.trim()) {
    return markdown;
  }

  return addStructuralSpacing(markdown.replace(/\r\n?/g, "\n"));
}

export function splitMarkdownIntoSections(markdown: string): PrdSection[] {
  const formatted = formatPrdMarkdown(markdown).trim();
  if (!formatted) {
    return [];
  }

  const lines = formatted.split("\n");
  const sections: Array<{ title: string; lines: string[] }> = [];
  let preface: string[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        sections.push(current);
      }

      current = { title: headingMatch[1].trim(), lines: [] };
      if (preface.length > 0) {
        current.lines.push(preface.join("\n").trim());
        preface = [];
      }
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else {
      preface.push(line);
    }
  }

  if (current) {
    sections.push(current);
  }

  if (sections.length === 0) {
    return [{ id: "section-1", title: "Document", content: formatted }];
  }

  const idCounts = new Map<string, number>();

  return sections.map((section, index) => {
    const baseId = slugifySectionTitle(section.title) || `section-${index + 1}`;
    const nextCount = (idCounts.get(baseId) ?? 0) + 1;
    idCounts.set(baseId, nextCount);

    return {
      id: nextCount === 1 ? baseId : `${baseId}-${nextCount}`,
      title: section.title,
      content: section.lines.join("\n").trim(),
    };
  });
}

export function joinSectionsIntoMarkdown(sections: PrdSection[]): string {
  return sections
    .map((section) => [`## ${section.title}`, section.content.trim()].filter(Boolean).join("\n\n"))
    .join("\n\n")
    .trim();
}

function slugifySectionTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
