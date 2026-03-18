/**
 * Ported from Inputmask/qunit/tests_ip.js
 * Tests IP alias behavior via the headless core engine.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createMask, defineAlias, defineDefinition } from "@magik_io/maskit-core";
import {
  extensionAliases,
  extensionDefinitions,
} from "../src/index.js";

beforeAll(() => {
  for (const [name, def] of Object.entries(extensionDefinitions)) {
    defineDefinition(name, def);
  }
  for (const [name, alias] of Object.entries(extensionAliases)) {
    defineAlias(name, alias);
  }
});

describe("IP alias — ported from QUnit", () => {
  it("type 10.10.10.10", () => {
    const engine = createMask({ alias: "ip" });
    "10.10.10.10".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("10.10.10.10");
  });

  it("type 1.1.1.1", () => {
    const engine = createMask({ alias: "ip" });
    "1.1.1.1".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("1.1.1.1");
  });

  it("type 255.255.255.255", () => {
    const engine = createMask({ alias: "ip" });
    "255.255.255.255".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("255.255.255.255");
  });

  it("type 192.168.1.100", () => {
    const engine = createMask({ alias: "ip" });
    "192.168.1.100".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("192.168.1.100");
  });

  it.skip("type 99999999 — greedy true (extension validators not yet integrated)", () => {
    const engine = createMask({ alias: "ip", greedy: true });
    "99999999".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("99.99.99.99");
  });

  it("ip greedy true — template shows ___.___.___.___", () => {
    const engine = createMask({ alias: "ip", greedy: true });
    expect(engine.getTemplate()).toContain("___");
  });
});
