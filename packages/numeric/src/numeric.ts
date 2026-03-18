import type {
  AliasDefinition,
  CaretPosition,
  CommandObject,
  MaskDefinition,
  MaskOptions,
  MaskSet,
  ValidationResult,
} from "@maskit/core";
import { escapeRegex, seekNext } from "@maskit/core";

/** Extended options for numeric aliases */
export interface NumericOptions extends Partial<MaskOptions> {
  digits?: string | number;
  digitsOptional?: boolean;
  enforceDigitsOnBlur?: boolean;
  allowMinus?: boolean;
  negationSymbol?: { front: string; back: string };
  prefix?: string;
  suffix?: string;
  min?: number | string | null;
  max?: number | string | null;
  SetMaxOnOverflow?: boolean;
  step?: number;
  inputType?: string;
  unmaskAsNumber?: boolean;
  roundingFN?: (x: number) => number;
  shortcuts?: Record<string, string>;
  stripLeadingZeroes?: boolean;
  substituteRadixPoint?: boolean;
  _mask?: (opts: NumericOptions) => string;
  _radixDance?: boolean;
  parseMinMaxOptions?: string;
  __financeInput?: boolean;
}

// ---- Internal helpers ----

function autoEscape(
  txt: string,
  opts: MaskOptions,
  globalDefs: Record<string, MaskDefinition>,
): string {
  let escapedTxt = "";
  for (let i = 0; i < txt.length; i++) {
    const ch = txt.charAt(i);
    if (
      globalDefs[ch] ||
      opts.definitions?.[ch] ||
      opts.optionalmarker[0] === ch ||
      opts.optionalmarker[1] === ch ||
      opts.quantifiermarker[0] === ch ||
      opts.quantifiermarker[1] === ch ||
      opts.groupmarker[0] === ch ||
      opts.groupmarker[1] === ch ||
      opts.alternatormarker === ch
    ) {
      escapedTxt += `\\${ch}`;
    } else {
      escapedTxt += ch;
    }
  }
  return escapedTxt;
}

export function alignDigits(
  buffer: string[],
  digits: number,
  opts: NumericOptions,
  force?: boolean,
): string[] {
  if (buffer.length > 0 && digits > 0 && (!opts.digitsOptional || force)) {
    let radixPosition = buffer.indexOf(opts.radixPoint ?? ".");
    let negationBack = false;
    if (opts.negationSymbol?.back === buffer[buffer.length - 1]) {
      negationBack = true;
      buffer.length--;
    }
    if (radixPosition === -1) {
      buffer.push(opts.radixPoint ?? ".");
      radixPosition = buffer.length - 1;
    }
    for (let i = 1; i <= digits; i++) {
      if (!Number.isFinite(Number(buffer[radixPosition + i]))) {
        buffer[radixPosition + i] = "0";
      }
    }
    if (negationBack && opts.negationSymbol?.back) {
      buffer.push(opts.negationSymbol.back);
    }
  }
  return buffer;
}

function findValidator(
  symbol: string,
  maskset: MaskSet,
  opts: MaskOptions,
  definitions: Record<string, MaskDefinition>,
): number {
  let posNdx = 0;
  if (symbol === "+") {
    posNdx = seekNext(
      maskset.validPositions.length - 1,
      opts,
      maskset,
      definitions,
    );
  }
  for (const tstNdxStr in maskset.tests) {
    const tstNdx = parseInt(tstNdxStr, 10);
    if (tstNdx >= posNdx) {
      for (
        let ndx = 0, ndxl = maskset.tests[tstNdx].length;
        ndx < ndxl;
        ndx++
      ) {
        if (
          (maskset.validPositions[tstNdx] === undefined || symbol === "-") &&
          maskset.tests[tstNdx][ndx].match.def === symbol
        ) {
          return (
            tstNdx +
            (maskset.validPositions[tstNdx] !== undefined && symbol !== "-"
              ? 1
              : 0)
          );
        }
      }
    }
  }
  return posNdx;
}

function findValid(symbol: string, maskset: MaskSet): number {
  let ret = -1;
  for (let ndx = 0, vpl = maskset.validPositions.length; ndx < vpl; ndx++) {
    const tst = maskset.validPositions[ndx];
    if (tst && tst.match.def === symbol) {
      ret = ndx;
      break;
    }
  }
  return ret;
}

