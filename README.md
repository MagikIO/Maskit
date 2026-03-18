# Maskit

A modular, framework-agnostic input masking library for JavaScript and TypeScript.

Maskit provides a **headless core engine** for parsing, validating, and formatting masked input — plus optional packages for DOM integration, framework bindings, and pre-built mask aliases.

## Features

- **Headless core** — zero DOM dependency, runs anywhere (Node.js, Deno, Bun, browsers)
- **Rich mask syntax** — optional sections `[...]`, alternations `(a|b)`, quantifiers `{min,max}`, escape characters, regex masks
- **Unicode-aware** — built-in definitions use `\p{N}` (digits) and `\p{L}` (letters) for international input
- **Extensible** — register custom definitions, aliases, and validators
- **Framework bindings** — SolidJS directive/component, Web Component, vanilla DOM
- **Pre-built aliases** — date/time, numeric/currency, IP, email, SSN, MAC, VIN, URL, and more
- **Tree-shakeable** — ES module builds with explicit `register*()` opt-in functions
- **Type-safe** — written in TypeScript with full type declarations

## Packages

| Package | Description | Depends On |
|---------|-------------|------------|
| [`@maskit/core`](packages/core/) | Headless mask engine, parser, validator | — |
| [`@maskit/dom`](packages/dom/) | DOM integration (event binding, caret, value patching) | `@maskit/core` |
| [`@maskit/date`](packages/date/) | Date/time mask aliases | `@maskit/core` |
| [`@maskit/numeric`](packages/numeric/) | Numeric, currency, percentage, integer aliases | `@maskit/core` |
| [`@maskit/extensions`](packages/extensions/) | IP, email, MAC, VIN, SSN, URL, CSS unit aliases | `@maskit/core` |
| [`@maskit/solid`](packages/solid/) | SolidJS directive and `<MaskedInput>` component | `@maskit/core`, `@maskit/dom` |
| [`@maskit/web-component`](packages/web-component/) | `<input-mask>` custom element (form-associated) | `@maskit/core`, `@maskit/dom` |

## Quick Start

### Headless (Node.js / any runtime)

```ts
import { createMask, format, unformat, isValid } from "@maskit/core";

// One-shot formatting
format("1234567890", { mask: "(999) 999-9999" });
// → "(123) 456-7890"

// One-shot unformatting
unformat("(123) 456-7890", { mask: "(999) 999-9999" });
// → "1234567890"

// One-shot validation
isValid("(123) 456-7890", { mask: "(999) 999-9999" });
// → true

// Stateful engine
const engine = createMask({ mask: "99/99/9999" });
engine.processInput("1");
engine.processInput("2");
engine.processInput("2");
engine.processInput("5");
engine.processInput("2");
engine.processInput("0");
engine.processInput("2");
engine.processInput("5");
engine.getValue();       // → "12/25/2025"
engine.getUnmaskedValue(); // → "12252025"
engine.isComplete();     // → true
```

### DOM (Vanilla JavaScript)

```ts
import { mask, unmask } from "@maskit/dom";

const input = document.querySelector("#phone");
const controller = mask(input, { mask: "(999) 999-9999" });

// Read values
controller.value();          // → "(123) 456-7890"
controller.unmaskedValue();  // → "1234567890"

// Set values programmatically
controller.setValue("9876543210");

// Clean up
controller.destroy();
```

### DOM (Auto-init via data attributes)

```html
<input data-maskit="(999) 999-9999" data-maskit-placeholder="_" />

<script type="module">
  import { autoInit } from "@maskit/dom";
  autoInit();
</script>
```

### SolidJS

```tsx
import { maskit, MaskedInput } from "@maskit/solid";

// Directive
function App() {
  // Required to prevent tree-shaking
  void maskit;
  return <input use:maskit={{ mask: "(999) 999-9999" }} />;
}

// Component
function App() {
  return (
    <MaskedInput
      options={{ mask: "(999) 999-9999" }}
      onController={(ctrl) => console.log(ctrl.value())}
    />
  );
}
```

### Web Component

```html
<script type="module">
  import { register } from "@maskit/web-component";
  register(); // registers <input-mask>
</script>

<input-mask mask="(999) 999-9999"></input-mask>
```

## Mask Syntax

### Definitions (built-in)

| Character | Matches | Description |
|-----------|---------|-------------|
| `9` | `\p{N}` | Any Unicode digit |
| `a` | `\p{L}` | Any Unicode letter |
| `*` | `[\p{L}\p{N}]` | Any letter or digit |

Any character not in the definitions table is treated as a **static literal**.

### Syntax Elements

