export function parseLastJsonObject<T>(
  raw: string,
  isMatch: (value: unknown) => value is T,
): T | null {
  const source = raw.trim();

  if (!source) {
    return null;
  }

  let matched: T | null = null;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "{") {
      continue;
    }

    const end = findJsonObjectEnd(source, index);
    if (end === -1) {
      continue;
    }

    const candidate = source.slice(index, end + 1);

    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isMatch(parsed)) {
        matched = parsed;
      }
    } catch {
      // Ignore malformed fragments and keep scanning for the last valid object.
    }
  }

  return matched;
}

export function containsCliTranscriptLeak(value: string) {
  const source = value.trim();

  if (!source) {
    return false;
  }

  if (FATAL_TRANSCRIPT_PATTERNS.some((pattern) => pattern.test(source))) {
    return true;
  }

  const softMatchCount = SOFT_TRANSCRIPT_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(source) ? 1 : 0),
    0,
  );

  return softMatchCount >= 2;
}

export function containsCliTranscriptLeakInStrings(values: Iterable<string>) {
  for (const value of values) {
    if (containsCliTranscriptLeak(value)) {
      return true;
    }
  }

  return false;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findJsonObjectEnd(source: string, startIndex: number) {
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char !== "}") {
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      return index;
    }
  }

  return -1;
}

const FATAL_TRANSCRIPT_PATTERNS = [
  /read additional input from stdin/i,
  /\bapproval:\s*\w+/i,
  /\bsandbox:\s*[-\w]+/i,
  /\bworkdir:\s*\S+/i,
  /\bone session:\b/i,
];

const SOFT_TRANSCRIPT_PATTERNS = [
  /openai codex v\d/i,
  /\bresearch preview\b/i,
  /\bprovider:\s*openai\b/i,
  /\bmodel:\s*[\w.-]+\b/i,
  /\bmcp:\s*[\w./-]+/i,
  /\bweb search:\b/i,
  /\bbash -lc\b/i,
  /\bstd(?:out|err)\b/i,
  /\breturn strict json only\b/i,
  /반드시\s+json만\s+반환/i,
  /\bjson (?:shape|schema):/i,
  /\bjson 형태:/i,
  /"hookVariants"\s*:\s*\[\s*\{\s*"text"\s*:\s*"string"/i,
  /"summary"\s*:\s*"string".*"scores"\s*:\s*\{/i,
];
