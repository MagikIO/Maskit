import { deepClone } from "./deep-clone.js";
import { escapeRegex } from "./escape-regex.js";
import { createMaskToken } from "./mask-token.js";
import type {
  MaskDefinition,
  MaskInput,
  MaskOptions,
  MaskSet,
  MaskToken,
  TestMatch,
} from "./types.js";

export function generateMaskSet(
  opts: MaskOptions,
  definitions: Record<string, MaskDefinition>,
  cache?: Map<string, MaskSet>,
  nocache?: boolean,
): MaskSet {
  function preProcessMask(
    mask: string,
    {
      repeat,
      groupmarker,
      quantifiermarker,
      keepStatic,
    }: Pick<
      MaskOptions,
      "repeat" | "groupmarker" | "quantifiermarker" | "keepStatic"
    >,
  ): string {
    if (
      (typeof repeat === "number" && repeat > 0) ||
      repeat === "*" ||
      repeat === "+"
    ) {
      const repeatStart = repeat === "*" ? 0 : repeat === "+" ? 1 : repeat;
      if (repeatStart !== repeat) {
        mask =
          groupmarker[0] +
          mask +
          groupmarker[1] +
          quantifiermarker[0] +
          repeatStart +
          "," +
          repeat +
          quantifiermarker[1];
      } else {
        const msk = mask;
        for (let i = 1; i < (repeatStart as number); i++) {
          mask += msk;
        }
      }
    }
    if (keepStatic === true) {
      const optionalRegex = "(.)\\[([^\\]]*)\\]";
      const maskMatches = mask.match(new RegExp(optionalRegex, "g"));
      if (maskMatches) {
        maskMatches.forEach((m) => {
          const [p1, p2Raw] = m.split("[");
          const p2 = p2Raw.replace("]", "");
          mask = mask.replace(
            new RegExp(`${escapeRegex(p1)}\\[${escapeRegex(p2)}\\]`),
            p1.charAt(0) === p2.charAt(0)
              ? `(${p1}|${p1}${p2})`
              : `${p1}[${p2}]`,
          );
        });
      }
    }
    return mask;
  }

  function generateMask(
    mask: string,
    metadata: unknown,
    opts: MaskOptions,
  ): MaskSet {
    let regexMask = false;
    if (mask === null || mask === "") {
      regexMask = opts.regex !== null;
      if (regexMask) {
        mask = opts.regex!;
        mask = mask.replace(/^(\^)(.*)(\$)$/, "$2");
      } else {
        regexMask = true;
        mask = ".*";
      }
    }
    if (mask.length === 1 && opts.greedy === false && opts.repeat !== 0) {
      opts.placeholder = "";
    }
    mask = preProcessMask(mask, opts);

    let maskdefKey: string;
    maskdefKey = regexMask
      ? `regex_${opts.regex}`
      : opts.numericInput
        ? mask.split("").reverse().join("")
        : mask;
    if (opts.keepStatic !== null) {
      maskdefKey = `ks_${opts.keepStatic}${maskdefKey}`;
    }
    if (typeof opts.placeholder === "object") {
      maskdefKey = `ph_${JSON.stringify(opts.placeholder)}${maskdefKey}`;
    }

    const cached = cache?.get(maskdefKey);
    if (cached && nocache !== true) {
      return deepClone(cached);
    }

    const masksetDefinition: MaskSet = {
      mask,
      maskToken: analyseMask(mask, regexMask, opts, definitions),
      validPositions: [],
      _buffer: undefined,
      buffer: undefined,
      tests: {},
      excludes: {},
      metadata,
      maskLength: undefined,
      jitOffset: {},
    };

    if (nocache !== true && cache) {
      cache.set(maskdefKey, masksetDefinition);
      return deepClone(masksetDefinition);
    }

    return masksetDefinition;
  }

  // Resolve mask option
  let maskOpt = opts.mask;
  if (typeof maskOpt === "function") {
    maskOpt = maskOpt(opts);
  }

  if (Array.isArray(maskOpt)) {
    if (maskOpt.length > 1) {
      if (opts.keepStatic === null) {
        opts.keepStatic = true;
      }
      let altMask = opts.groupmarker[0];
      const masks = opts.isRTL
        ? (maskOpt as (string | MaskInput)[]).slice().reverse()
        : (maskOpt as (string | MaskInput)[]);
      masks.forEach((msk) => {
        if (altMask.length > 1) {
          altMask += opts.alternatormarker;
        }
        if (typeof msk === "object" && msk.mask !== undefined) {
          altMask += msk.mask;
        } else {
          altMask += msk as string;
        }
      });
      altMask += opts.groupmarker[1];
      return generateMask(altMask, maskOpt, opts);
    } else {
      const singleMask = maskOpt[0];
      return processSingleMask(singleMask, opts);
    }
  }

  return processSingleMask(maskOpt, opts);

  function processSingleMask(
    maskOpt: string | MaskInput | null,
    opts: MaskOptions,
  ): MaskSet {
    let ms: MaskSet;
    if (
      maskOpt &&
      typeof maskOpt === "object" &&
      "mask" in maskOpt &&
      typeof maskOpt.mask !== "function"
    ) {
      ms = generateMask(maskOpt.mask as string, maskOpt, opts);
    } else {
      ms = generateMask(maskOpt as string, maskOpt, opts);
    }

    if (opts.keepStatic === null) {
      opts.keepStatic = false;
    }

    return ms;
  }
}

