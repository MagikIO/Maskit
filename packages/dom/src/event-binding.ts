import { getBuffer } from "@maskit/core";
import {
  onBlur,
  onClick,
  onCut,
  onFocus,
  onInput,
  onKeyDown,
  onKeyPress,
  onMouseEnter,
  onMouseLeave,
  onPaste,
  onReset,
  onSubmit,
} from "./event-handlers.js";
import type { MaskState } from "./types.js";
import { writeBuffer } from "./write-buffer.js";

/**
 * Bound event handler registry per element — uses WeakMap.
 * Tracks all listeners so they can be cleanly removed on unmask.
 */
const boundHandlers = new WeakMap<
  HTMLElement,
  Array<{
    target: EventTarget;
    event: string;
    handler: EventListener;
  }>
>();

function addHandler(
  el: HTMLElement,
  target: EventTarget,
  event: string,
  handler: EventListener,
): void {
  target.addEventListener(event, handler);
  let list = boundHandlers.get(el);
  if (!list) {
    list = [];
    boundHandlers.set(el, list);
  }
  list.push({ target, event, handler });
}

/**
 * Bind all mask-related event listeners to an input element.
 * Port of EventRuler.on() + mask() event binding — pure native addEventListener.
 */
export function bindEvents(input: HTMLInputElement, state: MaskState): void {
  const opts = state.opts;

  function isBlocked(e: Event): boolean {
    if (input.disabled) return true;
    if (input.readOnly && !["submit", "reset"].includes(e.type)) return true;
    return false;
  }

  // Keyboard events
  if (opts.inputEventOnly !== true) {
    addHandler(input, input, "keydown", (e: Event) => {
      if (isBlocked(e)) {
        e.preventDefault();
        return;
      }
      const ke = e as KeyboardEvent;
      onKeyDown(ke, input, state);
      // Process printable characters
      if (
        ke.key &&
        ke.key.length === 1 &&
        !ke.ctrlKey &&
        !ke.metaKey &&
        !ke.altKey &&
        !ke.defaultPrevented
      ) {
        onKeyPress(ke, input, state);
      }
    });
  }

  // Input event — fallback for IME, mobile, and inputEventOnly mode
  addHandler(input, input, "input", (e: Event) => {
    if (isBlocked(e)) {
      e.preventDefault();
      return;
    }
    onInput(e as InputEvent, input, state);
  });

  // Clipboard
  addHandler(input, input, "paste", (e: Event) => {
    if (isBlocked(e)) {
      e.preventDefault();
      return;
    }
    onPaste(e as ClipboardEvent, input, state);
  });

  addHandler(input, input, "cut", (e: Event) => {
    if (isBlocked(e)) {
      e.preventDefault();
      return;
    }
    onCut(e as ClipboardEvent, input, state);
  });

  // Focus — delayed for Chrome caret positioning
  addHandler(input, input, "focus", (e: Event) => {
    setTimeout(() => {
      if (!boundHandlers.has(input)) return;
      onFocus(e as FocusEvent, input, state);
    }, 0);
  });

  // Blur
  addHandler(input, input, "blur", (e: Event) => {
    if (isBlocked(e)) return;
    onBlur(e as FocusEvent, input, state);
  });

  // Click — delayed for selection stability
  addHandler(input, input, "click", (e: Event) => {
    setTimeout(() => {
      if (!boundHandlers.has(input)) return;
      onClick(e as MouseEvent, input, state);
    }, 0);
  });

  // Mouse enter/leave
  addHandler(input, input, "mouseenter", (e: Event) => {
    onMouseEnter(e as MouseEvent, input, state);
  });

  addHandler(input, input, "mouseleave", (e: Event) => {
    onMouseLeave(e as MouseEvent, input, state);
  });

  // Form events
  const form = input.form;
  if (form) {
    addHandler(input, form, "submit", (e: Event) => {
      onSubmit(e, input, state);
    });

    addHandler(input, form, "reset", (e: Event) => {
      onReset(e, input, state);
    });
  }

  // Custom setValue event (for programmatic value setting)
  addHandler(input, input, "setvalue", (e: Event) => {
    if (isBlocked(e)) return;
    const customEvent = e as CustomEvent;
    const value: string = customEvent.detail ?? input.value;
    state.engine.setValue(typeof value === "string" ? value : String(value));
    const o = state.engine.getOptions();
    const maskset = state.engine.getMaskSet();
    const defs = o.definitions ?? {};
    const buffer = getBuffer(o, maskset, defs);
    writeBuffer(input, state, buffer);
  });
}

/**
 * Remove all mask-related event listeners from an element.
 */
export function unbindEvents(input: HTMLInputElement): void {
  const list = boundHandlers.get(input);
  if (list) {
    for (const { target, event, handler } of list) {
      target.removeEventListener(event, handler);
    }
    boundHandlers.delete(input);
  }
}
