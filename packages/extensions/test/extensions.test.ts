import { describe, it, expect } from "vitest";
import { createMask, defineAlias, defineDefinition } from "@maskit/core";
import {
  extensionAliases,
  extensionDefinitions,
  ipAlias,
  emailAlias,
  macAlias,
  vinAlias,
  ssnAlias,
  cssunitAlias,
  urlAlias,
} from "../src/index.js";

// Register all extension aliases and definitions before tests
for (const [name, def] of Object.entries(extensionDefinitions)) {
  defineDefinition(name, def);
}
for (const [name, alias] of Object.entries(extensionAliases)) {
  defineAlias(name, alias);
}

describe("@maskit/extensions — IP alias", () => {
  it("formats 10.10.10.10", () => {
    const engine = createMask({ alias: "ip" });
    "10.10.10.10".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("10.10.10.10");
  });

  it("formats 1.1.1.1", () => {
    const engine = createMask({ alias: "ip" });
    "1.1.1.1".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("1.1.1.1");
  });

  it("formats 255.255.255.255", () => {
    const engine = createMask({ alias: "ip" });
    "255.255.255.255".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("255.255.255.255");
  });

  it("formats 192.168.1.100", () => {
    const engine = createMask({ alias: "ip" });
    "192.168.1.100".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue().replace(/_/g, "")).toBe("192.168.1.100");
  });

  it("alias is exported correctly", () => {
    expect(ipAlias).toBeDefined();
    expect(ipAlias.mask).toBe("i{1,3}.j{1,3}.k{1,3}.l{1,3}");
  });
});

describe("@maskit/extensions — Email alias", () => {
  it("alias is exported correctly", () => {
    expect(emailAlias).toBeDefined();
    expect(typeof emailAlias.mask).toBe("function");
  });

  it("has email-specific definitions", () => {
    expect(emailAlias.definitions).toBeDefined();
    expect(emailAlias.definitions!["*"]).toBeDefined();
    expect(emailAlias.definitions!["-"]).toBeDefined();
  });

  it("lowercases on paste via onBeforePaste", () => {
    const fn = emailAlias.onBeforePaste as (v: string, opts: unknown) => string;
    expect(fn("USER@EXAMPLE.COM", {})).toBe("user@example.com");
  });

  it("strips mailto: prefix on paste", () => {
    const fn = emailAlias.onBeforePaste as (v: string, opts: unknown) => string;
    expect(fn("mailto:user@test.com", {})).toBe("user@test.com");
  });
});

describe("@maskit/extensions — MAC alias", () => {
  it("uses ## separators", () => {
    expect(macAlias.mask).toBe("##:##:##:##:##:##");
  });

  it("accepts hex chars via engine", () => {
    const engine = createMask({ alias: "mac" });
    "AA:BB:CC:DD:EE:FF".split("").forEach((ch) => engine.processInput(ch));
    expect(engine.getValue()).toBe("AA:BB:CC:DD:EE:FF");
  });
});

describe("@maskit/extensions — VIN alias", () => {
  it("has correct mask structure", () => {
    expect(vinAlias.mask).toBe("V{13}9{4}");
  });

  it("uppercases input", () => {
    expect(vinAlias.definitions!["V"]!.casing).toBe("upper");
  });

  it("excludes I, O, Q characters", () => {
    expect(vinAlias.definitions!["V"]!.validator).toBe("[A-HJ-NPR-Za-hj-npr-z\\d]");
  });
});

describe("@maskit/extensions — SSN alias", () => {
  it("has correct mask", () => {
    expect(ssnAlias.mask).toBe("999-99-9999");
  });

  it("has postValidation", () => {
    expect(ssnAlias.postValidation).toBeDefined();
  });
});

describe("@maskit/extensions — CSS unit alias", () => {
  it("uses regex", () => {
    expect(cssunitAlias.regex).toBeDefined();
  });
});

describe("@maskit/extensions — URL alias", () => {
  it("uses regex", () => {
    expect(urlAlias.regex).toBeDefined();
  });
});

describe("@maskit/extensions — Extra definitions", () => {
  it("defines A (uppercase alpha)", () => {
    expect(extensionDefinitions["A"]).toBeDefined();
    expect(extensionDefinitions["A"].casing).toBe("upper");
  });

  it("defines & (uppercase alphanumeric)", () => {
    expect(extensionDefinitions["&"]).toBeDefined();
    expect(extensionDefinitions["&"].casing).toBe("upper");
  });

  it("defines # (hexadecimal)", () => {
    expect(extensionDefinitions["#"]).toBeDefined();
    expect(extensionDefinitions["#"].casing).toBe("upper");
  });
});
