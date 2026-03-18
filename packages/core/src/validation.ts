import { deepClone } from "./deep-clone.js";
import {
  determineTestTemplate,
  getBuffer,
  getDecisionTaker,
  getLastValidPosition,
  getMaskTemplate,
  getPlaceholder,
  getTest,
  getTests,
  getTestTemplate,
  isMask,
  resetMaskSet,
  seekNext,
  seekPrevious,
} from "./test-resolver.js";
import type {
  CaretPosition,
  CommandObject,
  MaskDefinition,
  MaskOptions,
  MaskSet,
  TestMatch,
  TestResult,
  ValidationResult,
  ValidatorFn,
  ValidPosition,
} from "./types.js";

interface EngineContext {
  opts: MaskOptions;
  maskset: MaskSet;
  definitions: Record<string, MaskDefinition>;
  hasAlternator: boolean;
  isRTL: boolean;
}

function applyCasing(
  elem: string,
  test: TestMatch,
  pos: number,
  ctx: EngineContext,
): string {
  switch (ctx.opts.casing || test.casing) {
    case "upper":
      return elem.toLocaleUpperCase();
    case "lower":
      return elem.toLocaleLowerCase();
    case "title": {
      const posBefore = ctx.maskset.validPositions[pos - 1];
      if (pos === 0 || (posBefore && posBefore.input === " ")) {
        return elem.toLocaleUpperCase();
      }
      return elem.toLocaleLowerCase();
    }
    default:
      if (typeof ctx.opts.casing === "function") {
        return ctx.opts.casing(elem, test, pos, ctx.maskset.validPositions);
      }
      return elem;
  }
}

export function checkAlternationMatch(
  altArr1: string[],
  altArr2: string[],
  opts: MaskOptions,
  na?: string,
): boolean {
  const altArrC = opts.greedy ? altArr2 : altArr2.slice(0, 1);
  let isMatch = false;
  const naArr = na !== undefined ? na.split(",") : [];

  for (let i = 0; i < naArr.length; i++) {
    const naNdx = altArr1.indexOf(naArr[i]);
    if (naNdx !== -1) {
      altArr1.splice(naNdx, 1);
    }
  }

  for (let alndx = 0; alndx < altArr1.length; alndx++) {
    if (altArrC.includes(altArr1[alndx])) {
      isMatch = true;
      break;
    }
  }
  return isMatch;
}

export function isComplete(
  ctx: EngineContext,
  buffer: string[],
): boolean | undefined {
  const { opts, maskset, definitions } = ctx;

  if (typeof opts.isComplete === "function")
    return opts.isComplete(buffer, opts) ?? undefined;
  if (opts.repeat === "*") return undefined;

  let complete = false;
  const lrp = determineLastRequiredPosition(ctx, true);
  const aml = lrp.l;

  if (
    lrp.def === undefined ||
    lrp.def.newBlockMarker ||
    lrp.def.optionality ||
    lrp.def.optionalQuantifier
  ) {
    complete = true;
    for (let i = 0; i <= aml; i++) {
      const test = getTestTemplate(i, opts, maskset, definitions).match;
      if (
        (test.static !== true &&
          maskset.validPositions[i] === undefined &&
          (test.optionality === false ||
            test.optionality === undefined ||
            (test.optionality && test.newBlockMarker === false)) &&
          (test.optionalQuantifier === false ||
            test.optionalQuantifier === undefined)) ||
        (test.static === true &&
          test.def !== "" &&
          buffer[i] !== getPlaceholder(i, opts, maskset, definitions, test))
      ) {
        complete = false;
        break;
      }
    }
  }

  return complete;
}

