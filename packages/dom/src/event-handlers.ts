import type { CaretPosition, MaskOptions } from "@maskit/core";
import {
  clearOptionalTail,
  getBuffer,
  getBufferTemplate,
  getLastValidPosition,
  getPlaceholder,
  getTest,
  isCompleteCore,
  isMask,
  resetMaskSet,
  seekNext,
  seekPrevious,
} from "@maskit/core";
import { getCaret, setCaret, valueGet, valueSet } from "./caret.js";
import type { MaskState } from "./types.js";
import { applyInputValue } from "./value.js";
import { handleNativePlaceholder, writeBuffer } from "./write-buffer.js";

/**
 * Determine new caret position on click/tab.
 * Port of determineNewCaretPosition from positioning.js.
 */
function determineNewCaretPosition(
  selectedCaret: CaretPosition,
  state: MaskState,
  tabbed?: boolean,
  positionCaretOnClick?: MaskOptions["positionCaretOnClick"],
): CaretPosition | undefined {
  const { opts, engine } = state;
  const maskset = engine.getMaskSet();
  const defs = engine.getOptions().definitions ?? {};

  function doRadixFocus(clickPos: number): boolean {
    if (opts.radixPoint !== "" && opts.digits !== 0) {
      const vps = maskset.validPositions;
      if (vps[clickPos] === undefined || vps[clickPos]?.input === undefined) {
        if (clickPos < seekNext(-1, opts, maskset, defs)) return true;
        const buffer = getBuffer(opts, maskset, defs);
        const radixPos = buffer.indexOf(opts.radixPoint);
        if (radixPos !== -1) {
          for (let vp = 0, vpl = vps.length; vp < vpl; vp++) {
            if (
              vps[vp] &&
              radixPos < vp &&
              vps[vp].input !== getPlaceholder(vp, opts, maskset, defs)
            ) {
              return false;
            }
          }
          return true;
        }
      }
    }
    return false;
  }

  if (tabbed) {
    if (state.isRTL) {
      selectedCaret.end = selectedCaret.begin;
    } else {
      selectedCaret.begin = selectedCaret.end;
    }
  }

  if (selectedCaret.begin === selectedCaret.end) {
    positionCaretOnClick = positionCaretOnClick || opts.positionCaretOnClick;
    switch (positionCaretOnClick) {
      case "none":
        break;
      case "select":
        return { begin: 0, end: getBuffer(opts, maskset, defs).length };
      case "ignore":
        return {
          begin: seekNext(getLastValidPosition(maskset), opts, maskset, defs),
          end: seekNext(getLastValidPosition(maskset), opts, maskset, defs),
        };
      case "radixFocus":
        if (state.clicked > 1 && maskset.validPositions.length === 0) break;
        if (doRadixFocus(selectedCaret.begin)) {
          const radixPos = getBuffer(opts, maskset, defs)
            .join("")
            .indexOf(opts.radixPoint);
          const newEnd = opts.numericInput
            ? seekNext(radixPos, opts, maskset, defs)
            : radixPos;
          return { begin: newEnd, end: newEnd };
        }
      // falls through to lvp
      default: {
        const clickPosition = selectedCaret.begin;
        const lvclickPosition = getLastValidPosition(
          maskset,
          clickPosition,
          true,
        );
        const lastPosition = seekNext(
          lvclickPosition === -1 && !isMask(0, opts, maskset, defs)
            ? -1
            : lvclickPosition,
          opts,
          maskset,
          defs,
        );

        if (clickPosition <= lastPosition) {
          const next = !isMask(clickPosition, opts, maskset, defs, false, true)
            ? seekNext(clickPosition, opts, maskset, defs)
            : clickPosition;
          return { begin: next, end: next };
        } else {
          return { begin: lastPosition, end: lastPosition };
        }
      }
    }
    return selectedCaret;
  }
  return undefined;
}

