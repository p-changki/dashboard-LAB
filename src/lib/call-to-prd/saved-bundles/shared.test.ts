import { describe, expect, it } from "vitest";

import {
  buildBundleTitle,
  buildNextActionFileName,
  buildSavedBundleEntryName,
  buildSavedBundleEntryPath,
  getPreview,
  isSafeEntryName,
  sanitizeFileName,
} from "@/lib/call-to-prd/saved-bundles/shared";

describe("isSafeEntryName", () => {
  it("accepts a plain bundle name and a project-scoped one", () => {
    expect(isSafeEntryName("2026-07-21_customer_abc12345")).toBe(true);
    expect(isSafeEntryName("my-project/2026-07-21_customer_abc12345")).toBe(true);
  });

  it("rejects parent-directory traversal", () => {
    expect(isSafeEntryName("../etc/passwd")).toBe(false);
    expect(isSafeEntryName("project/../../secrets")).toBe(false);
    expect(isSafeEntryName("..")).toBe(false);
  });

  it("rejects backslashes, which could escape on Windows paths", () => {
    expect(isSafeEntryName("project\\..\\secrets")).toBe(false);
    expect(isSafeEntryName("a\\b")).toBe(false);
  });

  it("allows at most one slash, so writes stay one level deep", () => {
    expect(isSafeEntryName("a/b")).toBe(true);
    expect(isSafeEntryName("a/b/c")).toBe(false);
  });

  it("rejects empty segments", () => {
    expect(isSafeEntryName("")).toBe(false);
    expect(isSafeEntryName("/leading")).toBe(false);
    expect(isSafeEntryName("trailing/")).toBe(false);
  });
});

describe("sanitizeFileName", () => {
  it("replaces filesystem-hostile characters", () => {
    expect(sanitizeFileName("a/b")).toBe("a-b");
    expect(sanitizeFileName("re:port*name?")).toBe("re-port-name-");
    expect(sanitizeFileName('quote"pipe|')).toBe("quote-pipe-");
  });

  it("collapses whitespace into dashes", () => {
    expect(sanitizeFileName("some   project")).toBe("some-project");
  });

  it("caps the length so paths stay bounded", () => {
    expect(sanitizeFileName("x".repeat(120))).toHaveLength(50);
  });
});

describe("buildSavedBundleEntryName", () => {
  it("includes the call date, customer, and a short id", () => {
    expect(buildSavedBundleEntryName("abcdef1234567890", null, "Acme", "2026-07-21")).toBe(
      "2026-07-21_Acme_abcdef12",
    );
  });

  it("omits the customer segment when there is none", () => {
    expect(buildSavedBundleEntryName("abcdef1234567890", null, null, "2026-07-21")).toBe(
      "2026-07-21_abcdef12",
    );
  });

  it("sanitizes a customer name that would break the path", () => {
    expect(buildSavedBundleEntryName("abcdef1234567890", null, "a/b", "2026-07-21")).toBe(
      "2026-07-21_a-b_abcdef12",
    );
  });
});

describe("buildSavedBundleEntryPath", () => {
  it("prefixes the project folder", () => {
    expect(buildSavedBundleEntryPath("abcdef1234567890", "proj", "Acme", "2026-07-21")).toBe(
      "proj/2026-07-21_Acme_abcdef12",
    );
  });

  it("falls back to a general folder without a project name", () => {
    expect(buildSavedBundleEntryPath("abcdef1234567890", null, "Acme", "2026-07-21")).toBe(
      "general/2026-07-21_Acme_abcdef12",
    );
  });

  it("stays within one slash so isSafeEntryName still accepts it", () => {
    const entry = buildSavedBundleEntryPath("abcdef1234567890", "a/b", "c/d", "2026-07-21");
    expect(isSafeEntryName(entry)).toBe(true);
  });
});

describe("buildBundleTitle", () => {
  it("joins project and customer when both exist", () => {
    expect(buildBundleTitle("proj", "Acme")).toBe("proj · Acme");
  });

  it("falls back to whichever one is present", () => {
    expect(buildBundleTitle("proj", null)).toBe("proj");
    expect(buildBundleTitle(null, "Acme")).toBe("Acme");
  });

  it("has a last-resort title", () => {
    expect(buildBundleTitle(null, null)).toBe("Call To PRD");
  });
});

describe("getPreview", () => {
  it("flattens newlines so the preview stays single-line", () => {
    expect(getPreview("a\n\nb")).toBe("a b");
  });

  it("truncates to 120 characters", () => {
    expect(getPreview("x".repeat(200))).toHaveLength(120);
  });
});

describe("buildNextActionFileName", () => {
  it("maps each action type to a numbered markdown file", () => {
    expect(buildNextActionFileName("pm-handoff")).toBe("01-pm-handoff.md");
    expect(buildNextActionFileName("github-issues")).toBe("06-github-issues.md");
  });

  it("produces names that stay path-safe", () => {
    const name = buildNextActionFileName("qa-plan");
    expect(name).not.toContain("/");
    expect(name).not.toContain("..");
    expect(name).toMatch(/^\d{2}-[a-z-]+\.md$/);
  });
});
