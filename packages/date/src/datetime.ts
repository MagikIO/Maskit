import type {
  AliasDefinition,
  CaretPosition,
  CommandObject,
  MaskDefinition,
  MaskOptions,
  MaskSet,
  TestResult,
  ValidationResult,
} from "@maskit/core";
import { escapeRegex, getTest } from "@maskit/core";
import type { DateI18n } from "./i18n.js";
import { defaultI18n } from "./i18n.js";

// ---- DateParts ----

/** Parsed date parts from a masked date string */
export interface DateParts {
  _date: Date;
  date: Date;
  day: string;
  rawday: string;
  month: string;
  rawmonth: string;
  year: string;
  rawyear: string;
  hours: string;
  rawhours: string;
  minutes: string;
  rawminutes: string;
  seconds: string;
  rawseconds: string;
  milliseconds: string;
  rawmilliseconds: string;
  ampm: string;
  rawampm: string;
  Z: string;
  rawZ: string;
  reset(): void;
  reInit(): void;
  [key: string]: unknown;
}

// ---- Extended options ----

export interface DateOptions extends Partial<MaskOptions> {
  inputFormat?: string;
  displayFormat?: string | null;
  outputFormat?: string | null;
  min?: string | DateParts | null;
  max?: string | DateParts | null;
  prefillYear?: boolean;
  tokenizer?: RegExp;
}

// ---- Format code types ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormatCodeEntry = any[];

function setAMPM(this: Date, value: string | number): void {
  const hours = this.getHours();
  const v = String(value);
  if (v.toLowerCase().includes("p")) {
    this.setHours(hours + 12);
  } else if (v.toLowerCase().includes("a") && hours >= 12) {
    this.setHours(hours - 12);
  }
}

function getAMPM(this: Date): string {
  const hours = this.getHours() || 12;
  return hours >= 12 ? "PM" : "AM";
}

function getTimeZoneAbbreviated(this: Date): string {
  const m = this.toString().match(/\((.+)\)/);
  if (!m) return "";
  let tz = m[1];
  if (tz.includes(" ")) {
    tz = tz.replace("-", " ").toUpperCase();
    tz = tz.split(" ").map((w) => w[0]).join("");
  }
  return tz;
}

