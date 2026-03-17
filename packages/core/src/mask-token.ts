import type { MaskToken } from "./types.js";

export function createMaskToken(
  isGroup = false,
  isOptional = false,
  isQuantifier = false,
  isAlternator = false,
): MaskToken {
  return {
    matches: [],
    openGroup: isGroup,
    alternatorGroup: false,
    isGroup,
    isOptional,
    isQuantifier,
    isAlternator,
    quantifier: { min: 1, max: 1 },
  };
}