| Syntax | Description | Example |
|--------|-------------|---------|
| `[...]` | Optional section | `99[99]` — 2 or 4 digits |
| `(a\|b)` | Alternation group | `(999) 999-9999\|(999)999-9999` |
| `{min,max}` | Quantifier | `a{2,4}` — 2 to 4 letters |
| `{n}` | Exact quantifier | `9{4}` — exactly 4 digits |
| `{+}` | One or more | `9{+}` — 1+ digits |
| `{*}` | Zero or more | `9{*}` — 0+ digits |
| `(...)` | Group | `(999){3}` — three groups of 3 digits |
| `\` | Escape next character | `\9` — literal "9" |

### Regex Masks

Pass a regex string to use regex-based masking:

```ts
createMask({ regex: "[0-9]{1,3}(\\.[0-9]{1,3}){3}" }); // IPv4
```

## Using Aliases

Aliases are pre-configured mask option sets. Register them explicitly, then reference by name:

### Date/Time

```ts
import { registerDate } from "@maskit/date";
import { createMask } from "@maskit/core";

registerDate(); // registers "datetime" alias

const engine = createMask({
  alias: "datetime",
  inputFormat: "MM/dd/yyyy",
});
```

**Date format tokens:** `d`, `dd`, `M`, `MM`, `MMM`, `MMMM`, `yy`, `yyyy`, `h`, `hh`, `H`, `HH`, `m`, `mm`, `s`, `ss`, `l`, `L`, `t`, `tt`, `T`, `TT`, `Z`

**Built-in date formats:** `isoDate` (`yyyy-MM-dd`), `isoTime` (`HH:mm:ss`), `isoDateTime` (`yyyy-MM-dd\THH:mm:ss`)

### Numeric

```ts
import { registerNumeric } from "@maskit/numeric";
import { createMask } from "@maskit/core";

registerNumeric(); // registers numeric, currency, decimal, integer, percentage, indianns

const currency = createMask({ alias: "currency" });
// groupSeparator: ",", digits: 2, radixPoint: "."

const percentage = createMask({ alias: "percentage" });
// min: 0, max: 100, suffix: " %", digits: 0
```

| Alias | Description |
|-------|-------------|
| `numeric` | General numeric input (configurable digits, grouping, negation) |
| `currency` | Numeric with `,` separators, 2 fixed decimals |
| `decimal` | Same as numeric (no overrides) |
| `integer` | Numeric with `digits: 0` — no decimal part |
| `percentage` | 0–100 with ` %` suffix |
| `indianns` | Indian numbering system grouping |

### Extensions

```ts
import { registerExtensions } from "@maskit/extensions";
import { createMask } from "@maskit/core";

registerExtensions(); // registers ip, email, mac, vin, ssn, url, cssunit + A, &, # defs

const email = createMask({ alias: "email" });
const ip = createMask({ alias: "ip" });
const ssn = createMask({ alias: "ssn" });
```

| Alias | Mask Pattern | Description |
|-------|-------------|-------------|
| `ip` | `i{1,3}.j{1,3}.k{1,3}.l{1,3}` | IPv4 address (0–255 per octet) |
| `email` | `*{1,64}@-{1,63}.-{1,63}[...]` | Email address |
| `mac` | `##:##:##:##:##:##` | MAC address (hex) |
| `vin` | `V{13}9{4}` | Vehicle Identification Number |
| `ssn` | `999-99-9999` | US Social Security Number (with validation) |
| `url` | `(https?\|ftp)://.*` | URL (regex) |
| `cssunit` | Regex for CSS values | `10px`, `1.5em`, `100%`, etc. |

**Extension definitions:**

| Character | Matches | Casing |
|-----------|---------|--------|
| `A` | Letters (incl. Cyrillic, Latin Extended) | upper |
| `&` | Letters + digits (incl. Cyrillic, Latin Extended) | upper |
| `#` | Hex digits (`0-9A-Fa-f`) | upper |

## Configuration Options

Key options available via `createMask()` and `mask()`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mask` | `string \| string[] \| Function` | `null` | The mask pattern |
| `regex` | `string` | `null` | Regex-based mask (alternative to `mask`) |
| `alias` | `string` | `null` | Reference a registered alias |
| `placeholder` | `string` | `"_"` | Placeholder character for unfilled positions |
| `greedy` | `boolean` | `false` | Whether the mask buffer grows to accommodate optional/quantifier content |
| `repeat` | `number` | `0` | Repeat the mask pattern (0 = no repeat) |
| `insertMode` | `boolean` | `true` | Insert vs. overwrite mode |
| `showMaskOnFocus` | `boolean` | `true` | Show mask template on focus (DOM) |
| `showMaskOnHover` | `boolean` | `true` | Show mask template on hover (DOM) |
| `clearMaskOnLostFocus` | `boolean` | `true` | Clear template text on blur if empty (DOM) |
| `clearIncomplete` | `boolean` | `false` | Clear value on blur if mask is incomplete |
| `autoUnmask` | `boolean` | `false` | Return unmasked value from `.value` getter |
| `removeMaskOnSubmit` | `boolean` | `false` | Remove mask from value on form submit |
| `numericInput` | `boolean` | `false` | RTL digit entry (right-to-left filling) |
| `rightAlign` | `boolean` | `false` | Right-align the input |
| `casing` | `string \| null` | `null` | `"upper"`, `"lower"`, or `"title"` |
| `keepStatic` | `boolean \| null` | `null` | Keep static parts when switching alternations |
| `jitMasking` | `boolean \| number` | `false` | Just-in-time masking: defer static chars |
| `nullable` | `boolean` | `true` | Allow empty value (return `""` instead of mask template) |
| `definitions` | `Record<string, MaskDefinition>` | — | Custom mask character definitions |
| `aliases` | `Record<string, AliasDefinition>` | — | Custom alias definitions |

### Hooks (DOM)

| Hook | Signature | Description |
|------|-----------|-------------|
| `onBeforeMask` | `(value, opts) → string` | Transform initial value before masking |
| `onBeforePaste` | `(pastedValue, opts) → string` | Transform pasted value |
| `onBeforeWrite` | `(event, buffer, caretPos, opts) → WriteResult` | Intercept before writing to DOM |
| `onUnMask` | `(maskedValue, unmasked, opts) → string` | Transform unmasked output |
| `preValidation` | `(buffer, pos, char, isSelection, opts, maskset, caretPos, strict) → boolean \| CommandObject` | Pre-validation hook |
| `postValidation` | `(buffer, pos, char, currentResult, opts, maskset, strict, fromCheckval) → boolean \| CommandObject` | Post-validation hook |
| `isComplete` | `(buffer, opts, maskset) → boolean` | Custom completeness check |
| `oncomplete` | `() → void` | Fired when mask is complete |
| `onincomplete` | `() → void` | Fired when mask is incomplete on blur |
| `oncleared` | `() → void` | Fired when mask is cleared |

## Custom Definitions

```ts
import { createMask, defineDefinition } from "@maskit/core";

