import type { CreateMaskOptions } from "@magik_io/maskit-core";
import type { MaskController } from "@magik_io/maskit-dom";
import type { JSX } from "solid-js";

/** Options accepted by the `use:maskit` directive */
export type MaskitDirectiveOptions = CreateMaskOptions;

/** Props for the `<MaskedInput>` component */
export interface MaskedInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "ref"> {
  /** Mask options passed to `@magik_io/maskit-dom` `mask()` */
  options: MaskitDirectiveOptions;
  /** Callback receiving the MaskController after the mask is applied */
  onController?: (controller: MaskController) => void;
  /** Ref callback for the underlying input element */
  ref?: (el: HTMLInputElement) => void;
}

// Extend Solid's JSX namespace so `use:maskit` is recognized
declare module "solid-js" {
  namespace JSX {
    interface Directives {
      maskit: MaskitDirectiveOptions;
    }
  }
}
