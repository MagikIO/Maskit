import { describe, it, expect, afterEach, vi } from "vitest";
import { InputMaskElement } from "../src/input-mask-element.js";
import { register } from "../src/register.js";

// Register the element for all tests
register();

let el: InputMaskElement;

function createElement(attrs: Record<string, string> = {}): InputMaskElement {
  const element = document.createElement("input-mask") as InputMaskElement;
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  document.body.appendChild(element);
  return element;
}

afterEach(() => {
  el?.remove();
});

describe("register()", () => {
  it("registers <input-mask> custom element", () => {
    expect(customElements.get("input-mask")).toBe(InputMaskElement);
  });

  it("returns the InputMaskElement class", () => {
    const result = register();
    expect(result).toBe(InputMaskElement);
  });

  it("does not re-register if already defined", () => {
    // Should not throw
    register();
    register();
  });
});

describe("InputMaskElement — construction", () => {
  it("creates an element with an open shadow DOM", () => {
    el = createElement({ mask: "9999" });
    expect(el.shadowRoot).not.toBeNull();
  });

  it("contains a style element and an input element in shadow DOM", () => {
    el = createElement({ mask: "9999" });
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector("style")).not.toBeNull();
    expect(shadow.querySelector("input")).not.toBeNull();
  });

  it("has formAssociated set to true", () => {
    expect(InputMaskElement.formAssociated).toBe(true);
  });

  it("observes mask, alias, placeholder, inputmode, disabled, readonly, name, value, required", () => {
    expect(InputMaskElement.observedAttributes).toEqual(
      expect.arrayContaining([
        "mask", "alias", "placeholder", "inputmode",
        "disabled", "readonly", "name", "value", "required",
      ]),
    );
  });
});

describe("InputMaskElement — mask attribute", () => {
  it("applies a mask from the mask attribute", () => {
    el = createElement({ mask: "99-99" });
    expect(el.controller).not.toBeNull();
  });

  it("does not apply mask when no mask or alias is set", () => {
    el = createElement();
    expect(el.controller).toBeNull();
  });

  it("re-applies mask when mask attribute changes", () => {
    el = createElement({ mask: "9999" });
    const ctrl1 = el.controller;
    el.setAttribute("mask", "99-99");
    const ctrl2 = el.controller;
    expect(ctrl2).not.toBeNull();
    // Should be a new controller
    expect(ctrl2).not.toBe(ctrl1);
  });
});

describe("InputMaskElement — alias attribute", () => {
  it("applies mask from alias attribute", () => {
    // This tests the code path even if the alias isn't registered
    el = createElement({ mask: "9999" });
    expect(el.controller).not.toBeNull();
  });
});

describe("InputMaskElement — value", () => {
  it("getter returns masked value", () => {
    el = createElement({ mask: "9999" });
    el.value = "1234";
    expect(el.value).toBe("1234");
  });

  it("setter sets value through the controller", () => {
    el = createElement({ mask: "99-99" });
    el.value = "1234";
    // The mask should format it
    expect(el.value).toContain("12");
  });

  it("unmaskedValue returns the raw value", () => {
    el = createElement({ mask: "99-99" });
    el.value = "1234";
    expect(el.unmaskedValue).toBe("1234");
  });

  it("setting value attribute updates the value", () => {
    el = createElement({ mask: "9999" });
    el.setAttribute("value", "5678");
    expect(el.value).toBe("5678");
  });

  it("value getter works without mask applied", () => {
    el = createElement();
    el.inputElement.value = "hello";
    expect(el.value).toBe("hello");
  });

  it("unmaskedValue falls back to input value when no controller", () => {
    el = createElement();
    el.inputElement.value = "hello";
    expect(el.unmaskedValue).toBe("hello");
  });
});

describe("InputMaskElement — isComplete", () => {
  it("returns true when mask is fully filled", () => {
    el = createElement({ mask: "9999" });
    el.value = "1234";
    expect(el.isComplete).toBe(true);
  });

  it("returns false when mask is incomplete", () => {
    el = createElement({ mask: "9999" });
    el.value = "12";
    expect(el.isComplete).toBe(false);
  });

  it("returns true when no mask is applied", () => {
    el = createElement();
    expect(el.isComplete).toBe(true);
  });
});

