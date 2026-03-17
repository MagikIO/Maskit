/**
 * Ported from Inputmask/qunit/tests_regex.js
 * Tests regex-driven mask behavior.
 */
import { describe, it, expect } from "vitest";
import { createMask } from "../src/index.js";

describe("Regex masks", () => {
  it('regex: "[0-9]*" — accepts digits', () => {
    const engine = createMask({ regex: "[0-9]*" });
    "123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("123");
  });

  it('regex: "[0-9]*" — isComplete', () => {
    const engine = createMask({ regex: "[0-9]*" });
    "12".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.isComplete()).toBeTruthy();
  });

  it('regex: "[A-Za-z0-9]*" — accepts alphanumeric', () => {
    const engine = createMask({
      regex: "[A-Za-z\\u0410-\\u044F\\u0401\\u04510-9]*",
    });
    "abc123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("abc123");
  });

  it('regex: "[A-Za-z]+[A-Za-z0-9]*"', () => {
    const engine = createMask({
      regex: "[A-Za-z\\u0410-\\u044F\\u0401\\u0451]+[A-Za-z\\u0410-\\u044F\\u0401\\u04510-9]*",
    });
    "abc".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("abc");
  });

  it('regex for coordinates — valid value', () => {
    const engine = createMask({ regex: "[-]?(([1-8][0-9])|[1-9]0?)" });
    "45".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("45");
  });

  it('regex for coordinates — negative value', () => {
    const engine = createMask({ regex: "[-]?(([1-8][0-9])|[1-9]0?)" });
    "-45".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("-45");
  });

  it('regex for coordinates — boundary value 90', () => {
    const engine = createMask({ regex: "[-]?(([1-8][0-9])|[1-9]0?)" });
    "90".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("90");
  });

  it('regex "(abc)+(def)" — type abcdef', () => {
    const engine = createMask({ regex: "(abc)+(def)" });
    "abcdef".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("abcdef");
  });

  it('regex "(abc)+(def)" — filters non-matching input', () => {
    const engine = createMask({ regex: "(abc)+(def)" });
    "123a4b5c6d7e8f".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("abc");
  });

  it('regex "(abc)+(def)" — repeated prefix abcabcdef', () => {
    const engine = createMask({ regex: "(abc)+(def)" });
    "abcabcdef".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("abcabcdef");
  });

  it('regex "(abc){2,4}(def)" — filters input', () => {
    const engine = createMask({ regex: "(abc){2,4}(def)" });
    "abcabcdef".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("abc");
  });

  it("[0-9]{2}|[0-9]{3} — type 123", () => {
    const engine = createMask({ regex: "[0-9]{2}|[0-9]{3}" });
    "123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("123");
  });

  it("CSS unit regex — accepts dimension values", () => {
    const engine = createMask({
      regex: "[+-]?[0-9]+\\.?([0-9]+)?(px|em|rem|ex|%|in|cm|mm|pt|pc)",
    });
    "12px".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("12px");
  });
});
