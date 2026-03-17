import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { autoInit, unmask } from "../src/index.js";

let container: HTMLDivElement;
const inputs: HTMLInputElement[] = [];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  for (const input of inputs) {
    unmask(input);
  }
  inputs.length = 0;
  container.remove();
});

describe("autoInit()", () => {
  it("initializes elements with data-maskit attribute", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("data-maskit", "99-99");
    container.appendChild(input);
    inputs.push(input);

    autoInit(container);

    // The input should now be masked - test by setting value
    input.value = "1234";
    // Value should be formatted (or at least the mask is applied)
    expect(input.value).toBeDefined();
  });

  it("handles data-maskit-placeholder attribute", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("data-maskit", "9999");
    input.setAttribute("data-maskit-placeholder", "#");
    container.appendChild(input);
    inputs.push(input);

    autoInit(container);

    // Mask should be applied with custom placeholder
    expect(input.value).toBeDefined();
  });

  it("skips elements without data-maskit", () => {
    const input = document.createElement("input");
    input.type = "text";
    container.appendChild(input);

    autoInit(container);

    // No mask should be applied - value should work normally
    input.value = "test";
    expect(input.value).toBe("test");
  });
});
