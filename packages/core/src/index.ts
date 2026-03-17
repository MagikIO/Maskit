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
