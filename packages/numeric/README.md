# @maskit/numeric

Numeric input mask aliases for Maskit. Provides pre-configured aliases for numbers, currency, decimals, integers, percentages, and Indian numbering system formatting.

## Installation

```bash
npm install @maskit/numeric @magik_io/maskit-core
# or
pnpm add @maskit/numeric @magik_io/maskit-core
```

## Usage

### Register and Use

```ts
import { registerNumeric } from "@maskit/numeric";
import { createMask, format } from "@magik_io/maskit-core";

// Register all numeric aliases globally
registerNumeric();

// Currency
const currency = createMask({ alias: "currency" });
currency.setValue("1234567.89");
currency.getValue(); // → "1,234,567.89"

// Percentage
const pct = createMask({ alias: "percentage" });
pct.setValue("75");
pct.getValue(); // → "75 %"

// Integer
const int = createMask({ alias: "integer" });
int.setValue("42");
int.getValue(); // → "42"
```

### Custom Configuration

```ts
const engine = createMask({
  alias: "numeric",
  digits: 3,
  digitsOptional: false,
  radixPoint: ".",
  groupSeparator: ",",
  allowMinus: true,
  prefix: "$ ",
  suffix: "",
  min: 0,
  max: 999999.999,
});
```

## Aliases

### `numeric`

General-purpose numeric mask. All other numeric aliases extend this one.

| Option | Default | Description |
|--------|---------|-------------|
| `digits` | `"*"` | Number of decimal digits (`"*"` = unlimited) |
| `digitsOptional` | `true` | Whether decimal digits are optional |
| `radixPoint` | `"."` | Decimal separator character |
| `groupSeparator` | `""` | Thousands separator (empty = none) |
| `allowMinus` | `true` | Allow negative numbers |
| `negationSymbol` | `{ front: "-", back: "" }` | Symbols for negative values |
| `prefix` | `""` | Prefix string (e.g. `"$ "`) |
| `suffix` | `""` | Suffix string (e.g. `" USD"`) |
| `min` | — | Minimum allowed value |
| `max` | — | Maximum allowed value |
| `SetMaxOnOverflow` | `false` | Auto-clamp to max when exceeded |
| `step` | `1` | Step for increment/decrement |
| `placeholder` | `"0"` | Placeholder character |
| `greedy` | `false` | Non-greedy |
| `rightAlign` | `true` | Right-align the input |
| `numericInput` | — | RTL digit entry |
| `inputmode` | `"decimal"` | Input mode hint |
| `stripLeadingZeroes` | `true` | Remove leading zeros |
| `shortcuts` | `{ k: "1000", m: "1000000" }` | Keyboard shortcuts for multipliers |
| `roundingFN` | — | Custom rounding function |
| `unmaskAsNumber` | `false` | Return number string from unmasked value |

### `currency`

Extends `numeric` with:

| Option | Value |
|--------|-------|
| `groupSeparator` | `","` |
| `digits` | `2` |
| `digitsOptional` | `false` |

### `decimal`

Alias for `numeric` with no overrides.

### `integer`

Extends `numeric` with:

| Option | Value |
|--------|-------|
| `inputmode` | `"numeric"` |
| `digits` | `0` |

### `percentage`

Extends `numeric` with:

| Option | Value |
|--------|-------|
| `min` | `0` |
| `max` | `100` |
| `suffix` | `" %"` |
| `digits` | `0` |
| `allowMinus` | `false` |

### `indianns`

Indian Numbering System. Extends `numeric` with custom grouping (e.g., `12,34,567`):

| Option | Value |
|--------|-------|
| `groupSeparator` | `","` |
| `digits` | `2` |
| `digitsOptional` | `false` |

## Features

- **Dynamic mask generation**: Mask pattern is built dynamically based on options (prefix, suffix, digit count, group separators)
- **Radix dance**: In `_radixDance` mode, the radix point is automatically managed — typing digits before the decimal moves past it seamlessly
- **Negation toggle**: Typing `-` toggles the sign; supports front/back negation symbols
- **Group separator skipping**: Caret automatically skips over group separators during input
- **Min/max enforcement**: Values are clamped to `min`/`max` range during post-validation
- **Leading zero stripping**: Leading zeros are automatically removed
- **Keyboard shortcuts**: `k` multiplies by 1,000; `m` multiplies by 1,000,000

## API

### `registerNumeric()`

Registers all numeric aliases (`numeric`, `currency`, `decimal`, `integer`, `percentage`, `indianns`) into the global `@magik_io/maskit-core` registry.

### `genMask(opts)`

Generates the mask pattern string for a given set of numeric options. Used internally by the numeric alias.

### `alignDigits(buffer, digits, opts, force?)`

Pads or trims decimal digits in a buffer array to match the configured digit count.

### `decimalValidator(chrs, maskset, pos, strict, opts)`

Validator function for decimal position characters. Returns `true`, `false`, or a `CommandObject`.

## License

MIT
