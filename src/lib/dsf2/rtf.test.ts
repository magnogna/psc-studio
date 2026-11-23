import { describe, expect, it } from "vitest";
import { rtfToText, textToRtf } from "./rtf";

describe("rtf", () => {
  it("round-trips Italian text with accents and paragraphs", () => {
    const t = "Attività di cantiere\nCaduta dall'alto: è vietato";
    expect(rtfToText(textToRtf(t))).toBe(t);
  });
  it("decodes cp1252 escapes and skips the font table", () => {
    expect(rtfToText("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0 Unit\\'e0\\par fine}")).toBe("Unità\nfine");
  });
});