// Register globally
defineDefinition("H", {
  validator: "[0-9A-Fa-f]",
  casing: "upper",
});

// Or pass per-instance
const engine = createMask({
  mask: "HH:HH:HH",
  definitions: {
    H: { validator: "[0-9A-Fa-f]", casing: "upper" },
  },
});
```

### MaskDefinition Properties

| Property | Type | Description |
|----------|------|-------------|
| `validator` | `string \| RegExp \| ValidatorFn` | Regex pattern or function to validate input |
| `casing` | `"upper" \| "lower" \| "title"` | Auto-case transformation |
| `definitionSymbol` | `string` | Symbol to use in test resolution |
| `static` | `boolean` | Whether this position is static (non-editable) |
| `optional` | `boolean` | Whether this position is optional |
| `placeholder` | `string` | Custom placeholder for this definition |
| `generated` | `boolean` | Whether this definition was auto-generated |

## Custom Aliases

```ts
import { defineAlias } from "@maskit/core";

defineAlias("phone-us", {
  mask: "(999) 999-9999",
  placeholder: "_",
  clearIncomplete: true,
});

// Use it
const engine = createMask({ alias: "phone-us" });
```

## Architecture

```
@maskit/core                  Headless engine (no DOM)
  ├── mask-lexer              Mask string → token AST
  ├── test-resolver           Position → test match resolver
  ├── validation              Character validation engine
  └── engine                  Public API (createMask, format, etc.)

@maskit/dom                   DOM integration layer
  ├── state                   WeakMap-based per-element state
  ├── caret                   Caret position management
  ├── value                   input.value get/set interception
  ├── event-handlers          Keyboard, mouse, clipboard, form events
  ├── event-binding           Event listener lifecycle
  └── mask/auto-init          mask() API and data-attribute scanning

@maskit/date                  Datetime alias
@maskit/numeric               Numeric/currency aliases
@maskit/extensions            IP, email, MAC, VIN, SSN, URL aliases
@maskit/solid                 SolidJS directive + component
@maskit/web-component         <input-mask> custom element
```

### Key Design Decisions

- **Headless-first**: `@maskit/core` has zero DOM dependency — it can run in any JS runtime
- **WeakMap state**: DOM package stores all per-element state in `WeakMap`s — no property mutation on elements
- **Value interception**: `Object.defineProperty` on the input instance intercepts `.value` get/set for transparent masking
- **Unicode validators**: Built-in definitions use Unicode property escapes (`\p{N}`, `\p{L}`) for international input
- **No side effects on import**: Registration functions (`registerDate()`, `registerNumeric()`, `registerExtensions()`) are explicit opt-ins
- **Function-preserving clone**: Custom `deepClone()` handles RegExp and function validators that `structuredClone` cannot

## Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

### Setup

```bash
pnpm install
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint all packages (Biome) |
| `pnpm format` | Format all packages (Biome) |
| `pnpm check` | Lint + format check (Biome) |
| `pnpm check:write` | Lint + format with auto-fix (Biome) |

### Code Style

- **Formatter**: Biome — 2-space indent, double quotes, trailing commas, semicolons always
- **Linting**: Biome recommended rules + `noExplicitAny: warn`, `noUnusedVariables: error`
- **Testing**: Vitest with v8 coverage
- **Build**: Vite library mode → ESM + CJS dual output with TypeScript declarations

### Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for versioning:

```bash
pnpm changeset       # Create a changeset
pnpm version         # Apply changesets → bump versions
pnpm release         # Build + publish to npm
```

## License

MIT