function buildFormatCodes(i18n: DateI18n): Record<string, FormatCodeEntry> {
  return {
    d: ["[1-9]|[12][0-9]|3[01]", Date.prototype.setDate, "day", Date.prototype.getDate],
    dd: [
      "0[1-9]|[12][0-9]|3[01]",
      Date.prototype.setDate,
      "day",
      function (this: Date) { return pad(Date.prototype.getDate.call(this), 2); },
    ],
    ddd: [""],
    dddd: [""],
    M: [
      "[1-9]|1[012]",
      function (this: Date, val: unknown) {
        let mval = val ? parseInt(String(val)) : 0;
        if (mval > 0) mval--;
        return Date.prototype.setMonth.call(this, mval);
      },
      "month",
      function (this: Date) { return Date.prototype.getMonth.call(this) + 1; },
    ],
    MM: [
      "0[1-9]|1[012]",
      function (this: Date, val: unknown) {
        let mval = val ? parseInt(String(val)) : 0;
        if (mval > 0) mval--;
        return Date.prototype.setMonth.call(this, mval);
      },
      "month",
      function (this: Date) { return pad(Date.prototype.getMonth.call(this) + 1, 2); },
    ],
    MMM: [
      i18n.monthNames.slice(0, 12).join("|"),
      function (this: Date, val: unknown) {
        const idx = i18n.monthNames.slice(0, 12).findIndex(
          (item) => String(val).toLowerCase() === item.toLowerCase(),
        );
        return idx !== -1 ? Date.prototype.setMonth.call(this, idx) : false;
      },
      "month",
      function (this: Date) { return i18n.monthNames.slice(0, 12)[Date.prototype.getMonth.call(this)]; },
    ],
    MMMM: [
      i18n.monthNames.slice(12, 24).join("|"),
      function (this: Date, val: unknown) {
        const idx = i18n.monthNames.slice(12, 24).findIndex(
          (item) => String(val).toLowerCase() === item.toLowerCase(),
        );
        return idx !== -1 ? Date.prototype.setMonth.call(this, idx) : false;
      },
      "month",
      function (this: Date) { return i18n.monthNames.slice(12, 24)[Date.prototype.getMonth.call(this)]; },
    ],
    yy: [
      "[0-9]{2}",
      function (this: Date, val: unknown) {
        const centuryPart = new Date().getFullYear().toString().slice(0, 2);
        Date.prototype.setFullYear.call(this, parseInt(`${centuryPart}${val}`));
      },
      "year",
      function (this: Date) { return pad(Date.prototype.getFullYear.call(this), 2); },
      2,
    ],
    yyyy: [
      "[0-9]{4}",
      function (this: Date, val: unknown) { Date.prototype.setFullYear.call(this, parseInt(String(val))); },
      "year",
      function (this: Date) { return pad(Date.prototype.getFullYear.call(this), 4); },
      4,
    ],
    h: ["[1-9]|1[0-2]", Date.prototype.setHours, "hours", Date.prototype.getHours],
    hh: [
      "0[1-9]|1[0-2]",
      Date.prototype.setHours,
      "hours",
      function (this: Date) { return pad(Date.prototype.getHours.call(this), 2); },
    ],
    hx: [
      (x: string) => `[0-9]{${x}}`,
      Date.prototype.setHours,
      "hours",
      (_x: string) => Date.prototype.getHours,
    ],
    H: ["1?[0-9]|2[0-3]", Date.prototype.setHours, "hours", Date.prototype.getHours],
    HH: [
      "0[0-9]|1[0-9]|2[0-3]",
      Date.prototype.setHours,
      "hours",
      function (this: Date) { return pad(Date.prototype.getHours.call(this), 2); },
    ],
    Hx: [
      (x: string) => `[0-9]{${x}}`,
      Date.prototype.setHours,
      "hours",
      (x: string) => function (this: Date) { return pad(Date.prototype.getHours.call(this), parseInt(x)); },
    ],
    m: ["[1-5]?[0-9]", Date.prototype.setMinutes, "minutes", Date.prototype.getMinutes],
    mm: [
      "0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]",
      Date.prototype.setMinutes,
      "minutes",
      function (this: Date) { return pad(Date.prototype.getMinutes.call(this), 2); },
    ],
    s: ["[1-5]?[0-9]", Date.prototype.setSeconds, "seconds", Date.prototype.getSeconds],
    ss: [
      "0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]",
      Date.prototype.setSeconds,
      "seconds",
      function (this: Date) { return pad(Date.prototype.getSeconds.call(this), 2); },
    ],
    l: [
      "[0-9]{3}",
      Date.prototype.setMilliseconds,
      "milliseconds",
      function (this: Date) { return pad(Date.prototype.getMilliseconds.call(this), 3); },
      3,
    ],
    L: [
      "[0-9]{2}",
      Date.prototype.setMilliseconds,
      "milliseconds",
      function (this: Date) { return pad(Date.prototype.getMilliseconds.call(this), 2); },
      2,
    ],
    t: ["[ap]", setAMPM, "ampm", getAMPM, 1],
    tt: ["[ap]m", setAMPM, "ampm", getAMPM, 2],
    T: ["[AP]", setAMPM, "ampm", getAMPM, 1],
    TT: ["[AP]M", setAMPM, "ampm", getAMPM, 2],
    Z: [".*", undefined, "Z", getTimeZoneAbbreviated],
    o: [""],
    S: [""],
  };
}

const FORMAT_CODE_ALIAS: Record<string, string> = {
  D: "d", DD: "dd", DDD: "ddd", DDDD: "dddd",
  YY: "yy", YYYY: "yyyy", sss: "L",
};

const FORMAT_ALIAS: Record<string, string> = {
  isoDate: "yyyy-MM-dd",
  isoTime: "HH:mm:ss",
  isoDateTime: "yyyy-MM-dd\\THH:mm:ss",
  isoUtcDateTime: "UTC:yyyy-MM-dd\\THH:mm:ss\\Z",
};

// ---- Helpers ----

