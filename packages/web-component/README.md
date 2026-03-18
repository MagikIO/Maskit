# @maskit/web-component

A form-associated `<input-mask>` custom element for Maskit. Provides input masking as a drop-in Web Component with shadow DOM encapsulation and native form integration.

## Installation

```bash
npm install @maskit/web-component @magik_io/maskit-core @magik_io/maskit-dom
# or
pnpm add @maskit/web-component @magik_io/maskit-core @magik_io/maskit-dom
```

## Usage

### Register the Element

```ts
import { register } from "@maskit/web-component";

register(); // Registers <input-mask> custom element
```

Or with a custom tag name:

```ts
register("masked-input"); // Registers <masked-input>
```

### Basic Usage

```html
<input-mask mask="(999) 999-9999"></input-mask>
<input-mask mask="99/99/9999" placeholder="MM/DD/YYYY"></input-mask>
<input-mask alias="email"></input-mask>
```

### JavaScript API

```ts
const el = document.querySelector("input-mask");

// Read values
el.value;          // → "(123) 456-7890" (masked)
el.unmaskedValue;  // → "1234567890"
el.isComplete;     // → true

// Set values
el.value = "9876543210"; // Formatted through the mask

// Access the controller
el.controller;       // → MaskController instance
el.inputElement;     // → inner <input> element

// Focus management
el.focus();
el.blur();
```

### Reactive Attributes

The mask re-applies automatically when observed attributes change:

```ts
el.setAttribute("mask", "99-99-99"); // Mask updates
el.setAttribute("alias", "ip");      // Switch to IP alias
```

## Attributes

| Attribute | Description |
|-----------|-------------|
| `mask` | Mask pattern string |
| `alias` | Alias name (e.g. `"email"`, `"ip"`) |
| `placeholder` | Placeholder character |
| `inputmode` | Input mode hint (forwarded to inner input) |
| `disabled` | Disables the input |
| `readonly` | Makes the input read-only |
| `name` | Form field name |
| `value` | Initial or current value |
| `required` | Marks the field as required |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `value` | `string` | Get/set the masked value |
| `unmaskedValue` | `string` (readonly) | The raw unmasked value |
| `isComplete` | `boolean` (readonly) | Whether all required positions are filled |
| `controller` | `MaskController \| null` (readonly) | The underlying mask controller |
| `inputElement` | `HTMLInputElement` (readonly) | The inner `<input>` element |

## Form Association

`<input-mask>` is a [form-associated custom element](https://web.dev/articles/more-capable-form-controls), which means it works natively with `<form>` elements:

```html
<form id="my-form">
  <input-mask name="phone" mask="(999) 999-9999" required></input-mask>
  <button type="submit">Submit</button>
</form>

<script>
  document.getElementById("my-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    console.log(data.get("phone")); // → unmasked value
  });
</script>
```

### Form APIs

| Method/Property | Description |
|----------------|-------------|
| `form` | The owning `<form>` element (or `null`) |
| `name` | Form field name |
| `type` | Always `"text"` |
| `validity` | `ValidityState` object |
| `validationMessage` | Validation error message |
| `willValidate` | Whether the element participates in validation |
| `checkValidity()` | Returns `true` if constraints are satisfied |
| `reportValidity()` | Shows validation UI and returns `true`/`false` |

### Validation States

The element reports these validation states:

- **`valueMissing`**: When `required` is set and the value is empty
- **`patternMismatch`**: When the mask is not complete

## Shadow DOM

The element uses an **open** shadow DOM containing:

- A `<style>` element with default styling
- A `<input type="text">` element

The inner input inherits the host's font and fills the container by default:

```css
/* Default shadow DOM styles */
:host { display: inline-block; }
input {
  font: inherit;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  margin: 0;
  width: 100%;
  color: inherit;
}
```

### Styling

Style the outer element like any inline-block element:

```css
input-mask {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 16px;
  width: 200px;
}

input-mask:focus-within {
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
}
```

To style the inner input, use the `::part` pseudo-element or CSS custom properties depending on your needs, or access `el.inputElement` directly.

## API

### `register(tagName?)`

Registers the `<input-mask>` custom element. Safe to call multiple times (idempotent).

- **`tagName`** (optional, default: `"input-mask"`): The custom element tag name.
- **Returns**: The `InputMaskElement` class.

### `InputMaskElement`

The custom element class. Can be imported for `instanceof` checks or subclassing:

```ts
import { InputMaskElement } from "@maskit/web-component";

const el = document.querySelector("input-mask");
console.log(el instanceof InputMaskElement); // → true
```

## License

MIT
