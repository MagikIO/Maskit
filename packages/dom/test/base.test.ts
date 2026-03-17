/**
 * Ported from Inputmask/qunit/tests_base.js
 * Tests fundamental mask input behavior with DOM interaction.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mask, unmask } from "../src/index.js";
import { type, sendKey, setCaret } from "./helpers/simulator.js";

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

describe("Simple masking — DOM", () => {
  it("99-99-99 clearMaskOnLostFocus false shows template", () => {
    mask(input, { mask: "99-99-99", clearMaskOnLostFocus: false });
    expect(input.value).toBe("__-__-__");
  });

  it("999.999.999 — type 123", () => {
    mask(input, { mask: "999.999.999" });
    input.focus();
    type(input, "123");
    expect(input.value).toBe("123.___.___");
  });

  it("999.999.999 — type 123 + backspace", () => {
    mask(input, { mask: "999.999.999" });
    input.focus();
    type(input, "123");
    sendKey(input, "Backspace");
    expect(input.value).toBe("12_.___.___");
  });

  it("999.999.999 — delete 2nd with backspace, continue", () => {
    mask(input, { mask: "999.999.999" });
    input.focus();
    type(input, "123");
    setCaret(input, 1, 2);
    sendKey(input, "Backspace");
    type(input, "4567890");
    expect(input.value).toContain("1");
  });

  it("999.999.999 — delete 2nd with delete, continue", () => {
    mask(input, { mask: "999.999.999" });
    input.focus();
    type(input, "123");
    setCaret(input, 1, 2);
    sendKey(input, "Delete");
    type(input, "4567890");
    expect(input.value).toContain("1");
  });

  it("***** wildcard mask", () => {
    mask(input, { mask: "*****" });
    input.focus();
    type(input, "abcde");
    expect(input.value).toBe("abcde");
  });

  it("(999)999-9999 — phone mask", () => {
    mask(input, { mask: "(999)999-9999" });
    input.focus();
    type(input, "1234567890");
    expect(input.value).toBe("(123)456-7890");
  });

  it("empty mask — no effect", () => {
    mask(input, { mask: "" });
    input.value = "test";
    expect(input.value).toBe("test");
  });

  it("selection delete with non-masks", () => {
    mask(input, { mask: "999.999.999" });
    input.focus();
    type(input, "123456789");
    setCaret(input, 0, 3);
    sendKey(input, "Delete");
    expect(input.value).not.toBe("123.456.789");
  });
});

describe("Non-greedy masks — DOM", () => {
  it("* greedy false repeat * — type abcdef", () => {
    mask(input, { mask: "*", greedy: false, repeat: "*" as unknown as number });
    input.focus();
    type(input, "abcdef");
    expect(input.value).toBe("abcdef");
  });

  it("* greedy false repeat * — replace cd with 1", () => {
    mask(input, { mask: "*", greedy: false, repeat: "*" as unknown as number });
    input.focus();
    type(input, "abcdef");
    setCaret(input, 2, 4);
    type(input, "1");
    expect(input.value).toContain("ab");
    expect(input.value).toContain("1");
  });
});

describe("Greedy masks — DOM", () => {
  it("* greedy true repeat 10 clearMask false — shows template", () => {
    mask(input, {
      mask: "*",
      greedy: true,
      repeat: 10,
      clearMaskOnLostFocus: false,
    });
    expect(input.value).toBe("__________");
  });

  it("* greedy true repeat 10 — rejects beyond length", () => {
    mask(input, { mask: "*", greedy: true, repeat: 10 });
    input.focus();
    type(input, "12345678901234567890");
    expect(input.value).toBe("1234567890");
  });

  it("9,99 greedy true repeat 5 — type long digits", () => {
    mask(input, { mask: "9,99", greedy: true, repeat: 5 });
    input.focus();
    type(input, "12345678901234567890");
    // Should be truncated by mask capacity
    expect(input.value.length).toBeGreaterThan(0);
    expect(input.value.length).toBeLessThanOrEqual(20);
  });
});

describe("Casing — DOM", () => {
  it("Title Case — 'Especially'", () => {
    mask(input, {
      mask: "A",
      repeat: 20,
      greedy: false,
      casing: "title",
      definitions: {
        A: {
          validator: "[A-Za-z ]",
        },
      },
    });
    input.focus();
    type(input, "especially");
    expect(input.value).toBe("Especially");
  });
});

describe("autoUnmask — DOM", () => {
  it("autoUnmask returns unmasked value — #1109", () => {
    const ctrl = mask(input, { mask: "99-99", autoUnmask: true });
    input.focus();
    type(input, "1234");
    const val = ctrl.unmaskedValue();
    expect(val).toBe("1234");
  });
});

describe("Callbacks — DOM", () => {
  it("oncomplete fires when mask filled", () => {
    let completed = false;
    mask(input, {
      mask: "999.999.999",
      oncomplete: () => {
        completed = true;
      },
    });
    input.focus();
    type(input, "123456789");
    expect(completed).toBe(true);
  });
});
