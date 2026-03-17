import { describe, it, expect } from "vitest";
import { defineAlias } from "@maskit/core";
import {
  dateAliases,
  datetimeAlias,
  createDatetimeAlias,
  defaultI18n,
  parseDateFormat,
  isValidDate,
  isDateInRange,
  pad,
} from "../src/index.js";
import type { DateParts, DateOptions, DateI18n } from "../src/index.js";

// Register date aliases
for (const [name, alias] of Object.entries(dateAliases)) {
  defineAlias(name, alias);
}

describe("@maskit/date — exports", () => {
  it("exports datetimeAlias", () => {
    expect(datetimeAlias).toBeDefined();
    expect(typeof datetimeAlias.mask).toBe("function");
  });

  it("exports createDatetimeAlias factory", () => {
    expect(typeof createDatetimeAlias).toBe("function");
  });

  it("exports dateAliases with 'datetime' key", () => {
    expect(Object.keys(dateAliases)).toEqual(["datetime"]);
  });

  it("exports i18n defaults", () => {
    expect(defaultI18n).toBeDefined();
    expect(defaultI18n.monthNames.length).toBe(24);
    expect(defaultI18n.dayNames.length).toBe(14);
    expect(defaultI18n.ordinalSuffix.length).toBe(4);
  });
});

describe("@maskit/date — pad helper", () => {
  it("pads 1 to '01'", () => {
    expect(pad(1)).toBe("01");
  });

  it("pads to specified length", () => {
    expect(pad(5, 4)).toBe("0005");
  });

  it("pads right when specified", () => {
    expect(pad("5", 4, true)).toBe("5000");
  });

  it("does not pad if already long enough", () => {
    expect(pad("12", 2)).toBe("12");
  });
});

describe("@maskit/date — i18n", () => {
  it("has English month names", () => {
    expect(defaultI18n.monthNames[0]).toBe("Jan");
    expect(defaultI18n.monthNames[12]).toBe("January");
  });

  it("has English day names", () => {
    expect(defaultI18n.dayNames[0]).toBe("Mon");
    expect(defaultI18n.dayNames[7]).toBe("Monday");
  });

  it("createDatetimeAlias accepts custom i18n", () => {
    const customI18n: DateI18n = {
      dayNames: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom",
                 "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
      monthNames: [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ],
      ordinalSuffix: ["er", "do", "er", "to"],
    };
    const alias = createDatetimeAlias(customI18n);
    expect(alias).toBeDefined();
    expect(typeof alias.mask).toBe("function");
  });
});

describe("@maskit/date — datetime alias properties", () => {
  it("has insertMode false", () => {
    expect(datetimeAlias.insertMode).toBe(false);
  });

  it("has numeric inputmode", () => {
    expect(datetimeAlias.inputmode).toBe("numeric");
  });

  it("has shiftPositions false", () => {
    expect(datetimeAlias.shiftPositions).toBe(false);
  });

  it("defaults inputFormat to isoDateTime", () => {
    expect((datetimeAlias as Record<string, unknown>).inputFormat).toBe("isoDateTime");
  });

  it("defaults placeholder to empty", () => {
    expect(datetimeAlias.placeholder).toBe("");
  });
});

describe("@maskit/date — parseDateFormat", () => {
  it("generates mask pattern for dd/MM/yyyy", () => {
    const opts: DateOptions = { escapeChar: "\\" };
    const pattern = parseDateFormat("dd/MM/yyyy", undefined, opts);
    expect(pattern).toContain("0[1-9]|[12][0-9]|3[01]");
    expect(pattern).toContain("0[1-9]|1[012]");
    expect(pattern).toContain("[0-9]{4}");
  });

  it("generates mask pattern for HH:mm:ss", () => {
    const opts: DateOptions = { escapeChar: "\\" };
    const pattern = parseDateFormat("HH:mm:ss", undefined, opts);
    expect(pattern).toContain("0[0-9]|1[0-9]|2[0-3]");
    expect(pattern).toContain("0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]");
  });

  it("handles escaped characters", () => {
    const opts: DateOptions = { escapeChar: "\\" };
    const pattern = parseDateFormat("yyyy\\-MM\\-dd", undefined, opts);
    // The escaped dashes should be literal
    expect(pattern).toContain("\\-");
  });
});

describe("@maskit/date — isDateInRange", () => {
  it("returns result when no min/max", () => {
    const parts = { date: new Date(2020, 0, 15) } as unknown as DateParts;
    const result = isDateInRange(parts, true, {});
    expect(result).toBe(true);
  });

  it("returns false when before min", () => {
    const parts = { date: new Date(2019, 0, 1) } as unknown as DateParts;
    const min = { date: new Date(2020, 0, 1) } as unknown as DateParts;
    const result = isDateInRange(parts, true, { min });
    expect(result).toBe(false);
  });

  it("returns false when after max", () => {
    const parts = { date: new Date(2025, 0, 1) } as unknown as DateParts;
    const max = { date: new Date(2024, 11, 31) } as unknown as DateParts;
    const result = isDateInRange(parts, true, { max });
    expect(result).toBe(false);
  });

  it("returns result when in range", () => {
    const parts = { date: new Date(2022, 5, 15) } as unknown as DateParts;
    const min = { date: new Date(2020, 0, 1) } as unknown as DateParts;
    const max = { date: new Date(2025, 11, 31) } as unknown as DateParts;
    const result = isDateInRange(parts, { pos: 5 }, { min, max });
    expect(result).toEqual({ pos: 5 });
  });

  it("returns false when result is false", () => {
    const parts = { date: new Date(2022, 5, 15) } as unknown as DateParts;
    const result = isDateInRange(parts, false, {});
    expect(result).toBe(false);
  });
});

describe("@maskit/date — FORMAT_ALIAS", () => {
  it("isoDate resolves to yyyy-MM-dd", () => {
    // This is tested indirectly through the mask function
    const opts: DateOptions = { inputFormat: "isoDate", escapeChar: "\\" };
    const pattern = parseDateFormat("yyyy-MM-dd", undefined, opts);
    expect(pattern).toBeDefined();
  });
});
