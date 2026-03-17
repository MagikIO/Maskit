/** WeakMap-based element state storage — replaces jQuery's $.data() */
import type { MaskState } from "./types.js";

const elementState = new WeakMap<HTMLElement, MaskState>();

export function getState(el: HTMLElement): MaskState | undefined {
  return elementState.get(el);
}

export function setState(el: HTMLElement, state: MaskState): void {
  elementState.set(el, state);
}

export function removeState(el: HTMLElement): void {
  elementState.delete(el);
}

export function hasState(el: HTMLElement): boolean {
  return elementState.has(el);
}
