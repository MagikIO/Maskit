// Public API

export { autoInit } from "./auto-init.js";
// Low-level utilities (for adapter authors)
export {
  getCaret,
  setCaret,
  translatePosition,
  valueGet,
  valueSet,
} from "./caret.js";
export { bindEvents, unbindEvents } from "./event-binding.js";
export { mask, unmask } from "./mask.js";
export { getState, hasState, removeState, setState } from "./state.js";
// Types
export type { MaskController, MaskState } from "./types.js";
export {
  applyInputValue,
  patchValueProperty,
  unpatchValueProperty,
} from "./value.js";
export { handleNativePlaceholder, writeBuffer } from "./write-buffer.js";
