import type { MaskDefinition } from "@maskit/core";

/** Uppercase alpha (including Cyrillic and Latin extended) */
export const upperAlphaDefinition: MaskDefinition = {
  validator: "[A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]",
  casing: "upper",
};

/** Uppercase alphanumeric */
export const upperAlphanumericDefinition: MaskDefinition = {
  validator:
    "[0-9A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]",
  casing: "upper",
};

/** Hexadecimal definition */
export const hexDefinition: MaskDefinition = {
  validator: "[0-9A-Fa-f]",
  casing: "upper",
};

/** Extra definitions provided by the extensions package */
export const extensionDefinitions: Record<string, MaskDefinition> = {
  A: upperAlphaDefinition,
  "&": upperAlphanumericDefinition,
  "#": hexDefinition,
};
