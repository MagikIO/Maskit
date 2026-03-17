// Public API
export { mask, unmask } from "./mask.js";
export { autoInit } from "./auto-init.js";

// Types
export type { MaskController, MaskState } from "./types.js";

// Low-level utilities (for adapter authors)
export { getCaret, setCaret, translatePosition, valueGet, valueSet } from "./caret.js";
export { writeBuffer, handleNativePlaceholder } from "./write-buffer.js";
export { patchValueProperty, unpatchValueProperty, applyInputValue } from "./value.js";
export { bindEvents, unbindEvents } from "./event-binding.js";
export { getState, setState, removeState, hasState } from "./state.js";
