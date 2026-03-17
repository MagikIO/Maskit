/**
 * Ported from Inputmask/qunit/tests_jitmasking.js
 * Tests JIT (just-in-time) masking behavior.
 */
import { describe, it, expect } from "vitest";
import { createMask } from "../src/index.js";

describe("JIT Masking", () => {
  it.skip("(.999){*} jitMasking true numericInput true — type 123456 (depends on numeric pipeline)", () => {
    const engine = createMask({
      mask: "(.999){*}",
      jitMasking: true,
      numericInput: true,
      groupSeparator: ".",
    });
    "123456".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toContain("123");
    expect(engine.getValue()).toContain("456");
  });
});