/** Pad a value to `len` characters with leading/trailing zeros */
export function pad(val: string | number, len = 2, right = false): string {
  let s = String(val);
  while (s.length < len) s = right ? s + "0" : "0" + s;
  return s;
}

function resolveFormatCode(
  match: string,
  formatCodes: Record<string, FormatCodeEntry>,
): FormatCodeEntry | undefined {
  const fcMatch = FORMAT_CODE_ALIAS[match] || match;
  const dynMatches = /\d+$/.exec(fcMatch);
  if (dynMatches && dynMatches[0] !== undefined) {
    const baseEntry = formatCodes[fcMatch[0] + "x"];
    if (!baseEntry) return undefined;
    const fcode = baseEntry.slice();
    fcode[0] = fcode[0](dynMatches[0]);
    fcode[3] = fcode[3](dynMatches[0]);
    return fcode;
  } else if (formatCodes[fcMatch]) {
    return formatCodes[fcMatch];
  }
  return undefined;
}

function getTokenizer(opts: DateOptions): RegExp {
  if (!opts.tokenizer) {
    const tokens: string[] = [];
    const dyntokens: string[] = [];
    const formatCodes = buildFormatCodes(defaultI18n);
    const allKeys = Object.keys(formatCodes).concat(Object.keys(FORMAT_CODE_ALIAS));
    for (const k of allKeys) {
      if (/\.*x$/.test(k)) {
        const dt = k[0] + "\\d+";
        if (!dyntokens.includes(dt)) dyntokens.push(dt);
      } else if (!tokens.includes(k[0])) {
        tokens.push(k[0]);
      }
    }
    const pattern =
      "(" + (dyntokens.length > 0 ? dyntokens.join("|") + "|" : "") + tokens.join("+|") + "+)+?|.";
    opts.tokenizer = new RegExp(pattern, "g");
  }
  return opts.tokenizer;
}

// helper to get test placeholder safely
function getTestPlaceholder(
  opts: DateOptions,
  maskset: MaskSet | undefined,
  ndx: number,
  definitions: Record<string, MaskDefinition>,
): string {
  if (!maskset) return "";
  const t = getTest(ndx, opts as MaskOptions, maskset, definitions) as TestResult;
  const ph = t.match.placeholder;
  if (typeof ph === "function") return ph(opts as MaskOptions);
  return ph ?? "";
}

function getTokenMatchForDate(
  pos: number,
  opts: DateOptions,
  maskset: MaskSet | undefined,
  formatCodes: Record<string, FormatCodeEntry>,
): { targetMatchIndex: number; nextMatch: RegExpExecArray | null; targetMatch: RegExpExecArray | null } {
  const defs = (opts as MaskOptions).definitions ?? {};
  let calcPos = 0;
  let targetMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  let matchLength = 0;
  const tokenizer = getTokenizer(opts);
  tokenizer.lastIndex = 0;

  while ((match = tokenizer.exec(opts.inputFormat ?? ""))) {
    const dynMatches = /\d+$/.exec(match[0]);
    if (dynMatches) {
      matchLength = parseInt(dynMatches[0]);
    } else {
      const targetSymbol = match[0][0];
      let ndx = calcPos;
      if (maskset) {
        const placeholder = typeof opts.placeholder === "object" ? opts.placeholder as Record<string, string> : {};
        while (
          (placeholder[`${match.index}'${getTestPlaceholder(opts, maskset, ndx, defs)}`] ||
            getTestPlaceholder(opts, maskset, ndx, defs)) === targetSymbol
        ) {
          ndx++;
        }
        matchLength = ndx - calcPos;
      }
      if (matchLength === 0) matchLength = match[0].length;
    }
    calcPos += matchLength;

    if (calcPos >= pos + 1) {
      let masksetHint = "";
      if (maskset && maskset.tests[pos]) {
        const ph = typeof opts.placeholder === "object" ? opts.placeholder as Record<string, string> : {};
        const testPh = String(maskset.tests[pos][0].match.placeholder ?? "");
        const filteredKeys = Object.keys(ph).filter((value) => {
          for (let i = match!.index - 1; i < calcPos; i++) {
            if (value === `${i}'${testPh}`) return true;
          }
          return false;
        });
        masksetHint = filteredKeys.length > 0 ? ph[filteredKeys[0]] : testPh;
      }

      if (match[0].indexOf(masksetHint) !== -1) {
        targetMatch = match;
        match = tokenizer.exec(opts.inputFormat ?? "");
        break;
      }
    }
  }

  return { targetMatchIndex: calcPos - matchLength, nextMatch: match, targetMatch };
}

