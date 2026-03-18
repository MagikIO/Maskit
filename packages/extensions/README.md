# @maskit/extensions

Pre-built mask aliases and extra definitions for common input formats: IP addresses, email, MAC addresses, VINs, SSNs, URLs, and CSS units.

## Installation

```bash
npm install @maskit/extensions @magik_io/maskit-core
# or
pnpm add @maskit/extensions @magik_io/maskit-core
```

## Usage

### Register and Use

```ts
import { registerExtensions } from "@maskit/extensions";
import { createMask, format } from "@magik_io/maskit-core";

// Register all extension aliases and definitions globally
registerExtensions();

const ip = createMask({ alias: "ip" });
ip.setValue("192.168.1.1");
ip.getValue(); // → "192.168.1.1"

const email = createMask({ alias: "email" });
const ssn = createMask({ alias: "ssn" });
const mac = createMask({ alias: "mac" });
const vin = createMask({ alias: "vin" });
```

## Aliases

### `ip` — IPv4 Address

Mask: `i{1,3}.j{1,3}.k{1,3}.l{1,3}`

- Custom validators ensure each octet is in the range **0–255**
- `inputmode: "decimal"` for numeric keyboards on mobile
- Substitutes `,` → `.` automatically

```ts
const engine = createMask({ alias: "ip" });
engine.setValue("10.0.0.1");
engine.getValue(); // → "10.0.0.1"
```

### `email` — Email Address

Mask: `*{1,64}[.*{1,64}][.*{1,64}][.*{1,63}]@-{1,63}.-{1,63}[.-{1,63}][.-{1,63}]`

- `casing: "lower"` — automatically lowercases input
- `greedy: false`
- `onBeforePaste` strips `mailto:` prefix and lowercases

```ts
const engine = createMask({ alias: "email" });
```

### `mac` — MAC Address

Mask: `##:##:##:##:##:##`

- Uses the `#` hex definition (accepts `0-9`, `A-F`)

```ts
const engine = createMask({ alias: "mac" });
engine.setValue("AA:BB:CC:DD:EE:FF");
```

### `vin` — Vehicle Identification Number

Mask: `V{13}9{4}`

- Custom `V` definition accepts VIN-valid characters (`A-HJ-NPR-Z`, `0-9`, excluding I, O, Q)
- `casing: "upper"` — auto-uppercases
- `clearIncomplete: true`
- `autoUnmask: true`

```ts
const engine = createMask({ alias: "vin" });
```

### `ssn` — US Social Security Number

Mask: `999-99-9999`

- `postValidation` rejects known invalid SSNs:
  - Area number `000`, `666`, or `900-999`
  - Group number `00`
  - Serial number `0000`
  - Specific blocked numbers (`219-09-9999`, `078-05-1120`)

```ts
const engine = createMask({ alias: "ssn" });
```

### `url` — URL

Regex mask: `(https?|ftp)://.*`

- `autoUnmask: false`
- `keepStatic: false`
- `tabThrough: true`

```ts
const engine = createMask({ alias: "url" });
```

### `cssunit` — CSS Unit Value

Regex mask: `[+-]?[0-9]+\.?([0-9]+)?(px|em|rem|ex|%|in|cm|mm|pt|pc)`

```ts
const engine = createMask({ alias: "cssunit" });
```

## Extra Definitions

These definitions are registered globally when calling `registerExtensions()`:

| Character | Matches | Casing | Description |
|-----------|---------|--------|-------------|
| `A` | `[A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]` | `upper` | Letters (Latin, Cyrillic, Extended) |
| `&` | `[0-9A-Za-z\u0410-\u044F\u0401\u0451\u00C0-\u00FF\u00B5]` | `upper` | Alphanumeric (Latin, Cyrillic, Extended) |
| `#` | `[0-9A-Fa-f]` | `upper` | Hexadecimal digit |

### Using Extra Definitions

```ts
import { registerExtensions } from "@maskit/extensions";
import { createMask } from "@magik_io/maskit-core";

registerExtensions();

// Hex color
const hex = createMask({ mask: "\\#HHHHHH" });

// Uppercase code
const code = createMask({ mask: "AA-9999" });
```

## API

### `registerExtensions()`

Registers all extension aliases (`ip`, `email`, `mac`, `vin`, `ssn`, `url`, `cssunit`) and definitions (`A`, `&`, `#`) into the global `@magik_io/maskit-core` registry. Call once at app startup.

### Individual Exports

All aliases and definitions are available as individual exports for direct use:

```ts
import {
  ipAlias,
  emailAlias,
  macAlias,
  vinAlias,
  ssnAlias,
  urlAlias,
  cssunitAlias,
  extensionAliases,
  upperAlphaDefinition,
  upperAlphanumericDefinition,
  hexDefinition,
  extensionDefinitions,
} from "@maskit/extensions";
```

## License

MIT
