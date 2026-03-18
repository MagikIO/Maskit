# @magik_io/maskit-core

The headless mask engine — zero DOM dependency. Parses mask patterns, validates input character-by-character, and manages masked/unmasked values.

## Installation

```bash
npm install @magik_io/maskit-core
# or
pnpm add @magik_io/maskit-core
```

## Usage

### Static Helpers

```ts
import { format, unformat, isValid } from "@magik_io/maskit-core";

// Format a raw value through a mask
format("1234567890", { mask: "(999) 999-9999" });
// → "(123) 456-7890"

// Extract the raw value from a masked string
unformat("(123) 456-7890", { mask: "(999) 999-9999" });
// → "1234567890"

// Check if a value satisfies a mask
isValid("12/25/2025", { mask: "99/99/9999" });
// → true
```

### Stateful Engine

```ts
import { createMask } from "@maskit/core";

const engine = createMask({ mask: "99-99-99" });

engine.processInput("1"); // type "1"
engine.processInput("2"); // type "2"
engine.processInput("3");
engine.processInput("4");
engine.processInput("5");
engine.processInput("6");

engine.getValue();         // → "12-34-56"
engine.getUnmaskedValue(); // → "123456"
engine.isComplete();       // → true
engine.getTemplate();      // → "__-__-__"

// Set a full value
engine.setValue("987654");
engine.getValue();         // → "98-76-54"

// Delete (backward)
engine.processDelete("backward");

// Reset to empty
engine.reset();
```

### `MaskEngine` Interface

| Method | Returns | Description |
|--------|---------|-------------|
| `processInput(char, position?)` | `ValidationResult` | Insert a character at position (or current) |
| `processDelete(direction, position?)` | `void` | Delete forward or backward from position |
| `getValue()` | `string` | Get the current masked value |
| `getUnmaskedValue()` | `string` | Get only user-entered characters |
| `isComplete()` | `boolean \| undefined` | Whether all required positions are filled |
| `reset()` | `void` | Clear all input, return to empty mask |
| `getTemplate()` | `string` | Get the placeholder template string |
| `setValue(value)` | `void` | Apply a full value string to the mask |
| `getMaskSet()` | `MaskSet` | Access the internal mask state |
| `getOptions()` | `MaskOptions` | Access resolved options |

### `CreateMaskOptions`

```ts
interface CreateMaskOptions extends Partial<MaskOptions> {
  definitions?: Record<string, MaskDefinition>;
  aliases?: Record<string, AliasDefinition>;
  cache?: Map<string, MaskSet> | false;
}
```

## Mask Syntax

### Built-in Definitions

| Token | Pattern | Description |
|-------|---------|-------------|
| `9` | `\p{N}` | Any Unicode digit |
| `a` | `\p{L}` | Any Unicode letter |
| `*` | `[\p{L}\p{N}]` | Any alphanumeric character |

All other characters are treated as static literals.

### Syntax Elements

| Syntax | Description | Example |
|--------|-------------|---------|
| `[...]` | Optional section | `99[99]` — 2 or 4 digits |
| `(a\|b)` | Alternation | `(999) 999-9999\|999-999-9999` |
| `{min,max}` | Quantifier | `a{2,4}` — 2 to 4 letters |
| `{n}` | Exact count | `9{4}` — exactly 4 digits |
| `{+}` / `{*}` | One-or-more / zero-or-more | `9{+}` |
| `(...)` | Group | `(999){3}` — 3 groups of 3 digits |
| `\` | Escape character | `\9` — literal "9" |

### Array Masks (Multi-mask)

Pass an array to auto-disambiguate between multiple patterns:

```ts
createMask({ mask: ["999-9999", "(999) 999-9999"] });
```

### Regex Masks

```ts
createMask({ regex: "[0-9]{1,3}(\\.[0-9]{1,3}){3}" });
```

## Custom Definitions

```ts
import { createMask, defineDefinition } from "@maskit/core";

// Register globally (available to all future createMask calls)
defineDefinition("H", {
  validator: "[0-9A-Fa-f]",
  casing: "upper",
});

// Or per-instance
const engine = createMask({
  mask: "HH:HH:HH",
  definitions: {
    H: { validator: "[0-9A-Fa-f]", casing: "upper" },
  },
});
```

### `MaskDefinition`

| Property | Type | Description |
|----------|------|-------------|
| `validator` | `string \| RegExp \| ValidatorFn` | Pattern or function to validate input |
| `casing` | `"upper" \| "lower" \| "title"` | Auto-transform casing |
| `definitionSymbol` | `string` | Override the symbol used in test resolution |
| `static` | `boolean` | Non-editable position |
| `optional` | `boolean` | Optional position |
| `placeholder` | `string` | Custom placeholder character |
| `generated` | `boolean` | Auto-generated definition marker |

## Custom Aliases

```ts
import { defineAlias, createMask } from "@magik_io/maskit-core";

defineAlias("zip", {
  mask: "99999[-9999]",
  placeholder: "_",
  clearIncomplete: true,
});

const engine = createMask({ alias: "zip" });
```

## Key Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mask` | `string \| string[] \| Function` | `null` | Mask pattern(s) |
| `regex` | `string` | `null` | Regex-based mask |
| `alias` | `string` | `null` | Reference a registered alias |
| `placeholder` | `string` | `"_"` | Placeholder character |
| `greedy` | `boolean` | `false` | Grow buffer for optional/quantifier content |
| `repeat` | `number` | `0` | Repeat the mask (0 = no repeat) |
| `insertMode` | `boolean` | `true` | Insert vs. overwrite |
| `numericInput` | `boolean` | `false` | RTL digit entry |
| `rightAlign` | `boolean` | `false` | Right-align input |
| `casing` | `string \| null` | `null` | `"upper"`, `"lower"`, or `"title"` |
| `keepStatic` | `boolean \| null` | `null` | Preserve static parts during alternation |
| `jitMasking` | `boolean \| number` | `false` | Defer static chars until neighbors are filled |
| `nullable` | `boolean` | `true` | Allow empty value |
| `autoUnmask` | `boolean` | `false` | Return unmasked value from `.value` |

See the full `MaskOptions` type in [src/types.ts](src/types.ts) for all available options.

## Advanced: Parser & Resolver APIs

For advanced use cases, the lower-level APIs are also exported:

```ts
import {
  analyseMask,
  generateMaskSet,
  getTests,
  getTestTemplate,
  getBuffer,
  isMask,
  seekNext,
  seekPrevious,
  getLastValidPosition,
  resetMaskSet,
} from "@magik_io/maskit-core";
```

## License

MIT
