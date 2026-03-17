import { describe, it, expect } from "vitest";
import { analyseMask, generateMaskSet } from "../src/mask-lexer.js";
import { defaults } from "../src/defaults.js";
import { defaultDefinitions } from "../src/definitions.js";
import type { MaskOptions, MaskToken, TestMatch } from "../src/types.js";

function makeOpts(overrides?: Partial<MaskOptions>): MaskOptions {
  return { ...defaults, ...overrides } as MaskOptions;
}

describe("analyseMask — parser", () => {
  it("parses simple numeric mask '99-99'", () => {
    const opts = makeOpts({ mask: "99-99" });
    const tokens = analyseMask("99-99", false, opts, defaultDefinitions);
    expect(tokens).toHaveLength(1);
    const root = tokens[0];
    // Should produce 4 matches: 9, 9, -, 9, 9
    expect(root.matches).toHaveLength(5);
    // First match is a non-static digit
    const first = root.matches[0] as TestMatch;
    expect(first.static).toBe(false);
    // definitionSymbol is "*" for 9, so def = "*"
    expect(first.def).toBe("*");
    expect(first.nativeDef).toBe("9");
    expect(first.fn).toBeInstanceOf(RegExp);
    // Third match is static '-'
    const dash = root.matches[2] as TestMatch;
    expect(dash.static).toBe(true);
    expect(dash.def).toBe("-");
  });

  it("parses mask with alpha definitions 'aa-aa'", () => {
    const opts = makeOpts({ mask: "aa-aa" });
    const tokens = analyseMask("aa-aa", false, opts, defaultDefinitions);
    const root = tokens[0];
    const first = root.matches[0] as TestMatch;
    expect(first.static).toBe(false);
    // definitionSymbol is "*" for a, so def = "*"
    expect(first.def).toBe("*");
    expect(first.nativeDef).toBe("a");
    expect(first.fn).toBeTruthy();
  });

  it("parses wildcard mask '*****'", () => {
    const opts = makeOpts({ mask: "*****" });
    const tokens = analyseMask("*****", false, opts, defaultDefinitions);
    const root = tokens[0];
    expect(root.matches).toHaveLength(5);
    (root.matches as TestMatch[]).forEach((m) => {
      expect(m.static).toBe(false);
      expect(m.def).toBe("*");
    });
  });

  it("parses optional section '[99]'", () => {
    const opts = makeOpts({ mask: "99[99]" });
    const tokens = analyseMask("99[99]", false, opts, defaultDefinitions);
    const root = tokens[0];
    // Should have: 9, 9, optional-group(9,9)
    expect(root.matches.length).toBeGreaterThanOrEqual(3);
    const optGroup = root.matches[2] as MaskToken;
    expect(optGroup.isOptional).toBe(true);
  });

  it("parses alternation 'a|9'", () => {
    const opts = makeOpts({ mask: "(a|9)" });
    const tokens = analyseMask("(a|9)", false, opts, defaultDefinitions);
    const root = tokens[0];
    // Should contain an alternator
    const hasAlternator = root.matches.some(
      (m) => "isAlternator" in m && (m as MaskToken).isAlternator,
    );
    expect(hasAlternator).toBe(true);
  });

  it("parses quantifier '{2,4}'", () => {
    const opts = makeOpts({ mask: "9{2,4}" });
    const tokens = analyseMask("9{2,4}", false, opts, defaultDefinitions);
    const root = tokens[0];
    const hasQuantifier = root.matches.some(
      (m) => "isQuantifier" in m && (m as MaskToken).isQuantifier,
    );
    expect(hasQuantifier).toBe(true);
    const qt = root.matches.find(
      (m) => "isQuantifier" in m && (m as MaskToken).isQuantifier,
    ) as MaskToken;
    expect(qt.quantifier.min).toBe(2);
    expect(qt.quantifier.max).toBe(4);
  });

  it("parses escape character", () => {
    const opts = makeOpts({ mask: "\\99" });
    const tokens = analyseMask("\\99", false, opts, defaultDefinitions);
    const root = tokens[0];
    // First should be static '9' (escaped), second should be non-static 9
    const first = root.matches[0] as TestMatch;
    expect(first.static).toBe(true);
    expect(first.nativeDef).toBe("'9");
    const second = root.matches[1] as TestMatch;
    expect(second.static).toBe(false);
  });

  it("parses phone mask '(999) 999-9999'", () => {
    const opts = makeOpts({ mask: "(999) 999-9999" });
    const tokens = analyseMask(
      "(999) 999-9999",
      false,
      opts,
      defaultDefinitions,
    );
    expect(tokens).toHaveLength(1);
    // Group with static parens and digits
    const root = tokens[0];
    expect(root.matches.length).toBeGreaterThan(0);
  });

  it("parses regex mask", () => {
    // regex masks need to go through generateMaskSet which resolves regex → mask
    const opts = makeOpts({ mask: null, regex: "[0-9]{3}" });
    const ms = generateMaskSet(opts, defaultDefinitions, {});
    expect(ms.maskToken).toBeDefined();
    expect(ms.maskToken.length).toBeGreaterThan(0);
  });
});

describe("generateMaskSet", () => {
  it("generates mask set from string mask", () => {
    const opts = makeOpts({ mask: "99/99/9999" });
    const ms = generateMaskSet(opts, defaultDefinitions, {});
    expect(ms.mask).toBe("99/99/9999");
    expect(ms.maskToken).toBeDefined();
    expect(ms.maskToken.length).toBeGreaterThan(0);
    expect(ms.validPositions).toEqual([]);
  });

  it("generates mask set from array mask", () => {
    const opts = makeOpts({
      mask: ["999-999", "999-999-999"],
    });
    const ms = generateMaskSet(opts, defaultDefinitions, {});
    // Array masks get combined into alternation
    expect(ms.maskToken).toBeDefined();
  });

  it("uses cache for repeated masks", () => {
    const cache = new Map();
    const opts = makeOpts({ mask: "99-99" });
    const ms1 = generateMaskSet(opts, defaultDefinitions, {}, cache);
    const ms2 = generateMaskSet(
      makeOpts({ mask: "99-99" }),
      defaultDefinitions,
      {},
      cache,
    );
    // Should be separate instances (structuredClone'd)
    expect(ms1).not.toBe(ms2);
    expect(ms1.mask).toBe(ms2.mask);
  });

  it("handles repeat option", () => {
    const opts = makeOpts({ mask: "9", repeat: 4 });
    const ms = generateMaskSet(opts, defaultDefinitions, {});
    expect(ms.mask).toBe("9999");
  });
});