// ---- Date parsing ----

function createDateParts(
  mask: string | undefined,
  format: string,
  opts: DateOptions,
  i18n: DateI18n,
  maskset?: MaskSet,
): DateParts {
  const formatCodes = buildFormatCodes(i18n);
  const defs = (opts as MaskOptions).definitions ?? {};
  let useDateObj = false;

  const parts: DateParts = {
    _date: new Date(1, 0, 1),
    get date() { return this._date; },
    day: "", rawday: "",
    month: "", rawmonth: "",
    year: "", rawyear: "",
    hours: "", rawhours: "",
    minutes: "", rawminutes: "",
    seconds: "", rawseconds: "",
    milliseconds: "", rawmilliseconds: "",
    ampm: "", rawampm: "",
    Z: "", rawZ: "",
    reset() { this._date = new Date(1, 0, 1); },
    reInit() {
      this._date = new Date(1, 0, 1);
      init(mask, this);
    },
  };

  function init(maskStr: string | undefined, dp: DateParts) {
    let m: RegExpExecArray | null;
    let lastNdx = -1;
    const tokenizer = getTokenizer(opts);
    tokenizer.lastIndex = 0;

    while ((m = tokenizer.exec(format))) {
      if (m.index >= lastNdx) {
        const dynMatches = /\d+$/.exec(m[0]);
        const fcode = dynMatches ? m[0][0] + "x" : m[0];
        let value: string | undefined;

        if (maskStr !== undefined) {
          if (dynMatches) {
            const li = tokenizer.lastIndex;
            const tm = getTokenMatchForDate(m.index, opts, maskset, formatCodes);
            tokenizer.lastIndex = li;
            value = tm.nextMatch ? maskStr.slice(0, maskStr.indexOf(tm.nextMatch[0])) : maskStr;
          } else {
            const sym = m[0][0];
            let ndx = m.index;
            if (maskset) {
              const ph = typeof opts.placeholder === "object" ? opts.placeholder as Record<string, string> : {};
              while (
                (ph[`${m.index}'${getTestPlaceholder(opts, maskset, ndx, defs)}`] ||
                  getTestPlaceholder(opts, maskset, ndx, defs)) === sym
              ) { ndx++; }
            } else {
              ndx = m.index + (m[0].length || 1);
            }
            lastNdx = ndx;
            const len = ndx - m.index;
            const fc = resolveFormatCode(fcode, formatCodes);
            value = maskStr.slice(0, len || (fc && fc[4]) || fcode.length);
          }
          maskStr = maskStr.slice(value.length);
        }

        const rfc = resolveFormatCode(fcode, formatCodes);
        if (rfc && Object.prototype.hasOwnProperty.call(formatCodes, fcode)) {
          setValue(dp, value, fcode, rfc[2], rfc[1], rfc);
        }
      }
    }
    void useDateObj;
  }

  function setValue(
    dp: DateParts,
    value: string | undefined,
    fcode: string,
    targetProp: string,
    dateOperation: ((this: Date, val: unknown) => void) | undefined,
    fc: FormatCodeEntry,
  ) {
    if (value !== undefined) {
      switch (targetProp) {
        case "ampm":
          dp[targetProp] = value;
          dp["raw" + targetProp] = value.replace(/\s/g, "_");
          break;
        case "month":
          if (fcode === "MMM" || fcode === "MMMM") {
            const slice = fcode === "MMM" ? i18n.monthNames.slice(0, 12) : i18n.monthNames.slice(12, 24);
            dp[targetProp] = pad(slice.findIndex((item) => value.toLowerCase() === item.toLowerCase()) + 1, 2);
            dp[targetProp] = dp[targetProp] === "00" ? "" : String(dp[targetProp]);
            dp["raw" + targetProp] = dp[targetProp] as string;
            break;
          }
        // falls through
        default:
          dp[targetProp] = value.replace(/[^0-9]/g, "0");
          dp["raw" + targetProp] = value.replace(/\s/g, "_");
      }
    }
    if (dateOperation !== undefined) {
      let datavalue = String(dp[targetProp]);
      if (
        (targetProp === "day" && parseInt(datavalue) === 29) ||
        (targetProp === "month" && parseInt(datavalue) === 2)
      ) {
        if (parseInt(dp.day) === 29 && parseInt(dp.month) === 2 && (!dp.year || dp.year === "")) {
          dp._date.setFullYear(2012, 1, 29);
        }
      }
      if (targetProp === "day") { useDateObj = true; if (parseInt(datavalue) === 0) datavalue = "1"; }
      if (targetProp === "month") useDateObj = true;
      if (targetProp === "year") {
        useDateObj = true;
        if (datavalue.length < (fc[4] ?? 0)) datavalue = pad(datavalue, fc[4], true);
      }
      if ((datavalue !== "" && !isNaN(Number(datavalue))) || targetProp === "ampm") {
        dateOperation.call(dp._date, datavalue);
      }
    }
  }

  init(mask, parts);
  return parts;
}

