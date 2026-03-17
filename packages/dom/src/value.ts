import { valueGet, valueSet } from "./caret.js";
import type { MaskState } from "./types.js";

/**
 * Patch the element's `value` property to intercept get/set.
 * Uses Object.defineProperty on the instance to override the prototype getter/setter.
 * Drops jQuery valHooks and IE __lookupGetter__ paths entirely.
 */
export function patchValueProperty(
  input: HTMLInputElement,
  state: MaskState,
): void {
  if (state.opts.noValuePatching) return;
  if (state.__valueGet) return; // already patched

  const proto = Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");

  if (descriptor?.get && descriptor?.set) {
    state.__valueGet = descriptor.get;
    state.__valueSet = descriptor.set;

    Object.defineProperty(input, "value", {
      get(this: HTMLInputElement): string {
        const s = state;
        if (s.opts.autoUnmask) {
          return s.engine.getUnmaskedValue();
        }
        const raw = valueGet(this, s, true);
        // If nullable and no valid positions, return empty
        const maskset = s.engine.getMaskSet();
        const hasValid = maskset.validPositions.some((vp) => vp != null);
        if (!hasValid && s.opts.nullable) {
          return "";
        }
        return raw;
      },
      set(this: HTMLInputElement, value: string) {
        // Call native setter then apply mask
        state.__valueSet!.call(this, value);
        applyInputValue(this, state, value);
      },
      configurable: true,
    });
  } else {
    // Fallback for contenteditable or non-input elements
    state.__valueGet = function (this: HTMLInputElement) {
      return this.textContent ?? "";
    };
    state.__valueSet = function (this: HTMLInputElement, v: string) {
      this.textContent = v;
    };
  }
}

/**
 * Remove the value property patch, restoring native behavior.
 */
export function unpatchValueProperty(input: HTMLInputElement): void {
  // Simply delete the instance override — the prototype getter/setter will be exposed again
  const descriptor = Object.getOwnPropertyDescriptor(input, "value");
  if (descriptor && descriptor.configurable) {
    delete (input as unknown as Record<string, unknown>)["value"];
  }
}

/**
 * Apply a value to a masked input — processes through the engine and writes to DOM.
 */
export function applyInputValue(
  input: HTMLInputElement,
  state: MaskState,
  value: string,
): void {
  state.refreshValue = false;
  const processed =
    typeof state.opts.onBeforeMask === "function"
      ? state.opts.onBeforeMask(value, state.opts) || value
      : value;

  state.engine.setValue(processed);
  state.undoValue = valueGet(input, state, true);

  // If clearMaskOnLostFocus and value equals template and no valid positions, clear
  const maskset = state.engine.getMaskSet();
  const hasValid = maskset.validPositions.some((vp) => vp != null);
  if (
    (state.opts.clearMaskOnLostFocus || state.opts.clearIncomplete) &&
    state.engine.getValue() === state.engine.getTemplate() &&
    !hasValid
  ) {
    valueSet(input, state, "");
  }
}
