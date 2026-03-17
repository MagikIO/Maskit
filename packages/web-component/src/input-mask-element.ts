import type { CreateMaskOptions } from "@maskit/core";
import type { MaskController } from "@maskit/dom";
import { mask } from "@maskit/dom";

/** Attributes that can be set declaratively on <input-mask> */
export interface InputMaskElementAttributes {
  mask: string;
  alias: string;
  placeholder: string;
  inputmode: string;
  disabled: string;
  readonly: string;
  name: string;
  value: string;
  required: string;
}

const STYLE = /* css */ `
  :host {
    display: inline-block;
  }
  input {
    font: inherit;
    color: inherit;
    border: none;
    outline: none;
    padding: 0;
    margin: 0;
    background: transparent;
    width: 100%;
    box-sizing: border-box;
  }
`;

/**
 * `<input-mask>` custom element.
 *
 * Wraps an `<input>` in an open shadow DOM and applies a mask via `@maskit/dom`.
 * Participates in native forms via `ElementInternals`.
 *
 * @example
 * ```html
 * <input-mask mask="(999) 999-9999" placeholder="_"></input-mask>
 * ```
 */
export class InputMaskElement extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes(): string[] {
    return [
      "mask",
      "alias",
      "placeholder",
      "inputmode",
      "disabled",
      "readonly",
      "name",
      "value",
      "required",
    ];
  }

  readonly #internals: ElementInternals;
  readonly #input: HTMLInputElement;
  #controller: MaskController | null = null;
  #connected = false;

  constructor() {
    super();

    this.#internals = this.attachInternals();

    const shadow = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    this.#input = document.createElement("input");
    this.#input.type = "text";
    shadow.appendChild(this.#input);
  }

  // ── Lifecycle ──────────────────────────────────────────

  connectedCallback(): void {
    this.#connected = true;

    // Forward relevant attributes to the inner input
    this.#syncInputAttributes();

    // Apply the mask if we have enough config
    this.#applyMask();

    // Sync form value on input
    this.#input.addEventListener("input", this.#onInput);
  }

  disconnectedCallback(): void {
    this.#connected = false;
    this.#input.removeEventListener("input", this.#onInput);
    this.#destroyMask();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    switch (name) {
      case "mask":
      case "alias":
      case "placeholder":
        // Re-apply the mask with the updated options
        if (this.#connected) {
          this.#applyMask();
        }
        break;
      case "inputmode":
        this.#input.inputMode = newValue ?? "";
        break;
      case "disabled":
        this.#input.disabled = newValue !== null;
        break;
      case "readonly":
        this.#input.readOnly = newValue !== null;
        break;
      case "name":
        // name is reflected for form association but the inner input doesn't need it
        break;
      case "value":
        this.value = newValue ?? "";
        break;
      case "required":
        this.#input.required = newValue !== null;
        this.#internals.ariaRequired = newValue !== null ? "true" : "false";
        break;
    }
  }

  // ── Form association ───────────────────────────────────

  /** Provides the unmasked value to the containing form */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  get name(): string {
    return this.getAttribute("name") ?? "";
  }

  set name(value: string) {
    this.setAttribute("name", value);
  }

  get type(): string {
    return "text";
  }

  get validity(): ValidityState {
    return this.#internals.validity;
  }

  get validationMessage(): string {
    return this.#internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.#internals.willValidate;
  }

  checkValidity(): boolean {
    return this.#internals.checkValidity();
  }

  reportValidity(): boolean {
    return this.#internals.reportValidity();
  }

  // ── Value accessors ────────────────────────────────────

  get value(): string {
    if (this.#controller) {
      return this.#controller.value();
    }
    return this.#input.value;
  }

  set value(val: string) {
    if (this.#controller) {
      this.#controller.setValue(val);
    } else {
      this.#input.value = val;
    }
    this.#syncFormValue();
  }

  /** Get the unmasked value */
  get unmaskedValue(): string {
    if (this.#controller) {
      return this.#controller.unmaskedValue();
    }
    return this.#input.value;
  }

  /** Get the underlying MaskController (null if no mask applied) */
  get controller(): MaskController | null {
    return this.#controller;
  }

  /** Get the underlying input element (for advanced use) */
  get inputElement(): HTMLInputElement {
    return this.#input;
  }

  /** Check if the current mask is complete */
  get isComplete(): boolean {
    if (this.#controller) {
      return this.#controller.engine.isComplete() === true;
    }
    return true;
  }

  // Focus delegation
  focus(options?: FocusOptions): void {
    this.#input.focus(options);
  }

  blur(): void {
    this.#input.blur();
  }

  // ── Private ────────────────────────────────────────────

  #onInput = (): void => {
    this.#syncFormValue();
  };

  #syncFormValue(): void {
    const val = this.unmaskedValue;

    // ElementInternals form APIs may not be available in all environments (e.g. jsdom)
    if (typeof this.#internals.setFormValue === "function") {
      this.#internals.setFormValue(val);
    }

    if (typeof this.#internals.setValidity === "function") {
      // Validate completeness
      if (this.hasAttribute("required") && !val) {
        this.#internals.setValidity(
          { valueMissing: true },
          "Please fill out this field.",
          this.#input,
        );
      } else if (this.#controller && !this.isComplete) {
        this.#internals.setValidity(
          { patternMismatch: true },
          "Please complete the masked input.",
          this.#input,
        );
      } else {
        this.#internals.setValidity({});
      }
    }
  }

  #syncInputAttributes(): void {
    const inputMode = this.getAttribute("inputmode");
    if (inputMode) this.#input.inputMode = inputMode;

    if (this.hasAttribute("disabled")) this.#input.disabled = true;
    if (this.hasAttribute("readonly")) this.#input.readOnly = true;
    if (this.hasAttribute("required")) this.#input.required = true;
  }

  #buildMaskOptions(): CreateMaskOptions | null {
    const maskAttr = this.getAttribute("mask");
    const aliasAttr = this.getAttribute("alias");

    // Need at least a mask or alias to do anything
    if (!maskAttr && !aliasAttr) return null;

    const opts: CreateMaskOptions = {};
    if (maskAttr) opts.mask = maskAttr;
    if (aliasAttr) opts.alias = aliasAttr;

    const placeholderAttr = this.getAttribute("placeholder");
    if (placeholderAttr !== null) opts.placeholder = placeholderAttr;

    return opts;
  }

  #applyMask(): void {
    this.#destroyMask();

    const opts = this.#buildMaskOptions();
    if (!opts) return;

    // Preserve current value before masking
    const currentValue = this.#input.value;

    this.#controller = mask(this.#input, opts);

    // Re-apply value if the element had content
    if (currentValue) {
      this.#controller.setValue(currentValue);
    }

    this.#syncFormValue();
  }

  #destroyMask(): void {
    if (this.#controller) {
      this.#controller.destroy();
      this.#controller = null;
    }
  }
}