export function onKeyDown(
  e: KeyboardEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  const { opts, engine } = state;
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};
  const pos = getCaret(input);
  const c = e.key;

  // onKeyDown hook
  const kdResult = opts.onKeyDown(e, getBuffer(opts, maskset, defs), pos, opts);
  if (kdResult !== undefined) return;

  if (
    c === "Backspace" ||
    c === "Delete" ||
    (e.ctrlKey && c === "x" && !("oncut" in input))
  ) {
    e.preventDefault();
    engine.processDelete(c === "Backspace" ? "backspace" : "delete", pos);
    resetMaskSet(maskset, true);
    const buffer = getBuffer(opts, maskset, defs);
    writeBuffer(
      input,
      state,
      buffer,
      maskset.p,
      e,
      valueGet(input, state, true) !== buffer.join(""),
    );
  } else if (c === "End" || c === "PageDown") {
    e.preventDefault();
    const caretPos = seekNext(
      getLastValidPosition(maskset),
      opts,
      maskset,
      defs,
    );
    setCaret(input, e.shiftKey ? pos.begin : caretPos, caretPos, state);
  } else if ((c === "Home" && !e.shiftKey) || c === "PageUp") {
    e.preventDefault();
    setCaret(input, 0, e.shiftKey ? pos.begin : 0, state);
  } else if (opts.undoOnEscape && c === "Escape" && !e.altKey) {
    engine.setValue(state.undoValue);
    const buffer = getBuffer(opts, maskset, defs);
    writeBuffer(input, state, buffer);
    setCaret(input, 0);
  } else if (c === "Insert" && !e.shiftKey && !e.ctrlKey) {
    if (pos.begin !== pos.end) {
      opts.insertMode = !opts.insertMode;
    } else {
      opts.insertMode = !opts.insertMode;
      setCaret(input, pos.begin, pos.begin, state);
    }
  } else if (opts.tabThrough && c === "Tab") {
    handleTab(e, input, state, pos);
  }

  // Mark composition state
  state.isComposing = c === "Process" || c === "Unidentified";
}

function handleTab(
  e: KeyboardEvent,
  input: HTMLInputElement,
  state: MaskState,
  pos: CaretPosition,
): void {
  const { opts } = state;
  const maskset = state.engine.getMaskSet();
  const defs = opts.definitions ?? {};

  if (e.shiftKey) {
    let end = seekPrevious(pos.end, opts, maskset, defs, true);
    if (getTest(end - 1, opts, maskset, defs).match.static) end--;
    const begin = seekPrevious(end, opts, maskset, defs, true);
    if (begin >= 0 && end > 0) {
      e.preventDefault();
      setCaret(input, begin, end, state);
    }
  } else {
    const begin = seekNext(pos.begin, opts, maskset, defs, true);
    let end = seekNext(begin, opts, maskset, defs, true);
    if (end < (maskset.maskLength ?? Infinity)) end--;
    if (begin <= (maskset.maskLength ?? Infinity)) {
      e.preventDefault();
      setCaret(input, begin, end, state);
    }
  }
}

export function onKeyPress(
  e: KeyboardEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  const c = e.key;
  if (!c || c.length > 1) return; // ignore control keys
  if (e.ctrlKey || e.metaKey) {
    // Handle Enter for change event
    if (c === "Enter" && state.undoValue !== valueGet(input, state, true)) {
      state.undoValue = valueGet(input, state, true);
      setTimeout(
        () => input.dispatchEvent(new Event("change", { bubbles: true })),
        0,
      );
    }
    return;
  }

  e.preventDefault();

  const { engine, opts } = state;
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};
  const pos = getCaret(input);

  const result = engine.processInput(c, pos.begin);

  if (result !== false) {
    resetMaskSet(maskset, true);
    const forwardPosition =
      typeof result === "object" && result.caret !== undefined
        ? result.caret
        : seekNext(
            typeof result === "object" && result.pos !== undefined
              ? result.pos
              : pos.begin,
            opts,
            maskset,
            defs,
          );
    maskset.p = forwardPosition;

    const buffer = getBuffer(opts, maskset, defs);
    writeBuffer(input, state, buffer, forwardPosition, e, true);
  }

  setTimeout(() => opts.onKeyValidation(c, result, opts), 0);
}