function parseMinMaxOptions(opts: NumericOptions): void {
  if (opts.parseMinMaxOptions !== undefined) return;

  if (opts.min != null) {
    let minStr = opts.min
      .toString()
      .replace(new RegExp(escapeRegex(opts.groupSeparator ?? ""), "g"), "");
    if (opts.radixPoint === ",") {
      minStr = minStr.replace(opts.radixPoint, ".");
    }
    const parsed = parseFloat(minStr);
    (opts as Record<string, unknown>).min = Number.isNaN(parsed)
      ? Number.MIN_VALUE
      : parsed;
  }
  if (opts.max != null) {
    let maxStr = opts.max
      .toString()
      .replace(new RegExp(escapeRegex(opts.groupSeparator ?? ""), "g"), "");
    if (opts.radixPoint === ",") {
      maxStr = maxStr.replace(opts.radixPoint, ".");
    }
    const parsed = parseFloat(maxStr);
    (opts as Record<string, unknown>).max = Number.isNaN(parsed)
      ? Number.MAX_VALUE
      : parsed;
  }
  opts.parseMinMaxOptions = "done";
}

function checkForLeadingZeroes(
  buffer: string[],
  opts: NumericOptions,
): RegExpExecArray | false {
  const numberMatches = new RegExp(
    "(^" +
      (opts.negationSymbol?.front !== ""
        ? `${escapeRegex(opts.negationSymbol?.front ?? "")}?`
        : "") +
      escapeRegex(opts.prefix ?? "") +
      ")(.*)(" +
      escapeRegex(opts.suffix ?? "") +
      (opts.negationSymbol?.back !== ""
        ? `${escapeRegex(opts.negationSymbol?.back ?? "")}?`
        : "") +
      "$)",
  ).exec(buffer.slice().reverse().join(""));

  const number = numberMatches ? numberMatches[2] : "";
  let leadingzeroes: RegExpExecArray | null = null;
  if (number) {
    const intPart = number.split((opts.radixPoint ?? ".").charAt(0))[0];
    leadingzeroes = new RegExp(`^[0${opts.groupSeparator ?? ""}]*`).exec(
      intPart,
    );
  }
  return leadingzeroes &&
    (leadingzeroes[0].length > 1 ||
      (leadingzeroes[0].length > 0 && leadingzeroes[0].length < number.length))
    ? leadingzeroes
    : false;
}

function handleRadixDance(
  pos: number,
  c: string,
  radixPos: number,
  maskset: MaskSet,
  opts: NumericOptions,
): number {
  if (
    opts._radixDance &&
    opts.numericInput &&
    c !== opts.negationSymbol?.back
  ) {
    if (
      pos <= radixPos &&
      (radixPos > 0 || c === opts.radixPoint) &&
      (maskset.validPositions[pos - 1] === undefined ||
        maskset.validPositions[pos - 1].input !== opts.negationSymbol?.back)
    ) {
      pos -= 1;
    }
  }
  return pos;
}

/** Decimal validator used in numeric masks */
export function decimalValidator(
  chrs: string,
  maskset: MaskSet,
  pos: number,
  strict: boolean,
  opts: NumericOptions,
): boolean | CommandObject {
  const radixPos = maskset.buffer
    ? maskset.buffer.indexOf(opts.radixPoint ?? ".")
    : -1;
  const result =
    (radixPos !== -1 || (strict && opts.jitMasking)) &&
    new RegExp((opts.definitions?.["9"]?.validator as string) ?? "[0-9]").test(
      chrs,
    );

  if (
    !strict &&
    opts._radixDance &&
    radixPos !== -1 &&
    result &&
    maskset.validPositions[radixPos] === undefined
  ) {
    return {
      insert: [
        {
          pos: radixPos === pos ? radixPos + 1 : radixPos,
          c: opts.radixPoint ?? ".",
        },
      ],
      pos,
    };
  }

  return !!result;
}

