import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mask, unmask } from "../src/index.js";
import { type, sendKey, paste, setCaret } from "./helpers/simulator.js";

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

describe("mask() — basic masking", () => {
  it("applies mask template to empty input", () => {
    const ctrl = mask(input, { mask: "99-99-99" });
    expect(ctrl.engine.getTemplate()).toBe("__-__-__");
  });

  it("returns a MaskController", () => {
    const ctrl = mask(input, { mask: "99-99" });
    expect(ctrl.engine).toBeDefined();
    expect(typeof ctrl.unmaskedValue).toBe("function");
    expect(typeof ctrl.value).toBe("function");
    expect(typeof ctrl.setValue).toBe("function");
    expect(typeof ctrl.destroy).toBe("function");
  });

  it("mask() replaces existing mask", () => {
    mask(input, { mask: "99-99" });
    const ctrl2 = mask(input, { mask: "9999" });
    expect(ctrl2.engine.getTemplate()).toBe("____");
  });
});

describe("mask() — keyboard input", () => {
  it("accepts valid digit input", () => {
    mask(input, { mask: "9999" });
    input.focus();
    type(input, "1234");
    expect(input.value).toBe("1234");
  });

  it("formats with static characters", () => {
    mask(input, { mask: "(999) 999-9999" });
    input.focus();
    type(input, "5551234567");
    expect(input.value).toBe("(555) 123-4567");
  });

  it("formats date input", () => {
    mask(input, { mask: "99/99/9999" });
    input.focus();
    type(input, "12252023");
    expect(input.value).toBe("12/25/2023");
  });

  it("rejects invalid characters", () => {
    mask(input, { mask: "9999" });
    input.focus();
    type(input, "ab");
    // Letters should be rejected for numeric mask
    expect(input.value).not.toContain("a");
    expect(input.value).not.toContain("b");
  });
});

describe("mask() — backspace/delete", () => {
  it("backspace removes a character", () => {
    mask(input, { mask: "9999" });
    input.focus();
    type(input, "123");
    sendKey(input, "Backspace");
    expect(input.value).toMatch(/12/);
  });

  it("delete removes character at position", () => {
    mask(input, { mask: "9999" });
    input.focus();
    type(input, "1234");
    setCaret(input, 0, 1);
    sendKey(input, "Delete");
    expect(input.value).not.toBe("1234");
  });
});

describe("mask() — setValue", () => {
  it("sets value programmatically", () => {
    const ctrl = mask(input, { mask: "(999) 999-9999" });
    ctrl.setValue("5551112222");
    expect(input.value).toBe("(555) 111-2222");
  });

  it("sets date value", () => {
    const ctrl = mask(input, { mask: "99/99/9999" });
    ctrl.setValue("12252023");
    expect(input.value).toBe("12/25/2023");
  });
});

describe("mask() — unmaskedValue", () => {
  it("returns unmasked value", () => {
    const ctrl = mask(input, { mask: "(999) 999-9999" });
    ctrl.setValue("5551112222");
    expect(ctrl.unmaskedValue()).toBe("5551112222");
  });
});

describe("unmask()", () => {
  it("removes the mask and restores the element", () => {
    const ctrl = mask(input, { mask: "9999" });
    ctrl.setValue("1234");
    unmask(input);
    // After unmask, value property should be restored to native
    input.value = "test";
    expect(input.value).toBe("test");
  });

  it("destroy() also unmasks", () => {
    const ctrl = mask(input, { mask: "9999" });
    ctrl.destroy();
    input.value = "abc";
    expect(input.value).toBe("abc");
  });
});

describe("mask() — initial value", () => {
  it("masks existing input value", () => {
    input.value = "1234";
    mask(input, { mask: "99-99" });
    expect(input.value).toBe("12-34");
  });
});

describe("mask() — placeholder", () => {
  it("uses custom placeholder character", () => {
    const ctrl = mask(input, { mask: "9999", placeholder: "#" });
    expect(ctrl.engine.getTemplate()).toBe("####");
  });
});

describe("mask() — paste", () => {
  it("handles paste event", () => {
    mask(input, { mask: "99/99/9999" });
    input.focus();
    paste(input, "12252023");
    expect(input.value).toBe("12/25/2023");
  });
});

describe("mask() — alpha masks", () => {
  it("accepts letters for alpha mask", () => {
    mask(input, { mask: "aaaa" });
    input.focus();
    type(input, "abcd");
    expect(input.value).toBe("abcd");
  });

  it("rejects digits for alpha mask", () => {
    mask(input, { mask: "aaaa" });
    input.focus();
    type(input, "1234");
    expect(input.value).not.toContain("1");
  });
});

describe("mask() — optional characters", () => {
  it("handles optional mask sections", () => {
    const ctrl = mask(input, { mask: "99[99]" });
    ctrl.setValue("12");
    expect(ctrl.engine.isComplete()).toBeTruthy();
  });
});
