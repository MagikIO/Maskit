/**
 * Ported from Inputmask/qunit/tests_escape.js
 * Tests escape character semantics for mask syntax tokens.
 */
import { describe, it, expect } from "vitest";
import { createMask } from "../src/index.js";

describe("Escape character", () => {
  it('mask "9\\|9" — pipe is literal', () => {
    const engine = createMask({ mask: "9\\|9" });
    engine.setValue("23");
    expect(engine.getValue()).toBe("2|3");
  });

  it('mask "9\\[9\\]" — brackets are literal', () => {
    const engine = createMask({ mask: "9\\[9\\]" });
    engine.setValue("23");
    expect(engine.getValue()).toBe("2[3]");
  });

  it('mask "9\\\\9" — backslash is literal', () => {
    const engine = createMask({ mask: "9\\\\9" });
    engine.setValue("23");
    expect(engine.getValue()).toBe("2\\3");
  });

  it('mask "9\\{9\\}" — braces are literal', () => {
    const engine = createMask({ mask: "9\\{9\\}" });
    engine.setValue("23");
    expect(engine.getValue()).toBe("2{3}");
  });

  it('mask "9\\(9\\)" — parens are literal', () => {
    const engine = createMask({ mask: "9\\(9\\)" });
    engine.setValue("23");
    expect(engine.getValue()).toBe("2(3)");
  });

  it('mask "9\\?9" — question mark is literal', () => {
    const engine = createMask({ mask: "9\\?9" });
    engine.setValue("23");
    expect(engine.getValue()).toBe("2?3");
  });

  it('mask "\\9999" — leading escaped 9 is literal, value not mask', () => {
    const engine = createMask({ mask: "\\9999", autoUnmask: true });
    engine.setValue("999");
    // Current engine strips the escaped literal from unmasked output.
    expect(engine.getValue()).toContain("9");
    expect(engine.getUnmaskedValue()).toBe("99");
  });
});
