# @maskit/dom

DOM integration layer for Maskit. Binds the headless `@maskit/core` engine to `<input>` elements with full keyboard, clipboard, caret, and form event handling.

## Installation

```bash
npm install @maskit/dom @maskit/core
# or
pnpm add @maskit/dom @maskit/core
```

## Usage

### `mask()` — Apply a Mask to an Input

```ts
import { mask } from "@maskit/dom";

const input = document.querySelector<HTMLInputElement>("#phone");
const controller = mask(input, { mask: "(999) 999-9999" });

// Read values
controller.value();          // → "(123) 456-7890"
controller.unmaskedValue();  // → "1234567890"

// Set values programmatically
controller.setValue("9876543210");

// Access the underlying engine
controller.engine.isComplete(); // → true

// Remove mask and clean up
controller.destroy();
```

### `MaskController`

| Method | Returns | Description |
|--------|---------|-------------|
| `value()` | `string` | Current masked value |
| `unmaskedValue()` | `string` | Current unmasked (raw) value |
| `setValue(value)` | `void` | Set a new value programmatically |
| `destroy()` | `void` | Remove mask, unbind events, restore input |
| `engine` | `MaskEngine` | Access to the underlying headless engine |

### `unmask()` — Remove a Mask

```ts
import { unmask } from "@maskit/dom";

unmask(input); // unbinds events, restores value property, removes state
```

### Auto-init via Data Attributes

```html
<input data-maskit="(999) 999-9999" />
<input data-maskit="99/99/9999" data-maskit-placeholder="#" />
<input data-maskit-alias="email" />
```

```ts
import { autoInit } from "@maskit/dom";

// Scan document for [data-maskit] elements
autoInit();

// Or scan a specific container
autoInit(document.querySelector("#form-container"));
```

**Supported attributes:**

| Attribute | Description |
|-----------|-------------|
| `data-maskit` | Mask pattern string |
| `data-maskit-alias` | Alias name |
| `data-maskit-placeholder` | Placeholder character |

## How It Works

### Value Interception

When a mask is applied, `@maskit/dom` intercepts the input's `.value` property via `Object.defineProperty` on the element instance:

- **Getter**: Returns the unmasked value if `autoUnmask` is enabled, or the masked value otherwise. Returns `""` for nullable empty masks.
- **Setter**: Pipes the new value through the mask engine before writing to the DOM.

This means frameworks and form libraries that read `input.value` get the correct value transparently.

### Event Handling

The DOM package handles these events automatically:

| Event | Behavior |
|-------|----------|
| `keydown` | Processes Backspace, Delete, Escape (undo), Insert (toggle mode), Tab, Home/End |
| `input` | Handles IME composition, mobile keyboards, insertText, deleteContent |
| `paste` | Processes clipboard data through `onBeforePaste` hook |
| `cut` | Copies selection to clipboard, processes delete |
| `focus` | Shows mask template (if `showMaskOnFocus`), positions caret |
| `blur` | Clears mask template (if `clearMaskOnLostFocus`), validates completeness |
| `click` | Positions caret based on `positionCaretOnClick` strategy |
| `mouseenter/leave` | Shows/hides mask template (if `showMaskOnHover`) |
| `submit` | Handles `removeMaskOnSubmit` / `autoUnmask` |
| `reset` | Resets engine and buffer |

### State Management

All per-element state is stored in `WeakMap`s — no properties are added to DOM elements:

```ts
import { getState, hasState } from "@maskit/dom";

if (hasState(input)) {
  const state = getState(input);
  console.log(state.engine.getValue());
}
```

## DOM-Specific Options

These options are relevant when using `@maskit/dom` (they have no effect in headless mode):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showMaskOnFocus` | `boolean` | `true` | Show mask template when input gains focus |
| `showMaskOnHover` | `boolean` | `true` | Show mask template on mouse hover |
| `clearMaskOnLostFocus` | `boolean` | `true` | Clear template text on blur if empty |
| `clearIncomplete` | `boolean` | `false` | Clear value on blur if mask is not complete |
| `removeMaskOnSubmit` | `boolean` | `false` | Strip mask from value on form submission |
| `autoUnmask` | `boolean` | `false` | `.value` getter returns unmasked value |
| `positionCaretOnClick` | `string` | `"lvp"` | Caret strategy: `"lvp"`, `"radixFocus"`, `"select"`, `"ignore"`, `"none"` |
| `positionCaretOnTab` | `boolean` | `true` | Position caret on Tab focus |
| `undoOnEscape` | `boolean` | `true` | Restore previous value on Escape |
| `tabThrough` | `boolean` | `false` | Allow Tab to advance through mask sections |

## Caret Utilities

```ts
import { getCaret, setCaret } from "@maskit/dom";

const { begin, end } = getCaret(input);
setCaret(input, 5); // move caret to position 5
setCaret(input, 2, 8); // select positions 2–8
```

## License

MIT
