import { describe, expect, it } from "vitest";

import {
  createDefaultPerformanceForm,
  getResearchCacheKey,
  getTrendBoardReviewState,
  moveTrendBoardItem,
  normalizeSignalWriterText,
  toMetricNumber,
  toPostedAtIso,
} from "@/features/signal-writer/helpers";

describe("normalizeSignalWriterText", () => {
  it("trims and lowercases so surrounding whitespace and case do not split duplicates", () => {
    expect(normalizeSignalWriterText("  Hello World  ")).toBe("hello world");
  });

  it("does not collapse inner whitespace — dedupe compares exact inner spacing", () => {
    expect(normalizeSignalWriterText("a  b")).toBe("a  b");
  });

  it("handles empty input", () => {
    expect(normalizeSignalWriterText("")).toBe("");
  });
});

describe("toMetricNumber", () => {
  it("parses plain digits", () => {
    expect(toMetricNumber("1200")).toBe(1200);
  });

  it("uses 0 as the sentinel for empty, non-numeric, or non-positive input", () => {
    expect(toMetricNumber("")).toBe(0);
    expect(toMetricNumber("abc")).toBe(0);
    expect(toMetricNumber("-5")).toBe(0);
  });
});

describe("toPostedAtIso", () => {
  it("uses an empty string as the sentinel for empty input", () => {
    expect(toPostedAtIso("")).toBe("");
  });

  it("returns an empty string rather than an Invalid Date for garbage", () => {
    expect(toPostedAtIso("not-a-date")).toBe("");
  });

  it("converts a parseable date to an ISO string", () => {
    const iso = toPostedAtIso("2026-07-21T00:00");
    expect(iso).not.toBe("");
    expect(() => new Date(iso).toISOString()).not.toThrow();
  });
});

describe("getResearchCacheKey", () => {
  it("keys on both signal and channel so channels do not collide", () => {
    expect(getResearchCacheKey("s1", "threads")).not.toBe(
      getResearchCacheKey("s1", "linkedin"),
    );
    expect(getResearchCacheKey("s1", "threads")).toBe(getResearchCacheKey("s1", "threads"));
  });
});

describe("createDefaultPerformanceForm", () => {
  it("starts every field empty", () => {
    const form = createDefaultPerformanceForm();
    expect(Object.values(form).every((value) => value === "")).toBe(true);
  });

  it("returns a fresh object each call, so edits do not leak between drafts", () => {
    const a = createDefaultPerformanceForm();
    const b = createDefaultPerformanceForm();
    a.views = "10";
    expect(b.views).toBe("");
  });
});

describe("moveTrendBoardItem", () => {
  const order = ["a", "b", "c"];

  it("moves an item up and down", () => {
    expect(moveTrendBoardItem(order, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveTrendBoardItem(order, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("is a no-op at the boundaries", () => {
    expect(moveTrendBoardItem(order, "a", "up")).toEqual(order);
    expect(moveTrendBoardItem(order, "c", "down")).toEqual(order);
  });

  it("leaves the order alone for an unknown id", () => {
    expect(moveTrendBoardItem(order, "zzz", "up")).toEqual(order);
  });

  it("does not mutate the input array", () => {
    const input = [...order];
    moveTrendBoardItem(input, "b", "up");
    expect(input).toEqual(order);
  });
});

describe("getTrendBoardReviewState", () => {
  it("falls back to a default state for an unknown item", () => {
    const state = getTrendBoardReviewState({}, "missing");
    expect(state).toEqual({ included: true, reviewed: false, note: "" });
  });

  it("returns the stored state when present", () => {
    const stored = { included: false, reviewed: true, note: "skip" };
    expect(getTrendBoardReviewState({ x: stored }, "x")).toEqual(stored);
  });
});
