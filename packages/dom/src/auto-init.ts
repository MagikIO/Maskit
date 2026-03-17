import { mask } from "./mask.js";
import type { CreateMaskOptions } from "@maskit/core";

/**
 * Auto-initialize input masks on elements with `data-maskit` attributes.
 * This is opt-in — calling `autoInit()` scans the DOM and applies masks.
 * No side effects on import.
 *
 * Recognized attributes:
 * - `data-maskit` — the mask pattern (e.g. "99/99/9999")
 * - `data-maskit-alias` — alias name
 * - `data-maskit-placeholder` — placeholder character
 *
 * @param root - The root element to scan (defaults to document)
 */
export function autoInit(root?: ParentNode): void {
  const container = root ?? document;
  const elements =
    container.querySelectorAll<HTMLInputElement>("[data-maskit]");
  elements.forEach((el) => {
    const maskValue = el.getAttribute("data-maskit");
    if (!maskValue) return;

    const options: CreateMaskOptions = {
      mask: maskValue,
    };

    const alias = el.getAttribute("data-maskit-alias");
    if (alias) options.alias = alias;

    const placeholder = el.getAttribute("data-maskit-placeholder");
    if (placeholder) options.placeholder = placeholder;

    mask(el, options);
  });
}