function determineLastRequiredPosition(
  ctx: EngineContext,
  returnDefinition: true,
): { l: number; def: TestMatch | undefined };
function determineLastRequiredPosition(
  ctx: EngineContext,
  returnDefinition?: false,
): number;
function determineLastRequiredPosition(
  ctx: EngineContext,
  returnDefinition?: boolean,
): number | { l: number; def: TestMatch | undefined } {
  const { opts, maskset, definitions } = ctx;
  const lvp = getLastValidPosition(maskset);
  const positions: Record<number, TestResult> = {};
  const lvTest = maskset.validPositions[lvp];
  const buffer = getMaskTemplate(
    opts,
    maskset,
    definitions,
    true,
    getLastValidPosition(maskset),
    true,
    true,
  );
  let bl = buffer.length;
  let ndxIntlzr = lvTest !== undefined ? lvTest.locator.slice() : undefined;
  let testPos: TestResult;

  for (let pos = lvp + 1; pos < buffer.length; pos++) {
    testPos = getTestTemplate(
      pos,
      opts,
      maskset,
      definitions,
      ndxIntlzr,
      pos - 1,
    );
    ndxIntlzr = testPos.locator.slice();
    positions[pos] = deepClone(testPos);
  }

  const lvTestAlt =
    lvTest && lvTest.alternation !== undefined
      ? lvTest.locator[lvTest.alternation]
      : undefined;

  for (let pos = bl - 1; pos > lvp; pos--) {
    testPos = positions[pos];
    if (
      testPos &&
      (testPos.match.optionality ||
        (testPos.match.optionalQuantifier && testPos.match.newBlockMarker) ||
        (lvTestAlt &&
          ((lvTestAlt !== positions[pos].locator[lvTest!.alternation!] &&
            testPos.match.static !== true) ||
            (testPos.match.static === true &&
              testPos.locator[lvTest!.alternation!] &&
              checkAlternationMatch(
                testPos.locator[lvTest!.alternation!].toString().split(","),
                lvTestAlt.toString().split(","),
                opts,
              ) &&
              getTests(pos, opts, maskset, definitions)[0].match.def !==
                "")))) &&
      buffer[pos] ===
        getPlaceholder(pos, opts, maskset, definitions, testPos.match)
    ) {
      bl--;
    } else {
      break;
    }
  }

  if (lvp === -1 || bl <= lvp) {
    bl = lvp + 1 > 0 ? lvp + 1 : 0;
  }

  return returnDefinition
    ? {
        l: bl,
        def: positions[bl] ? positions[bl].match : undefined,
      }
    : bl;
}

function isSelection(pos: CaretPosition | number, ctx: EngineContext): boolean {
  if (typeof pos === "number") return false;
  const insertModeOffset = ctx.opts.insertMode ? 0 : 1;
  return ctx.isRTL
    ? pos.begin - pos.end > insertModeOffset
    : pos.end - pos.begin > insertModeOffset;
}

function positionCanMatchDefinition(
  pos: number,
  testDefinition: ValidPosition,
  ctx: EngineContext,
): boolean | undefined {
  const { opts, maskset, definitions } = ctx;
  let valid: boolean | undefined = false;
  const tests = getTests(pos, opts, maskset, definitions);
  for (let tndx = 0; tndx < tests.length; tndx++) {
    if (
      tests[tndx].match &&
      ((tests[tndx].match.nativeDef ===
        testDefinition.match[opts.shiftPositions ? "def" : "nativeDef"] &&
        (!opts.shiftPositions || !testDefinition.match.static)) ||
        tests[tndx].match.nativeDef === testDefinition.match.nativeDef ||
        (opts.regex &&
          !tests[tndx].match.static &&
          tests[tndx].match.fn !== null &&
          (tests[tndx].match.fn instanceof RegExp
            ? (tests[tndx].match.fn as RegExp).test(testDefinition.input)
            : (tests[tndx].match.fn as ValidatorFn)(testDefinition.input, maskset, pos, false, opts) !== false)))
    ) {
      valid = true;
      break;
    } else if (
      tests[tndx].match &&
      tests[tndx].match.def === testDefinition.match.nativeDef
    ) {
      valid = undefined;
      break;
    }
  }
  if (valid === false) {
    if (maskset.jitOffset[pos] !== undefined) {
      valid = positionCanMatchDefinition(
        pos + maskset.jitOffset[pos],
        testDefinition,
        ctx,
      );
    }
  }
  return valid;
}

