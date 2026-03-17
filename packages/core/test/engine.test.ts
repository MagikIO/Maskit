import { describe, it, expect } from "vitest";
import { createMask, format, unformat, isValid } from "../src/index.js";

describe("createMask — basic masks", () => {
  it("creates engine for '99-99-99'", () => {
    const engine = createMask({ mask: "99-99-99" });
    expect(engine.getTemplate()).toBe("__-__-__");
  });

  it("creates engine for '(999) 999-9999'", () => {
    const engine = createMask({ mask: "(999) 999-9999" });
    expect(engine.getTemplate()).toBe("(___) ___-____");
  });

  it("creates engine for '999.999.999'", () => {
    const engine = createMask({ mask: "999.999.999" });
    expect(engine.getTemplate()).toBe("___.___.___");
  });

  it("creates engine for 'aa-9999'", () => {
    const engine = createMask({ mask: "aa-9999" });
    expect(engine.getTemplate()).toBe("__-____");
  });

  it("creates engine for '*****'", () => {
    const engine = createMask({ mask: "*****" });
    expect(engine.getTemplate()).toBe("_____");
  });
});

describe("createMask — processInput", () => {
  it("accepts valid digit for '99-99'", () => {
    const engine = createMask({ mask: "99-99" });
    const result = engine.processInput("1", 0);
    expect(result).not.toBe(false);
    expect(engine.getValue()).toContain("1");
  });

  it("rejects letter for numeric mask '9999'", () => {
    const engine = createMask({ mask: "9999" });
    const result = engine.processInput("a", 0);
    expect(result).toBe(false);
  });

  it("accepts letter for alpha mask 'aaaa'", () => {
    const engine = createMask({ mask: "aaaa" });
    const result = engine.processInput("b", 0);
    expect(result).not.toBe(false);
  });

  it("auto-fills static characters", () => {
    const engine = createMask({ mask: "(999) 999-9999" });
    engine.processInput("5", 0);
    engine.processInput("5", undefined);
    engine.processInput("5", undefined);
    const val = engine.getValue();
    // After entering 555, should be "(555) ___-____"
    expect(val).toMatch(/^\(555\)/);
  });

  it("processes full input sequence", () => {
    const engine = createMask({ mask: "99/99/9999" });
    "12252023".split("").forEach((ch) => {
      engine.processInput(ch);
    });
    expect(engine.getValue()).toBe("12/25/2023");
  });
});

describe("createMask — processDelete", () => {
  it("backspace removes last character", () => {
    const engine = createMask({ mask: "9999" });
    engine.processInput("1", 0);
    engine.processInput("2");
    engine.processInput("3");
    engine.processDelete("backspace", { begin: 3, end: 3 });
    expect(engine.getValue()).toMatch(/12_/);
  });

  it("delete removes character at position", () => {
    const engine = createMask({ mask: "9999" });
    "1234".split("").forEach((ch) => engine.processInput(ch));
    engine.processDelete("delete", { begin: 0, end: 1 });
    // Should shift remaining characters
    const val = engine.getValue();
    expect(val).not.toBe("1234");
  });
});

describe("createMask — setValue", () => {
  it("sets value for phone mask", () => {
    const engine = createMask({ mask: "(999) 999-9999" });
    engine.setValue("5551112222");
    expect(engine.getValue()).toBe("(555) 111-2222");
  });

  it("sets value for date mask", () => {
    const engine = createMask({ mask: "99/99/9999" });
    engine.setValue("12252023");
    expect(engine.getValue()).toBe("12/25/2023");
  });

  it("sets value for SSN-like mask", () => {
    const engine = createMask({ mask: "999-99-9999" });
    engine.setValue("123456789");
    expect(engine.getValue()).toBe("123-45-6789");
  });
});

describe("createMask — getUnmaskedValue", () => {
  it("returns unmasked digits", () => {
    const engine = createMask({ mask: "(999) 999-9999" });
    engine.setValue("5551112222");
    expect(engine.getUnmaskedValue()).toBe("5551112222");
  });

  it("returns unmasked for date", () => {
    const engine = createMask({ mask: "99/99/9999" });
    engine.setValue("12252023");
    expect(engine.getUnmaskedValue()).toBe("12252023");
  });
});

