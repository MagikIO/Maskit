// Public API
export {
  createMask,
  format,
  unformat,
  isValidStatic as isValid,
  defineAlias,
  defineDefinition,
  getAliases,
  getDefinitions,
} from "./engine.js";
export type { CreateMaskOptions } from "./engine.js";

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
  ValidPosition,
  ValidationResult,
  WriteResult,
} from "./types.js";

// Defaults (for extension authors)
export { defaults } from "./defaults.js";
export { defaultDefinitions } from "./definitions.js";

// Low-level utilities (for extension authors)
export { escapeRegex } from "./escape-regex.js";
export { keyCode, keys } from "./keycode.js";
export { generateMaskSet, analyseMask } from "./mask-lexer.js";
export { createMaskToken } from "./mask-token.js";
export {
  getTests,
  getTest,
  getTestTemplate,
  getMaskTemplate,
  getPlaceholder,
  determineTestTemplate,
  getDecisionTaker,
  isSubsetOf,
  getLastValidPosition,
  seekNext,
  seekPrevious,
  isMask,
  resetMaskSet,
  getBuffer,
  getBufferTemplate,
} from "./test-resolver.js";
export {
  isValid as isValidCore,
  isComplete as isCompleteCore,
  revalidateMask,
  alternate,
  handleRemove,
  checkAlternationMatch,
  checkVal,
  unmaskedvalue,
  clearOptionalTail,
} from "./validation.js";