/** Generate the numeric mask pattern */
export function genMask(opts: NumericOptions): string | string[] {
  const defs: Record<string, MaskDefinition> = opts.definitions ?? {};

  opts.repeat = 0;
  // treat equal separator and radixpoint
  if (
    opts.groupSeparator === opts.radixPoint &&
    opts.digits &&
    opts.digits !== "0"
  ) {
    if (opts.radixPoint === ".") {
      opts.groupSeparator = ",";
    } else if (opts.radixPoint === ",") {
      opts.groupSeparator = ".";
    } else {
      opts.groupSeparator = "";
    }
  }

  if (opts.groupSeparator === " ") {
    opts.skipOptionalPartCharacter = undefined;
  }

  if (typeof opts.placeholder === "string" && opts.placeholder.length > 1) {
    opts.placeholder = opts.placeholder.charAt(0);
  }

  if (opts.positionCaretOnClick === "radixFocus" && opts.placeholder === "") {
    opts.positionCaretOnClick = "lvp";
  }

  let decimalDef = "0";
  let radixPointDef = opts.radixPoint ?? ".";

  if (opts.numericInput === true && opts.__financeInput === undefined) {
    decimalDef = "1";
    opts.positionCaretOnClick =
      opts.positionCaretOnClick === "radixFocus"
        ? "lvp"
        : opts.positionCaretOnClick;
    opts.digitsOptional = false;
    if (typeof opts.digits === "string" && Number.isNaN(parseInt(opts.digits, 10))) {
      opts.digits =
        opts.digits.indexOf(",") !== -1 ? opts.digits.split(",")[0] : "2";
    }
    opts._radixDance = false;
    radixPointDef = opts.radixPoint === "," ? "?" : "!";
    if (opts.radixPoint !== "" && defs[radixPointDef] === undefined) {
      defs[radixPointDef] = {
        validator: `[${opts.radixPoint}]`,
        placeholder: opts.radixPoint,
        static: true,
        generated: true,
      };
    }
  } else {
    opts.__financeInput = false;
    opts.numericInput = true;
  }

  let mask = "[+]";
  let altMask: string | undefined;

  mask += autoEscape(opts.prefix ?? "", opts as MaskOptions, defs);
  if (opts.groupSeparator !== "") {
    if (defs[opts.groupSeparator!] === undefined) {
      defs[opts.groupSeparator!] = {
        validator: `[${opts.groupSeparator}]`,
        placeholder: opts.groupSeparator,
        static: true,
        generated: true,
      };
    }
    mask += opts._mask
      ? opts._mask(opts)
      : `(${opts.groupSeparator}999){+|1}`;
  } else {
    mask += opts._mask ? opts._mask(opts) : "9{+}";
  }

  if (opts.digits !== undefined && opts.digits !== 0) {
    const dq = opts.digits.toString().split(",");
    if (Number.isFinite(parseInt(dq[0], 10)) && dq[1] && Number.isFinite(parseInt(dq[1], 10))) {
      mask += `${radixPointDef + decimalDef}{${opts.digits}}`;
    } else if (
      Number.isNaN(parseInt(opts.digits as string, 10)) ||
      parseInt(opts.digits as string, 10) > 0
    ) {
      if (opts.digitsOptional || opts.jitMasking) {
        altMask = `${mask + radixPointDef + decimalDef}{0,${opts.digits}}`;
        opts.keepStatic = true;
      } else {
        mask += `${radixPointDef + decimalDef}{${opts.digits}}`;
      }
    }
  } else {
    opts.inputmode = "numeric";
  }

  mask += autoEscape(opts.suffix ?? "", opts as MaskOptions, defs);
  mask += "[-]";

  if (altMask) {
    return [
      altMask +
        autoEscape(opts.suffix ?? "", opts as MaskOptions, defs) +
        "[-]",
      mask,
    ];
  }

  opts.greedy = false;
  parseMinMaxOptions(opts);

  if (opts.radixPoint !== "" && opts.substituteRadixPoint) {
    opts.substitutes = opts.substitutes ?? {};
    opts.substitutes[opts.radixPoint === "." ? "," : "."] = opts.radixPoint!;
  }

  return mask;
}

// ---- Aliases ----

