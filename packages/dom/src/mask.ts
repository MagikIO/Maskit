import {
  createMask,
  getBuffer,
  getBufferTemplate,
  getLastValidPosition,
  isCompleteCore,
  resetMaskSet,
  seekNext,
  clearOptionalTail,
} from "@maskit/core";
import type { CreateMaskOptions } from "@maskit/core";
import type { MaskController, MaskState } from "./types.js";
import { getState, setState, removeState, hasState } from "./state.js";
import {
  patchValueProperty,
  unpatchValueProperty,
  applyInputValue,
} from "./value.js";
import { bindEvents, unbindEvents } from "./event-binding.js";
import { writeBuffer, handleNativePlaceholder } from "./write-buffer.js";
import { setCaret, valueGet } from "./caret.js";

/**
 * Apply an input mask to a DOM element.
 *
 * @param element - The HTMLInputElement to mask
 * @param options - Mask options (same as createMask options)
 * @returns A MaskController for programmatic interaction and cleanup
 */
export function mask(
  element: HTMLInputElement,
  options: CreateMaskOptions,
): MaskController {
  // If already masked, unmask first
  if (hasState(element)) {
    unmask(element);
  }

  const engine = createMask(options);
  const opts = engine.getOptions();
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};
  const isRTL = opts.isRTL || opts.numericInput || false;

  // Check that the element type is supported
  const elementType = element.getAttribute("type");
  const isSupported =
    (element.tagName.toLowerCase() === "input" &&
      opts.supportsInputType.includes(elementType || "text")) ||
    element.isContentEditable ||
    element.tagName.toLowerCase() === "textarea";

  if (!isSupported) {
    return createNoopController(engine, element);
  }

  // Create state
  const state: MaskState = {
    engine,
    opts,
    isRTL,
    originalPlaceholder: element.placeholder || "",
    undoValue: "",
    mouseEnter: false,
    clicked: 0,
    caretPos: { begin: 0, end: 0 },
    isComposing: false,
    skipInputEvent: false,
    skipNextInsert: false,
    refreshValue: false,
    validationEvent: false,
    maxLength: element.maxLength === -1 ? undefined : element.maxLength,
    __valueGet: undefined,
    __valueSet: undefined,
    lastInputEvent: undefined,
  };

  setState(element, state);

  // Patch value property
  patchValueProperty(element, state);

  // Set inputmode
  if (element.getAttribute("inputmode") === null) {
    element.inputMode = opts.inputmode;
    element.setAttribute("inputmode", opts.inputmode);
  }

  // Bind events
  unbindEvents(element); // clean any existing
  bindEvents(element, state);

  // Initialize buffer template
  getBufferTemplate(opts, maskset, defs);

  // Store initial undo value
  state.undoValue = valueGet(element, state, true);

  // Apply initial value
  const root = element.getRootNode() as Document | ShadowRoot;
  const rawValue = valueGet(element, state, true);

  if (
    rawValue !== "" ||
    !opts.clearMaskOnLostFocus ||
    root.activeElement === element
  ) {
    applyInputValue(element, state, rawValue);
    let buffer = getBuffer(opts, maskset, defs).slice();

    const complete = isCompleteCore(
      { opts, maskset, definitions: defs, hasAlternator: false, isRTL },
      buffer,
    );
    if (complete === false && opts.clearIncomplete) {
      resetMaskSet(maskset, false);
    }

    if (opts.clearMaskOnLostFocus && root.activeElement !== element) {
      if (getLastValidPosition(maskset) === -1) {
        buffer = [];
      } else {
        buffer = clearOptionalTail({
          opts,
          maskset,
          definitions: defs,
          hasAlternator: false,
          isRTL,
        });
      }
    }

    if (
      !opts.clearMaskOnLostFocus ||
      (opts.showMaskOnFocus && root.activeElement === element) ||
      rawValue !== ""
    ) {
      writeBuffer(element, state, buffer);
    }

    if (root.activeElement === element) {
      setCaret(
        element,
        seekNext(getLastValidPosition(maskset), opts, maskset, defs),
        undefined,
        state,
      );
    } else {
      setCaret(element, 0, undefined, state);
    }
  }

  return createController(engine, element, state);
}

/**
 * Remove the mask from a DOM element, restoring original behavior.
 */
export function unmask(element: HTMLInputElement): void {
  const state = getState(element);
  if (!state) return;

  unbindEvents(element);
  unpatchValueProperty(element);

  // Restore placeholder
  handleNativePlaceholder(element, state.originalPlaceholder);

  removeState(element);
}

function createController(
  engine: ReturnType<typeof createMask>,
  element: HTMLInputElement,
  state: MaskState,
): MaskController {
  return {
    engine,
    unmaskedValue(): string {
      return engine.getUnmaskedValue();
    },
    value(): string {
      return engine.getValue();
    },
    setValue(value: string): void {
      applyInputValue(element, state, value);
      const opts = engine.getOptions();
      const maskset = engine.getMaskSet();
      const defs = opts.definitions ?? {};
      const buffer = getBuffer(opts, maskset, defs);
      writeBuffer(element, state, buffer);
    },
    destroy(): void {
      unmask(element);
    },
  };
}

function createNoopController(
  engine: ReturnType<typeof createMask>,
  _element: HTMLInputElement,
): MaskController {
  return {
    engine,
    unmaskedValue: () => engine.getUnmaskedValue(),
    value: () => engine.getValue(),
    setValue: (v: string) => engine.setValue(v),
    destroy: () => {},
  };
}
