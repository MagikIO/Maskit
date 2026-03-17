// Definitions
export {
  extensionDefinitions,
  upperAlphaDefinition,
  upperAlphanumericDefinition,
  hexDefinition,
} from "./definitions.js";

// Aliases
export {
  extensionAliases,
  ipAlias,
  cssunitAlias,
  urlAlias,
  emailAlias,
  macAlias,
  vinAlias,
  ssnAlias,
} from "./aliases.js";

// Registration helper
import { defineAlias, defineDefinition } from "@maskit/core";
import { extensionDefinitions } from "./definitions.js";
import { extensionAliases } from "./aliases.js";

/**
 * Register all extension definitions and aliases into the global
 * @maskit/core registry. Call once at app startup.
 */
export function registerExtensions(): void {
  for (const [name, def] of Object.entries(extensionDefinitions)) {
    defineDefinition(name, def);
  }
  for (const [name, alias] of Object.entries(extensionAliases)) {
    defineAlias(name, alias);
  }
}
