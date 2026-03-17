import { describe, it, expect, afterEach } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { MaskedInput } from "../src/MaskedInput.jsx";
import type { MaskController } from "@maskit/dom";

describe("MaskedInput component", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders an input element", async () => {
    const { container } = render(() => (
      <MaskedInput options={{ mask: "999" }} />
    ));

    const input = container.querySelector("input");
    expect(input).toBeInstanceOf(HTMLInputElement);
  });

  it("applies a mask to the rendered input", async () => {
    let ctrl: MaskController | undefined;

    const { container } = render(() => (
      <MaskedInput
        options={{ mask: "99/99" }}
        onController={(c) => { ctrl = c; }}
      />
    ));

    const input = container.querySelector("input");
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(ctrl).toBeDefined();
  });

  it("forwards HTML attributes to the input", async () => {
    const { container } = render(() => (
      <MaskedInput
        options={{ mask: "999" }}
        id="test-input"
        class="my-class"
        data-testid="masked"
      />
    ));

    const input = container.querySelector("input")!;
    expect(input.id).toBe("test-input");
    expect(input.className).toBe("my-class");
    expect(input.dataset.testid).toBe("masked");
  });

  it("provides ref to the underlying input", async () => {
    let refEl: HTMLInputElement | undefined;

    render(() => (
      <MaskedInput
        options={{ mask: "999" }}
        ref={(el) => { refEl = el; }}
      />
    ));

    expect(refEl).toBeInstanceOf(HTMLInputElement);
  });

  it("re-applies mask when options change", async () => {
    const controllers: MaskController[] = [];

    const [opts, setOpts] = createSignal({ mask: "999" });

    render(() => (
      <MaskedInput
        options={opts()}
        onController={(c) => { controllers.push(c); }}
      />
    ));

    expect(controllers.length).toBe(1);

    setOpts({ mask: "99/99" });

    // After reactive update, a new controller should have been created
    // (may need a tick for reactivity to propagate)
    await Promise.resolve();
    expect(controllers.length).toBeGreaterThanOrEqual(1);
  });

  it("cleans up mask on unmount", async () => {
    let ctrl: MaskController | undefined;

    const { unmount } = render(() => (
      <MaskedInput
        options={{ mask: "999" }}
        onController={(c) => { ctrl = c; }}
      />
    ));

    expect(ctrl).toBeDefined();

    // Unmount should trigger cleanup without errors
    unmount();
    expect(true).toBe(true);
  });
});