export function revalidateMask(
  pos: CaretPosition | number,
  ctx: EngineContext,
  validTest?: TestResult & { input?: string },
  fromIsValid?: boolean,
  validatedPos?: number,
): number | false {
  const { opts, maskset, definitions } = ctx;

  let offset = 0;
  const begin = typeof pos === "number" ? pos : pos.begin;
  let end = typeof pos === "number" ? pos : pos.end;

  const normalizedBegin = begin > end ? end : begin;
  const normalizedEnd = begin > end ? begin : end;

  validatedPos = validatedPos !== undefined ? validatedPos : normalizedBegin;

  if (
    fromIsValid === undefined &&
    (normalizedBegin !== normalizedEnd ||
      (opts.insertMode && maskset.validPositions[validatedPos] !== undefined) ||
      validTest === undefined ||
      validTest.match.optionalQuantifier ||
      validTest.match.optionality)
  ) {
    const positionsClone = deepClone(maskset.validPositions);
    const lvp = getLastValidPosition(maskset, undefined, true);
    maskset.p = normalizedBegin;

    const clearpos = isSelection(
      typeof pos === "number" ? { begin: pos, end: pos } : pos,
      ctx,
    )
      ? normalizedBegin
      : validatedPos;
    for (let i = lvp; i >= clearpos; i--) {
      maskset.validPositions.splice(i, 1);
      if (validTest === undefined) delete maskset.tests[i + 1];
    }

    let j = validatedPos;
    let posMatch = j;
    let valid = true;

    if (validTest) {
      maskset.validPositions[validatedPos] = deepClone(
        validTest,
      ) as ValidPosition;
      posMatch++;
      j++;
    }

    if (
      positionsClone[normalizedEnd] === undefined &&
      maskset.jitOffset[normalizedEnd]
    ) {
      end = normalizedEnd + maskset.jitOffset[normalizedEnd] + 1;
    }

    for (let i = validTest ? normalizedEnd : normalizedEnd - 1; i <= lvp; i++) {
      const t = positionsClone[i];
      if (
        t !== undefined &&
        t.generatedInput !== true &&
        (i >= normalizedEnd ||
          (i >= normalizedBegin &&
            isEnclosedStatic(i, positionsClone, {
              begin: normalizedBegin,
              end: normalizedEnd,
            })))
      ) {
        while (getTest(posMatch, opts, maskset, definitions).match.def !== "") {
          const canMatch = positionCanMatchDefinition(posMatch, t, ctx);
          if (canMatch !== false || t.match.def === "+") {
            if (t.match.def === "+")
              getBuffer(opts, maskset, definitions, true);
            const result = isValid(
              posMatch,
              t.input,
              ctx,
              t.match.def !== "+",
              true,
            );
            valid = result !== false;
            j = ((result as CommandObject).pos || posMatch) + 1;
            if (!valid && canMatch) break;
          } else {
            valid = false;
          }
          if (valid) {
            if (
              validTest === undefined &&
              t.match.static &&
              i === (typeof pos === "number" ? pos : pos.begin)
            )
              offset++;
            break;
          }
          if (posMatch > (maskset.maskLength ?? Infinity)) {
            break;
          }
          posMatch++;
        }
        if (getTest(posMatch, opts, maskset, definitions).match.def === "") {
          valid = false;
        }
        posMatch = j;
      }
      if (!valid) break;
    }
    if (!valid) {
      maskset.validPositions = deepClone(positionsClone);
      resetMaskSet(maskset, true);
      return false;
    }
  } else if (
    validTest &&
    getTest(validatedPos, opts, maskset, definitions).cd === validTest.cd
  ) {
    maskset.validPositions[validatedPos] = deepClone(
      validTest,
    ) as ValidPosition;
  }

  resetMaskSet(maskset, true);
  return offset;
}

function isEnclosedStatic(
  pos: number,
  valids: ValidPosition[],
  selection: { begin: number; end: number },
): boolean {
  const posMatch = valids[pos];
  if (
    posMatch !== undefined &&
    posMatch.match.static === true &&
    !posMatch.match.optionality &&
    (valids[0] === undefined || valids[0].alternation === undefined)
  ) {
    const prevMatch =
      selection.begin <= pos - 1
        ? valids[pos - 1] &&
          valids[pos - 1].match.static === true &&
          valids[pos - 1]
        : valids[pos - 1];
    const nextMatch =
      selection.end > pos + 1
        ? valids[pos + 1] &&
          valids[pos + 1].match.static === true &&
          valids[pos + 1]
        : valids[pos + 1];
    return !!(prevMatch && nextMatch);
  }
  return false;
}

