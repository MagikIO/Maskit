/**
 * Ported from Inputmask/qunit/tests_formatvalidate.js
 * Tests static format(), isValid(), and unformat() APIs.
 */
import { describe, it, expect } from "vitest";
import { format, isValid, unformat } from "../src/index.js";

describe("Value formatting", () => {
  it('format "016501030020001DE1015170" with escape mask', () => {
    const result = format("016501030020001DE1015170", {
      mask: "99 999 999 999 9999 \\D\\E*** 9999",
    });
    expect(result).toBe("01 650 103 002 0001 DE101 5170");
  });

  it('format phone "(999) 999-9999" — krivaten', () => {
    const result = format("5551112222", { mask: "(999) 999-9999" });
    expect(result).toBe("(555) 111-2222");
  });

  it('format "12" numericInput with placeholder "0"', () => {
    const result = format("12", {
      mask: "$ 999999",
      numericInput: true,
      placeholder: "0",
    });
    expect(result).toBe("$ 000012");
  });
});

describe("Value validating", () => {
  it('isValid "01 650 103 002 0001 DE101 5170" with escape mask', () => {
    expect(
      isValid("01 650 103 002 0001 DE101 5170", {
        mask: "99 999 999 999 9999 \\D\\E*** 9999",
      }),
    ).toBe(true);
  });

  it('isValid "12lbs" with optional mask — thomstark', () => {
    expect(
      isValid("12lbs", {
        mask: "99[9]lb\\s",
        greedy: false,
        skipOptionalPartCharacter: "",
        clearIncomplete: true,
      }),
    ).toBe(true);
  });

  it("isValid \"1'2\\\"\" with optional mask — thomstark", () => {
    expect(
      isValid("1'2\"", {
        mask: "9'9[9]\"",
        greedy: false,
        skipOptionalPartCharacter: "",
        clearIncomplete: true,
      }),
    ).toBe(true);
  });

  it('isValid "12lbs" with quantifier mask — thomstark', () => {
    expect(
      isValid("12lbs", {
        mask: "99{1,2}lb\\s",
        greedy: false,
        skipOptionalPartCharacter: "",
        clearIncomplete: true,
      }),
    ).toBe(true);
  });

  it("isValid \"1'2\\\"\" with quantifier mask — thomstark", () => {
    expect(
      isValid("1'2\"", {
        mask: "9'9{1,2}\"",
        greedy: false,
        skipOptionalPartCharacter: "",
        clearIncomplete: true,
      }),
    ).toBe(true);
  });

  it('isValid "03-11" with optional section — pricejt', () => {
    expect(
      isValid("03-11", { mask: "99-99[ 99/99]" }),
    ).toBe(true);
  });
});

describe("Value unmasking", () => {
  it("unformat phone '(123)456-78-90'", () => {
    const result = unformat("(123)456-78-90", { mask: "(999)999-99-99" });
    expect(result).toBe("1234567890");
  });
});