export function onInput(
  e: InputEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  if (state.skipInputEvent) {
    state.skipInputEvent = false;
    return;
  }

  // Prevent duplicate input between keydown and input event
  if (
    state.lastInputEvent &&
    Date.now() - state.lastInputEvent.time < 10 &&
    state.lastInputEvent.data === e.data
  ) {
    return;
  }
  state.lastInputEvent = { time: Date.now(), data: e.data };

  const { engine, opts } = state;
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};
  const currentValue = valueGet(input, state, true);
  const bufferStr = (
    state.isRTL
      ? getBuffer(opts, maskset, defs).slice().reverse()
      : getBuffer(opts, maskset, defs)
  ).join("");

  if (currentValue !== bufferStr) {
    const caretPos = getCaret(input);

    // Composition handling
    if (
      state.skipNextInsert &&
      e.inputType === "insertText" &&
      state.isComposing
    ) {
      return;
    }
    if (e.inputType === "insertCompositionText" && state.isComposing) {
      state.skipNextInsert = true;
    } else {
      state.skipNextInsert = false;
    }

    // Analyze change type from inputType
    switch (e.inputType) {
      case "insertText":
      case "insertCompositionText":
      case "insertFromPaste":
      case "insertReplacementText":
        if (e.data) {
          // Reset to buffered state, then process each char
          valueSet(input, state, bufferStr, true);
          setCaret(input, caretPos.begin, caretPos.end, state);
          for (const ch of e.data) {
            const keyEvent = new KeyboardEvent("keypress", { key: ch });
            onKeyPress(keyEvent, input, state);
          }
        }
        break;
      case "deleteContentBackward":
        // Restore buffer and process backspace
        valueSet(input, state, bufferStr, true);
        setCaret(input, caretPos.begin, caretPos.end, state);
        onKeyDown(
          new KeyboardEvent("keydown", { key: "Backspace" }),
          input,
          state,
        );
        break;
      case "deleteContentForward":
        valueSet(input, state, bufferStr, true);
        setCaret(input, caretPos.begin, caretPos.end, state);
        onKeyDown(
          new KeyboardEvent("keydown", { key: "Delete" }),
          input,
          state,
        );
        break;
      default:
        // Fallback: re-apply the value
        applyInputValue(input, state, currentValue);
        setCaret(input, caretPos.begin, caretPos.end, state);
        break;
    }

    e.preventDefault();
  }
}

export function onPaste(
  e: ClipboardEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  e.preventDefault();
  const pastedValue = e.clipboardData?.getData("text/plain");
  if (!pastedValue) return;

  const { opts } = state;
  const currentValue = valueGet(input, state, true);
  const caretPos = getCaret(input);

  // Trim template from before/after caret
  const template = state.engine.getTemplate();
  let before = currentValue.substring(0, caretPos.begin);
  let after = currentValue.substring(caretPos.end);
  if (before === template.substring(0, caretPos.begin)) before = "";
  if (after === template.substring(caretPos.end)) after = "";

  let pasteValue = before + pastedValue + after;

  if (typeof opts.onBeforePaste === "function") {
    const processed = opts.onBeforePaste(pasteValue, opts);
    if (processed) pasteValue = processed;
  }

  applyInputValue(input, state, pasteValue);
  // Write back out
  const maskset = state.engine.getMaskSet();
  const defs = opts.definitions ?? {};
  const buffer = getBuffer(opts, maskset, defs);
  writeBuffer(input, state, buffer, maskset.p, e);
}

export function onCut(
  e: ClipboardEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  const { engine, opts } = state;
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};
  const pos = getCaret(input);
  const buffer = getBuffer(opts, maskset, defs);

  const clipData = state.isRTL
    ? buffer.slice(pos.end, pos.begin)
    : buffer.slice(pos.begin, pos.end);
  const clipText = state.isRTL
    ? clipData.reverse().join("")
    : clipData.join("");

  e.clipboardData?.setData("text/plain", clipText);
  e.preventDefault();

  engine.processDelete("delete", pos);
  resetMaskSet(maskset, true);
  writeBuffer(
    input,
    state,
    getBuffer(opts, maskset, defs),
    maskset.p,
    e,
    state.undoValue !== valueGet(input, state, true),
  );
}

export function onFocus(
  _e: FocusEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  const { opts, engine } = state;
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};
  const nptValue = valueGet(input, state);

  if (opts.showMaskOnFocus) {
    const bufferStr = getBuffer(opts, maskset, defs).join("");
    if (nptValue !== bufferStr) {
      const caretPos = seekNext(
        getLastValidPosition(maskset),
        opts,
        maskset,
        defs,
      );
      writeBuffer(input, state, getBuffer(opts, maskset, defs), caretPos);
    }
  }

  if (opts.positionCaretOnTab && !state.mouseEnter) {
    const complete = isCompleteCore(
      {
        opts,
        maskset,
        definitions: defs,
        hasAlternator: false,
        isRTL: state.isRTL,
      },
      getBuffer(opts, maskset, defs),
    );
    if (!complete || getLastValidPosition(maskset) === -1) {
      onClickInternal(input, state, true);
    }
  }

  state.undoValue = valueGet(input, state, true);
}

