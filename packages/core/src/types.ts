/**
 * Function-based validator receiving full mask context.
 * Return `true`/`false` for simple accept/reject, or a `CommandObject`
 * to trigger inserts, removes, buffer refreshes, etc.
 */
export type ValidatorFn = (
  chrs: string,
  maskset: MaskSet,
  pos: number,
  strict: boolean,
  opts: MaskOptions,
) => boolean | CommandObject;

/** A mask definition entry (e.g. `9` → digit, `a` → letter) */
export interface MaskDefinition {
  validator: string | ValidatorFn;
  definitionSymbol?: string;
  static?: boolean;
  optional?: boolean;
  casing?: "upper" | "lower" | "title" | null;
  placeholder?: string;
  generated?: boolean;
}

/** Options controlling mask behavior */
export interface MaskOptions {
  _maxTestPos: number;
  placeholder: string | Record<number, string>;
  optionalmarker: [string, string];
  quantifiermarker: [string, string];
  groupmarker: [string, string];
  alternatormarker: string;
  escapeChar: string;
  mask:
    | string
    | string[]
    | MaskInput[]
    | ((opts: MaskOptions) => string)
    | null;
  regex: string | null;
  oncomplete: () => void;
  onincomplete: () => void;
  oncleared: () => void;
  repeat: number | string;
  greedy: boolean;
  autoUnmask: boolean;
  removeMaskOnSubmit: boolean;
  clearMaskOnLostFocus: boolean;
  insertMode: boolean;
  insertModeVisual: boolean;
  clearIncomplete: boolean;
  alias: string | null;
  onKeyDown: (...args: unknown[]) => void;
  onBeforeMask: ((value: string, opts: MaskOptions) => string) | null;
  onBeforePaste: ((value: string, opts: MaskOptions) => string) | null;
  onBeforeWrite:
    | ((
        event: unknown,
        buffer: string[],
        caretPos: number,
        opts: MaskOptions,
      ) => WriteResult | void)
    | null;
  onUnMask:
    | ((masked: string, unmasked: string, opts: MaskOptions) => string)
    | null;
  outputMask: string | null;
  showMaskOnFocus: boolean;
  showMaskOnHover: boolean;
  onKeyValidation: (key: string, result: unknown, opts: MaskOptions) => void;
  skipOptionalPartCharacter: string;
  numericInput: boolean;
  rightAlign: boolean;
  undoOnEscape: boolean;
  radixPoint: string;
  _radixDance: boolean;
  groupSeparator: string;
  keepStatic: boolean | number | null;
  positionCaretOnTab: boolean;
  tabThrough: boolean;
  supportsInputType: string[];
  isComplete:
    | ((buffer: string[], opts: MaskOptions) => boolean | undefined)
    | null;
  preValidation:
    | ((
        buffer: string[],
        pos: number,
        char: string,
        isSelection: boolean,
        opts: MaskOptions,
        maskset: MaskSet,
        caretPos: CaretPosition | number,
        strict: boolean,
      ) => boolean | CommandObject)
    | null;
  postValidation:
    | ((
        buffer: string[],
        pos: number,
        char: string,
        currentResult: ValidationResult,
        opts: MaskOptions,
        maskset: MaskSet,
        strict: boolean,
        fromCheckval: boolean,
        fromAlternate: boolean,
      ) => boolean | ValidationResult)
    | null;
  staticDefinitionSymbol: string | undefined;
  jitMasking: boolean | number;
  nullable: boolean;
  noValuePatching: boolean;
  positionCaretOnClick: "none" | "lvp" | "radixFocus" | "select" | "ignore";
  casing:
    | "upper"
    | "lower"
    | "title"
    | ((
        elem: string,
        test: TestMatch,
        pos: number,
        validPositions: ValidPosition[],
      ) => string)
    | null;
  inputmode: string;
  importDataAttributes: boolean;
  shiftPositions: boolean;
  usePrototypeDefinitions: boolean;
  validationEventTimeOut: number;
  substitutes: Record<string, string>;
  definitions?: Record<string, MaskDefinition>;
  isRTL?: boolean;
  __financeInput?: boolean;
  digits?: string | number;
  // Internal
  inputEventOnly?: boolean;
}