// ---- Parse format to mask pattern / format DateParts to string ----

export function parseDateFormat(
  format: string,
  dateObjValue: DateParts | undefined,
  opts: DateOptions,
  i18n: DateI18n = defaultI18n,
): string {
  const formatCodes = buildFormatCodes(i18n);
  let mask = "";
  let match: RegExpExecArray | null;
  let ndx = 0;
  let escaped = false;
  const placeHolder: Record<string | number, string> = {};
  const tokenizer = getTokenizer(opts);
  tokenizer.lastIndex = 0;

  while ((match = tokenizer.exec(format))) {
    if (match[0] === (opts.escapeChar ?? "\\")) {
      escaped = true;
    } else {
      if (dateObjValue === undefined) {
        if (!escaped) {
          const fcode = resolveFormatCode(match[0], formatCodes);
          if (fcode) {
            mask += "(" + fcode[0] + ")";
            if (typeof opts.placeholder === "string" && opts.placeholder !== "") {
              placeHolder[ndx] = opts.placeholder[match.index % opts.placeholder.length];
              placeHolder[`${match.index}'${opts.placeholder[match.index % opts.placeholder.length]}`] = match[0].charAt(0);
            } else {
              placeHolder[ndx] = match[0].charAt(0);
            }
          } else {
            switch (match[0]) {
              case "[": mask += "("; break;
              case "]": mask += ")?"; break;
              default:
                mask += escapeRegex(match[0]);
                placeHolder[ndx] = match[0].charAt(0);
            }
          }
        } else {
          mask += escapeRegex(match[0]);
          placeHolder[ndx] = match[0].charAt(0);
        }
      } else {
        if (!escaped) {
          const fcode = resolveFormatCode(match[0], formatCodes);
          if (fcode) {
            if (fcode[3]) {
              const getFn = fcode[3];
              mask += getFn.call(dateObjValue.date);
            } else if (fcode[2] && dateObjValue["raw" + fcode[2]] !== undefined) {
              mask += dateObjValue["raw" + fcode[2]];
            } else {
              mask += match[0];
            }
          } else {
            mask += match[0];
          }
        } else {
          mask += match[0];
        }
      }
      ndx++;
      escaped = false;
    }
  }

  if (dateObjValue === undefined) {
    (opts as MaskOptions).placeholder = placeHolder as unknown as string;
  }
  return mask;
}

function analyseDateMask(
  mask: string | DateParts | undefined,
  format: string,
  opts: DateOptions,
  i18n: DateI18n,
  maskset?: MaskSet,
): DateParts | undefined {
  if (typeof mask === "string") return createDateParts(mask, format, opts, i18n, maskset);
  if (mask && typeof mask === "object" && "date" in mask) return mask as DateParts;
  return undefined;
}

function importDate(dateObj: Date, opts: DateOptions, i18n: DateI18n): string {
  return parseDateFormat(opts.inputFormat!, { date: dateObj } as unknown as DateParts, opts, i18n);
}

