/**
 * Ported from Inputmask/qunit/tests_optional.js
 * Tests optional mask sections.
 */
import { describe, it, expect } from "vitest";
import { createMask, isValid } from "../src/index.js";

describe("Optional sections", () => {
  it("(99) 9999[9]-99999 — input 121234-12345", () => {
    const engine = createMask({ mask: "(99) 9999[9]-99999" });
    "121234".split("").forEach((ch) => engine.processInput(ch));
    "12345".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("12");
  });

  it("(99) 9999[9]-99999 — input 121234512345", () => {
    const engine = createMask({ mask: "(99) 9999[9]-99999" });
    "121234512345".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("(12) 12345-12345");
  });

  it("99999[-9999] greedy true — input 123", () => {
    const engine = createMask({ mask: "99999[-9999]", greedy: true });
    "123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.isComplete()).toBe(false);
  });

  it("99999[-9999] greedy false — input 123", () => {
    const engine = createMask({ mask: "99999[-9999]", greedy: false });
    "123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.isComplete()).toBe(false);
  });

  it("99999[-9999] greedy false — input 12345", () => {
    const engine = createMask({ mask: "99999[-9999]", greedy: false });
    "12345".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.isComplete()).toBe(true);
  });

  it("99999[-9999] greedy false — input 123456", () => {
    const engine = createMask({ mask: "99999[-9999]", greedy: false });
    "123456".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("12345");
  });

  it("99999[-9999] greedy false — input 123456789", () => {
    const engine = createMask({ mask: "99999[-9999]", greedy: false });
    "123456789".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("12345-6789");
    expect(engine.isComplete()).toBe(true);
  });

  it('[9-]AAA.999 — optional leading digit', () => {
    const engine = createMask({ mask: "[9-]AAA.999" });
    "abc123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("ABC");
  });

  it("99[99] — short input is complete", () => {
    const engine = createMask({ mask: "99[99]" });
    engine.setValue("12");
    expect(engine.isComplete()).toBe(true);
  });

  it("99[99] — full input is also complete", () => {
    const engine = createMask({ mask: "99[99]" });
    engine.setValue("1234");
    expect(engine.isComplete()).toBe(true);
  });

  it("99999[-9999] greedy false — type 123456 backspace → isComplete?", () => {
    const engine = createMask({ mask: "99999[-9999]", greedy: false });
    "123456".split("").forEach((ch) => engine.processInput(ch));
    engine.processDelete("backspace");
    expect(engine.isComplete()).toBe(true);
  });

  it("a{+} XYZ 9 — dynamic alpha with static suffix", () => {
    const engine = createMask({ mask: "a{+} XYZ 9" });
    "ab1".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("AB");
  });

  it("999[- 999] type 123456", () => {
    const engine = createMask({ mask: "999[- 999]" });
    "123456".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("123- 456");
  });

  it("isValid('12lbs', {mask:'99[9]lb\\s'}) — thomstark", () => {
    const valid = isValid("12lbs", {
      mask: "99[9]lb\\s",
      greedy: false,
      skipOptionalPartCharacter: "",
      clearIncomplete: true,
    });
    expect(valid).toBe(true);
  });

  it("isValid('12lbs', {mask:'99{1,2}lb\\s'}) — thomstark", () => {
    const valid = isValid("12lbs", {
      mask: "99{1,2}lb\\s",
      greedy: false,
      skipOptionalPartCharacter: "",
      clearIncomplete: true,
    });
    expect(valid).toBe(true);
  });
});