export function isValid(
  pos: number | CaretPosition,
  c: string,
  ctx: EngineContext,
  strict?: boolean,
  fromIsValid?: boolean,
  fromAlternate?: boolean,
  validateOnly?: boolean,
  fromCheckval?: boolean,
): ValidationResult {
  const { opts, maskset, definitions } = ctx;
  strict = strict === true;

  let maskPos = typeof pos === "number" ? pos : ctx.isRTL ? pos.end : pos.begin;

  function processCommandObject(
    commandObj: ValidationResult,
  ): ValidationResult {
    if (
      commandObj !== undefined &&
      commandObj !== false &&
      commandObj !== true
    ) {
      if (commandObj.remove !== undefined) {
        if (!Array.isArray(commandObj.remove))
          commandObj.remove = [commandObj.remove];
        (commandObj.remove as { pos: number }[])
          .sort((a, b) => (ctx.isRTL ? a.pos - b.pos : b.pos - a.pos))
          .forEach((lmnt) => {
            revalidateMask(
              {
                begin: typeof lmnt === "number" ? lmnt : lmnt.pos,
                end: (typeof lmnt === "number" ? lmnt : lmnt.pos) + 1,
              },
              ctx,
            );
          });
        commandObj.remove = undefined;
      }
      if (commandObj.insert !== undefined) {
        if (!Array.isArray(commandObj.insert))
          commandObj.insert = [commandObj.insert];
        commandObj.insert
          .sort((a, b) => (ctx.isRTL ? b.pos - a.pos : a.pos - b.pos))
          .forEach((lmnt) => {
            if (lmnt.c !== "") {
              isValid(
                lmnt.pos,
                lmnt.c,
                ctx,
                lmnt.strict !== undefined ? lmnt.strict : true,
                lmnt.fromIsValid !== undefined ? lmnt.fromIsValid : fromIsValid,
              );
            }
          });
        commandObj.insert = undefined;
      }

      if (commandObj.refreshFromBuffer && commandObj.buffer) {
        const refresh = commandObj.refreshFromBuffer;
        refreshFromBuffer(
          ctx,
          refresh === true
            ? refresh
            : (refresh as { start: number; end: number }).start,
          typeof refresh === "object" ? refresh.end : undefined,
          commandObj.buffer,
        );
        commandObj.refreshFromBuffer = undefined;
      }

      if (commandObj.rewritePosition !== undefined) {
        maskPos = commandObj.rewritePosition;
        commandObj = true;
      }
    }
    return commandObj;
  }

  function _isValid(
    position: number,
    c: string,
    strict: boolean,
  ): ValidationResult {
    let rslt: ValidationResult = false;
    getTests(position, opts, maskset, definitions).every((tst) => {
      const test = tst.match;
      getBuffer(opts, maskset, definitions, true);
      if (
        test.jit &&
        maskset.validPositions[
          seekPrevious(position, opts, maskset, definitions)
        ] === undefined
      ) {
        rslt = false;
      } else {
        if (test.fn != null) {
          let fnResult: boolean | CommandObject;
          if (test.fn instanceof RegExp) {
            fnResult = test.fn.test(c);
          } else {
            fnResult = test.fn(c, maskset, position, strict, opts);
          }
          if (fnResult !== false) {
            rslt =
              typeof fnResult === "object" ? { c, pos: position, ...fnResult } : { c, pos: position };
          } else {
            rslt = false;
          }
        } else {
          rslt =
            (c === test.def || c === opts.skipOptionalPartCharacter) &&
                test.def !== ""
              ? {
                  c:
                    getPlaceholder(
                      position,
                      opts,
                      maskset,
                      definitions,
                      test,
                      true,
                    ) || test.def,
                  pos: position,
                }
              : false;
        }
      }
      if (rslt !== false) {
        let elem =
          (rslt as CommandObject).c !== undefined
            ? (rslt as CommandObject).c!
            : c;
        let validatedPos = position;
        elem =
          elem === opts.skipOptionalPartCharacter && test.static === true
            ? getPlaceholder(
                position,
                opts,
                maskset,
                definitions,
                test,
                true,
              ) || test.def
            : elem;

        rslt = processCommandObject(rslt);

        if (
          rslt !== true &&
          (rslt as CommandObject).pos !== undefined &&
          (rslt as CommandObject).pos !== position
        ) {
          validatedPos = (rslt as CommandObject).pos!;
        }

        if (
          rslt !== true &&
          (rslt as CommandObject).pos === undefined &&
          (rslt as CommandObject).c === undefined
        ) {
          return false;
        }

        if (
          revalidateMask(
            typeof pos === "number" ? pos : (pos as CaretPosition),
            ctx,
            {
              ...tst,
              input: applyCasing(elem, test, validatedPos, ctx),
            },
            fromIsValid,
            validatedPos,
          ) === false
        ) {
          rslt = false;
        }
        return false;
      }
      return true;
    });
    return rslt;
  }

  let result: ValidationResult = true;
  const positionsClone = deepClone(maskset.validPositions);

  if (
    opts.keepStatic === false &&
    maskset.excludes[maskPos] !== undefined &&
    fromAlternate !== true &&
    fromIsValid !== true
  ) {
    for (
      let i = maskPos;
      i <
      (ctx.isRTL
        ? (pos as CaretPosition).begin
        : ((pos as CaretPosition).end ?? maskPos + 1));
      i++
    ) {
      if (maskset.excludes[i] !== undefined) {
        maskset.excludes[i] = undefined as unknown as string[];
        delete maskset.tests[i];
      }
    }
  }

  if (
    typeof opts.preValidation === "function" &&
    fromIsValid !== true &&
    validateOnly !== true
  ) {
    result = opts.preValidation(
      getBuffer(opts, maskset, definitions),
      maskPos,
      c,
      isSelection(
        typeof pos === "number" ? { begin: pos, end: pos } : pos,
        ctx,
      ),
      opts,
      maskset,
      typeof pos === "number" ? { begin: pos, end: pos } : pos,
      strict || !!fromAlternate,
    );
    result = processCommandObject(result as ValidationResult);
  }

  if (result === true) {
    result = _isValid(maskPos, c, strict);
    if (
      (!strict || fromIsValid === true) &&
      result === false &&
      validateOnly !== true
    ) {
      const currentPosValid = maskset.validPositions[maskPos];
      if (
        currentPosValid &&
        currentPosValid.match.static === true &&
        (currentPosValid.match.def === c ||
          c === opts.skipOptionalPartCharacter)
      ) {
        result = {
          caret: seekNext(maskPos, opts, maskset, definitions),
        };
      } else if (
        opts.insertMode ||
        maskset.validPositions[
          seekNext(maskPos, opts, maskset, definitions)
        ] === undefined ||
        (typeof pos !== "number" && pos.end > maskPos)
      ) {
        let skip = false;
        if (
          maskset.jitOffset[maskPos] &&
          maskset.validPositions[
            seekNext(maskPos, opts, maskset, definitions)
          ] === undefined
        ) {
          result = isValid(
            maskPos + maskset.jitOffset[maskPos],
            c,
            ctx,
            true,
            true,
          );
          if (result !== false) {
            if (fromAlternate !== true)
              (result as CommandObject).caret = maskPos;
            skip = true;
          }
        }
        if (typeof pos !== "number" && pos.end > maskPos) {
          maskset.validPositions[maskPos] =
            undefined as unknown as ValidPosition;
        }
        if (
          !skip &&
          !isMask(
            maskPos,
            opts,
            maskset,
            definitions,
            opts.keepStatic !== null &&
              opts.keepStatic !== false &&
              maskPos === 0
              ? true
              : undefined,
          )
        ) {
          for (
            let nPos = maskPos + 1,
              snPos = seekNext(
                maskPos,
                opts,
                maskset,
                definitions,
                false,
                maskPos !== 0 ? undefined : false,
              );
            nPos <= snPos;
            nPos++
          ) {
            result = _isValid(nPos, c, strict);
            if (result !== false) {
              result =
                trackbackPositions(
                  maskPos,
                  (result as CommandObject).pos !== undefined
                    ? (result as CommandObject).pos!
                    : nPos,
                  ctx,
                ) || result;
              maskPos = nPos;
              break;
            }
          }
        }
      }
    }

    if (ctx.hasAlternator && fromAlternate !== true && !strict) {
      fromAlternate = true;
      if (result === false) {
        if (
          opts.keepStatic === true ||
          (typeof opts.keepStatic === "number" &&
            Number.isFinite(opts.keepStatic) &&
            maskPos >= opts.keepStatic)
        ) {
          result = alternate(
            maskPos,
            c,
            ctx,
            strict,
            fromIsValid,
            undefined,
            typeof pos === "number" ? { begin: pos, end: pos } : pos,
          );
        }
      } else if (result === true) {
        if (
          isSelection(
            typeof pos === "number" ? { begin: pos, end: pos } : pos,
            ctx,
          ) &&
          maskset.tests[maskPos] &&
          maskset.tests[maskPos].length > 1 &&
          opts.keepStatic
        ) {
          result = alternate(maskPos, c, ctx, true) || result;
        } else if (
          opts.numericInput !== true &&
          maskset.tests[maskPos] &&
          maskset.tests[maskPos].length > 1 &&
          getLastValidPosition(maskset, undefined, true) > maskPos
        ) {
          result = alternate(maskPos, c, ctx, true) || result;
        }
      }
    }

    if (result === true) {
      result = { pos: maskPos };
    }

    if (
      typeof opts.postValidation === "function" &&
      fromIsValid !== true &&
      validateOnly !== true
    ) {
      const postResult = opts.postValidation(
        getBuffer(opts, maskset, definitions, true),
        typeof pos !== "number" ? (ctx.isRTL ? pos.end : pos.begin) : pos,
        c,
        result,
        opts,
        maskset,
        strict,
        !!fromCheckval,
        !!fromAlternate,
      );
      if (postResult !== undefined) {
        result =
          postResult === true ? result : (postResult as ValidationResult);
      }
    }
  }

  if (result && (result as CommandObject).pos === undefined) {
    (result as CommandObject).pos = maskPos;
  }

  if (result === false || validateOnly === true) {
    resetMaskSet(maskset, true);
    maskset.validPositions = deepClone(positionsClone);
  } else {
    trackbackPositions(undefined, maskPos, ctx, true);
  }

  return processCommandObject(result);
}

