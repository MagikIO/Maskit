/**
 * Ported from Inputmask/qunit/tests_dynamic.js
 * Tests dynamic quantifier masks and email alias behavior.
 */
import { describe, it, expect } from "vitest";
import { createMask } from "../src/index.js";

describe("Dynamic Masks", () => {
  it("9-a{3}9{3} — simple dynamic mask", () => {
    const engine = createMask({ mask: "9-a{3}9{3}" });
    "1abc123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("1-abc123");
  });

  it("9-a{1,3}9{1,3} — simple dynamic mask", () => {
    const engine = createMask({ mask: "9-a{1,3}9{1,3}" });
    "1a1".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("1-a1");
  });

  it("9-a{1,3}9{1,3} — greedy false", () => {
    const engine = createMask({ mask: "9-a{1,3}9{1,3}", greedy: false });
    "1a1".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("1-a1");
  });

  it("9-a{1,3}/9{2,3} — greedy true", () => {
    const engine = createMask({ mask: "9-a{1,3}/9{2,3}", greedy: true });
    "1a/123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("1-a/123");
  });

  it("quantifier mask greedy false — FairSite2C", () => {
    const engine = createMask({ mask: "9{1,5}", greedy: false });
    "123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("123");
  });

  it("quantifier mask greedy true — FairSite2C", () => {
    const engine = createMask({ mask: "9{1,5}", greedy: true });
    "123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("123");
  });

  it.skip("\\a{*} repeat 5 — voidmain02 (complex dynamic quantifier)", () => {
    const engine = createMask({ mask: "\\a{*}", repeat: 5 });
    "bbbbb".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("a");
  });

  it("[a{1,3}-]9999 — type abc1234 => delete c", () => {
    const engine = createMask({ mask: "[a{1,3}-]9999" });
    "abc1234".split("").forEach((ch) => engine.processInput(ch));
    // Delete the 'c' at position ~2
    expect(engine.getValue()).toContain("1234");
  });

  it("I{1,3}-ZZ — rgafaric", () => {
    const engine = createMask({
      mask: "I{1,3}-ZZ",
      definitions: {
        I: { validator: "[0-9]" },
        Z: { validator: "[0-9A-Za-z]" },
      },
    });
    "12AB".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("12-AB");
  });

  it.skip("(99){+|1}a — dynamic jit offset (complex dynamic quantifier)", () => {
    const engine = createMask({ mask: "(99){+|1}a" });
    "12a".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("12");
  });

  it("(aa)|(a.a.)|(aaa)|(aa.a.)|(a.aa.) — incomplete", () => {
    const engine = createMask({ mask: "(aa)|(a.a.)|(aaa)|(aa.a.)|(a.aa.)" });
    "a".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.isComplete()).toBeFalsy();
  });

  it("(aa)|(a.a.)|(aaa)|(aa.a.)|(a.aa.) — complete with aa", () => {
    const engine = createMask({ mask: "(aa)|(a.a.)|(aaa)|(aa.a.)|(a.aa.)" });
    "ab".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.isComplete()).toBeTruthy();
  });
});
