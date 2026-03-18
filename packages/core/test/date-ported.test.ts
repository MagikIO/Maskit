/**
 * Ported from Inputmask/qunit/tests_date.js
 * Tests datetime alias formatting and validation.
 *
 * NOTE: These tests are ported from the QUnit test suite and serve as
 * regression anchors. Many are currently skipped because the datetime
 * alias integration with the headless core engine is not yet complete
 * (the alias mask function + pre/post validators need the full opts object
 * with extension properties). They will be activated once the extension
 * pipeline is fully wired.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createMask, format, isValid, defineAlias, dateAliases, type CreateMaskOptions } from "../src/index.js";

beforeAll(() => {
  for (const [name, alias] of Object.entries(dateAliases)) {
    defineAlias(name, alias);
  }
});

// Helper — datetime extension options are not in MaskOptions. Cast through.
function dtOpts(opts: Record<string, unknown>): CreateMaskOptions {
  return opts as unknown as CreateMaskOptions;
}

describe("Date.Extensions — dd/MM/yyyy", () => {
  it.skip("type 2331973 → 23/03/1973", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "dd/MM/yyyy",
      min: "01/01/1900",
    }));
    "2331973".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("23/03/1973");
  });

  it.skip("format '2331973' → '23/03/1973'", () => {
    const result = format("2331973", dtOpts({
      alias: "datetime",
      inputFormat: "dd/MM/yyyy",
      min: "01/01/1900",
    }));
    expect(result).toBe("23/03/1973");
  });

  it.skip("isValid '23/03/1973' → true", () => {
    expect(isValid("23/03/1973", dtOpts({
      alias: "datetime",
      inputFormat: "dd/MM/yyyy",
      min: "01/01/1900",
    }))).toBe(true);
  });

  it.skip("setValue 592017 → 05/09/2017", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "dd/MM/yyyy",
      min: "01/01/1900",
    }));
    engine.setValue("592017");
    expect(engine.getValue()).toBe("05/09/2017");
  });
});

describe("Date.Extensions — MM/dd/yyyy", () => {
  it.skip("type 3231973 → 03/23/1973", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "MM/dd/yyyy",
      min: "01/01/1900",
    }));
    "3231973".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("03/23/1973");
  });

  it.skip("setValue 952017 → 09/05/2017", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "MM/dd/yyyy",
      min: "01/01/1900",
    }));
    engine.setValue("952017");
    expect(engine.getValue()).toBe("09/05/2017");
  });
});

describe("Date.Extensions — dd.MM.yyyy", () => {
  it.skip("type 2331973 → 23.03.1973", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "dd.MM.yyyy",
      min: "01.01.1900",
    }));
    "2331973".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("23.03.1973");
  });

  it.skip("setValue 592017 → 05.09.2017", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "dd.MM.yyyy",
      min: "01.01.1900",
    }));
    engine.setValue("592017");
    expect(engine.getValue()).toBe("05.09.2017");
  });
});

describe("Date.Extensions — yyyy-MM-dd (#2360)", () => {
  it.skip("type 19500101 → 1950-01-01", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "yyyy-MM-dd",
      min: "1900-01-01",
      max: "2099-12-31",
    }));
    "19500101".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("1950-01-01");
  });

  it.skip("type 19991231 → 1999-12-31", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "yyyy-MM-dd",
      min: "1900-01-01",
      max: "2099-12-31",
    }));
    "19991231".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("1999-12-31");
  });
});

describe("Date.Extensions — HH:mm:ss", () => {
  it.skip("type 111111 → 11:11:11", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "HH:mm:ss",
    }));
    "111111".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("11:11:11");
  });

  it.skip("type 222222 → 22:22:22", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "HH:mm:ss",
    }));
    "222222".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("22:22:22");
  });

  it.skip("type 235959 → 23:59:59", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "HH:mm:ss",
    }));
    "235959".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("23:59:59");
  });

  it.skip("type 333333 → 03:33:33", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "HH:mm:ss",
    }));
    "333333".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("03:33:33");
  });

  it.skip("HH:mm — setValue 14:02", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "HH:mm",
    }));
    engine.setValue("1402");
    expect(engine.getValue()).toBe("14:02");
  });
});

describe("Date.Extensions — unmask", () => {
  it.skip("unmask '23/03/1973' with datetime alias", () => {
    const engine = createMask(dtOpts({
      alias: "datetime",
      inputFormat: "dd/MM/yyyy",
      min: "01/01/1900",
    }));
    engine.setValue("23031973");
    expect(engine.getUnmaskedValue()).toContain("23031973");
  });
});

describe("Date.Extensions — leapyear", () => {
  it.skip("02/29/2012 is valid leapyear date", () => {
    const result = isValid("02/29/2012", dtOpts({
      alias: "datetime",
      inputFormat: "MM/dd/yyyy",
      min: "01/01/1900",
    }));
    expect(result).toBe(true);
  });

  it.skip("02/29/2020 is valid leapyear date (jit)", () => {
    const result = isValid("02/29/2020", dtOpts({
      alias: "datetime",
      inputFormat: "MM/dd/yyyy",
      min: "01/01/1900",
    }));
    expect(result).toBe(true);
  });

  it.skip("29/02/2024 is valid leapyear date (dd/MM)", () => {
    const result = isValid("29/02/2024", dtOpts({
      alias: "datetime",
      inputFormat: "dd/MM/yyyy",
      min: "01/01/1900",
    }));
    expect(result).toBe(true);
  });
});
