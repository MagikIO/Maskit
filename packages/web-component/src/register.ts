import { InputMaskElement } from "./input-mask-element.js";

/**
 * Register the `<input-mask>` custom element.
 *
 * Call this explicitly to define the custom element — importing the package
 * does NOT auto-register (no side effects on import).
 *
 * @param tagName - Custom element tag name (default: `"input-mask"`)
 * @returns The InputMaskElement class that was registered
 *
 * @example
 * ```ts
 * import { register } from '@maskit/web-component';
 * register(); // defines <input-mask>
 * register('masked-input'); // defines <masked-input>
 * ```
 */
export function register(tagName = "input-mask"): typeof InputMaskElement {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, InputMaskElement);
  }
  return InputMaskElement;
}
