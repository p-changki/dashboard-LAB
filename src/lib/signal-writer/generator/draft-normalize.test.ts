import { describe, expect, it } from "vitest";

import {
  buildFallbackHookTexts,
  equalsIgnoringCase,
  firstSentence,
  isGenericHashtag,
  normalizeHashtags,
  tokenize,
} from "@/lib/signal-writer/generator/draft-normalize";

describe("normalizeHashtags", () => {
  it("strips the leading # so tags are stored bare", () => {
    expect(normalizeHashtags(["#ai", "#dev"])).toEqual(["ai", "dev"]);
  });

  it("drops duplicates after stripping", () => {
    expect(normalizeHashtags(["#ai", "ai"])).toEqual(["ai"]);
  });

  it("drops entries that become empty", () => {
    expect(normalizeHashtags(["#", "  ", "#ok"])).toEqual(["ok"]);
  });

  it("returns an empty list for empty input", () => {
    expect(normalizeHashtags([])).toEqual([]);
  });
});

describe("isGenericHashtag", () => {
  it("flags the filler tags on the deny list", () => {
    expect(isGenericHashtag("general")).toBe(true);
    expect(isGenericHashtag("#threads")).toBe(true);
    expect(isGenericHashtag("Agents")).toBe(true);
  });

  it("ignores punctuation and case when matching", () => {
    expect(isGenericHashtag("#Thread!")).toBe(true);
  });

  it("keeps a specific tag", () => {
    expect(isGenericHashtag("postgres-vacuum")).toBe(false);
    expect(isGenericHashtag("#ai")).toBe(false);
  });
});

describe("tokenize", () => {
  it("splits a sentence into lowercase word tokens", () => {
    const tokens = tokenize("Hello Brave World");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
  });

  it("returns nothing for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("firstSentence", () => {
  it("takes only up to the first terminator", () => {
    expect(firstSentence("One thing. Two thing.")).toBe("One thing.");
  });

  it("returns the whole string when there is no terminator", () => {
    expect(firstSentence("no terminator here")).toBe("no terminator here");
  });

  it("handles empty input without throwing", () => {
    expect(() => firstSentence("")).not.toThrow();
  });
});

describe("equalsIgnoringCase", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(equalsIgnoringCase("Hello", " hello ")).toBe(true);
  });

  it("still distinguishes different text", () => {
    expect(equalsIgnoringCase("hello", "world")).toBe(false);
  });
});

describe("buildFallbackHookTexts", () => {
  it("produces hook variants in both locales", () => {
    const ko = buildFallbackHookTexts("원본 훅", "ko");
    const en = buildFallbackHookTexts("original hook", "en");
    expect(ko.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
  });

  it("returns strings, not empty entries", () => {
    for (const text of buildFallbackHookTexts("hook", "en")) {
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