/** A mask specified as an object with metadata */
export interface MaskInput {
  mask: string;
  [key: string]: unknown;
}

/** Caret position */
export interface CaretPosition {
  begin: number;
  end: number;
}

/** A parsed mask token node */
export interface MaskToken {
  matches: (TestMatch | MaskToken)[];
  openGroup: boolean;
  alternatorGroup: boolean;
  isGroup: boolean;
  isOptional: boolean;
  isQuantifier: boolean;
  isAlternator: boolean;
  quantifier: {
    min: number | string;
    max: number | string;
    jit?: number;
  };
}

/** A single test match definition */
export interface TestMatch {
  fn: RegExp | ValidatorFn | null;
  static: boolean;
  optionality: number | false;
  defOptionality?: number | false;
  newBlockMarker: boolean | "master";
  casing: "upper" | "lower" | "title" | null;
  def: string;
  placeholder?: string | ((opts: MaskOptions) => string);
  nativeDef: string;
  generated?: boolean;
  jit?: boolean | number;
  optionalQuantifier?: boolean;
  input?: string;
}

/** A resolved test result with locator info */
export interface TestResult {
  match: TestMatch;
  locator: (string | number)[];
  cd: string;
  mloc: Record<string, (string | number)[]>;
  alternation?: number;
  unMatchedAlternationStopped?: boolean;
}

/** A validated position entry */
export interface ValidPosition extends TestResult {
  input: string;
  generatedInput?: boolean;
}

/** The compiled mask set structure */
export interface MaskSet {
  mask: string;
  maskToken: MaskToken[];
  validPositions: ValidPosition[];
  _buffer: string[] | undefined;
  buffer: string[] | undefined;
  tests: Record<number, TestResult[]>;
  excludes: Record<number, string[]>;
  metadata: unknown;
  maskLength: number | undefined;
  jitOffset: Record<number, number>;
  p?: number;
}

/** Command object returned by validators */
export interface CommandObject {
  pos?: number;
  c?: string;
  caret?: number;
  remove?: number | number[] | { pos: number }[];
  insert?: {
    pos: number;
    c: string;
    strict?: boolean;
    fromIsValid?: boolean;
  }[];
  refreshFromBuffer?: boolean | { start: number; end: number };
  buffer?: string[];
  rewritePosition?: number;
  forwardPosition?: number;
}

/** Result from validation */
export type ValidationResult = false | true | CommandObject;

/** Result from write operations */
export interface WriteResult {
  refreshFromBuffer?: boolean | { start: number; end: number };
  buffer?: string[];
  caret?: number;
}

/** The public MaskEngine interface */
export interface MaskEngine {
  /** Process a character input at the current or specified position */
  processInput(char: string, position?: number): ValidationResult;
  /** Process a delete (backspace or forward delete) */
  processDelete(
    direction: "backspace" | "delete",
    position?: CaretPosition,
  ): void;
  /** Get the current masked value */
  getValue(): string;
  /** Get the current unmasked value */
  getUnmaskedValue(): string;
  /** Check if the current value is complete */
  isComplete(): boolean | undefined;
  /** Reset the engine to empty state */
  reset(): void;
  /** Get the buffer template (placeholder) */
  getTemplate(): string;
  /** Set a value into the engine */
  setValue(value: string): void;
  /** Get the underlying mask set (advanced) */
  getMaskSet(): MaskSet;
  /** Get the options */
  getOptions(): MaskOptions;
}

/** Alias definition for registration */
export interface AliasDefinition extends Partial<MaskOptions> {
  alias?: string;
}
