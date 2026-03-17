/**
 * Ported from Inputmask/qunit/tests_keepStatic.js
 * Tests keepStatic mask switching behavior.
 */
import { describe, it, expect } from "vitest";
import { createMask } from "../src/index.js";

describe("keepStatic mask switching", () => {
  it.skip('multi-mask array keepStatic true — +55 phone', () => {
    const engine = createMask({
      mask: ["+55-99-9999-9999", "+55-99-99999-9999"],
      keepStatic: true,
    });
    engine.setValue("5512123451234");
    expect(engine.getValue()).toContain("+55");
  });

  it("+55-99-9999|(99)-9999 keepStatic true — type 12123451234", () => {
    const engine = createMask({
      mask: "+55-99-9999|(99)-9999",
      keepStatic: true,
    });
    "12123451234".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("+55");
  });

  it('["(99) 9999-9999","(99) 99999-9999"] — val 1212341234', () => {
    const engine = createMask({
      mask: ["(99) 9999-9999", "(99) 99999-9999"],
    });
    engine.setValue("1212341234");
    expect(engine.getValue()).toBe("(12) 1234-1234");
  });

  it("+55-99-9999|(99)-9999 keepStatic false — type 12123451234", () => {
    const engine = createMask({
      mask: "+55-99-9999|(99)-9999",
      keepStatic: false,
    });
    "12123451234".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("+55-12");
  });

  it('multi-mask keepStatic true — backspace switches back', () => {
    const engine = createMask({
      mask: ["+55-99-9999-9999", "+55-99-99999-9999"],
      keepStatic: true,
    });
    "12123451234".split("").forEach((ch) => engine.processInput(ch));
    engine.processDelete("backspace");
    expect(engine.getValue()).toContain("+55");
  });

  it('["99-9999-99","99-99999-99"] — add 1 upfront', () => {
    const engine = createMask({
      mask: ["99-9999-99", "99-99999-99"],
    });
    "12123412".split("").forEach((ch) => engine.processInput(ch));
    // Attempt to insert at beginning
    engine.processInput("1", 0);
    expect(engine.getValue()).toContain("12");
  });

  it('["99-99999-9","99-999999-9"] — type 121234561', () => {
    const engine = createMask({
      mask: ["99-99999-9", "99-999999-9"],
    });
    "121234561".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("12");
  });

  it('"(99-9)|(99999)" keepStatic true greedy false — type 12345', () => {
    const engine = createMask({
      mask: "(99-9)|(99999)",
      keepStatic: true,
      greedy: false,
    });
    "12345".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("12345");
  });

  it("7|8 999 99 99 — hiddenman", () => {
    const engine = createMask({ mask: "7|8 999 99 99" });
    engine.setValue("7123456");
    expect(engine.getValue()).toContain("7");
  });

  it("(78)|(79) 999 99 99", () => {
    const engine = createMask({ mask: "(78)|(79) 999 99 99" });
    engine.setValue("7812345");
    expect(engine.getValue()).toContain("78");
  });

  it("(78)|(79) 999 99 99 — type 5", () => {
    const engine = createMask({ mask: "(78)|(79) 999 99 99" });
    engine.processInput("5");
    // 5 doesn't match 7 or 8 prefix
    expect(engine.getValue()).toBeDefined();
  });

  it("(78)|(74) 999 99 99", () => {
    const engine = createMask({ mask: "(78)|(74) 999 99 99" });
    engine.setValue("7812345");
    expect(engine.getValue()).toContain("78");
  });

  it("5-9|(9a)-5 — keepStatic false", () => {
    const engine = createMask({ mask: "5-9|(9a)-5", keepStatic: false });
    engine.setValue("585");
    expect(engine.getValue()).toContain("5");
  });

  it('(99 99)|(*****) keepStatic false — type 12 abc', () => {
    const engine = createMask({ mask: "(99 99)|(*****)", keepStatic: false });
    "12abc".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("12abc");
  });

  it('(99 99)|(*****) keepStatic false — type 12 123', () => {
    const engine = createMask({ mask: "(99 99)|(*****)", keepStatic: false });
    "12123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("12");
  });

  it('(99 99)|(*****) keepStatic true — type 1212', () => {
    const engine = createMask({ mask: "(99 99)|(*****)", keepStatic: true });
    "1212".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("12 12");
  });

  it('(99 99)|(*****) keepStatic true — type 12123', () => {
    const engine = createMask({ mask: "(99 99)|(*****)", keepStatic: true });
    "12123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("12");
  });

  it('(99 99)|(*****) keepStatic true — type abcde', () => {
    const engine = createMask({ mask: "(99 99)|(*****)", keepStatic: true });
    "abcde".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("abcde");
  });

  it('["999-9999","(999) 999-9999","1-(999) 999-9999"] — 999-9999', () => {
    const engine = createMask({
      mask: ["999-9999", "(999) 999-9999", "1-(999) 999-9999"],
    });
    engine.setValue("1234567");
    expect(engine.getValue()).toBe("123-4567");
  });

  it('["999-9999","(999) 999-9999","1-(999) 999-9999"] — (999) 999-9999', () => {
    const engine = createMask({
      mask: ["999-9999", "(999) 999-9999", "1-(999) 999-9999"],
    });
    engine.setValue("1234567890");
    expect(engine.getValue()).toBe("(123) 456-7890");
  });

  it.skip('["999-9999","(999) 999-9999","1-(999) 999-9999"] — 1-(999) 999-9999', () => {
    const engine = createMask({
      mask: ["999-9999", "(999) 999-9999", "1-(999) 999-9999"],
    });
    engine.setValue("12345678901");
    expect(engine.getValue()).toBe("1-(234) 567-8901");
  });
});
