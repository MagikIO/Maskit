// i18n

// datetime alias & helpers
export type { DateOptions, DateParts } from "./datetime.js";
export {
  createDatetimeAlias,
  dateAliases,
  datetimeAlias,
  isDateInRange,
  isValidDate,
  pad,
  parseDateFormat,
} from "./datetime.js";
export type { DateI18n } from "./i18n.js";
export { defaultI18n } from "./i18n.js";

// Registration helper
import { defineAlias } from "@maskit/core";
import { dateAliases } from "./datetime.js";

/**
 * Register all date aliases into the global @maskit/core registry.
 * Call once at app startup.
 */
export function registerDate(): void {
  for (const [name, alias] of Object.entries(dateAliases)) {
    defineAlias(name, alias);
  }
}
