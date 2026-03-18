import type { CaretPosition, MaskEngine, MaskOptions } from "@magik_io/maskit-core";

/** State stored per masked element via WeakMap */
export interface MaskState {
  engine: MaskEngine;
  opts: MaskOptions;
  isRTL: boolean;
  originalPlaceholder: string;
  undoValue: string;
  mouseEnter: boolean;
  clicked: number;
  caretPos: CaretPosition;
  isComposing: boolean;
  skipInputEvent: boolean;
  skipNextInsert: boolean;
  refreshValue: boolean;
  validationEvent: boolean;
  maxLength: number | undefined;
  /** Native value getter (before patching) */
  __valueGet: (() => string) | undefined;
  /** Native value setter (before patching) */
  __valueSet: ((v: string) => void) | undefined;
  lastInputEvent: { time: number; data: string | null } | undefined;
}

/** Controller returned by mask() */
export interface MaskController {
  /** Get the underlying MaskEngine */
  engine: MaskEngine;
  /** Get the current unmasked value */
  unmaskedValue(): string;
  /** Get the current masked value */
  value(): string;
  /** Set a value programmatically */
  setValue(value: string): void;
  /** Remove the mask and restore the element */
  destroy(): void;
}