describe("createMask — isComplete", () => {
  it("returns true when all required positions filled", () => {
    const engine = createMask({ mask: "9999" });
    engine.setValue("1234");
    expect(engine.isComplete()).toBe(true);
  });

  it("returns false when positions are empty", () => {
    const engine = createMask({ mask: "9999" });
    engine.processInput("1", 0);
    expect(engine.isComplete()).toBe(false);
  });
});

describe("createMask — reset", () => {
  it("clears all state", () => {
    const engine = createMask({ mask: "9999" });
    engine.setValue("1234");
    engine.reset();
    expect(engine.getValue()).toBe("____");
  });
});

describe("format — static helper", () => {
  it("formats phone number", () => {
    expect(format("5551112222", { mask: "(999) 999-9999" })).toBe(
      "(555) 111-2222",
    );
  });

  it("formats date", () => {
    expect(format("12252023", { mask: "99/99/9999" })).toBe("12/25/2023");
  });

  it("formats SSN", () => {
    expect(format("123456789", { mask: "999-99-9999" })).toBe("123-45-6789");
  });

  it("formats zip code", () => {
    expect(format("12345", { mask: "99999" })).toBe("12345");
  });

  it("formats partial input", () => {
    const result = format("123", { mask: "999-999" });
    expect(result).toMatch(/^123/);
  });
});

describe("unformat — static helper", () => {
  it("unformats phone number", () => {
    expect(unformat("(555) 111-2222", { mask: "(999) 999-9999" })).toBe(
      "5551112222",
    );
  });

  it("unformats date", () => {
    expect(unformat("12/25/2023", { mask: "99/99/9999" })).toBe("12252023");
  });

  it("unformats SSN", () => {
    expect(unformat("123-45-6789", { mask: "999-99-9999" })).toBe(
      "123456789",
    );
  });
});

describe("isValid — static helper", () => {
  it("validates complete phone number", () => {
    expect(isValid("(555) 111-2222", { mask: "(999) 999-9999" })).toBe(true);
  });

  it("rejects incomplete phone number", () => {
    expect(isValid("(555) 111-222", { mask: "(999) 999-9999" })).toBe(false);
  });

  it("validates date", () => {
    expect(isValid("12/25/2023", { mask: "99/99/9999" })).toBe(true);
  });

  it("rejects alpha in numeric mask", () => {
    expect(isValid("12/ab/2023", { mask: "99/99/9999" })).toBe(false);
  });
});

describe("createMask — optional masks", () => {
  it("handles optional section", () => {
    const engine = createMask({ mask: "99[99]" });
    engine.setValue("12");
    expect(engine.isComplete()).toBe(true);
    engine.setValue("1234");
    expect(engine.isComplete()).toBe(true);
  });
});

describe("createMask — casing", () => {
  it("upper casing", () => {
    const engine = createMask({ mask: "aaaa", casing: "upper" });
    engine.setValue("test");
    expect(engine.getValue()).toBe("TEST");
  });

  it("lower casing", () => {
    const engine = createMask({ mask: "aaaa", casing: "lower" });
    engine.setValue("TEST");
    expect(engine.getValue()).toBe("test");
  });
});

describe("createMask — aliases", () => {
  it("resolves alias", () => {
    const engine = createMask({
      alias: "phone",
      aliases: {
        phone: { mask: "(999) 999-9999" },
      },
    });
    expect(engine.getTemplate()).toBe("(___) ___-____");
  });
});

describe("createMask — custom definitions", () => {
  it("uses custom definition", () => {
    const engine = createMask({
      mask: "HH:HH",
      definitions: {
        H: {
          validator: "[0-9A-Fa-f]",
        },
      },
    });
    engine.setValue("FF00");
    expect(engine.getValue()).toMatch(/^FF:00/);
  });
});
