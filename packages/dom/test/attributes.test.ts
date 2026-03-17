/**
 * Ported from Inputmask/qunit/tests_attributes.js
 * Tests data-attribute-driven mask configuration.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { autoInit, unmask } from "../src/index.js";
import { type } from "./helpers/simulator.js";

let container: HTMLDivElement;
let input: HTMLInputElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  input = document.createElement("input");
  input.type = "text";
  container.appendChild(input);
});

afterEach(() => {
  unmask(input);
  container.remove();
});

describe("Attribute options — DOM", () => {
  it("data-maskit='[9-]AAA-999' — type abc123", () => {
    input.setAttribute("data-maskit", "[9-]AAA-999");
    autoInit(container);
    input.focus();
    type(input, "abc123");
    expect(input.value).toContain("AAA");
    expect(input.value).toContain("23");
  });

  it("data-maskit='9999' — basic digit mask from attribute", () => {
    input.setAttribute("data-maskit", "9999");
    autoInit(container);
    input.focus();
    type(input, "1234");
    expect(input.value).toBe("1234");
  });
});
