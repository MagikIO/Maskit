/**
 * Ported from Inputmask/qunit/tests_numericinput.js
 * Tests numericInput (RTL-style) masking behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mask, unmask } from "../src/index.js";
import { type } from "./helpers/simulator.js";

let input: HTMLInputElement;

beforeEach(() => {
  input = document.createElement("input");
  input.type = "text";
  document.body.appendChild(input);
});

afterEach(() => {
  unmask(input);
  input.remove();
});

describe("Numeric Input (RTL-style) — DOM", () => {
  it("9 repeat 10 greedy true numericInput true — type 1234567890", () => {
    mask(input, { mask: "9", repeat: 10, greedy: true, numericInput: true });
    input.focus();
    type(input, "1234567890");
    expect(input.value).toBe("0987654321");
  });

  it("99-99-99 numericInput true — type digits", () => {
    mask(input, { mask: "99-99-99", numericInput: true });
    input.focus();
    type(input, "123456");
    expect(input.value).toBe("65-43-21");
  });

  it("9999 t numericInput true — type 123", () => {
    mask(input, { mask: "9999 t", numericInput: true });
    input.focus();
    type(input, "123");
    expect(input.value).toContain("321");
    expect(input.value).toContain("t");
  });

  it("9 repeat 10 numericInput true placeholder '' greedy true — type 12345", () => {
    mask(input, {
      mask: "9",
      repeat: 10,
      placeholder: "",
      numericInput: true,
      greedy: true,
    });
    input.focus();
    type(input, "12345");
    expect(input.value).toBe("54321");
  });
});