// ---- Validation helpers ----

function prefillYearFn(
  dateParts: DateParts,
  currentResult: CommandObject,
  opts: DateOptions,
): CommandObject {
  const currentYear = new Date().getFullYear();
  if (dateParts.year !== dateParts.rawyear) {
    const cry = currentYear.toString();
    const entered = dateParts.rawyear.replace(/[^0-9]/g, "");
    const cyp = cry.slice(0, entered.length);
    const cyNext = cry.slice(entered.length);
    if (entered.length === 2 && entered === cyp) {
      const entryDate = new Date(currentYear, parseInt(dateParts.month) - 1, parseInt(dateParts.day));
      if (
        parseInt(dateParts.day) === entryDate.getDate() &&
        (!opts.max || (opts.max as DateParts).date.getTime() >= entryDate.getTime())
      ) {
        dateParts.date.setFullYear(currentYear);
        dateParts.year = cry;
        currentResult.insert = [
          { pos: (currentResult.pos ?? 0) + 1, c: cyNext[0] },
          { pos: (currentResult.pos ?? 0) + 2, c: cyNext[1] },
        ];
      }
    }
  }
  return currentResult;
}

export function isValidDate(
  dateParts: DateParts,
  currentResult: boolean | CommandObject,
  opts: DateOptions,
  maskset?: MaskSet,
  formatCodes?: Record<string, FormatCodeEntry>,
): boolean | CommandObject {
  if (typeof currentResult === "boolean" && !currentResult) return false;
  const result = currentResult as CommandObject;

  if (
    dateParts.rawday === undefined ||
    (!isFinite(Number(dateParts.rawday)) &&
      new Date(
        dateParts.date.getFullYear(),
        isFinite(Number(dateParts.rawmonth)) ? parseInt(dateParts.month) : dateParts.date.getMonth() + 1,
        0,
      ).getDate() >= parseInt(dateParts.day)) ||
    (dateParts.day === "29" &&
      (!isFinite(Number(dateParts.rawyear)) || dateParts.rawyear === undefined || dateParts.rawyear === "")) ||
    new Date(
      dateParts.date.getFullYear(),
      isFinite(Number(dateParts.rawmonth)) ? parseInt(dateParts.month) : dateParts.date.getMonth() + 1,
      0,
    ).getDate() >= parseInt(dateParts.day)
  ) {
    return result;
  }

  if (dateParts.day === "29" && maskset && formatCodes) {
    const tm = getTokenMatchForDate(result.pos ?? 0, opts, maskset, formatCodes);
    if (tm.targetMatch && ["yyyy", "YYYY"].includes(tm.targetMatch[0]) && (result.pos ?? 0) - tm.targetMatchIndex === 2) {
      result.remove = (result.pos ?? 0) + 1;
      return result;
    }
  } else if (dateParts.date.getMonth() === 2 && dateParts.day === "30" && (result as Record<string, unknown>).c !== undefined) {
    dateParts.day = "03";
    dateParts.date.setDate(3);
    dateParts.date.setMonth(1);
    result.insert = [
      { pos: result.pos ?? 0, c: "0" },
      { pos: (result.pos ?? 0) + 1, c: (result as Record<string, unknown>).c as string },
    ];
    return result;
  }
  return false;
}

export function isDateInRange(
  dateParts: DateParts,
  result: boolean | CommandObject,
  opts: DateOptions,
): boolean | CommandObject {
  if (!result) return result;
  if (opts.min) {
    const minParts = opts.min as DateParts;
    if (!isNaN(minParts.date.getTime()) && minParts.date.getTime() > dateParts.date.getTime()) return false;
  }
  if (opts.max) {
    const maxParts = opts.max as DateParts;
    if (!isNaN(maxParts.date.getTime()) && maxParts.date.getTime() < dateParts.date.getTime()) return false;
  }
  return result;
}

// ---- datetime alias ----