export function analyseMask(
  mask: string,
  regexMask: boolean,
  opts: MaskOptions,
  definitions: Record<string, MaskDefinition>,
): MaskToken[] {
  const tokenizer =
    /(?:[?*+]|\{[0-9+*]+(?:,[0-9+*]*)?(?:\|[0-9+*]*)?\})|[^.?*+^${[]()|\\]+|./g;
  const regexTokenizer =
    /\[\^?]?(?:[^\\\]]+|\\[\S\s]?)*]?|\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9][0-9]*|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4}|c[A-Za-z]|[\S\s]?)|\((?:\?[:=!]?)?|(?:[?*+]|\{[0-9]+(?:,[0-9]*)?\})\??|[^.?*+^${[()|\\]+|./g;

  const currentToken = createMaskToken();
  const openenings: MaskToken[] = [];
  const maskTokens: MaskToken[] = [];
  let escaped = false;
  let match: RegExpExecArray | null;
  let m: string;
  let openingToken: MaskToken;
  let currentOpeningToken: MaskToken;
  let alternator: MaskToken;
  let lastMatch: MaskToken | TestMatch | undefined;
  let closeRegexGroup = false;

  function insertTestDefinition(
    mtoken: MaskToken,
    element: string,
    position?: number,
  ): void {
    position = position !== undefined ? position : mtoken.matches.length;
    const prevMatch = mtoken.matches[position - 1] as TestMatch | undefined;
    let flag = opts.casing ? "i" : "";

    if (regexMask) {
      if (
        element.indexOf("[") === 0 ||
        (escaped && /\\d|\\s|\\w|\\p/i.test(element)) ||
        element === "."
      ) {
        if (/\\p\{.*}/i.test(element)) flag += "u";
        mtoken.matches.splice(position, 0, {
          fn: new RegExp(element, flag),
          static: false,
          optionality: false,
          newBlockMarker:
            prevMatch === undefined ? "master" : prevMatch.def !== element,
          casing: null,
          def: element,
          placeholder:
            typeof opts.placeholder === "object"
              ? opts.placeholder[currentToken.matches.length]
              : undefined,
          nativeDef: element,
        } as TestMatch);
      } else {
        if (escaped) element = element[element.length - 1];
        element.split("").forEach((lmnt) => {
          const prev = mtoken.matches[position! - 1] as TestMatch | undefined;
          mtoken.matches.splice(position!, 0, {
            fn: /[a-z]/i.test(opts.staticDefinitionSymbol || lmnt)
              ? new RegExp(
                  `[${opts.staticDefinitionSymbol || lmnt}]`,
                  flag,
                )
              : null,
            static: true,
            optionality: false,
            newBlockMarker:
              prev === undefined
                ? "master"
                : prev.def !== lmnt && prev.static !== true,
            casing: null,
            def: opts.staticDefinitionSymbol || lmnt,
            placeholder:
              opts.staticDefinitionSymbol !== undefined
                ? lmnt
                : typeof opts.placeholder === "object"
                  ? opts.placeholder[currentToken.matches.length]
                  : undefined,
            nativeDef: (escaped ? "'" : "") + lmnt,
          } as TestMatch);
          position!++;
        });
        escaped = false;
      }
    } else {
      const allDefs = { ...definitions, ...opts.definitions };
      const maskdef =
        allDefs[element] ||
        (opts.usePrototypeDefinitions ? definitions[element] : undefined);

      if (maskdef && !escaped) {
        if (
          typeof maskdef.validator === "string" &&
          /\\p\{.*}/i.test(maskdef.validator)
        )
          flag += "u";
        mtoken.matches.splice(position, 0, {
          fn: maskdef.validator
            ? typeof maskdef.validator === "string"
              ? new RegExp(maskdef.validator, flag)
              : ({ test: maskdef.validator } as unknown as RegExp)
            : /./,
          static: maskdef.static || false,
          optionality: maskdef.optional || false,
          defOptionality: maskdef.optional || false,
          newBlockMarker:
            prevMatch === undefined || maskdef.optional
              ? "master"
              : prevMatch.def !== (maskdef.definitionSymbol || element),
          casing: maskdef.casing ?? null,
          def: maskdef.definitionSymbol || element,
          placeholder: maskdef.placeholder,
          nativeDef: element,
          generated: maskdef.generated,
        } as TestMatch);
      } else {
        mtoken.matches.splice(position, 0, {
          fn: /[a-z]/i.test(opts.staticDefinitionSymbol || element)
            ? new RegExp(
                `[${opts.staticDefinitionSymbol || element}]`,
                flag,
              )
            : null,
          static: true,
          optionality: false,
          newBlockMarker:
            prevMatch === undefined
              ? "master"
              : prevMatch.def !== element && prevMatch.static !== true,
          casing: null,
          def: opts.staticDefinitionSymbol || element,
          placeholder:
            opts.staticDefinitionSymbol !== undefined ? element : undefined,
          nativeDef: (escaped ? "'" : "") + element,
        } as TestMatch);
        escaped = false;
      }
    }
  }

  function verifyGroupMarker(maskToken: MaskToken): void {
    if (maskToken?.matches) {
      maskToken.matches.forEach((token, ndx) => {
        const nextToken = maskToken.matches[ndx + 1] as MaskToken | undefined;
        if (
          (nextToken === undefined ||
            nextToken.matches === undefined ||
            nextToken.isQuantifier === false) &&
          token &&
          "isGroup" in token &&
          (token as MaskToken).isGroup
        ) {
          (token as MaskToken).isGroup = false;
          if (!regexMask) {
            insertTestDefinition(token as MaskToken, opts.groupmarker[0], 0);
            if ((token as MaskToken).openGroup !== true) {
              insertTestDefinition(token as MaskToken, opts.groupmarker[1]);
            }
          }
        }
        if ("matches" in token) {
          verifyGroupMarker(token as MaskToken);
        }
      });
    }
  }

  function defaultCase(): void {
    if (openenings.length > 0) {
      currentOpeningToken = openenings[openenings.length - 1];
      insertTestDefinition(currentOpeningToken, m);
      if (currentOpeningToken.isAlternator) {
        alternator = openenings.pop()!;
        for (let mndx = 0; mndx < alternator.matches.length; mndx++) {
          if ("isGroup" in alternator.matches[mndx])
            (alternator.matches[mndx] as MaskToken).isGroup = false;
        }
        if (openenings.length > 0) {
          currentOpeningToken = openenings[openenings.length - 1];
          currentOpeningToken.matches.push(alternator);
        } else {
          currentToken.matches.push(alternator);
        }
      }
    } else {
      insertTestDefinition(currentToken, m);
    }
  }

  function reverseTokens(maskToken: MaskToken): MaskToken {
    function reverseStatic(st: string): string {
      if (st === opts.optionalmarker[0]) return opts.optionalmarker[1];
      if (st === opts.optionalmarker[1]) return opts.optionalmarker[0];
      if (st === opts.groupmarker[0]) return opts.groupmarker[1];
      if (st === opts.groupmarker[1]) return opts.groupmarker[0];
      return st;
    }

    maskToken.matches = maskToken.matches.reverse();
    for (const key in maskToken.matches) {
      if (Object.hasOwn(maskToken.matches, key)) {
        const intMatch = parseInt(key);
        const item = maskToken.matches[intMatch];
        if (
          "isQuantifier" in item &&
          (item as MaskToken).isQuantifier &&
          maskToken.matches[intMatch + 1] &&
          "isGroup" in maskToken.matches[intMatch + 1] &&
          (maskToken.matches[intMatch + 1] as MaskToken).isGroup
        ) {
          const qt = maskToken.matches[intMatch];
          maskToken.matches.splice(intMatch, 1);
          maskToken.matches.splice(intMatch + 1, 0, qt);
        }
        if ("matches" in item && (item as MaskToken).matches !== undefined) {
          maskToken.matches[intMatch] = reverseTokens(item as MaskToken);
        } else {
          const testItem = item as TestMatch;
          testItem.def = reverseStatic(testItem.def);
        }
      }
    }
    return maskToken;
  }

  function groupify(matches: (TestMatch | MaskToken)[]): MaskToken {
    const groupToken = createMaskToken(true);
    groupToken.openGroup = false;
    groupToken.matches = matches;
    return groupToken;
  }

  function closeGroup(): void {
    openingToken = openenings.pop()!;
    openingToken.openGroup = false;
    if (openingToken !== undefined) {
      if (openenings.length > 0) {
        currentOpeningToken = openenings[openenings.length - 1];
        currentOpeningToken.matches.push(openingToken);
        if (currentOpeningToken.isAlternator) {
          alternator = openenings.pop()!;
          for (let mndx = 0; mndx < alternator.matches.length; mndx++) {
            if ("isGroup" in alternator.matches[mndx]) {
              (alternator.matches[mndx] as MaskToken).isGroup = false;
              (alternator.matches[mndx] as MaskToken).alternatorGroup = false;
            }
          }
          if (openenings.length > 0) {
            currentOpeningToken = openenings[openenings.length - 1];
            currentOpeningToken.matches.push(alternator);
          } else {
            currentToken.matches.push(alternator);
          }
        }
      } else {
        currentToken.matches.push(openingToken);
      }
    } else {
      defaultCase();
    }
  }

  function groupQuantifier(
    matches: (TestMatch | MaskToken)[],
  ): TestMatch | MaskToken {
    let last = matches.pop()!;
    if ("isQuantifier" in last && (last as MaskToken).isQuantifier) {
      last = groupify([matches.pop()!, last]);
    }
    return last;
  }

  if (regexMask) {
    (opts as MaskOptions).optionalmarker = [
      undefined as unknown as string,
      undefined as unknown as string,
    ];
  }

  while (
    (match = regexMask ? regexTokenizer.exec(mask) : tokenizer.exec(mask)) !==
    null
  ) {
    m = match[0];

    if (regexMask) {
      switch (m.charAt(0)) {
        case "?":
          m = "{0,1}";
          break;
        case "+":
        case "*":
          m = `{${m}}`;
          break;
        case "|":
          if (openenings.length === 0) {
            const altRegexGroup = groupify(currentToken.matches);
            altRegexGroup.openGroup = true;
            openenings.push(altRegexGroup);
            currentToken.matches = [];
            closeRegexGroup = true;
          }
          break;
      }
      switch (m) {
        case "\\d":
          m = "[0-9]";
          break;
        case "\\p":
          m += regexTokenizer.exec(mask)![0];
          m += regexTokenizer.exec(mask)![0];
          break;
        case "(?:":
        case "(?=":
        case "(?!":
        case "(?<=":
        case "(?<!":
          break;
      }
    }

    if (escaped) {
      defaultCase();
      continue;
    }

    switch (m.charAt(0)) {
      case "$":
      case "^":
        if (!regexMask) {
          defaultCase();
        }
        break;
      case opts.escapeChar:
        escaped = true;
        if (regexMask) defaultCase();
        break;
      case opts.optionalmarker[1]:
      case opts.groupmarker[1]:
        closeGroup();
        break;
      case opts.optionalmarker[0]:
        openenings.push(createMaskToken(false, true));
        break;
      case opts.groupmarker[0]:
        openenings.push(createMaskToken(true));
        break;
      case opts.quantifiermarker[0]: {
        const quantifier = createMaskToken(false, false, true);
        m = m.replace(/[{}?]/g, "");
        const mqj = m.split("|");
        const mq = mqj[0].split(",");
        let mq0: number | string = Number.isNaN(Number(mq[0]))
          ? mq[0]
          : parseInt(mq[0], 10);
        const mq1: number | string =
          mq.length === 1
            ? mq0
            : Number.isNaN(Number(mq[1]))
              ? mq[1]
              : parseInt(mq[1], 10);
        const mqJit: number | string | undefined = mqj[1]
          ? Number.isNaN(Number(mqj[1]))
            ? mqj[1]
            : parseInt(mqj[1], 10)
          : undefined;
        if (mq0 === "*" || mq0 === "+") {
          mq0 = mq1 === "*" ? 0 : 1;
        }
        quantifier.quantifier = {
          min: mq0,
          max: mq1,
          jit: mqJit as number | undefined,
        };
        const qmatches =
          openenings.length > 0
            ? openenings[openenings.length - 1].matches
            : currentToken.matches;
        let qmatch = qmatches.pop()!;
        if (!("isGroup" in qmatch) || !(qmatch as MaskToken).isGroup) {
          qmatch = groupify([qmatch]);
        }
        qmatches.push(qmatch);
        qmatches.push(quantifier);
        break;
      }
      case opts.alternatormarker:
        if (openenings.length > 0) {
          currentOpeningToken = openenings[openenings.length - 1];
          const subToken =
            currentOpeningToken.matches[currentOpeningToken.matches.length - 1];
          if (
            currentOpeningToken.openGroup &&
            (subToken === undefined ||
              !("matches" in subToken) ||
              ((subToken as MaskToken).isGroup === false &&
                (subToken as MaskToken).isAlternator === false))
          ) {
            lastMatch = openenings.pop();
          } else {
            lastMatch = groupQuantifier(currentOpeningToken.matches);
          }
        } else {
          lastMatch = groupQuantifier(currentToken.matches);
        }
        if (
          lastMatch &&
          "isAlternator" in lastMatch &&
          lastMatch.isAlternator
        ) {
          openenings.push(lastMatch as MaskToken);
        } else {
          if (
            lastMatch &&
            "alternatorGroup" in lastMatch &&
            lastMatch.alternatorGroup
          ) {
            alternator = openenings.pop()!;
            (lastMatch as MaskToken).alternatorGroup = false;
          } else {
            alternator = createMaskToken(false, false, false, true);
          }
          alternator.matches.push(lastMatch!);
          openenings.push(alternator);
          if (lastMatch && "openGroup" in lastMatch && lastMatch.openGroup) {
            (lastMatch as MaskToken).openGroup = false;
            const alternatorGroup = createMaskToken(true);
            alternatorGroup.alternatorGroup = true;
            openenings.push(alternatorGroup);
          }
        }
        break;
      default:
        defaultCase();
    }
  }

  if (closeRegexGroup) closeGroup();

  while (openenings.length > 0) {
    openingToken = openenings.pop()!;
    currentToken.matches.push(openingToken);
  }
  if (currentToken.matches.length > 0) {
    verifyGroupMarker(currentToken);
    maskTokens.push(currentToken);
  }

  if (opts.numericInput || opts.isRTL) {
    reverseTokens(maskTokens[0]);
  }

  return maskTokens;
}
