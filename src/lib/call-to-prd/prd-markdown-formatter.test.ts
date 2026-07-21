import { describe, expect, it } from "vitest";

import {
  joinSectionsIntoMarkdown,
  splitMarkdownIntoSections,
} from "@/lib/call-to-prd/prd-markdown-formatter";

const SAMPLE = `## 1. Summary

first body

## 2. Details

second body
`;

describe("splitMarkdownIntoSections", () => {
  it("splits on level-2 headings and keeps the body with its section", () => {
    const sections = splitMarkdownIntoSections(SAMPLE);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("1. Summary");
    expect(sections[0].content).toContain("first body");
    expect(sections[1].title).toBe("2. Details");
    expect(sections[1].content).toContain("second body");
  });

  it("gives every section a non-empty id", () => {
    for (const section of splitMarkdownIntoSections(SAMPLE)) {
      expect(section.id).toBeTruthy();
    }
  });

  it("keeps ids unique when two headings would slug the same", () => {
    const sections = splitMarkdownIntoSections("## Notes\n\na\n\n## Notes\n\nb\n");
    expect(sections).toHaveLength(2);
    expect(sections[0].id).not.toBe(sections[1].id);
  });

  it("still returns one section for markdown with no headings", () => {
    const sections = splitMarkdownIntoSections("plain text only");
    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain("plain text only");
  });

  it("returns a section for empty input rather than throwing", () => {
    expect(() => splitMarkdownIntoSections("")).not.toThrow();
  });
});

describe("joinSectionsIntoMarkdown", () => {
  it("round-trips: split then join preserves titles and bodies", () => {
    const sections = splitMarkdownIntoSections(SAMPLE);
    const joined = joinSectionsIntoMarkdown(sections);
    const reSplit = splitMarkdownIntoSections(joined);

    expect(reSplit.map((s) => s.title)).toEqual(sections.map((s) => s.title));
    expect(reSplit[0].content).toContain("first body");
    expect(reSplit[1].content).toContain("second body");
  });

  it("re-emits each title as a level-2 heading", () => {
    const joined = joinSectionsIntoMarkdown([
      { id: "a", title: "Alpha", content: "body a" },
    ]);
    expect(joined).toContain("## Alpha");
    expect(joined).toContain("body a");
  });

  it("survives a section whose body was replaced, as section regeneration does", () => {
    const sections = splitMarkdownIntoSections(SAMPLE);
    const edited = sections.map((s) =>
      s.id === sections[1].id ? { ...s, content: "regenerated body" } : s,
    );
    const joined = joinSectionsIntoMarkdown(edited);

    expect(joined).toContain("regenerated body");
    expect(joined).toContain("first body");
    expect(splitMarkdownIntoSections(joined)).toHaveLength(2);
  });
});
