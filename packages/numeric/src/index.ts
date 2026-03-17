export type { NumericOptions } from "./numeric.js";

export {
  numericAliases,
  numericAlias,
  currencyAlias,
  decimalAlias,
  integerAlias,
  percentageAlias,
  indiannsAlias,
  genMask,
  decimalValidator,
  alignDigits,
} from "./numeric.js";

// Registration helper
import { defineAlias } from "@maskit/core";
import { numericAliases } from "./numeric.js";

/**
 * Register all numeric aliases into the global @maskit/core registry.
 * Call once at app startup.
 */
export function registerNumeric(): void {
  for (const [name, alias] of Object.entries(numericAliases)) {
    defineAlias(name, alias);
  }
}
