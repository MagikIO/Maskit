import type {
  AliasDefinition,
  CaretPosition,
  MaskDefinition,
  MaskEngine,
  MaskOptions,
  MaskSet,
  MaskToken,
  ValidationResult,
} from "./types.js";
import { defaults } from "./defaults.js";
import { defaultDefinitions } from "./definitions.js";
import { generateMaskSet } from "./mask-lexer.js";
import {
  getBuffer,
  getBufferTemplate,
  resetMaskSet,
  seekNext,
} from "./test-resolver.js";
import {
  checkVal,
  clearOptionalTail,
  handleRemove,
  isComplete,
  isValid,
  unmaskedvalue,
} from "./validation.js";

const globalAliases: Record<string, AliasDefinition> = {};
const globalDefinitions: Record<string, MaskDefinition> = {
  ...defaultDefinitions,
};
const masksCache = new Map<string, MaskSet>();

function maskHasAlternator(tokens: MaskToken[]): boolean {
  for (const token of tokens) {
    if (token.isAlternator) return true;
    for (const m of token.matches) {
      if ("matches" in m && maskHasAlternator([m as MaskToken])) return true;
    }
  }
  return false;
}

function resolveAlias(
  aliasStr: string | null,
  options: Partial<MaskOptions> | undefined,
  opts: MaskOptions,
  aliases: Record<string, AliasDefinition>,
): boolean {
  if (!aliasStr) return false;
  const aliasDefinition = aliases[aliasStr];
  if (aliasDefinition) {
    if (aliasDefinition.alias)
      resolveAlias(aliasDefinition.alias, undefined, opts, aliases);
    Object.assign(opts, aliasDefinition, options);
    return true;
  }
  if (opts.mask === null) {
    opts.mask = aliasStr;
  }
  return false;
}

export interface CreateMaskOptions extends Partial<MaskOptions> {
  /** Additional definitions to merge */
  definitions?: Record<string, MaskDefinition>;
  /** Additional aliases to use */
  aliases?: Record<string, AliasDefinition>;
  /** Opt-in mask cache (pass a Map, or omit to use global cache) */
  cache?: Map<string, MaskSet> | false;
}

export function createMask(options: CreateMaskOptions): MaskEngine {
  const allAliases = { ...globalAliases, ...options.aliases };
  const allDefinitions = { ...globalDefinitions, ...options.definitions };
  const opts: MaskOptions = { ...defaults, ...options };
  const cache =
    options.cache === false ? undefined : (options.cache ?? masksCache);

  if (opts.alias) {
    resolveAlias(opts.alias, options, opts, allAliases);
  }

  const maskset = generateMaskSet(opts, allDefinitions, allAliases, cache);
  const isRTL = opts.isRTL || opts.numericInput || false;

  const ctx = {
    opts,
    maskset,
    definitions: allDefinitions,
    hasAlternator: maskHasAlternator(maskset.maskToken),
    isRTL,
  };

  return {
    processInput(char: string, position?: number): ValidationResult {
      const pos =
        position !== undefined
          ? position
          : maskset.p !== undefined
            ? maskset.p
            : seekNext(-1, opts, maskset, allDefinitions);
      const result = isValid(pos, char, ctx);
      if (result !== false) {
        const resultObj = result as { pos?: number; caret?: number };
        const np =
          resultObj.caret !== undefined
            ? resultObj.caret
            : seekNext(resultObj.pos ?? pos, opts, maskset, allDefinitions);
        maskset.p = np;
      }
      resetMaskSet(maskset, true); // clear buffer cache
      return result;
    },

    processDelete(
      direction: "backspace" | "delete",
      position?: CaretPosition,
    ): void {
      const pos = position || {
        begin: maskset.p ?? 0,
        end: maskset.p ?? 0,
      };
      handleRemove(direction, pos, ctx);
      resetMaskSet(maskset, true);
    },

    getValue(): string {
      const buffer = getBuffer(opts, maskset, allDefinitions);
      return (isRTL ? buffer.slice().reverse() : buffer).join("");
    },

    getUnmaskedValue(): string {
      return unmaskedvalue(ctx);
    },

    isComplete(): boolean | undefined {
      return isComplete(ctx, getBuffer(opts, maskset, allDefinitions));
    },

    reset(): void {
      resetMaskSet(maskset);
    },

    getTemplate(): string {
      return getBufferTemplate(opts, maskset, allDefinitions).join("");
    },

    setValue(value: string): void {
      resetMaskSet(maskset);
      const preprocessed =
        typeof opts.onBeforeMask === "function"
          ? opts.onBeforeMask(value, opts) || value
          : value;
      const result = checkVal(ctx, preprocessed.split(""));
      maskset.p = result.caretPos;
      resetMaskSet(maskset, true);
    },

    getMaskSet(): MaskSet {
      return maskset;
    },

    getOptions(): MaskOptions {
      return opts;
    },
  };
}

// Static helpers

export function format(value: string, options: CreateMaskOptions): string {
  const engine = createMask(options);
  engine.setValue(value);
  return engine.getValue();
}

export function unformat(value: string, options: CreateMaskOptions): string {
  const engine = createMask(options);
  engine.setValue(value);
  return engine.getUnmaskedValue();
}

export function isValidStatic(
  value: string,
  options: CreateMaskOptions,
): boolean {
  const engine = createMask(options);
  engine.setValue(value);
  const complete = engine.isComplete();
  if (!complete) return false;
  const buffer = clearOptionalTail({
    opts: engine.getOptions(),
    maskset: engine.getMaskSet(),
    definitions: { ...globalDefinitions, ...options.definitions },
    hasAlternator: maskHasAlternator(engine.getMaskSet().maskToken),
    isRTL:
      engine.getOptions().isRTL || engine.getOptions().numericInput || false,
  });
  const isRTL = engine.getOptions().isRTL || engine.getOptions().numericInput;
  const formatted = isRTL ? buffer.reverse().join("") : buffer.join("");
  return value === formatted;
}

// Extension registration

export function defineAlias(name: string, definition: AliasDefinition): void {
  globalAliases[name] = definition;
}

export function defineDefinition(
  name: string,
  definition: MaskDefinition,
): void {
  globalDefinitions[name] = definition;
}

export function getAliases(): Record<string, AliasDefinition> {
  return globalAliases;
}

export function getDefinitions(): Record<string, MaskDefinition> {
  return globalDefinitions;
}
