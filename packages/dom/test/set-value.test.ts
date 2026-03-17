/**
 * Ported from Inputmask/qunit/tests_setvalue.js
 * Tests programmatic value setting via the mask controller.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mask, unmask } from "../src/index.js";

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

describe("Set value — DOM", () => {
  it("mask 9 — set value 1", () => {
    const ctrl = mask(input, { mask: "9" });
    ctrl.setValue("1");
    expect(input.value).toBe("1");
  });

  it("(999) 999-9999 — set value 8144419449", () => {
    const ctrl = mask(input, { mask: "(999) 999-9999" });
    ctrl.setValue("8144419449");
    expect(input.value).toBe("(814) 441-9449");
  });

  it("+7 (999) 999-99-99 — set full value", () => {
    const ctrl = mask(input, { mask: "+7 (999) 999-99-99" });
    ctrl.setValue("9114041112");
    expect(input.value).toBe("+7 (911) 404-11-12");
  });

  it("+375 (99) 999-99-99 — set full value", () => {
    const ctrl = mask(input, { mask: "+375 (99) 999-99-99" });
    ctrl.setValue("291234567");
    expect(input.value).toBe("+375 (29) 123-45-67");
  });

  it("99-99 — setValue preserves format", () => {
    const ctrl = mask(input, { mask: "99-99" });
    ctrl.setValue("1234");
    expect(input.value).toBe("12-34");
  });

  it("99/99/9999 — set date value", () => {
    const ctrl = mask(input, { mask: "99/99/9999" });
    ctrl.setValue("12252023");
    expect(input.value).toBe("12/25/2023");
  });
});