function trackbackPositions(
  originalPos: number | undefined,
  newPos: number,
  ctx: EngineContext,
  fillOnly?: boolean,
): ValidationResult {
  const { opts, maskset, definitions } = ctx;

  if (originalPos === undefined) {
    for (originalPos = newPos - 1; originalPos > 0; originalPos--) {
      if (maskset.validPositions[originalPos]) break;
    }
  }
  for (let ps = originalPos; ps < newPos; ps++) {
    if (
      maskset.validPositions[ps] === undefined &&
      !isMask(ps, opts, maskset, definitions, false)
    ) {
      const vp =
        ps === 0
          ? getTest(ps, opts, maskset, definitions)
          : maskset.validPositions[ps - 1];
      if (vp) {
        const tests = getTests(ps, opts, maskset, definitions).slice();
        if (tests[tests.length - 1].match.def === "") tests.pop();
        const bestMatch = determineTestTemplate(ps, tests, opts);
        if (
          bestMatch &&
          (bestMatch.match.jit !== true ||
            (bestMatch.match.newBlockMarker === "master" &&
              maskset.validPositions[ps + 1]?.match.optionalQuantifier ===
                true))
        ) {
          const extMatch = {
            ...deepClone(bestMatch),
            input:
              getPlaceholder(
                ps,
                opts,
                maskset,
                definitions,
                bestMatch.match,
                true,
              ) || bestMatch.match.def,
            generatedInput: true,
          };
          revalidateMask(ps, ctx, extMatch, true);

          if (fillOnly !== true) {
            const cvpInput = maskset.validPositions[newPos]?.input;
            if (cvpInput !== undefined) {
              maskset.validPositions[newPos] =
                undefined as unknown as ValidPosition;
              return isValid(newPos, cvpInput, ctx, true, true);
            }
          }
        }
      }
    }
  }
  return false;
}

