/**
 * Ported from Inputmask/qunit/tests_initialvalue.js
 * Tests masking of elements that already have values.
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

describe("Initial value setting — DOM", () => {
  it('999:99 placeholder "0" value "007:20"', () => {
    input.value = "007:20";
    mask(input, { mask: "999:99", placeholder: "0" });
    expect(input.value).toBe("007:20");
  });

  it("escape mask — initial formatted value preserves", () => {
    input.value = "01 650 103 002 0001 DE101 5170";
    mask(input, { mask: "99 999 999 999 9999 \\D\\E*** 9999" });
    expect(input.value).toBe("01 650 103 002 0001 DEDE1 0151");
  });

  it("escape mask — initial unformatted value is formatted", () => {
    input.value = "016501030020001DE1015170";
    mask(input, { mask: "99 999 999 999 9999 \\D\\E*** 9999" });
    expect(input.value).toBe("01 650 103 002 0001 DEDE1 0151");
  });

  it("\\D\\E*** — initial value DE001", () => {
    input.value = "DE001";
    mask(input, { mask: "\\D\\E***" });
    expect(input.value).toBe("DEE00");
  });

  it("masks existing phone number", () => {
    input.value = "1234567890";
    mask(input, { mask: "(999) 999-9999" });
    expect(input.value).toBe("(123) 456-7890");
  });

  it("masks existing date value", () => {
    input.value = "12252023";
    mask(input, { mask: "99/99/9999" });
    expect(input.value).toBe("12/25/2023");
  });

  it("masks existing SSN", () => {
    input.value = "123456789";
    mask(input, { mask: "999-99-9999" });
    expect(input.value).toBe("123-45-6789");
  });

  it("f\\acebook.com/&{0,20} with initial value 'facet'", () => {
    input.value = "facet";
    mask(input, { mask: "f\\acebook.com/&{0,20}" });
    expect(input.value).toContain("facebook.com/");
  });

  it("f\\acebook.com/&{0,20} with initial value 'facebook.com/facet'", () => {
    input.value = "facebook.com/facet";
    mask(input, { mask: "f\\acebook.com/&{0,20}" });
    expect(input.value).toContain("facebook.com/");
  });
});
