import type { MaskState } from "./types.js";
import { setCaret, valueSet } from "./caret.js";

/**
 * Write the buffer to the DOM and optionally set caret position.
 * Port of writeBuffer from inputHandling.js — no jQuery dependency.
 */
export function writeBuffer(
  input: HTMLInputElement,
  state: MaskState,
  buffer: string[],
  caretPos?: number,
  event?: Event,
  triggerEvents?: boolean,
): void {
  const opts = state.opts;

  // onBeforeWrite hook
  if (event && typeof opts.onBeforeWrite === "function") {
    const result = opts.onBeforeWrite(event, buffer, caretPos ?? 0, opts);
    if (result) {
      if (result.refreshFromBuffer) {
        const engine = state.engine;
        engine.reset();
        const val = buffer.join("");
        engine.setValue(val);
        buffer = engine.getValue().split("");
      }
      if (result.caret !== undefined) {
        caretPos = result.caret;
      }
    }
  }

  // Write the value to the DOM
  valueSet(input, state, buffer.join(""));

  // Set caret
  if (caretPos !== undefined && (!event || event.type !== "blur")) {
    setCaret(
      input,
      caretPos,
      undefined,
      state,
      event instanceof KeyboardEvent &&
        (event.key === "Delete" || event.key === "Backspace"),
    );
  }

  // Trigger events
  if (triggerEvents) {
    state.skipInputEvent = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const template = state.engine.getTemplate();
    const currentVal = buffer.join("");
    setTimeout(() => {
      if (currentVal === template) {
        input.dispatchEvent(new CustomEvent("cleared", { bubbles: true }));
      } else if (state.engine.isComplete()) {
        input.dispatchEvent(new CustomEvent("complete", { bubbles: true }));
      }
    }, 0);
  }
}

/**
 * Handle the native placeholder attribute.
 * Port of HandleNativePlaceholder — no IE workarounds.
 */
export function handleNativePlaceholder(
  input: HTMLInputElement,
  value: string,
): void {
  if (input.placeholder !== value) {
    input.placeholder = value;
    if (input.placeholder === "") {
      input.removeAttribute("placeholder");
    }
  }
}