export function alternate(
  maskPos: number | true,
  c: string | undefined,
  ctx: EngineContext,
  strict?: boolean,
  fromIsValid?: boolean,
  rAltPos?: number,
  selection?: CaretPosition,
): ValidationResult {
  const { opts, maskset, definitions } = ctx;

  if (!ctx.hasAlternator) return false;

  const validPsClone = deepClone(maskset.validPositions);
  const tstClone = deepClone(maskset.tests);
  let lastAlt: number | undefined;
  let alternation: number | undefined;
  let isValidRslt: boolean | ValidationResult = false;
  let returnRslt: ValidationResult = false;
  let altPos: TestResult | undefined;
  let prevAltPos: TestResult | undefined;
  let decisionPos: number;
  let lAltPos = rAltPos !== undefined ? rAltPos : getLastValidPosition(maskset);
  let begin: number | undefined;
  let end: number | undefined;

  if (selection) {
    begin = selection.begin;
    end = selection.end;
    if (selection.begin > selection.end) {
      begin = selection.end;
      end = selection.begin;
    }
  }

  if (lAltPos === -1 && rAltPos === undefined) {
    lastAlt = 0;
    prevAltPos = getTest(lastAlt, opts, maskset, definitions);
    alternation = prevAltPos.alternation;
  } else {
    for (; lAltPos >= 0; lAltPos--) {
      altPos =
        lAltPos === 0
          ? getTest(0, opts, maskset, definitions)
          : maskset.validPositions[lAltPos];
      if (altPos && altPos.alternation !== undefined) {
        if (
          lAltPos <= (typeof maskPos === "number" ? maskPos : 0) &&
          prevAltPos &&
          prevAltPos.locator[altPos.alternation] !==
            altPos.locator[altPos.alternation]
        ) {
          break;
        }
        lastAlt = lAltPos;
        alternation = altPos.alternation;
        prevAltPos = altPos;
      }
    }
  }

  if (alternation !== undefined) {
    decisionPos = parseInt(String(lastAlt), 10);
    maskset.excludes[decisionPos] = maskset.excludes[decisionPos] || [];
    if (maskPos !== true) {
      maskset.excludes[decisionPos].push(
        `${getDecisionTaker(prevAltPos!)}:${prevAltPos!.alternation}`,
      );
    }

    const validInputs: string[] = [];
    let resultPos = -1;
    for (
      let i = decisionPos;
      decisionPos < getLastValidPosition(maskset, undefined, true) + 1;
      i++
    ) {
      if (
        resultPos === -1 &&
        typeof maskPos === "number" &&
        maskPos <= i &&
        c !== undefined
      ) {
        validInputs.push(c);
        resultPos = validInputs.length - 1;
      }
      const validPos = maskset.validPositions[decisionPos];
      if (
        validPos &&
        validPos.generatedInput !== true &&
        (decisionPos !== 0 ||
          validPos.input !== opts.skipOptionalPartCharacter) &&
        (selection === undefined || i < begin! || i >= end!)
      ) {
        validInputs.push(validPos.input);
      }
      maskset.validPositions.splice(decisionPos, 1);
    }
    if (resultPos === -1 && c !== undefined) {
      validInputs.push(c);
      resultPos = validInputs.length - 1;
    }

    while (
      maskset.excludes[decisionPos] !== undefined &&
      maskset.excludes[decisionPos].length < 10
    ) {
      maskset.tests = {};
      resetMaskSet(maskset, true);
      isValidRslt = true;
      let nextPos = decisionPos - 1;
      for (let i = 0; i < validInputs.length; i++) {
        nextPos =
          i === 0 ||
          (returnRslt as CommandObject)?.caret !== undefined ||
          opts.insertMode === false
            ? seekNext(nextPos, opts, maskset, definitions)
            : getLastValidPosition(maskset, nextPos, true) + 1;
        const input = validInputs[i];
        if (
          !(isValidRslt = isValid(nextPos, input, ctx, false, true) as boolean)
        ) {
          if (isComplete(ctx, getBuffer(opts, maskset, definitions))) {
            isValidRslt = returnRslt as boolean;
          }
          break;
        }
        if (i === resultPos) {
          returnRslt = isValidRslt as ValidationResult;
        }
        if (maskPos === true && isValidRslt) {
          returnRslt = { caret: i };
        }
      }

      if (!isValidRslt) {
        resetMaskSet(maskset);
        prevAltPos = getTest(decisionPos, opts, maskset, definitions);
        maskset.validPositions = deepClone(validPsClone);
        maskset.tests = deepClone(tstClone);
        returnRslt = false;
        if (maskset.excludes[decisionPos]) {
          if (prevAltPos.alternation !== undefined) {
            const decisionTaker = getDecisionTaker(prevAltPos);
            if (
              maskset.excludes[decisionPos].indexOf(
                `${decisionTaker}:${prevAltPos.alternation}`,
              ) !== -1
            ) {
              returnRslt = alternate(
                maskPos,
                c,
                ctx,
                strict,
                fromIsValid,
                decisionPos - 1,
                selection,
              );
              break;
            }
            maskset.excludes[decisionPos].push(
              `${decisionTaker}:${prevAltPos.alternation}`,
            );
            for (
              let i = decisionPos;
              i < getLastValidPosition(maskset, undefined, true) + 1;
              i++
            )
              maskset.validPositions.splice(decisionPos);
          } else delete maskset.excludes[decisionPos];
        } else {
          returnRslt = alternate(
            maskPos,
            c,
            ctx,
            strict,
            fromIsValid,
            decisionPos - 1,
            selection,
          );
          break;
        }
      } else {
        break;
      }
    }
  }

  if (!returnRslt || opts.keepStatic !== false) {
    delete maskset.excludes[decisionPos!];
  }
  if (!returnRslt) {
    maskset.validPositions = deepClone(validPsClone);
    maskset.tests = deepClone(tstClone);
  }
  return returnRslt;
}

