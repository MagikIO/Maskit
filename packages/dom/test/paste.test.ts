/**
 * Ported from Inputmask/qunit/tests_paste.js
 * Tests paste event handling in masked inputs.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mask, unmask } from "../src/index.js";
import { paste, setCaret } from "./helpers/simulator.js";

let input: HTMLInputElement;

beforeEach(() => {
  input = document.createElement("input");
  input.type = "text";
  document.body.appendChild(input);
});

afterEach(() => {
  unmask(input);
  input.remove();
});

describe("Paste value — DOM", () => {
  it("+7 (999) 999-99-99 — paste +79114041112", () => {
    mask(input, { mask: "+7 (999) 999-99-99" });
    input.focus();
    paste(input, "+79114041112");
    expect(input.value).toBe("+7 (911) 404-11-12");
  });

  it("+31 9999999999 — paste 3112345678", () => {
    mask(input, { mask: "+31 9999999999" });
    input.focus();
    paste(input, "3112345678");
    expect(input.value).toContain("+31");
  });

  it("02.999.999 — paste 02.024.900", () => {
    mask(input, { mask: "99.999.999" });
    input.focus();
    paste(input, "02024900");
    expect(input.value).toBe("02.024.900");
  });

  it("(999) 999-9999 — paste phone number", () => {
    mask(input, { mask: "(999) 999-9999" });
    input.focus();
    paste(input, "5551234567");
    expect(input.value).toBe("(555) 123-4567");
  });

  it("99/99/9999 — paste date", () => {
    mask(input, { mask: "99/99/9999" });
    input.focus();
    paste(input, "12252023");
    expect(input.value).toBe("12/25/2023");
  });

  it("+3719{8} — paste 27000000", () => {
    mask(input, { mask: "+3719{8}" });
    input.focus();
    setCaret(input, 4);
    paste(input, "27000000");
    expect(input.value).toContain("+371");
    expect(input.value).toContain("27000000");
  });

  it("*{1,64}[.*{1,64}][.*{1,64}]@domain.com — paste construct", () => {
    mask(input, { mask: "*{1,64}[.*{1,64}][.*{1,64}]@domainname.com" });
    input.focus();
    paste(input, "construct");
    expect(input.value).toContain("construct");
  });
});