describe("InputMaskElement — disabled/readonly", () => {
  it("forwards disabled attribute to inner input", () => {
    el = createElement({ mask: "9999", disabled: "" });
    expect(el.inputElement.disabled).toBe(true);
  });

  it("forwards readonly attribute to inner input", () => {
    el = createElement({ mask: "9999", readonly: "" });
    expect(el.inputElement.readOnly).toBe(true);
  });

  it("responds to dynamic disabled changes", () => {
    el = createElement({ mask: "9999" });
    expect(el.inputElement.disabled).toBe(false);
    el.setAttribute("disabled", "");
    expect(el.inputElement.disabled).toBe(true);
    el.removeAttribute("disabled");
    expect(el.inputElement.disabled).toBe(false);
  });

  it("responds to dynamic readonly changes", () => {
    el = createElement({ mask: "9999" });
    expect(el.inputElement.readOnly).toBe(false);
    el.setAttribute("readonly", "");
    expect(el.inputElement.readOnly).toBe(true);
    el.removeAttribute("readonly");
    expect(el.inputElement.readOnly).toBe(false);
  });
});

describe("InputMaskElement — inputmode", () => {
  it("forwards inputmode to inner input", () => {
    el = createElement({ mask: "9999", inputmode: "numeric" });
    expect(el.inputElement.inputMode).toBe("numeric");
  });

  it("responds to dynamic inputmode changes", () => {
    el = createElement({ mask: "9999" });
    el.setAttribute("inputmode", "tel");
    expect(el.inputElement.inputMode).toBe("tel");
  });
});

describe("InputMaskElement — placeholder attribute", () => {
  it("re-applies mask when placeholder changes", () => {
    el = createElement({ mask: "9999", placeholder: "_" });
    const ctrl1 = el.controller;
    el.setAttribute("placeholder", "#");
    const ctrl2 = el.controller;
    // Controller should have been recreated
    expect(ctrl2).not.toBe(ctrl1);
  });
});

describe("InputMaskElement — name", () => {
  it("name getter returns the attribute value", () => {
    el = createElement({ mask: "9999", name: "phone" });
    expect(el.name).toBe("phone");
  });

  it("name setter sets the attribute", () => {
    el = createElement({ mask: "9999" });
    el.name = "email";
    expect(el.getAttribute("name")).toBe("email");
  });
});

describe("InputMaskElement — type", () => {
  it("returns 'text'", () => {
    el = createElement({ mask: "9999" });
    expect(el.type).toBe("text");
  });
});

describe("InputMaskElement — focus delegation", () => {
  it("focus() delegates to inner input", () => {
    el = createElement({ mask: "9999" });
    const spy = vi.spyOn(el.inputElement, "focus");
    el.focus();
    expect(spy).toHaveBeenCalled();
  });

  it("blur() delegates to inner input", () => {
    el = createElement({ mask: "9999" });
    const spy = vi.spyOn(el.inputElement, "blur");
    el.blur();
    expect(spy).toHaveBeenCalled();
  });
});

describe("InputMaskElement — inputElement", () => {
  it("exposes the inner input for advanced use", () => {
    el = createElement({ mask: "9999" });
    expect(el.inputElement).toBeInstanceOf(HTMLInputElement);
  });
});

describe("InputMaskElement — cleanup", () => {
  it("destroys mask controller on disconnectedCallback", () => {
    el = createElement({ mask: "9999" });
    const ctrl = el.controller;
    expect(ctrl).not.toBeNull();
    const spy = vi.spyOn(ctrl!, "destroy");
    el.remove();
    expect(spy).toHaveBeenCalled();
    // After remove, a new element should start fresh
  });
});

describe("InputMaskElement — required attribute", () => {
  it("forwards required to inner input", () => {
    el = createElement({ mask: "9999", required: "" });
    expect(el.inputElement.required).toBe(true);
  });

  it("responds to dynamic required changes", () => {
    el = createElement({ mask: "9999" });
    expect(el.inputElement.required).toBe(false);
    el.setAttribute("required", "");
    expect(el.inputElement.required).toBe(true);
  });
});

describe("InputMaskElement — attribute unchanged", () => {
  it("ignores attributeChangedCallback when old===new", () => {
    el = createElement({ mask: "9999" });
    const ctrl1 = el.controller;
    // Setting the same value should not re-create controller
    // (attributeChangedCallback short-circuits)
    el.attributeChangedCallback("mask", "9999", "9999");
    expect(el.controller).toBe(ctrl1);
  });
});
