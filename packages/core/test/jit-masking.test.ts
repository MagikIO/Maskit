/**
 * Ported from Inputmask/qunit/tests_jitmasking.js
 * Tests JIT (just-in-time) masking behavior.
 *
 * NOTE: The original QUnit test for (.999){*} with numericInput relies on
 * the numeric alias pipeline (preValidation, custom definitions, etc.)
 * which lives in @maskit/numeric. That test has been moved to
 * packages/numeric/test/numeric-ported.test.ts.
 */
import { describe, it } from "vitest";

describe("JIT Masking", () => {
  it.todo("add core-only JIT masking tests that don't depend on numeric pipeline");
});