export function handleRemove(
  direction: "backspace" | "delete",
  pos: CaretPosition,
  ctx: EngineContext,
  strict?: boolean,
): void {
  const { opts, maskset, definitions } = ctx;
  const mutablePos = { ...pos };

  if (opts.numericInput || ctx.isRTL) {
    if (direction === "backspace") {
      direction = "delete";
    } else {
      direction = "backspace";
    }
    if (ctx.isRTL) {
      const pend = mutablePos.end;
      mutablePos.end = mutablePos.begin;
      mutablePos.begin = pend;
    }
  }

  const lvp = getLastValidPosition(maskset, undefined, true);
  if (
    mutablePos.end >= getBuffer(opts, maskset, definitions).length &&
    lvp >= mutablePos.end
  ) {
    mutablePos.end = lvp + 1;
  }

  if (direction === "backspace") {
    if (mutablePos.end - mutablePos.begin < 1) {
      mutablePos.begin = seekPrevious(
        mutablePos.begin,
        opts,
        maskset,
        definitions,
      );
    }
  } else if (direction === "delete") {
    if (mutablePos.begin === mutablePos.end) {
      mutablePos.end = isMask(
        mutablePos.end,
        opts,
        maskset,
        definitions,
        true,
        true,
      )
        ? mutablePos.end + 1
        : seekNext(mutablePos.end, opts, maskset, definitions) + 1;
    }
  }

  const offset = revalidateMask(mutablePos, ctx);
  if (offset !== false) {
    if (
      (strict !== true && opts.keepStatic !== false) ||
      (opts.regex !== null &&
        getTest(mutablePos.begin, opts, maskset, definitions).match.def.indexOf(
          "|",
        ) !== -1)
    ) {
      alternate(true, undefined, ctx);
    }
    if (strict !== true) {
      maskset.p =
        direction === "delete"
          ? mutablePos.begin + (offset as number)
          : mutablePos.begin;
    }
  }
}

