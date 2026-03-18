# @maskit/solid

SolidJS bindings for Maskit. Provides a `use:maskit` directive and a `<MaskedInput>` component for declarative input masking.

## Installation

```bash
npm install @maskit/solid @magik_io/maskit-core @magik_io/maskit-dom
# or
pnpm add @maskit/solid @magik_io/maskit-core @magik_io/maskit-dom
```

**Peer dependency:** `solid-js >= 1.8.0`

## Usage

### `use:maskit` Directive

```tsx
import { maskit } from "@maskit/solid";

function PhoneInput() {
  // Required to prevent tree-shaking of the directive
  void maskit;

  return (
    <input
      type="text"
      use:maskit={{ mask: "(999) 999-9999" }}
    />
  );
}
```

**Reactive options** — the mask re-applies automatically when options change:

```tsx
import { createSignal } from "solid-js";
import { maskit } from "@maskit/solid";

function DynamicMask() {
  void maskit;
  const [maskOpts, setMaskOpts] = createSignal({ mask: "999-9999" });

  return (
    <>
      <input use:maskit={maskOpts()} />
      <button onClick={() => setMaskOpts({ mask: "(999) 999-9999" })}>
        Switch to full phone
      </button>
    </>
  );
}
```

### `<MaskedInput>` Component

```tsx
import { MaskedInput } from "@maskit/solid";

function App() {
  return (
    <MaskedInput
      options={{ mask: "99/99/9999" }}
      placeholder="Enter date"
      class="my-input"
      onController={(controller) => {
        console.log("Mask applied:", controller.value());
      }}
    />
  );
}
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `options` | `CreateMaskOptions` | Mask configuration (required) |
| `onController` | `(ctrl: MaskController) => void` | Callback when mask controller is created |
| `ref` | `(el: HTMLInputElement) => void` | Ref callback for the underlying input |
| `...rest` | `JSX.InputHTMLAttributes` | All standard input attributes are forwarded |

**Reactive options:**

```tsx
import { createSignal } from "solid-js";
import { MaskedInput } from "@maskit/solid";

function App() {
  const [opts, setOpts] = createSignal({ mask: "999-9999" });

  return (
    <MaskedInput
      options={opts()}
      onController={(ctrl) => console.log(ctrl.value())}
    />
  );
}
```

### Accessing the Controller

Both the directive and component provide access to the `MaskController` from `@magik_io/maskit-dom`:

```tsx
import { MaskedInput } from "@maskit/solid";
import type { MaskController } from "@magik_io/maskit-dom";

function App() {
  let controller: MaskController | undefined;

  return (
    <>
      <MaskedInput
        options={{ mask: "(999) 999-9999" }}
        onController={(ctrl) => { controller = ctrl; }}
      />
      <button onClick={() => console.log(controller?.unmaskedValue())}>
        Get Value
      </button>
    </>
  );
}
```

## TypeScript

The package extends the SolidJS JSX namespace to provide type checking for the `use:maskit` directive:

```tsx
// Fully typed — TypeScript knows about use:maskit
<input use:maskit={{ mask: "99-99-99" }} />
```

## Cleanup

Both the directive and component automatically clean up (destroy the mask, unbind events) when the component is unmounted via SolidJS's `onCleanup`.

## License

MIT