export function onBlur(
  e: FocusEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  const { opts, engine } = state;
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};
  state.clicked = 0;

  handleNativePlaceholder(input, state.originalPlaceholder);

  let buffer = getBuffer(opts, maskset, defs).slice();
  const nptValue = valueGet(input, state, true);

  if (nptValue !== "") {
    if (opts.clearMaskOnLostFocus) {
      if (
        getLastValidPosition(maskset) === -1 &&
        nptValue === getBufferTemplate(opts, maskset, defs).join("")
      ) {
        buffer = [];
      } else {
        buffer = clearOptionalTail({
          opts,
          maskset,
          definitions: defs,
          hasAlternator: false,
          isRTL: state.isRTL,
        });
      }
    }

    const complete = isCompleteCore(
      {
        opts,
        maskset,
        definitions: defs,
        hasAlternator: false,
        isRTL: state.isRTL,
      },
      buffer,
    );
    if (complete === false) {
      setTimeout(
        () =>
          input.dispatchEvent(new CustomEvent("incomplete", { bubbles: true })),
        0,
      );
      if (opts.clearIncomplete) {
        resetMaskSet(maskset, false);
        buffer = opts.clearMaskOnLostFocus
          ? []
          : getBufferTemplate(opts, maskset, defs).slice();
      }
    }

    writeBuffer(input, state, buffer, undefined, e);
  }

  const newNptValue = valueGet(input, state, true);
  if (state.undoValue !== newNptValue) {
    state.undoValue = newNptValue;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function onClick(
  _e: MouseEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  state.clicked++;
  onClickInternal(input, state);
}

function onClickInternal(
  input: HTMLInputElement,
  state: MaskState,
  tabbed?: boolean,
): void {
  const root = input.getRootNode() as Document | ShadowRoot;
  if (root.activeElement !== input) return;

  const currentCaret = getCaret(input);
  const newPos = determineNewCaretPosition(currentCaret, state, tabbed);
  if (newPos) {
    setCaret(input, newPos.begin, newPos.end, state);
  }
}

export function onMouseEnter(
  _e: MouseEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  state.mouseEnter = true;
  const root = input.getRootNode() as Document | ShadowRoot;
  if (root.activeElement !== input && state.opts.showMaskOnHover) {
    const { opts, engine } = state;
    const maskset = engine.getMaskSet();
    const defs = opts.definitions ?? {};
    const template = (
      state.isRTL
        ? getBufferTemplate(opts, maskset, defs).slice().reverse()
        : getBufferTemplate(opts, maskset, defs)
    ).join("");
    handleNativePlaceholder(input, template);
  }
}

export function onMouseLeave(
  _e: MouseEvent,
  input: HTMLInputElement,
  state: MaskState,
): void {
  state.mouseEnter = false;
  const root = input.getRootNode() as Document | ShadowRoot;
  if (state.opts.clearMaskOnLostFocus && root.activeElement !== input) {
    handleNativePlaceholder(input, state.originalPlaceholder);
  }
}

export function onSubmit(
  _e: Event,
  input: HTMLInputElement,
  state: MaskState,
): void {
  const { opts, engine } = state;
  const maskset = engine.getMaskSet();
  const defs = opts.definitions ?? {};

  if (state.undoValue !== valueGet(input, state, true)) {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  if (
    getLastValidPosition(maskset) === -1 &&
    valueGet(input, state) === getBufferTemplate(opts, maskset, defs).join("")
  ) {
    valueSet(input, state, "");
  }

  if (opts.clearIncomplete) {
    const complete = isCompleteCore(
      {
        opts,
        maskset,
        definitions: defs,
        hasAlternator: false,
        isRTL: state.isRTL,
      },
      getBuffer(opts, maskset, defs),
    );
    if (complete === false) {
      valueSet(input, state, "");
    }
  }

  if (opts.removeMaskOnSubmit) {
    valueSet(input, state, engine.getUnmaskedValue(), true);
    setTimeout(() => {
      writeBuffer(input, state, getBuffer(opts, maskset, defs));
    }, 0);
  }
}

export function onReset(
  _e: Event,
  input: HTMLInputElement,
  state: MaskState,
): void {
  state.refreshValue = true;
  setTimeout(() => {
    applyInputValue(input, state, valueGet(input, state, true));
  }, 0);
}
