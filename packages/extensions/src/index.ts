// Definitions

// Aliases
export {
  cssunitAlias,
  emailAlias,
  extensionAliases,
  ipAlias,
  macAlias,
  ssnAlias,
  urlAlias,
  vinAlias,
} from "./aliases.js";
export {
  extensionDefinitions,
  hexDefinition,
  upperAlphaDefinition,
  upperAlphanumericDefinition,
} from "./definitions.js";

// Registration helper
import { defineAlias, defineDefinition } from "@maskit/core";
import { extensionAliases } from "./aliases.js";
import { extensionDefinitions } from "./definitions.js";

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
