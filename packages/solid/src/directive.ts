import { mask, unmask } from "@maskit/dom";
import type { MaskController } from "@maskit/dom";
import { createEffect, onCleanup, type Accessor } from "solid-js";
import type { MaskitDirectiveOptions } from "./types.js";

/**
 * SolidJS directive that applies an input mask to an element.
 *
 * @example
 * ```tsx
 * import { maskit } from "@maskit/solid";
 * // Prevent tree-shaking (required for directives)
 * void maskit;
 *
 * <input use:maskit={{ mask: "(999) 999-9999" }} />
 * ```
 *
 * The directive accepts either a static options object or a reactive accessor.
 * When options change reactively, the mask is re-applied.
 */
export function maskit(
  el: HTMLInputElement,
  value: Accessor<MaskitDirectiveOptions>,
): void {
  let controller: MaskController | null = null;

  createEffect(() => {
    const opts = value();

    // Destroy previous mask if options changed
    if (controller) {
      controller.destroy();
      controller = null;
    }

    // Apply the new mask
    controller = mask(el, opts);
  });

  onCleanup(() => {
    if (controller) {
      controller.destroy();
      controller = null;
    }
  });
}
