// Public API

// Defaults (for extension authors)
export { defaults } from "./defaults.js";
export { defaultDefinitions } from "./definitions.js";
export type { CreateMaskOptions } from "./engine.js";
export {
  createMask,
  defineAlias,
  defineDefinition,
  format,
  getAliases,
  getDefinitions,
  isValidStatic as isValid,
  unformat,
} from "./engine.js";
// Low-level utilities (for extension authors)
export { escapeRegex } from "./escape-regex.js";
export { keyCode, keys } from "./keycode.js";
export { analyseMask, generateMaskSet } from "./mask-lexer.js";
export { createMaskToken } from "./mask-token.js";
export {
  determineTestTemplate,
  getBuffer,
  getBufferTemplate,
  getDecisionTaker,
  getLastValidPosition,
  getMaskTemplate,
  getPlaceholder,
  getTest,
  getTests,
  getTestTemplate,
  isMask,
  isSubsetOf,
  resetMaskSet,
  seekNext,
  seekPrevious,
} from "./test-resolver.js";
// Types
export type {
  AliasDefinition,
  CaretPosition,
  CommandObject,
  MaskDefinition,
  MaskEngine,
  MaskInput,
  MaskOptions,
  MaskSet,
  MaskToken,
  TestMatch,
  TestResult,
  ValidationResult,
  ValidatorFn,
  ValidPosition,
  WriteResult,
} from "./types.js";
export {
  alternate,
  checkAlternationMatch,
  checkVal,
  clearOptionalTail,
  handleRemove,
  isComplete as isCompleteCore,
  isValid as isValidCore,
  revalidateMask,
  unmaskedvalue,
} from "./validation.js";

// ---- Date ----
export type { DateOptions, DateParts } from "./datetime.js";
export {
  createDatetimeAlias,
  dateAliases,
  datetimeAlias,
  isDateInRange,
  isValidDate,
  pad,
  parseDateFormat,
} from "./datetime.js";
export type { DateI18n } from "./i18n.js";
export { defaultI18n } from "./i18n.js";

// ---- Numeric ----
export type { NumericOptions } from "./numeric.js";
export {
  alignDigits,
  currencyAlias,
  decimalAlias,
  decimalValidator,
  genMask,
  indiannsAlias,
  integerAlias,
  numericAlias,
  numericAliases,
  percentageAlias,
} from "./numeric.js";

// ---- Extensions ----
export {
  cssunitAlias,
  emailAlias,
  extensionAliases,
  ipAlias,
  macAlias,
  ssnAlias,
  urlAlias,
  vinAlias,
} from "./extension-aliases.js";
export {
  extensionDefinitions,
  hexDefinition,
  upperAlphaDefinition,
  upperAlphanumericDefinition,
} from "./extension-definitions.js";

// ---- Registration helpers ----
import { defineAlias, defineDefinition } from "./engine.js";
import { dateAliases } from "./datetime.js";
import { numericAliases } from "./numeric.js";
import { extensionAliases } from "./extension-aliases.js";
import { extensionDefinitions } from "./extension-definitions.js";

/**
 * Register all date aliases into the global registry.
 * Call once at app startup.
 */
export function registerDate(): void {
  for (const [name, alias] of Object.entries(dateAliases)) {
    defineAlias(name, alias);
  }
}

/**
 * Register all numeric aliases into the global registry.
 * Call once at app startup.
 */
export function registerNumeric(): void {
  for (const [name, alias] of Object.entries(numericAliases)) {
    defineAlias(name, alias);
  }
}

/**
 * Register all extension definitions and aliases into the global registry.
 * Call once at app startup.
 */
export function registerExtensions(): void {
  for (const [name, def] of Object.entries(extensionDefinitions)) {
    defineDefinition(name, def);
  }
  for (const [name, alias] of Object.entries(extensionAliases)) {
    defineAlias(name, alias);
  }
}

/**
 * Register all built-in aliases and definitions (date, numeric, extensions).
 * Convenience function — call once at app startup.
 */
export function registerAll(): void {
  registerDate();
  registerNumeric();
  registerExtensions();
}
