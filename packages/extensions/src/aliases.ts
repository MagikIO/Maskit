import type { AliasDefinition, MaskOptions, MaskSet, ValidationResult } from "@maskit/core";
import { getMaskTemplate, getLastValidPosition, defaultDefinitions } from "@maskit/core";

const ipValidatorRegex = /25[0-5]|2[0-4][0-9]|[01][0-9][0-9]/;

function ipValidator(
  chrs: string,
  maskset: MaskSet,
  pos: number,
  _strict: boolean,
  opts: MaskOptions,
): boolean | { refreshFromBuffer: boolean; buffer: string[]; caret: number } {
  if (pos - 1 > -1 && maskset.buffer?.[pos - 1] !== ".") {
    chrs = maskset.buffer![pos - 1] + chrs;
    if (pos - 2 > -1 && maskset.buffer![pos - 2] !== ".") {
      chrs = maskset.buffer![pos - 2] + chrs;
    } else {
      chrs = "0" + chrs;
    }
  } else {
    chrs = "00" + chrs;
  }

  if (
    opts?.greedy &&
    parseInt(chrs) > 255 &&
    ipValidatorRegex.test("00" + chrs.charAt(2))
  ) {
    const buffer = [...(maskset.buffer?.slice(0, pos) ?? []), ".", chrs.charAt(2)];
    if ((buffer.join("").match(/\./g) ?? []).length < 4) {
      return {
        refreshFromBuffer: true,
        buffer,
        caret: pos + 2,
      };
    }
  }
  return ipValidatorRegex.test(chrs);
}

/** IP address alias: `i{1,3}.j{1,3}.k{1,3}.l{1,3}` */
export const ipAlias: AliasDefinition = {
  mask: "i{1,3}.j{1,3}.k{1,3}.l{1,3}",
  definitions: {
    i: { validator: ipValidator as unknown as string },
    j: { validator: ipValidator as unknown as string },
    k: { validator: ipValidator as unknown as string },
    l: { validator: ipValidator as unknown as string },
  },
  onUnMask: (maskedValue: string) => maskedValue,
  inputmode: "decimal",
  substitutes: { ",": "." },
};

/** CSS unit alias: optional sign, digits, optional decimal, unit */
export const cssunitAlias: AliasDefinition = {
  regex: "[+-]?[0-9]+\\.?([0-9]+)?(px|em|rem|ex|%|in|cm|mm|pt|pc)",
};

/** URL alias */
export const urlAlias: AliasDefinition = {
  regex: "(https?|ftp)://.*",
  autoUnmask: false,
  keepStatic: false,
  tabThrough: true,
};

/** Email alias */
export const emailAlias: AliasDefinition = {
  mask: ((opts: MaskOptions & { separator?: string | null; quantifier?: number }) => {
    const separator = opts.separator ?? null;
    const quantifier = opts.quantifier ?? 5;
    const emailMask =
      "*{1,64}[.*{1,64}][.*{1,64}][.*{1,63}]@-{1,63}.-{1,63}[.-{1,63}][.-{1,63}]";
    let mask = emailMask;
    if (separator) {
      for (let i = 0; i < quantifier; i++) {
        mask += `[${separator}${emailMask}]`;
      }
    }
    return mask;
  }) as (opts: MaskOptions) => string,
  greedy: false,
  casing: "lower",
  skipOptionalPartCharacter: "",
  onBeforePaste: (pastedValue: string) => {
    return pastedValue.toLowerCase().replace("mailto:", "");
  },
  definitions: {
    "*": {
      validator:
        "[0-9\uFF11-\uFF19A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5!#$%&'*+/=?^_`{|}~-]",
    },
    "-": {
      validator: "[0-9A-Za-z-]",
    },
  },
  onUnMask: (maskedValue: string) => maskedValue,
  inputmode: "email",
};

/** MAC address alias: `##:##:##:##:##:##` */
export const macAlias: AliasDefinition = {
  mask: "##:##:##:##:##:##",
};

/** VIN (Vehicle Identification Number) alias */
export const vinAlias: AliasDefinition = {
  mask: "V{13}9{4}",
  definitions: {
    V: {
      validator: "[A-HJ-NPR-Za-hj-npr-z\\d]",
      casing: "upper",
    },
  },
  clearIncomplete: true,
  autoUnmask: true,
};

/** SSN (Social Security Number) alias */
export const ssnAlias: AliasDefinition = {
  mask: "999-99-9999",
  postValidation: (
    buffer: string[],
    _pos: number,
    _c: string,
    _currentResult: ValidationResult,
    opts: MaskOptions,
    maskset: MaskSet,
  ): boolean => {
    const defs = { ...defaultDefinitions, ...opts.definitions };
    const bffr = getMaskTemplate(
      opts,
      maskset,
      defs,
      true,
      getLastValidPosition(maskset),
      true,
    );
    return /^(?!219-09-9999|078-05-1120)(?!666|000|9.{2}).{3}-(?!00).{2}-(?!0{4}).{4}$/.test(
      bffr.join(""),
    );
  },
};

/** All extension aliases */
export const extensionAliases: Record<string, AliasDefinition> = {
  ip: ipAlias,
  cssunit: cssunitAlias,
  url: urlAlias,
  email: emailAlias,
  mac: macAlias,
  vin: vinAlias,
  ssn: ssnAlias,
};
