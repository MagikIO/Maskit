# @maskit/date

Date and time mask aliases for Maskit. Provides a `datetime` alias with format-token-based masking, date validation, range checking, and i18n support.

## Installation

```bash
npm install @magik_io/maskit-date @magik_io/maskit-core
# or
pnpm add @magik_io/maskit-date @magik_io/maskit-core
```

## Usage

### Register and Use

```ts
import { registerDate } from "@magik_io/maskit-date";
import { createMask, format } from "@magik_io/maskit-core";

// Register the "datetime" alias globally
registerDate();

// Create a date mask
const engine = createMask({
  alias: "datetime",
  inputFormat: "MM/dd/yyyy",
});

engine.setValue("12252025");
engine.getValue(); // → "12/25/2025"
```

### With Custom Options

```ts
const engine = createMask({
  alias: "datetime",
  inputFormat: "dd/MM/yyyy",
  min: "01/01/2000",   // Minimum date
  max: "31/12/2099",   // Maximum date
  prefillYear: true,    // Auto-fill year digits
});
```

### Custom i18n

```ts
import { createDatetimeAlias } from "@magik_io/maskit-date";
import { defineAlias } from "@magik_io/maskit-core";

const spanishDatetime = createDatetimeAlias({
  dayNames: [
    "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom",
    "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
  ],
  monthNames: [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ],
  ordinalSuffix: ["°", "°", "°", "°"],
});

defineAlias("datetime-es", spanishDatetime);
```

## Format Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `d` | Day (no leading zero) | `1`, `15`, `31` |
| `dd` | Day (zero-padded) | `01`, `15`, `31` |
| `M` | Month (no leading zero) | `1`, `12` |
| `MM` | Month (zero-padded) | `01`, `12` |
| `MMM` | Month short name | `Jan`, `Feb` |
| `MMMM` | Month full name | `January`, `February` |
| `yy` | 2-digit year | `25` |
| `yyyy` | 4-digit year | `2025` |
| `h` | Hours 12h (no leading zero) | `1`, `12` |
| `hh` | Hours 12h (zero-padded) | `01`, `12` |
| `H` | Hours 24h (no leading zero) | `0`, `23` |
| `HH` | Hours 24h (zero-padded) | `00`, `23` |
| `m` | Minutes (no leading zero) | `0`, `59` |
| `mm` | Minutes (zero-padded) | `00`, `59` |
| `s` | Seconds (no leading zero) | `0`, `59` |
| `ss` | Seconds (zero-padded) | `00`, `59` |
| `l` | Milliseconds (3-digit) | `000`, `999` |
| `L` | Milliseconds (2-digit) | `00`, `99` |
| `t` | AM/PM (single char) | `a`, `p` |
| `tt` | AM/PM (full) | `am`, `pm` |
| `T` | AM/PM upper (single) | `A`, `P` |
| `TT` | AM/PM upper (full) | `AM`, `PM` |
| `Z` | Timezone | Any string |

## Built-in Format Shortcuts

| Name | Format |
|------|--------|
| `isoDate` | `yyyy-MM-dd` |
| `isoTime` | `HH:mm:ss` |
| `isoDateTime` | `yyyy-MM-dd\THH:mm:ss` |

## Validation Features

- **Day-in-month**: Automatically validates days per month (28/29/30/31)
- **Leap year**: February 29 is allowed only in leap years
- **Leading zero normalization**: Typing `3` for a day auto-prepends `0` when needed
- **Date range**: `min`/`max` options enforce date boundaries
- **AM/PM casing**: Automatic casing for time period tokens

## API

### `registerDate()`

Registers the `datetime` alias into the global `@magik_io/maskit-core` registry. Call once at app startup.

### `createDatetimeAlias(i18n?)`

Creates a datetime alias definition with optional custom i18n strings. Returns an `AliasDefinition` that can be passed to `defineAlias()`.

### `parseDateFormat(format, dateObj?, opts, i18n?)`

Parses a date format string into a regex mask pattern (when `dateObj` is undefined) or formats a `DateParts` object back to a string (when `dateObj` is provided).

### `isValidDate(dateParts, currentResult, opts, maskset?, formatCodes?)`

Validates that a `DateParts` object represents a valid date (day-in-month, leap year checks).

### `isDateInRange(dateParts, result, opts)`

Checks whether a date falls within the `min`/`max` range.

### `pad(val, len?, right?)`

Pads a value with leading (or trailing) zeros to the specified length.

## Alias Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `inputFormat` | `string` | `"isoDateTime"` | Date format for input display |
| `displayFormat` | `string \| null` | `null` | Alternate format for display |
| `outputFormat` | `string \| null` | `null` | Format for unmasked output |
| `min` | `string` | — | Minimum allowed date |
| `max` | `string` | — | Maximum allowed date |
| `prefillYear` | `boolean` | `true` | Auto-fill year digits |
| `inputmode` | `string` | `"numeric"` | Input mode hint |

## License

MIT