/** Base numeric alias */
export const numericAlias: AliasDefinition = {
  mask: genMask as unknown as (opts: MaskOptions) => string,
  _mask: ((opts: NumericOptions) => {
    return `(${opts.groupSeparator ?? ""}999){+|1}`;
  }) as unknown as (opts: MaskOptions) => string,
  digits: "*",
  digitsOptional: true,
  enforceDigitsOnBlur: false,
  radixPoint: ".",
  positionCaretOnClick: "radixFocus",
  _radixDance: true,
  groupSeparator: "",
  allowMinus: true,
  negationSymbol: { front: "-", back: "" },
  prefix: "",
  suffix: "",
  min: null,
  max: null,
  SetMaxOnOverflow: false,
  step: 1,
  inputType: "text",
  unmaskAsNumber: false,
  roundingFN: Math.round,
  inputmode: "decimal",
  shortcuts: { k: "1000", m: "1000000" },
  placeholder: "0",
  greedy: false,
  rightAlign: true,
  insertMode: true,
  autoUnmask: false,
  skipOptionalPartCharacter: "",
  usePrototypeDefinitions: false,
  stripLeadingZeroes: true,
  substituteRadixPoint: true,
  definitions: {
    0: { validator: decimalValidator as unknown as string },
    1: {
      validator: decimalValidator as unknown as string,
      definitionSymbol: "9",
    },
    9: {
      validator: "[0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9]",
      definitionSymbol: "*",
    },
    "+": {
      validator: ((
        chrs: string,
        _maskset: MaskSet,
        _pos: number,
        _strict: boolean,
        opts: NumericOptions,
      ) => {
        return (
          opts.allowMinus &&
          (chrs === "-" || chrs === opts.negationSymbol?.front)
        );
      }) as unknown as string,
    },
    "-": {
      validator: ((
        chrs: string,
        _maskset: MaskSet,
        _pos: number,
        _strict: boolean,
        opts: NumericOptions,
      ) => {
        return opts.allowMinus && chrs === opts.negationSymbol?.back;
      }) as unknown as string,
    },
  },
  preValidation: (
    buffer: string[],
    pos: number,
    c: string,
    isSelection: boolean,
    opts: MaskOptions,
    maskset: MaskSet,
    caretPos: CaretPosition | number,
    strict: boolean,
  ): boolean | CommandObject => {
    const numOpts = opts as unknown as NumericOptions;
    if (numOpts.__financeInput !== false && c === opts.radixPoint) return false;

    const radixPos = buffer.indexOf(opts.radixPoint);
    const initPos = pos;
    pos = handleRadixDance(pos, c, radixPos, maskset, numOpts);

    if (c === "-" || c === numOpts.negationSymbol?.front) {
      if (numOpts.allowMinus !== true) return false;
      let isNegative: number[] | false = false;
      const front = findValid("+", maskset);
      const back = findValid("-", maskset);
      if (front !== -1) {
        isNegative = [front];
        if (back !== -1) isNegative.push(back);
      }
      return isNegative !== false
        ? {
            remove: isNegative.map((p) => ({ pos: p })),
            caret: initPos - (numOpts.negationSymbol?.back.length ?? 0),
          }
        : {
            insert: [
              {
                pos: findValidator("+", maskset, opts, opts.definitions ?? {}),
                c: numOpts.negationSymbol?.front ?? "-",
                fromIsValid: true,
              },
              {
                pos: findValidator("-", maskset, opts, opts.definitions ?? {}),
                c: numOpts.negationSymbol?.back ?? "",
                fromIsValid: undefined as unknown as boolean,
              },
            ],
            caret: initPos + (numOpts.negationSymbol?.back.length ?? 0),
          };
    }

    if (c === (numOpts.groupSeparator ?? "")) {
      return { caret: initPos };
    }

    if (strict) return true;

    if (
      radixPos !== -1 &&
      numOpts._radixDance === true &&
      isSelection === false &&
      c === opts.radixPoint &&
      opts.digits !== undefined &&
      (Number.isNaN(parseInt(opts.digits as string, 10)) ||
        parseInt(opts.digits as string, 10) > 0) &&
      radixPos !== pos
    ) {
      return {
        caret:
          numOpts._radixDance && pos === radixPos - 1 ? radixPos + 1 : radixPos,
      };
    }

    if (numOpts.__financeInput === false) {
      if (isSelection) {
        if (numOpts.digitsOptional) {
          return { rewritePosition: (caretPos as CaretPosition).end };
        } else {
          if (
            (caretPos as CaretPosition).begin > radixPos &&
            (caretPos as CaretPosition).end <= radixPos
          ) {
            if (c === opts.radixPoint) {
              return {
                insert: [{ pos: radixPos + 1, c: "0", fromIsValid: true }],
                rewritePosition: radixPos,
              };
            }
            return { rewritePosition: radixPos + 1 };
          } else if ((caretPos as CaretPosition).begin < radixPos) {
            return { rewritePosition: (caretPos as CaretPosition).begin - 1 };
          }
        }
      }
    }

    return { rewritePosition: pos };
  },
  postValidation: (
    buffer: string[],
    pos: number,
    c: string,
    currentResult: ValidationResult,
    opts: MaskOptions,
    maskset: MaskSet,
    strict: boolean,
    _fromCheckval: boolean,
    fromAlternate: boolean,
  ): boolean | ValidationResult => {
    if (currentResult === false) return currentResult;
    if (strict) return true;

    const numOpts = opts as unknown as NumericOptions;

    if (numOpts.min != null || numOpts.max != null) {
      const onUnMaskFn = numOpts.onUnMask as
        | ((
            masked: string,
            unmasked: string | undefined,
            opts: MaskOptions,
          ) => string)
        | undefined;
      if (onUnMaskFn) {
        const unmasked = onUnMaskFn(
          buffer.slice().reverse().join(""),
          undefined,
          { ...opts, unmaskAsNumber: true } as MaskOptions,
        );
        const unmaskedNum = Number(unmasked);

        if (
          numOpts.min != null &&
          unmaskedNum < (numOpts.min as number) &&
          fromAlternate !== true &&
          (unmasked.toString().length >
            (numOpts.min as number).toString().length ||
            buffer[0] === opts.radixPoint ||
            unmaskedNum < 0)
        ) {
          return false;
        }

        if (
          numOpts.max != null &&
          (numOpts.max as number) >= 0 &&
          unmaskedNum > (numOpts.max as number)
        ) {
          return numOpts.SetMaxOnOverflow
            ? {
                refreshFromBuffer: true,
                buffer: alignDigits(
                  (numOpts.max as number)
                    .toString()
                    .replace(".", opts.radixPoint)
                    .split(""),
                  parseInt(opts.digits as string, 10) || 0,
                  numOpts,
                ).reverse(),
              }
            : false;
        }
      }
    }

    return currentResult;
  },
  onUnMask: (
    maskedValue: string,
    unmaskedValue: string,
    opts: MaskOptions,
  ): string => {
    const numOpts = opts as unknown as NumericOptions;
    if (unmaskedValue === "" && numOpts.nullable === true) {
      return unmaskedValue;
    }
    let processValue = maskedValue.replace(numOpts.prefix ?? "", "");
    processValue = processValue.replace(numOpts.suffix ?? "", "");
    processValue = processValue.replace(
      new RegExp(escapeRegex(opts.groupSeparator), "g"),
      "",
    );
    if (
      typeof opts.placeholder === "string" &&
      opts.placeholder.charAt(0) !== ""
    ) {
      processValue = processValue.replace(
        new RegExp(opts.placeholder.charAt(0), "g"),
        "0",
      );
    }
    if (numOpts.unmaskAsNumber) {
      if (
        opts.radixPoint !== "" &&
        processValue.indexOf(opts.radixPoint) !== -1
      ) {
        processValue = processValue.replace(escapeRegex(opts.radixPoint), ".");
      }
      processValue = processValue.replace(
        new RegExp(`^${escapeRegex(numOpts.negationSymbol?.front ?? "-")}`),
        "-",
      );
      processValue = processValue.replace(
        new RegExp(`${escapeRegex(numOpts.negationSymbol?.back ?? "")}$`),
        "",
      );
      return String(Number(processValue));
    }
    return processValue;
  },
  isComplete: (buffer: string[], opts: MaskOptions): boolean => {
    const numOpts = opts as unknown as NumericOptions;
    let maskedValue = (
      opts.numericInput ? buffer.slice().reverse() : buffer
    ).join("");
    maskedValue = maskedValue.replace(
      new RegExp(`^${escapeRegex(numOpts.negationSymbol?.front ?? "-")}`),
      "-",
    );
    maskedValue = maskedValue.replace(
      new RegExp(`${escapeRegex(numOpts.negationSymbol?.back ?? "")}$`),
      "",
    );
    maskedValue = maskedValue.replace(numOpts.prefix ?? "", "");
    maskedValue = maskedValue.replace(numOpts.suffix ?? "", "");
    maskedValue = maskedValue.replace(
      new RegExp(`${escapeRegex(opts.groupSeparator)}([0-9]{3})`, "g"),
      "$1",
    );
    if (opts.radixPoint === ",") {
      maskedValue = maskedValue.replace(escapeRegex(opts.radixPoint), ".");
    }
    return Number.isFinite(Number(maskedValue));
  },
  onBeforeMask: (initialValue: string, opts: MaskOptions): string => {
    const numOpts = opts as unknown as NumericOptions;
    initialValue = initialValue ?? "";
    const radixPoint = opts.radixPoint || ",";
    if (Number.isFinite(parseInt(opts.digits as string, 10))) {
      opts.digits = parseInt(opts.digits as string, 10);
    }
    if (
      (typeof initialValue === "number" || numOpts.inputType === "number") &&
      radixPoint !== ""
    ) {
      initialValue = initialValue.toString().replace(".", radixPoint);
    }

    const isNegative =
      initialValue.charAt(0) === "-" ||
      initialValue.charAt(0) === (numOpts.negationSymbol?.front ?? "-");
    const valueParts = initialValue.split(radixPoint);
    const integerPart = valueParts[0].replace(/[^\-0-9]/g, "");
    const decimalPart =
      valueParts.length > 1 ? valueParts[1].replace(/[^0-9]/g, "") : "";
    const forceDigits = valueParts.length > 1;

    initialValue =
      integerPart +
      (decimalPart !== "" ? radixPoint + decimalPart : decimalPart);

    let digits = 0;
    if (radixPoint !== "") {
      digits = !numOpts.digitsOptional
        ? (opts.digits as number)
        : (opts.digits as number) < decimalPart.length
          ? (opts.digits as number)
          : decimalPart.length;
      if (decimalPart !== "" || !numOpts.digitsOptional) {
        const digitsFactor = 10 ** (digits || 1);
        initialValue = initialValue.replace(escapeRegex(radixPoint), ".");
        if (!Number.isNaN(parseFloat(initialValue))) {
          initialValue = (
            (numOpts.roundingFN ?? Math.round)(
              parseFloat(initialValue) * digitsFactor,
            ) / digitsFactor
          ).toFixed(digits);
        }
        initialValue = initialValue.toString().replace(".", radixPoint);
      }
    }

    if (opts.digits === 0 && initialValue.indexOf(radixPoint) !== -1) {
      initialValue = initialValue.substring(
        0,
        initialValue.indexOf(radixPoint),
      );
    }

    if (initialValue !== "" && (numOpts.min != null || numOpts.max != null)) {
      const numberValue = initialValue.toString().replace(radixPoint, ".");
      if (
        numOpts.min != null &&
        parseFloat(numberValue) < (numOpts.min as number)
      ) {
        initialValue = (numOpts.min as number)
          .toString()
          .replace(".", radixPoint);
      } else if (
        numOpts.max != null &&
        parseFloat(numberValue) > (numOpts.max as number)
      ) {
        initialValue = (numOpts.max as number)
          .toString()
          .replace(".", radixPoint);
      }
    }

    if (isNegative && initialValue.charAt(0) !== "-") {
      initialValue = `-${initialValue}`;
    }

    return alignDigits(
      initialValue.toString().split(""),
      digits,
      numOpts,
      forceDigits,
    ).join("");
  },
} as AliasDefinition;

