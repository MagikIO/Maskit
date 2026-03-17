/**
 * Test simulator for DOM-based mask tests.
 * Port of Inputmask/qunit/simulator.js using native events.
 */

/**
 * Set caret position on an input element.
 */
export function setCaret(
  input: HTMLInputElement,
  begin: number,
  end?: number,
): void {
  input.focus();
  end = end ?? begin;
  input.setSelectionRange(begin, end);
}

/**
 * Get the current caret position.
 */
export function getCaret(input: HTMLInputElement): { begin: number; end: number } {
  return {
    begin: input.selectionStart ?? 0,
    end: input.selectionEnd ?? 0,
  };
}

/**
 * Simulate typing a single key as a user would.
 * Dispatches keydown → keypress-like (via input) → keyup events.
 */
export function sendKey(
  input: HTMLInputElement,
  key: string,
  modifier?: { ctrlKey?: boolean; shiftKey?: boolean },
): void {
  input.focus();

  const opts = {
    key,
    bubbles: true,
    cancelable: true,
    ctrlKey: modifier?.ctrlKey ?? false,
    shiftKey: modifier?.shiftKey ?? false,
  };

  switch (key) {
    case "Home":
      setCaret(input, 0);
      input.dispatchEvent(new KeyboardEvent("keydown", opts));
      return;
    case "End":
      setCaret(input, input.value.length);
      input.dispatchEvent(new KeyboardEvent("keydown", opts));
      return;
    case "ArrowLeft": {
      const pos = getCaret(input);
      setCaret(input, Math.max(0, pos.begin - 1));
      input.dispatchEvent(new KeyboardEvent("keydown", opts));
      return;
    }
    case "ArrowRight": {
      const pos = getCaret(input);
      setCaret(input, Math.min(input.value.length, pos.end + 1));
      input.dispatchEvent(new KeyboardEvent("keydown", opts));
      return;
    }
    case "Backspace":
    case "Delete": {
      // Let the event handler process it
      const kd = new KeyboardEvent("keydown", opts);
      input.dispatchEvent(kd);
      return;
    }
    default: {
      // For inputEventOnly mode, simulate via input event
      if (input.dataset.inputEventOnly === "true") {
        const caretPos = getCaret(input);
        const front = input.value.substring(0, caretPos.begin);
        const back = input.value.substring(caretPos.end);
        // Set value directly using the native setter
        const desc = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(input),
          "value",
        );
        if (desc?.set) {
          desc.set.call(input, front + key + back);
        }
        setCaret(input, front.length + 1);
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: key,
          }),
        );
      } else {
        // Normal flow: keydown dispatches through our handler
        input.dispatchEvent(new KeyboardEvent("keydown", opts));
      }
    }
  }
}

/**
 * Type a string character by character.
 */
export function type(input: HTMLInputElement, str: string): void {
  for (const ch of str) {
    sendKey(input, ch);
  }
}

/**
 * Simulate a paste event.
 */
export function paste(input: HTMLInputElement, text: string): void {
  input.focus();
  const dt = new DataTransfer();
  dt.setData("text/plain", text);
  const pasteEvent = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: dt,
  });
  input.dispatchEvent(pasteEvent);
}

/**
 * Set value programmatically via the custom setvalue event.
 */
export function setValue(input: HTMLInputElement, value: string): void {
  input.dispatchEvent(
    new CustomEvent("setvalue", { detail: value, bubbles: true }),
  );
}
