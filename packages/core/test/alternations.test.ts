/**
 * Ported from Inputmask/qunit/tests_alternations.js
 * Tests alternation mask syntax and nested alternators.
 */
import { describe, it, expect } from "vitest";
import { createMask, format } from "../src/index.js";

describe("Alternations", () => {
  it('"9{1,2}C|S A{1,3} 9{4}" — type 12Cabc1234', () => {
    const engine = createMask({ mask: "9{1,2}C|S A{1,3} 9{4}" });
    "12Cabc1234".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("12C ABC 1234");
  });

  it('"9{1,2}C|S A{1,3} 9{4}" — replace C with S', () => {
    const engine = createMask({ mask: "9{1,2}C|S A{1,3} 9{4}" });
    "12Cabc1234".split("").forEach((ch) => engine.processInput(ch));
    // Replace position 2 (C) with S
    engine.processDelete("delete", { begin: 2, end: 3 });
    engine.processInput("S", 2);
    expect(engine.getValue()).toBe("12S ABC 1234");
  });

  it("nested alternations 1 — 02121212", () => {
    const engine = createMask({
      mask: "0<2)##-##-##>|<3<4)#-##-##>|<5)#-##-##>|<6)#-##-##>>",
      groupmarker: ["<", ">"],
    });
    engine.setValue("02121212");
    expect(engine.getValue()).toBe("02)12-12-12");
  });

  it("nested alternations 2 — 03411212", () => {
    const engine = createMask({
      mask: "0<2)##-##-##>|<3<4)#-##-##>|<5)#-##-##>|<6)#-##-##>>",
      groupmarker: ["<", ">"],
    });
    engine.setValue("03411212");
    expect(engine.getValue()).toBe("034)1-12-12");
  });

  it("nested alternations 3 — 03511212", () => {
    const engine = createMask({
      mask: "0<2)##-##-##>|<3<4)#-##-##>|<5)#-##-##>|<6)#-##-##>>",
      groupmarker: ["<", ">"],
    });
    engine.setValue("03511212");
    expect(engine.getValue()).toBe("035)1-12-12");
  });

  it("nested alternations 4 — 03611212", () => {
    const engine = createMask({
      mask: "0<2)##-##-##>|<3<4)#-##-##>|<5)#-##-##>|<6)#-##-##>>",
      groupmarker: ["<", ">"],
    });
    engine.setValue("03611212");
    expect(engine.getValue()).toBe("036)1-12-12");
  });

  it("alternations W|XY|Z — type WZ", () => {
    const engine = createMask({ mask: "W|XY|Z" });
    "WZ".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("W");
  });

  it("alternations (W)|(X)(Y)|(Z) — type WZ", () => {
    const engine = createMask({ mask: "(W)|(X)(Y)|(Z)" });
    "WZ".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("W");
  });

  it("(9{1,3}|SE|NE|SW|NW)-9{1,3} — type NE123", () => {
    const engine = createMask({ mask: "(9{1,3}|SE|NE|SW|NW)-9{1,3}" });
    "NE123".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("NE-123");
  });

  it("((S)) — all static mask", () => {
    const engine = createMask({ mask: "((S))" });
    expect(engine.getTemplate()).toBe("((S))");
  });

  it("((S) — all static mask", () => {
    const engine = createMask({ mask: "((S)" });
    expect(engine.getTemplate()).toBe("((S)");
  });

  it("(9)|(a9) — type 1", () => {
    const engine = createMask({ mask: "(9)|(a9)" });
    engine.processInput("1");
    expect(engine.getValue().replace(/_/g, "")).toContain("1");
  });

  it("(9)|(a9) — type a1", () => {
    const engine = createMask({ mask: "(9)|(a9)" });
    "a1".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("a1");
  });

  it("(999)|(0aa) — type 0ab", () => {
    const engine = createMask({ mask: "(999)|(0aa)" });
    "0ab".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("0ab");
  });

  it("(9)|(09)|(19)|(2f) — type 41", () => {
    const engine = createMask({ mask: "(9)|(09)|(19)|(2f)" });
    "41".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("4");
  });

  it("(9)|(09)|(19)|(2f) — type 01", () => {
    const engine = createMask({ mask: "(9)|(09)|(19)|(2f)" });
    "01".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("01");
  });

  it("(9)|(09)|(19)|(2f) — type 11", () => {
    const engine = createMask({ mask: "(9)|(09)|(19)|(2f)" });
    "11".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("1");
  });

  it("(9)|(09)|(19)|(2f) — type 23", () => {
    const engine = createMask({ mask: "(9)|(09)|(19)|(2f)" });
    "23".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toContain("23");
  });

  it("(1|2|3)/(4|5)", () => {
    const engine = createMask({ mask: "(1|2|3)/(4|5)" });
    "14".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("1/4");
  });

  it("9|(9a) — mixed typed alternation", () => {
    const engine = createMask({ mask: "9|(9a)" });
    engine.processInput("1");
    expect(engine.getValue().replace(/_/g, "")).toContain("1");
  });

  it("+(9| ){0,15} — #2125", () => {
    const engine = createMask({ mask: "+(9| ){0,15}" });
    engine.processInput("1");
    expect(engine.getValue()).toContain("+");
    expect(engine.getValue()).toContain("1");
  });
});

describe("Alternations format", () => {
  it("format with alternation mask", () => {
    const result = format("NE123", {
      mask: "(9{1,3}|SE|NE|SW|NW)-9{1,3}",
    });
    expect(result.replace(/_/g, "")).toBe("NE-123");
  });
});