function refreshFromBuffer(
  ctx: EngineContext,
  start: boolean | number,
  end: number | undefined,
  buffer: string[],
): void {
  const { opts, maskset } = ctx;
  const skipOptionalPartCharacter = opts.skipOptionalPartCharacter;
  opts.skipOptionalPartCharacter = "";
  const bffr = ctx.isRTL ? buffer.slice().reverse() : buffer;

  if (start === true) {
    resetMaskSet(maskset, false);
    start = 0;
    end = buffer.length;
  } else {
    for (let i = start as number; i < (end ?? buffer.length); i++) {
      delete maskset.validPositions[i];
    }
  }

  let p = start as number;
  for (let i = start as number; i < (end ?? buffer.length); i++) {
    const valResult = isValid(p, bffr[i].toString(), ctx, true, true);
    if (
      valResult !== false &&
      (valResult as CommandObject).forwardPosition !== undefined
    ) {
      p = (valResult as CommandObject).forwardPosition!;
    }
  }

  opts.skipOptionalPartCharacter = skipOptionalPartCharacter;
}

export function checkVal(
  ctx: EngineContext,
  inputValue: string[],
  strict?: boolean,
): { caretPos: number } {
  const { opts, maskset } = ctx;
  const skipOptionalPartCharacter = opts.skipOptionalPartCharacter;
  opts.skipOptionalPartCharacter = "";

  resetMaskSet(maskset, false);
  const initialNdx = 0;
  maskset.p = initialNdx;
  let caretPos = initialNdx;
  let result: ValidationResult;

  inputValue.forEach((charCode) => {
    if (charCode !== undefined) {
      const lvp = getLastValidPosition(maskset, undefined, true);
      result = processKeypress(caretPos, charCode, ctx, strict);
      if (result) {
        if (
          (result as CommandObject).pos !== undefined &&
          (result as CommandObject).forwardPosition !== undefined
        ) {
          caretPos = (result as CommandObject).forwardPosition!;
        } else if ((result as CommandObject).pos !== undefined) {
          caretPos = (result as CommandObject).pos! + 1;
        } else {
          caretPos = lvp + 2;
        }
      }
    }
  });

  opts.skipOptionalPartCharacter = skipOptionalPartCharacter;
  return { caretPos };
}

function processKeypress(
  pos: number,
  c: string,
  ctx: EngineContext,
  strict?: boolean,
): ValidationResult {
  const { opts, maskset, definitions } = ctx;

  // Apply substitutes
  if (opts.substitutes[c]) {
    c = opts.substitutes[c];
  }

  const result = isValid(pos, c, ctx, strict, false, false, false, true);
  if (result !== false) {
    const resultObj = result as CommandObject;
    if (resultObj.pos === undefined) {
      resultObj.pos = pos;
    }
    const np =
      resultObj.caret !== undefined
        ? resultObj.caret
        : seekNext(resultObj.pos, opts, maskset, definitions);
    resultObj.forwardPosition = np;
    return resultObj as ValidationResult;
  }
  return false;
}

export function unmaskedvalue(ctx: EngineContext): string {
  const { opts, maskset, definitions } = ctx;
  const umValue: string[] = [];
  const vps = maskset.validPositions;

  for (let pndx = 0, vpl = vps.length; pndx < vpl; pndx++) {
    if (
      vps[pndx]?.match &&
      (vps[pndx].match.static != true ||
        (opts.keepStatic !== true &&
          Array.isArray(maskset.metadata) &&
          vps[pndx].generatedInput !== true))
    ) {
      umValue.push(vps[pndx].input);
    }
  }
  let unmasked =
    umValue.length === 0
      ? ""
      : (ctx.isRTL ? umValue.reverse() : umValue).join("");

  if (typeof opts.onUnMask === "function") {
    const bufferValue = (
      ctx.isRTL
        ? getBuffer(opts, maskset, definitions).slice().reverse()
        : getBuffer(opts, maskset, definitions)
    ).join("");
    unmasked = opts.onUnMask(bufferValue, unmasked, opts);
  }

  return unmasked;
}

export function clearOptionalTail(ctx: EngineContext): string[] {
  const { opts, maskset, definitions } = ctx;
  const buffer: string[] = [];
  const template = getMaskTemplate(
    opts,
    maskset,
    definitions,
    true,
    0,
    true,
    undefined,
    true,
  );
  let lmnt: string | undefined;
  while ((lmnt = template.shift()) !== undefined) buffer.push(lmnt);
  return buffer;
}
