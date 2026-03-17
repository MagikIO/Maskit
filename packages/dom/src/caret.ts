import type { CaretPosition } from "@maskit/core";
import type { MaskState } from "./types.js";

/**
 * Get or set the caret position on an input element.
 * Ported from positioning.js caret() — simplified for modern browsers.
 * Drops IE createTextRange, __lookupGetter__ paths.
 */
export function getCaret(input: HTMLInputElement): CaretPosition {
  return {
    begin: input.selectionStart ?? 0,
    end: input.selectionEnd ?? 0,
  };
}

export function setCaret(
  input: HTMLInputElement,
  begin: number,
  end?: number,
  state?: MaskState,
  isDelete?: boolean,
): void {
  end = end ?? begin;

  // Track caret internally
  if (state) {
    state.caretPos = { begin, end };

    // Visual insert/overwrite mode
    if (
      state.opts.insertModeVisual &&
      state.opts.insertMode === false &&
      begin === end &&
      !isDelete
    ) {
      end++;
    }
  }

  // Only set if element is the active element in its root
  const root = input.getRootNode() as Document | ShadowRoot;
  if (root.activeElement === input) {
    input.setSelectionRange(begin, end);
  }
}

/**
 * Translate position for RTL inputs.
 */
export function translatePosition(
  pos: number,
  state: MaskState,
  input: HTMLInputElement,
): number {
  if (
    state.isRTL &&
    typeof pos === "number" &&
    (!state.opts.greedy || state.opts.placeholder !== "")
  ) {
    const valueLength = valueGet(input, state).length;
    pos = valueLength - pos;
    if (pos < 0) pos = 0;
  }
  return pos;
}

/**
 * Get the raw DOM value (bypassing our patched getter).
 */
export function valueGet(
  input: HTMLInputElement,
  state: MaskState,
  overruleRTL?: boolean,
): string {
  const raw = state.__valueGet ? state.__valueGet.call(input) : input.value;
  if (state.isRTL && overruleRTL !== true) {
    return raw.split("").reverse().join("");
  }
  return raw;
}

/**
 * Set the raw DOM value (bypassing our patched setter).
 */
export function valueSet(
  input: HTMLInputElement,
  state: MaskState,
  value: string,
  overruleRTL?: boolean,
): void {
  const val =
    value === null || value === undefined
      ? ""
      : overruleRTL !== true && state.isRTL
        ? value.split("").reverse().join("")
        : value;
  if (state.__valueSet) {
    state.__valueSet.call(input, val);
  } else {
    input.value = val;
  }
}
