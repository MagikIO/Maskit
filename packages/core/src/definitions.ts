import type { MaskDefinition } from "./types.js";

export const defaultDefinitions: Record<string, MaskDefinition> = {
  "9": {
    validator: "\\p{N}",
    definitionSymbol: "*",
  },
  a: {
    validator: "\\p{L}",
    definitionSymbol: "*",
  },
  "*": {
    validator: "[\\p{L}\\p{N}]",
  },
};
