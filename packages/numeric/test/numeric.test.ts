import { describe, it, expect } from "vitest";
import { defineAlias } from "@magik_io/maskit-core";
import {
  numericAlias,
  currencyAlias,
  decimalAlias,
  integerAlias,
  percentageAlias,
  indiannsAlias,
  numericAliases,
  genMask,
  decimalValidator,
  alignDigits,
} from "../src/index.js";

// Register all numeric aliases before tests
for (const [name, alias] of Object.entries(numericAliases)) {
  defineAlias(name, alias);
}

describe("@maskit/numeric — exports", () => {
  it("exports all aliases", () => {
    expect(numericAlias).toBeDefined();
    expect(currencyAlias).toBeDefined();
    expect(decimalAlias).toBeDefined();
    expect(integerAlias).toBeDefined();
    expect(percentageAlias).toBeDefined();
    expect(indiannsAlias).toBeDefined();
  });

  it("exports utility functions", () => {
    expect(typeof genMask).toBe("function");
    expect(typeof decimalValidator).toBe("function");
    expect(typeof alignDigits).toBe("function");
  });

  it("numericAliases has all aliases", () => {
    expect(Object.keys(numericAliases)).toEqual([
      "numeric",
      "currency",
      "decimal",
      "integer",
      "percentage",
      "indianns",
    ]);
  });
});

describe("@maskit/numeric — numeric alias properties", () => {
  it("has numeric input mode", () => {
    expect(numericAlias.inputmode).toBe("decimal");
  });

  it("has definitions with decimal validator", () => {
    expect(numericAlias.definitions).toBeDefined();
    expect(numericAlias.definitions!["0"]).toBeDefined();
    expect(numericAlias.definitions!["1"]).toBeDefined();
    expect(numericAlias.definitions!["9"]).toBeDefined();
    expect(numericAlias.definitions!["+"]).toBeDefined();
    expect(numericAlias.definitions!["-"]).toBeDefined();
  });

  it("mask is a function (genMask)", () => {
    expect(typeof numericAlias.mask).toBe("function");
  });

  it("defaults to right-aligned", () => {
    expect(numericAlias.rightAlign).toBe(true);
  });
});

describe("@maskit/numeric — currency alias", () => {
  it("extends numeric via alias field", () => {
    expect(currencyAlias.alias).toBe("numeric");
  });

  it("has group separator comma", () => {
    expect((currencyAlias as Record<string, unknown>).groupSeparator).toBe(",");
  });

  it("has 2 fixed digits", () => {
    expect((currencyAlias as Record<string, unknown>).digits).toBe(2);
    expect((currencyAlias as Record<string, unknown>).digitsOptional).toBe(false);
  });
});

describe("@maskit/numeric — integer alias", () => {
  it("extends numeric", () => {
    expect(integerAlias.alias).toBe("numeric");
  });

  it("has 0 digits", () => {
    expect((integerAlias as Record<string, unknown>).digits).toBe(0);
  });
});

describe("@maskit/numeric — percentage alias", () => {
  it("extends numeric", () => {
    expect(percentageAlias.alias).toBe("numeric");
  });

  it("has min 0 and max 100", () => {
    expect((percentageAlias as Record<string, unknown>).min).toBe(0);
    expect((percentageAlias as Record<string, unknown>).max).toBe(100);
  });

  it("has suffix ' %'", () => {
    expect((percentageAlias as Record<string, unknown>).suffix).toBe(" %");
  });
});

describe("@maskit/numeric — alignDigits", () => {
  it("pads decimal digits to specified count", () => {
    const buf = "123.4".split("");
    const result = alignDigits(buf, 2, { radixPoint: "." });
    expect(result.join("")).toBe("123.40");
  });

  it("adds radix point if missing", () => {
    const buf = "123".split("");
    const result = alignDigits(buf, 2, { radixPoint: "." });
    expect(result.join("")).toBe("123.00");
  });

  it("handles negation symbol back", () => {
    const buf = "123)".split("");
    const result = alignDigits(buf, 2, {
      radixPoint: ".",
      negationSymbol: { front: "(", back: ")" },
    });
    expect(result.join("")).toBe("123.00)");
  });
});

describe("@maskit/numeric — onBeforeMask", () => {
  it("formats initial number value", () => {
    const fn = numericAlias.onBeforeMask as unknown as (val: string, opts: Record<string, unknown>) => string;
    const result = fn("1234.56", {
      radixPoint: ".",
      digits: 2,
      digitsOptional: false,
      roundingFN: Math.round,
      groupSeparator: "",
      negationSymbol: { front: "-", back: "" },
      prefix: "",
      suffix: "",
      placeholder: "0",
      min: null,
      max: null,
    });
    expect(result).toContain("1234");
    expect(result).toContain("56");
  });
});