/** Currency alias — numeric with grouping */
export const currencyAlias = {
  prefix: "",
  groupSeparator: ",",
  alias: "numeric",
  digits: 2,
  digitsOptional: false,
} as AliasDefinition & NumericOptions;

/** Decimal alias — same as numeric */
export const decimalAlias: AliasDefinition = {
  alias: "numeric",
};

/** Integer alias — numeric with no decimals */
export const integerAlias: AliasDefinition = {
  alias: "numeric",
  inputmode: "numeric",
  digits: 0,
};

/** Percentage alias — 0-100, no minus */
export const percentageAlias = {
  alias: "numeric",
  min: 0,
  max: 100,
  suffix: " %",
  digits: 0,
  allowMinus: false,
} as AliasDefinition & NumericOptions;

/** Indian Numbering System alias */
export const indiannsAlias = {
  alias: "numeric",
  _mask: (opts: NumericOptions) => {
    return (
      "(" +
      (opts.groupSeparator ?? ",") +
      "99){*|1}(" +
      (opts.groupSeparator ?? ",") +
      "999){1|1}"
    );
  },
  groupSeparator: ",",
  radixPoint: ".",
  placeholder: "0",
  digits: 2,
  digitsOptional: false,
} as AliasDefinition & NumericOptions;

/** All numeric aliases */
export const numericAliases: Record<string, AliasDefinition> = {
  numeric: numericAlias,
  currency: currencyAlias,
  decimal: decimalAlias,
  integer: integerAlias,
  percentage: percentageAlias,
  indianns: indiannsAlias,
};