export function createDatetimeAlias(i18n: DateI18n = defaultI18n): AliasDefinition {
  const formatCodes = buildFormatCodes(i18n);

  const alias = {
    mask: ((opts: MaskOptions) => {
      const dateOpts = opts as unknown as DateOptions;
      opts.numericInput = false;
      formatCodes.S = [i18n.ordinalSuffix.join("|"), undefined, "ordinal", () => ""];

      dateOpts.inputFormat = FORMAT_ALIAS[dateOpts.inputFormat ?? ""] ?? dateOpts.inputFormat ?? "isoDateTime";
      if (typeof opts.repeat === "number" && opts.repeat > 0) {
        let fmt = "";
        for (let i = 0; i < opts.repeat; i++) fmt += dateOpts.inputFormat;
        dateOpts.inputFormat = fmt;
        opts.repeat = 0;
      }

      dateOpts.displayFormat = FORMAT_ALIAS[dateOpts.displayFormat ?? ""] ?? dateOpts.displayFormat ?? dateOpts.inputFormat;
      dateOpts.outputFormat = FORMAT_ALIAS[dateOpts.outputFormat ?? ""] ?? dateOpts.outputFormat ?? dateOpts.inputFormat;
      opts.regex = parseDateFormat(dateOpts.inputFormat!, undefined, dateOpts, i18n);
      dateOpts.min = dateOpts.min ? analyseDateMask(dateOpts.min as string, dateOpts.inputFormat!, dateOpts, i18n) : null;
      dateOpts.max = dateOpts.max ? analyseDateMask(dateOpts.max as string, dateOpts.inputFormat!, dateOpts, i18n) : null;
      return null as unknown as string;
    }) as (opts: MaskOptions) => string,
    placeholder: "",
    inputFormat: "isoDateTime",
    displayFormat: null,
    outputFormat: null,
    min: null,
    max: null,
    skipOptionalPartCharacter: "",
    preValidation(
      buffer: string[],
      pos: number,
      c: string,
      _isSelection: boolean,
      opts: MaskOptions,
      maskset: MaskSet,
      _caretPos: CaretPosition | number,
      strict: boolean,
    ): boolean | CommandObject {
      if (strict) return true;
      const dateOpts = opts as unknown as DateOptions;
      if (isNaN(Number(c)) && buffer[pos] !== c) {
        const tm = getTokenMatchForDate(pos, dateOpts, maskset, formatCodes);
        if (tm.nextMatch && tm.nextMatch[0] === c && tm.targetMatch && tm.targetMatch[0].length > 1) {
          const validator = resolveFormatCode(tm.targetMatch[0], formatCodes)?.[0];
          if (validator && new RegExp(validator).test("0" + buffer[pos - 1])) {
            buffer[pos] = buffer[pos - 1];
            buffer[pos - 1] = "0";
            return {
              buffer,
              refreshFromBuffer: { start: pos - 1, end: pos + 1 },
              pos: pos + 1,
            } as CommandObject;
          }
        }
      }
      return true;
    },
    postValidation(
      buffer: string[],
      pos: number,
      c: string,
      currentResult: ValidationResult,
      opts: MaskOptions,
      maskset: MaskSet,
      strict: boolean,
      fromCheckval: boolean,
    ): boolean | ValidationResult {
      if (strict) return true;
      const dateOpts = opts as unknown as DateOptions;
      let tokenMatch: ReturnType<typeof getTokenMatchForDate>;
      let validator: string | undefined;

      if (currentResult === false) {
        tokenMatch = getTokenMatchForDate(pos + 1, dateOpts, maskset, formatCodes);
        if (tokenMatch.targetMatch && tokenMatch.targetMatchIndex === pos && tokenMatch.targetMatch[0].length > 1 && resolveFormatCode(tokenMatch.targetMatch[0], formatCodes) !== undefined) {
          validator = resolveFormatCode(tokenMatch.targetMatch[0], formatCodes)![0];
        } else {
          tokenMatch = getTokenMatchForDate(pos + 2, dateOpts, maskset, formatCodes);
          if (tokenMatch.targetMatch && tokenMatch.targetMatchIndex === pos + 1 && tokenMatch.targetMatch[0].length > 1 && resolveFormatCode(tokenMatch.targetMatch[0], formatCodes) !== undefined) {
            validator = resolveFormatCode(tokenMatch.targetMatch[0], formatCodes)![0];
          }
        }
        if (validator !== undefined) {
          pos = tokenMatch.targetMatchIndex;
          if (maskset.validPositions[pos + 1] !== undefined && new RegExp(validator).test(c + "0")) {
            buffer[pos] = c;
            buffer[pos + 1] = "0";
            currentResult = { pos: pos + 2, caret: pos + 1 };
          } else if (new RegExp(validator).test("0" + c)) {
            buffer[pos] = "0";
            buffer[pos + 1] = c;
            currentResult = { pos: pos + 2 };
          }
        }
        if (currentResult === false) return currentResult;
      }

      // Full validate target
      tokenMatch = getTokenMatchForDate(pos, dateOpts, maskset, formatCodes);
      if (tokenMatch.targetMatch && tokenMatch.targetMatch[0] && resolveFormatCode(tokenMatch.targetMatch[0], formatCodes) !== undefined) {
        const fcode = resolveFormatCode(tokenMatch.targetMatch[0], formatCodes)!;
        validator = fcode[0] as string;
        const part = buffer.slice(tokenMatch.targetMatchIndex, tokenMatch.targetMatchIndex + tokenMatch.targetMatch[0].length);
        if (validator && !new RegExp(validator).test(part.join("")) && tokenMatch.targetMatch[0].length === 2 && maskset.validPositions[tokenMatch.targetMatchIndex] && maskset.validPositions[tokenMatch.targetMatchIndex + 1]) {
          maskset.validPositions[tokenMatch.targetMatchIndex + 1].input = "0";
        }
      }

      let result: boolean | ValidationResult = currentResult;
      const dateParts = analyseDateMask(buffer.join(""), dateOpts.inputFormat!, dateOpts, i18n, maskset);

      if (result && dateParts && !isNaN(dateParts.date.getTime())) {
        if (dateOpts.prefillYear) result = prefillYearFn(dateParts, result as CommandObject, dateOpts);
        result = isValidDate(dateParts, result, dateOpts, maskset, formatCodes);
        result = isDateInRange(dateParts, result, dateOpts);
      }

      if (pos !== undefined && result && typeof result === "object" && (result as CommandObject).pos !== pos) {
        return {
          buffer: parseDateFormat(dateOpts.inputFormat!, dateParts!, dateOpts, i18n).split(""),
          refreshFromBuffer: { start: pos, end: (result as CommandObject).pos! },
          pos: (result as CommandObject).caret !== undefined ? (result as CommandObject).caret : (result as CommandObject).pos,
        };
      }
      return result;
    },
    onUnMask(maskedValue: string, unmaskedValue: string, opts: MaskOptions): string {
      const dateOpts = opts as unknown as DateOptions;
      return unmaskedValue
        ? parseDateFormat(dateOpts.outputFormat ?? dateOpts.inputFormat!, analyseDateMask(maskedValue, dateOpts.inputFormat!, dateOpts, i18n)!, dateOpts, i18n)
        : unmaskedValue;
    },
    casing: ((elem: string, test: { nativeDef: string; def: string; static: boolean }, pos: number) => {
      if (test.nativeDef.indexOf("[ap]") === 0) return elem.toLowerCase();
      if (test.nativeDef.indexOf("[AP]") === 0) return elem.toUpperCase();
      if (test.static && test.def === test.def.toUpperCase()) return elem.toUpperCase();
      if (pos === 0) return elem.toUpperCase();
      return elem.toLowerCase();
    }) as unknown as MaskOptions["casing"],
    onBeforeMask(initialValue: string, opts: MaskOptions): string {
      const dateOpts = opts as unknown as DateOptions;
      if (Object.prototype.toString.call(initialValue) === "[object Date]") {
        return importDate(initialValue as unknown as Date, dateOpts, i18n);
      }
      return initialValue;
    },
    insertMode: false,
    insertModeVisual: false,
    shiftPositions: false,
    keepStatic: false,
    inputmode: "numeric",
    prefillYear: true,
  };

  return alias as AliasDefinition;
}

/** Pre-built datetime alias with default English i18n */
export const datetimeAlias = createDatetimeAlias(defaultI18n);

/** All date aliases */
export const dateAliases: Record<string, AliasDefinition> = {
  datetime: datetimeAlias,
};
