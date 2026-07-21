import { describe, expect, it } from "vitest";

import {
  buildFallbackDiffReport,
  buildGenerationFailureMessage,
  formatSize,
  getErrorMessage,
  isCallGenerationMode,
  isClaudeUsageLimitError,
} from "@/lib/call-to-prd/pipeline/shared";

describe("getErrorMessage", () => {
  it("uses the Error message when there is one", () => {
    expect(getErrorMessage(new Error("boom"), "ko")).toBe("boom");
  });

  it("falls back to a localized unknown-error string", () => {
    expect(getErrorMessage(null, "ko")).toBe("알 수 없는 오류");
    expect(getErrorMessage("a string", "en")).toBe("Unknown error");
  });
});

describe("isCallGenerationMode", () => {
  it("accepts the four supported modes", () => {
    for (const mode of ["claude", "codex", "dual", "openai"]) {
      expect(isCallGenerationMode(mode)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isCallGenerationMode("gpt")).toBe(false);
    expect(isCallGenerationMode("")).toBe(false);
  });
});

describe("isClaudeUsageLimitError", () => {
  it("detects the usage-limit phrasings that trigger fallback", () => {
    expect(isClaudeUsageLimitError("You've hit your limit")).toBe(true);
    expect(isClaudeUsageLimitError("usage limit reached")).toBe(true);
    expect(isClaudeUsageLimitError("rate limit exceeded")).toBe(true);
    expect(isClaudeUsageLimitError("quota exhausted")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isClaudeUsageLimitError("USAGE LIMIT")).toBe(true);
  });

  it("does not fire on unrelated failures", () => {
    expect(isClaudeUsageLimitError("ENOENT: no such file")).toBe(false);
    expect(isClaudeUsageLimitError(null)).toBe(false);
  });
});

describe("formatSize", () => {
  it("scales bytes to KB and MB", () => {
    expect(formatSize(512)).toBe("512B");
    expect(formatSize(2048)).toBe("2.0KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5.0MB");
  });
});

describe("buildGenerationFailureMessage", () => {
  it("reports the failing provider for a single-provider mode", () => {
    const message = buildGenerationFailureMessage({
      locale: "en",
      generationMode: "claude",
      claudeError: "cli missing",
      codexError: null,
      openAiError: null,
    });
    expect(message).toContain("cli missing");
  });

  it("combines every provider error in dual mode", () => {
    const message = buildGenerationFailureMessage({
      locale: "en",
      generationMode: "dual",
      claudeError: "claude down",
      codexError: "codex down",
      openAiError: null,
    });
    expect(message).toContain("claude down");
    expect(message).toContain("codex down");
  });

  it("still produces a message when no provider reported anything", () => {
    const message = buildGenerationFailureMessage({
      locale: "en",
      generationMode: "dual",
      claudeError: null,
      codexError: null,
      openAiError: null,
    });
    expect(message).toBe("AI generation failed");
  });
});

describe("buildFallbackDiffReport", () => {
  it("labels each single-generation mode", () => {
    const base = {
      locale: "en" as const,
      claudePrd: "x",
      codexPrd: null,
      openAiPrd: null,
      claudeError: null,
      codexError: null,
      openAiError: null,
    };
    expect(buildFallbackDiffReport({ ...base, generationMode: "claude" })).toContain("Claude");
    expect(buildFallbackDiffReport({ ...base, generationMode: "codex" })).toContain("Codex");
    expect(buildFallbackDiffReport({ ...base, generationMode: "openai" })).toContain("OpenAI");
  });

  it("explains a missing codex side in dual mode", () => {
    const report = buildFallbackDiffReport({
      locale: "en",
      generationMode: "dual",
      claudePrd: "x",
      codexPrd: null,
      openAiPrd: null,
      claudeError: null,
      codexError: "Codex 미설치",
      openAiError: null,
    });
    expect(report).toContain("Codex");
  });

  it("returns null when both sides produced output", () => {
    expect(
      buildFallbackDiffReport({
        locale: "en",
        generationMode: "dual",
        claudePrd: "x",
        codexPrd: "y",
        openAiPrd: null,
        claudeError: null,
        codexError: null,
        openAiError: null,
      }),
    ).toBeNull();
  });
});
