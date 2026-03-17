import type { MaskController } from "@maskit/dom";
import { mask } from "@maskit/dom";
import { createEffect, onCleanup, splitProps } from "solid-js";
import type { MaskedInputProps } from "./types.js";

/**
 * A SolidJS component that renders a masked `<input>`.
 *
 * @example
 * ```tsx
 * import { MaskedInput } from "@maskit/solid";
 *
 * <MaskedInput
 *   options={{ mask: "99/99/9999" }}
 *   placeholder="DD/MM/YYYY"
 *   onController={(ctrl) => console.log(ctrl.unmaskedValue())}
 * />
 * ```
 */
export function MaskedInput(props: MaskedInputProps) {
  const [local, inputProps] = splitProps(props, [
    "options",
    "onController",
    "ref",
  ]);

  let controller: MaskController | null = null;
  let inputEl: HTMLInputElement | undefined;

  function setRef(el: HTMLInputElement) {
    inputEl = el;
    local.ref?.(el);
  }

  createEffect(() => {
    if (!inputEl) return;
    const opts = local.options;

    // Destroy previous mask if options changed
    if (controller) {
      controller.destroy();
      controller = null;
    }

    controller = mask(inputEl, opts);
    local.onController?.(controller);
  });

  onCleanup(() => {
    if (controller) {
      controller.destroy();
      controller = null;
    }
  });

  return <input ref={setRef} {...inputProps} />;
}
