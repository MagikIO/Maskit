/**
 * Ported from Inputmask/qunit/tests_multi.js
 * Tests multi-mask selection and disambiguation.
 */
import { describe, it, expect } from "vitest";
import { createMask } from "../src/index.js";

describe("Multi masks", () => {
  it('["99-99","999-99"] — type 12345', () => {
    const engine = createMask({ mask: ["99-99", "999-99"] });
    "12345".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("123-45");
  });

  it('["999.999.999-99","99.999.999/9999-99"] — type 12312312312', () => {
    const engine = createMask({
      mask: ["999.999.999-99", "99.999.999/9999-99"],
    });
    "12312312312".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("123.123.123-12");
  });

  it('["99999","99999-9999"] greedy false keepStatic true — type 12345', () => {
    const engine = createMask({
      mask: ["99999", "99999-9999"],
      greedy: false,
      keepStatic: true,
    });
    "12345".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("12345");
  });

  it('["99999","99999-9999"] — type 12345-1234', () => {
    const engine = createMask({
      mask: ["99999", "99999-9999"],
      greedy: false,
      keepStatic: true,
    });
    "123451234".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("12345-1234");
  });

  it('["99999","99999-9999","999999-9999"] — type 1234561234', () => {
    const engine = createMask({
      mask: ["99999", "99999-9999", "999999-9999"],
    });
    "1234561234".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("123456-1234");
  });

  it('["9 AAA-AAA","A 999-999"] — type 1abc', () => {
    const engine = createMask({
      mask: ["9 AAA-AAA", "A 999-999"],
      definitions: {
        A: { validator: "[A-Za-z]", casing: "upper" },
      },
    });
    "1abc".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("1 ABC");
  });

  it('["9 AAA-AAA","A 999-999"] — type a123', () => {
    const engine = createMask({
      mask: ["9 AAA-AAA", "A 999-999"],
      definitions: {
        A: { validator: "[A-Za-z]", casing: "upper" },
      },
    });
    "a123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("A 123");
  });

  it('["99.9","X","abc"] with custom X def — type x', () => {
    const engine = createMask({
      mask: ["99.9", "X", "abc"],
      definitions: {
        X: { validator: "[xX]", casing: "upper" },
      },
    });
    engine.processInput("x");
    expect(engine.getValue().replace(/_/g, "")).toContain("X");
  });

  it('[{"mask":"###-##-####"}] with # as digit — type 123121234', () => {
    const engine = createMask({
      mask: [{ mask: "###-##-####" }],
      definitions: {
        "#": { validator: "[0-9]" },
      },
    });
    "123121234".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("123-12-1234");
  });

  it('["[9-]AAA-999","999999"] keepStatic false — type 1a', () => {
    const engine = createMask({
      mask: ["[9-]AAA-999", "999999"],
      keepStatic: false,
    });
    "1a".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("1");
    expect(engine.getValue()).toContain("A");
  });

  it("(99 99 999999)|(*{+}) — type 12abc", () => {
    const engine = createMask({ mask: "(99 99 999999)|(*{+})" });
    "12abc".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("12abc");
  });

  it('["(99) 9999-9999","(99) 99999-9999"] — type 12123451234', () => {
    const engine = createMask({
      mask: ["(99) 9999-9999", "(99) 99999-9999"],
    });
    "12123451234".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("(12) 12345-1234");
  });
});
