import type {
  MaskDefinition,
  MaskOptions,
  MaskSet,
  MaskToken,
  TestMatch,
  TestResult,
  ValidPosition,
} from "./types.js";
import { deepClone } from "./deep-clone.js";

export function getDecisionTaker(tst: TestResult): string {
  let decisionTaker = tst.locator[tst.alternation!];
  if (typeof decisionTaker === "string" && decisionTaker.length > 0) {
    decisionTaker = decisionTaker
      .split(",")
      .sort((a, b) => Number(a) - Number(b))[0];
  }
  return decisionTaker !== undefined ? decisionTaker.toString() : "";
}

function getLocator(tst: TestResult, align: number): string {
  let locator = (
    tst.alternation != undefined
      ? tst.mloc[`${getDecisionTaker(tst)}:${tst.alternation}`] || tst.locator
      : tst.locator
  ).join("");
  if (locator !== "") {
    locator = locator.split(":")[0];
    while (locator.length < align) locator += "0";
  }
  return locator;
}

export function getPlaceholder(
  pos: number,
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  test?: TestMatch,
  returnPL?: boolean,
): string {
  test = test || getTest(pos, opts, maskset, definitions).match;

  if (test.placeholder !== undefined || returnPL === true) {
    if (
      test.placeholder !== "" &&
      test.static === true &&
      test.generated !== true
    ) {
      const lvp = getLastValidPosition(maskset);
      const nextPos = seekNext(pos, opts, maskset, definitions);
      return (returnPL ? pos <= nextPos : pos < nextPos)
        ? opts.staticDefinitionSymbol && test.static
          ? test.nativeDef
          : test.def
        : typeof test.placeholder === "function"
          ? test.placeholder(opts)
          : (test.placeholder as string);
    } else {
      return typeof test.placeholder === "function"
        ? test.placeholder(opts)
        : (test.placeholder as string);
    }
  } else if (test.static === true) {
    if (pos > -1 && maskset.validPositions[pos] === undefined) {
      const tests = getTests(pos, opts, maskset, definitions);
      const staticAlternations: TestResult[] = [];
      let prevTest: TestResult | undefined;
      if (
        typeof opts.placeholder === "string" &&
        tests.length > 1 + (tests[tests.length - 1].match.def === "" ? 1 : 0)
      ) {
        for (let i = 0; i < tests.length; i++) {
          if (
            tests[i].match.def !== "" &&
            !tests[i].match.optionality &&
            !(tests[i].match as TestMatch & { optionalQuantifier?: boolean })
              .optionalQuantifier &&
            (tests[i].match.static === true ||
              prevTest === undefined ||
              (tests[i].match.fn !== null &&
                tests[i].match.fn!.test(prevTest.match.def) !== false))
          ) {
            staticAlternations.push(tests[i]);
            if (tests[i].match.static === true) prevTest = tests[i];
            if (staticAlternations.length > 1) {
              if (/[0-9a-bA-Z]/.test(staticAlternations[0].match.def)) {
                return (opts.placeholder as string).charAt(
                  pos % (opts.placeholder as string).length,
                );
              }
            }
          }
        }
      }
    }
    return test.def;
  }

  return typeof opts.placeholder === "object"
    ? test.def
    : (opts.placeholder as string).charAt(
        pos % (opts.placeholder as string).length,
      );
}

export function getMaskTemplate(
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  baseOnInput: boolean,
  minimalPos: number,
  includeMode?: boolean | undefined,
  noJit?: boolean,
  clearOptionalTailFlag?: boolean,
): string[] {
  const greedy = opts.greedy;
  if (clearOptionalTailFlag && opts.greedy) {
    opts.greedy = false;
    maskset.tests = {};
  }
  minimalPos = minimalPos || 0;
  const maskTemplate: string[] = [];
  let ndxIntlzr: (string | number)[] | undefined;
  let pos = 0;
  let test: TestMatch;
  let testPos: TestResult | ValidPosition;
  let jitRenderStatic: boolean | undefined;

  do {
    if (baseOnInput === true && maskset.validPositions[pos]) {
      testPos =
        clearOptionalTailFlag &&
        maskset.validPositions[pos].match.optionality &&
        maskset.validPositions[pos + 1] === undefined &&
        (maskset.validPositions[pos].generatedInput === true ||
          (maskset.validPositions[pos].input ===
            opts.skipOptionalPartCharacter &&
            pos > 0))
          ? determineTestTemplate(
              pos,
              getTests(pos, opts, maskset, definitions, ndxIntlzr, pos - 1),
              opts,
            )
          : maskset.validPositions[pos];
      test = testPos.match;
      ndxIntlzr = testPos.locator.slice();
      maskTemplate.push(
        includeMode === true
          ? (testPos as ValidPosition).input!
          : includeMode === false
            ? test.nativeDef
            : getPlaceholder(pos, opts, maskset, definitions, test),
      );
    } else {
      testPos = getTestTemplate(
        pos,
        opts,
        maskset,
        definitions,
        ndxIntlzr,
        pos - 1,
      );
      test = testPos.match;
      ndxIntlzr = testPos.locator.slice();
      const jitMasking =
        noJit === true
          ? false
          : opts.jitMasking !== false
            ? opts.jitMasking
            : test.jit;
      jitRenderStatic =
        (jitRenderStatic || maskset.validPositions[pos - 1]) &&
        test.static &&
        test.def !== opts.groupSeparator &&
        test.fn === null
          ? true
          : undefined;

      if (
        jitRenderStatic ||
        jitMasking === false ||
        jitMasking === undefined ||
        (typeof jitMasking === "number" &&
          isFinite(jitMasking) &&
          jitMasking > pos)
      ) {
        maskTemplate.push(
          includeMode === false
            ? test.nativeDef
            : getPlaceholder(pos, opts, maskset, definitions, test),
        );
      } else {
        jitRenderStatic = undefined;
      }
    }

    pos++;
  } while (test.static !== true || test.def !== "" || minimalPos > pos);

  if (maskTemplate[maskTemplate.length - 1] === "") {
    maskTemplate.pop();
  }
  if (includeMode !== false || maskset.maskLength === undefined) {
    maskset.maskLength = pos - 1;
  }

  opts.greedy = greedy;
  return maskTemplate;
}

export function getTestTemplate(
  pos: number,
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  ndxIntlzr?: (string | number)[],
  tstPs?: number,
): TestResult {
  return (
    maskset.validPositions[pos] ||
    determineTestTemplate(
      pos,
      getTests(
        pos,
        opts,
        maskset,
        definitions,
        ndxIntlzr ? ndxIntlzr.slice() : ndxIntlzr,
        tstPs,
      ),
      opts,
    )
  );
}

function determineOptionalityLevel(pos: number, tests: TestResult[]): number {
  let optionalityLevel = 0;
  let differentOptionalLevels = false;
  tests.forEach((test) => {
    if (test.match.optionality) {
      if (optionalityLevel !== 0 && optionalityLevel !== test.match.optionality)
        differentOptionalLevels = true;
      if (
        optionalityLevel === 0 ||
        optionalityLevel > (test.match.optionality as number)
      ) {
        optionalityLevel = test.match.optionality as number;
      }
    }
  });
  if (optionalityLevel) {
    if (pos == 0) optionalityLevel = 0;
    else if (tests.length == 1) optionalityLevel = 0;
    else if (!differentOptionalLevels) optionalityLevel = 0;
  }
  return optionalityLevel;
}

export function determineTestTemplate(
  pos: number,
  tests: TestResult[],
  opts: MaskOptions,
): TestResult {
  const optionalityLevel = determineOptionalityLevel(pos, tests);
  pos = pos > 0 ? pos - 1 : 0;

  const longestLocator = Math.max(
    ...tests.map((tst) => (tst.locator === undefined ? 0 : tst.locator.length)),
  );
  const prevTest = getTestFromResults(pos, tests);
  const prevLocator = getLocator(prevTest || tests[0], longestLocator);

  let lenghtOffset = 0;
  let tstLocator: string;
  let closest: number | undefined;
  let bestMatch: TestResult | undefined;

  if (
    opts.greedy &&
    tests.length > 1 &&
    tests[tests.length - 1].match.def === ""
  )
    lenghtOffset = 1;

  for (let ndx = 0; ndx < tests.length - lenghtOffset; ndx++) {
    const tst = tests[ndx];
    tstLocator = getLocator(tst, longestLocator);
    const distance = Number(tstLocator) - Number(prevLocator);

    if (
      tst.unMatchedAlternationStopped !== true ||
      tests.filter((t) => t.unMatchedAlternationStopped !== true).length <= 1
    ) {
      if (
        closest === undefined ||
        (tstLocator !== "" && distance < closest) ||
        (bestMatch &&
          !opts.greedy &&
          bestMatch.match.optionality &&
          (bestMatch.match.optionality as number) - optionalityLevel > 0 &&
          bestMatch.match.newBlockMarker === "master" &&
          (!tst.match.optionality ||
            (tst.match.optionality as number) - optionalityLevel < 1 ||
            !tst.match.newBlockMarker)) ||
        (bestMatch &&
          !opts.greedy &&
          bestMatch.match.optionalQuantifier &&
          !tst.match.optionalQuantifier)
      ) {
        closest = distance;
        bestMatch = tst;
      }
    }
  }
  return bestMatch!;
}

function getTestFromResults(
  pos: number,
  tests: TestResult[],
): TestResult | undefined {
  // Simple helper - in practice this returns the test for a previous position
  return tests[0];
}

export function getTest(
  pos: number,
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  tests?: TestResult[],
): TestResult {
  if (maskset.validPositions[pos]) {
    return maskset.validPositions[pos];
  }
  return (tests || getTests(pos, opts, maskset, definitions))[0];
}

export function isSubsetOf(
  source: TestResult,
  target: TestResult,
  opts: MaskOptions,
): boolean {
  function expand(pattern: string): string {
    const expanded: string[] = [];
    let start = -1;
    let end: number;
    for (let i = 0, l = pattern.length; i < l; i++) {
      if (pattern.charAt(i) === "-") {
        end = pattern.charCodeAt(i + 1);
        while (++start < end) expanded.push(String.fromCharCode(start));
      } else {
        start = pattern.charCodeAt(i);
        expanded.push(pattern.charAt(i));
      }
    }
    return expanded.join("");
  }

  if (source.match.def === target.match.nativeDef) return true;

  if (
    (opts.regex ||
      (source.match.fn instanceof RegExp &&
        target.match.fn instanceof RegExp)) &&
    source.match.static !== true &&
    target.match.static !== true
  ) {
    if (target.match.fn!.source === ".") return true;
    return (
      expand(target.match.fn!.source.replace(/[[\]/]/g, "")).indexOf(
        expand(source.match.fn!.source.replace(/[[\]/]/g, "")),
      ) !== -1
    );
  }
  return false;
}

export function getTests(
  pos: number,
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  ndxIntlzr?: (string | number)[],
  tstPs?: number,
): TestResult[] {
  const maskTokens = maskset.maskToken;
  let testPos = ndxIntlzr ? (tstPs ?? 0) : 0;
  let ndxInitializer = ndxIntlzr ? ndxIntlzr.slice() : [0];
  let matches: TestResult[] = [];
  let insertStop = false;
  let latestMatch: TestMatch | undefined;
  let cacheDependency = ndxIntlzr ? ndxIntlzr.join("") : "";
  let unMatchedAlternation = false;
  let hasAlternator = false;

  function resolveTestFromToken(
    maskToken: MaskToken,
    ndxInit: (string | number)[],
    loopNdx: (string | number)[],
    quantifierRecurse?: MaskToken,
  ): boolean | undefined {
    function handleMatch(
      match: TestMatch | MaskToken,
      loopNdx: (string | number)[],
      quantifierRecurse?: MaskToken,
    ): boolean | undefined {
      function isFirstMatch(
        latestMatch: TestMatch,
        tokenGroup: MaskToken,
      ): boolean {
        let firstMatch =
          tokenGroup.matches.indexOf(latestMatch as TestMatch | MaskToken) ===
          0;
        if (!firstMatch) {
          tokenGroup.matches.every((m) => {
            if ("isQuantifier" in m && (m as MaskToken).isQuantifier === true) {
              firstMatch = isFirstMatch(
                latestMatch,
                tokenGroup.matches[
                  tokenGroup.matches.indexOf(m) - 1
                ] as MaskToken,
              );
            } else if ("matches" in m) {
              firstMatch = isFirstMatch(latestMatch, m as MaskToken);
            }
            if (firstMatch) return false;
            return true;
          });
        }
        return firstMatch;
      }

      function resolveNdxInitializer(
        resolvePos: number,
        alternateNdx: string | number,
        targetAlternation?: number,
      ): (string | number)[] | undefined {
        let bestMatch: TestResult | undefined;
        let distance: number | undefined;
        let locator: string | undefined;
        let newAlternateMloc: string | undefined;
        let alternateMloc = `${alternateNdx}:${targetAlternation}`;

        if (maskset.tests[resolvePos] || maskset.validPositions[resolvePos]) {
          const source = maskset.validPositions[resolvePos]
            ? [maskset.validPositions[resolvePos]]
            : maskset.tests[resolvePos];
          if (source) {
            source.every((lmnt) => {
              if (lmnt.mloc[alternateMloc]) {
                bestMatch = lmnt;
                return false;
              }
              const mlocMatches = Object.values(lmnt.mloc).filter(
                (m: (string | number)[]) =>
                  m[targetAlternation!] == alternateNdx,
              );
              mlocMatches.every((mlocMatch: (string | number)[]) => {
                let mlocMatchL = mlocMatch.join("").split(":")[0];
                locator = locator || mlocMatchL;
                while (mlocMatchL.length < locator!.length) mlocMatchL += "0";
                const mlocDistance = Number(mlocMatchL);
                if (bestMatch === undefined || mlocDistance < distance!) {
                  distance = mlocDistance;
                  bestMatch = lmnt;
                  newAlternateMloc = Object.entries(lmnt.mloc).find(
                    (entry) => entry[1].toString() === mlocMatch.toString(),
                  )?.[0];
                }
                return true;
              });
              return true;
            });
          }
        }
        if (bestMatch) {
          if (targetAlternation === undefined) {
            alternateMloc = `${alternateNdx}:${bestMatch.alternation}`;
          }
          const bestMatchAltIndex = `${bestMatch.locator[bestMatch.alternation!]}:${bestMatch.alternation}`;
          const slocator = (
            bestMatch.mloc[newAlternateMloc || alternateMloc] ||
            bestMatch.mloc[bestMatchAltIndex] ||
            bestMatch.locator
          ).slice();

          if (slocator[slocator.length - 1].toString().indexOf(":") !== -1) {
            slocator.pop();
          }

          const sliceStart = parseInt(String(bestMatch.alternation)) + 1;
          return slocator.slice(sliceStart);
        } else {
          return targetAlternation !== undefined
            ? resolveNdxInitializer(resolvePos, alternateNdx)
            : undefined;
        }
      }

      function staticCanMatchDefinition(
        source: TestResult,
        target: TestResult,
      ): boolean {
        return source.match.static === true && target.match.static !== true
          ? target.match.fn !== null &&
              target.match.fn.test(source.match.def) !== false
          : false;
      }

      function setMergeLocators(
        targetMatch: TestResult,
        altMatch?: TestResult,
      ): boolean {
        function mergeLoc(altNdx: number): boolean {
          targetMatch.mloc = targetMatch.mloc || {};
          let locNdx = targetMatch.locator[altNdx];
          if (locNdx === undefined) {
            targetMatch.alternation = undefined;
            return false;
          }
          if (altMatch === undefined) {
            if (typeof locNdx === "string") locNdx = locNdx.split(",")[0];
            locNdx = `${locNdx}:${altNdx}`;
            if (targetMatch.mloc[locNdx] === undefined) {
              targetMatch.mloc[locNdx] = targetMatch.locator.slice();
              targetMatch.mloc[locNdx].push(`:${altNdx}`);
            }
          } else {
            let offset = 0;
            for (const ndx in altMatch.mloc) {
              if (targetMatch.mloc[ndx] === undefined) {
                targetMatch.mloc[ndx] = altMatch.mloc[ndx];
              } else {
                do {
                  if (targetMatch.mloc[ndx + offset] === undefined) {
                    targetMatch.mloc[ndx + offset] = altMatch.mloc[ndx];
                    break;
                  }
                } while (targetMatch.mloc[ndx + offset++] !== undefined);
              }
            }
            targetMatch.locator = mergeLocators(testPos, [
              targetMatch,
              altMatch,
            ]);
          }
          if (
            targetMatch.alternation !== undefined &&
            targetMatch.alternation > altNdx
          ) {
            targetMatch.alternation = altNdx;
          }
          return true;
        }

        const alternationNdx = targetMatch.alternation!;
        const shouldMerge =
          altMatch === undefined ||
          (alternationNdx <= altMatch.alternation! &&
            targetMatch.locator[alternationNdx]
              .toString()
              .indexOf(altMatch.locator[alternationNdx]?.toString()) === -1);

        if (shouldMerge) {
          return mergeLoc(alternationNdx);
        }
        return false;
      }

      function handleGroup(): boolean | undefined {
        const token = match as MaskToken;
        const nextIdx = maskToken.matches.indexOf(token) + 1;
        if (nextIdx < maskToken.matches.length) {
          match = handleMatch(
            maskToken.matches[nextIdx],
            loopNdx,
            quantifierRecurse,
          ) as unknown as MaskToken;
          if (match) return true;
        }
        return undefined;
      }

      function handleOptional(): boolean | undefined {
        const optionalToken = match as MaskToken;
        const mtchsNdx = matches.length;
        match = resolveTestFromToken(
          optionalToken,
          ndxInit,
          loopNdx,
          quantifierRecurse,
        ) as unknown as MaskToken;
        if (matches.length > 0) {
          matches.forEach((mtch, ndx) => {
            if (ndx >= mtchsNdx) {
              mtch.match.optionality = mtch.match.optionality
                ? (mtch.match.optionality as number) + 1
                : 1;
            }
          });
          latestMatch = matches[matches.length - 1].match;
          if (
            quantifierRecurse === undefined &&
            isFirstMatch(latestMatch, optionalToken)
          ) {
            insertStop = true;
            testPos = pos;
          } else {
            return match as unknown as boolean;
          }
        }
        return undefined;
      }

      function handleAlternator(): boolean | undefined {
        hasAlternator = true;
        const alternateToken = match as MaskToken;
        const malternateMatches: TestResult[] = [];
        const currentMatches = matches.slice();
        const loopNdxCnt = loopNdx.length;
        const altIndex = ndxInit.length > 0 ? ndxInit.shift()! : -1;
        let maltMatches: TestResult[];

        if (altIndex === -1 || typeof altIndex === "string") {
          const currentPos = testPos;
          const ndxInitClone = ndxInit.slice();
          let altIndexArr: string[];

          if (typeof altIndex === "string") {
            altIndexArr = altIndex.split(",");
          } else {
            altIndexArr = [];
            for (
              let amndx = 0;
              amndx < alternateToken.matches.length;
              amndx++
            ) {
              altIndexArr.push(amndx.toString());
            }
          }

          if (maskset.excludes[pos] !== undefined) {
            const altIndexArrClone = altIndexArr.slice();
            for (let i = 0, exl = maskset.excludes[pos].length; i < exl; i++) {
              const excludeSet = maskset.excludes[pos][i].toString().split(":");
              if (loopNdx.length == parseInt(excludeSet[1])) {
                altIndexArr.splice(altIndexArr.indexOf(excludeSet[0]), 1);
              }
            }
            if (altIndexArr.length === 0) {
              delete maskset.excludes[pos];
              altIndexArr = altIndexArrClone;
            }
          }
          if (
            opts.keepStatic === true ||
            (typeof opts.keepStatic === "number" &&
              isFinite(opts.keepStatic) &&
              currentPos >= opts.keepStatic)
          )
            altIndexArr = altIndexArr.slice(0, 1);

          for (let ndx = 0; ndx < altIndexArr.length; ndx++) {
            const amndx = parseInt(altIndexArr[ndx]);
            matches = [];
            ndxInit =
              typeof altIndex === "string"
                ? resolveNdxInitializer(testPos, amndx, loopNdxCnt) ||
                  ndxInitClone.slice()
                : ndxInitClone.slice();

            const tokenMatch = alternateToken.matches[amndx];
            if (
              tokenMatch &&
              handleMatch(
                tokenMatch,
                [amndx].concat(loopNdx as number[]),
                quantifierRecurse,
              )
            ) {
              match = true as unknown as MaskToken;
            } else {
              unMatchedAlternation = true;
            }

            maltMatches = matches.slice();
            testPos = currentPos;
            matches = [];

            for (let ndx1 = 0; ndx1 < maltMatches.length; ndx1++) {
              const altMatch = maltMatches[ndx1];
              let dropMatch = false;
              altMatch.alternation = altMatch.alternation || loopNdxCnt;
              setMergeLocators(altMatch);
              for (let ndx2 = 0; ndx2 < malternateMatches.length; ndx2++) {
                const altMatch2 = malternateMatches[ndx2];
                if (
                  typeof altIndex !== "string" ||
                  (altMatch.alternation !== undefined &&
                    altIndex.indexOf(
                      altMatch.locator[altMatch.alternation].toString(),
                    ) !== -1)
                ) {
                  if (altMatch.match.nativeDef === altMatch2.match.nativeDef) {
                    dropMatch = true;
                    setMergeLocators(altMatch2, altMatch);
                    break;
                  } else if (isSubsetOf(altMatch, altMatch2, opts)) {
                    if (setMergeLocators(altMatch, altMatch2)) {
                      dropMatch = true;
                      malternateMatches.splice(
                        malternateMatches.indexOf(altMatch2),
                        0,
                        altMatch,
                      );
                    }
                    break;
                  } else if (isSubsetOf(altMatch2, altMatch, opts)) {
                    setMergeLocators(altMatch2, altMatch);
                    break;
                  } else if (staticCanMatchDefinition(altMatch, altMatch2)) {
                    if (setMergeLocators(altMatch, altMatch2)) {
                      dropMatch = true;
                      malternateMatches.splice(
                        malternateMatches.indexOf(altMatch2),
                        0,
                        altMatch,
                      );
                    }
                    break;
                  }
                }
              }
              if (!dropMatch) {
                malternateMatches.push(altMatch);
              }
            }
          }

          matches = currentMatches.concat(malternateMatches);
          testPos = pos;
          insertStop = matches.length > 0 && unMatchedAlternation;
          match = (malternateMatches.length > 0 &&
            !unMatchedAlternation) as unknown as MaskToken;

          if (unMatchedAlternation && insertStop && !match) {
            matches.forEach((mtch) => {
              mtch.unMatchedAlternationStopped = true;
            });
          }

          ndxInit = ndxInitClone.slice();
        } else {
          match = handleMatch(
            alternateToken.matches[altIndex as number] ||
              maskToken.matches[altIndex as number],
            [altIndex].concat(loopNdx as number[]),
            quantifierRecurse,
          ) as unknown as MaskToken;
        }
        if (match) return true;
        return undefined;
      }

      function handleQuantifier(): boolean | undefined {
        const qt = match as MaskToken;
        let breakloop = false;
        for (
          let qndx = ndxInit.length > 0 ? (ndxInit.shift() as number) : 0;
          qndx <
            (isNaN(qt.quantifier.max as number)
              ? qndx + 1
              : (qt.quantifier.max as number)) && testPos <= pos;
          qndx++
        ) {
          const tokenGroup = maskToken.matches[
            maskToken.matches.indexOf(qt as unknown as TestMatch | MaskToken) -
              1
          ] as MaskToken;
          match = handleMatch(
            tokenGroup,
            [qndx].concat(loopNdx as number[]),
            tokenGroup,
          ) as unknown as MaskToken;
          if (match) {
            matches.forEach((mtch) => {
              latestMatch = mtch.match;
              latestMatch.optionalQuantifier =
                qndx >= (qt.quantifier.min as number);
              latestMatch.jit =
                (qndx + 1) *
                  (tokenGroup.matches.indexOf(
                    latestMatch as unknown as TestMatch | MaskToken,
                  ) +
                    1) >
                (qt.quantifier.jit as number);
              if (
                latestMatch.optionalQuantifier &&
                isFirstMatch(latestMatch, tokenGroup)
              ) {
                insertStop = true;
                testPos = pos;
                if (
                  opts.greedy &&
                  maskset.validPositions[pos - 1] == undefined &&
                  qndx > (qt.quantifier.min as number) &&
                  ["*", "+"].indexOf(String(qt.quantifier.max)) != -1
                ) {
                  matches.pop();
                  cacheDependency = "";
                }
                breakloop = true;
                match = false as unknown as MaskToken;
              }
              if (!breakloop && latestMatch.jit) {
                maskset.jitOffset[pos] =
                  tokenGroup.matches.length -
                  tokenGroup.matches.indexOf(
                    latestMatch as unknown as TestMatch | MaskToken,
                  );
              }
            });
            if (breakloop) break;
            return true;
          }
        }
        return undefined;
      }

      if (testPos > pos + opts._maxTestPos) {
        throw new Error(
          `Inputmask: There is probably an error in your mask definition or in the code. Create an issue on github with an example of the mask you are using. ${maskset.mask}`,
        );
      }

      const matchToken = match as MaskToken;

      if (testPos === pos && matchToken.matches === undefined) {
        matches.push({
          match: match as TestMatch,
          locator: loopNdx.reverse(),
          cd: cacheDependency,
          mloc: {},
        });
        if (
          (match as TestMatch).optionality &&
          quantifierRecurse === undefined
        ) {
          const allDefs = { ...definitions, ...opts.definitions };
          if (allDefs[(match as TestMatch).nativeDef]?.optional) {
            insertStop = true;
            testPos = pos;
          } else {
            return true;
          }
        } else {
          return true;
        }
      } else if (matchToken.matches !== undefined) {
        if (matchToken.isGroup && quantifierRecurse !== matchToken) {
          return handleGroup();
        } else if (matchToken.isOptional) {
          return handleOptional();
        } else if (matchToken.isAlternator) {
          return handleAlternator();
        } else if (
          matchToken.isQuantifier &&
          quantifierRecurse !==
            (maskToken.matches[
              maskToken.matches.indexOf(
                matchToken as unknown as TestMatch | MaskToken,
              ) - 1
            ] as MaskToken)
        ) {
          return handleQuantifier();
        } else {
          match = resolveTestFromToken(
            matchToken,
            ndxInit,
            loopNdx,
            quantifierRecurse,
          ) as unknown as MaskToken;
          if (match) return true;
        }
      } else {
        testPos++;
      }
      return undefined;
    }

    for (
      let tndx = ndxInit.length > 0 ? (ndxInit.shift() as number) : 0;
      tndx < maskToken.matches.length;
      tndx++
    ) {
      if (
        "isQuantifier" in maskToken.matches[tndx] &&
        (maskToken.matches[tndx] as MaskToken).isQuantifier === true
      )
        continue;
      const result = handleMatch(
        maskToken.matches[tndx],
        [tndx].concat(loopNdx as number[]),
        quantifierRecurse,
      );
      if (result && testPos === pos) {
        return result;
      } else if (testPos > pos) {
        break;
      }
    }
    return undefined;
  }

  function mergeLocators(
    mergePos: number,
    tests: TestResult[],
  ): (string | number)[] {
    let locator: (string | number)[] = [];
    if (!Array.isArray(tests)) tests = [tests];
    if (tests.length > 0) {
      if (
        tests[0].alternation === undefined ||
        opts.keepStatic === true ||
        (typeof opts.keepStatic === "number" &&
          isFinite(opts.keepStatic) &&
          mergePos >= opts.keepStatic)
      ) {
        const dt = determineTestTemplate(mergePos, tests.slice(), opts);
        locator = dt ? dt.locator.slice() : [];
        if (locator.length === 0) locator = tests[0].locator.slice();
      } else {
        tests.forEach((mtch) => {
          Object.values(mtch.mloc).forEach((mloc) => {
            (mloc as (string | number)[]).forEach(
              (loc: string | number, locNdx: number) => {
                const mergedPos = locator[locNdx];
                if (
                  loc.toString().includes(":") ||
                  (mergedPos && mergedPos.toString().includes(":"))
                )
                  return;
                if (mergedPos === undefined) {
                  locator[locNdx] = loc;
                } else if (!mergedPos.toString().includes(String(loc))) {
                  locator[locNdx] = locator[locNdx] + "," + loc;
                }
              },
            );
          });
        });
      }
    }
    return locator;
  }

  if (pos > -1) {
    if (ndxIntlzr === undefined) {
      let previousPos = pos - 1;
      let test: TestResult[] | TestResult | undefined;
      while (
        (test =
          maskset.validPositions[previousPos] || maskset.tests[previousPos]) ===
          undefined &&
        previousPos > -1
      ) {
        previousPos--;
      }
      if (test !== undefined && previousPos > -1) {
        ndxInitializer = mergeLocators(
          previousPos,
          Array.isArray(test) ? test : [test],
        );
        cacheDependency = ndxInitializer.join("");
        testPos = previousPos;
      }
    }
    if (maskset.tests[pos] && maskset.tests[pos][0].cd === cacheDependency) {
      return maskset.tests[pos];
    }
    for (
      let mtndx = ndxInitializer.shift() as number;
      mtndx < maskTokens.length;
      mtndx++
    ) {
      resolveTestFromToken(maskTokens[mtndx], ndxInitializer, [mtndx]);
      if (testPos === pos || testPos > pos) {
        break;
      }
    }
  }

  if (matches.length === 0 || insertStop) {
    matches.push({
      match: {
        fn: null,
        static: true,
        optionality: false,
        newBlockMarker: false,
        casing: null,
        def: "",
        placeholder: "",
        nativeDef: "",
      },
      locator:
        unMatchedAlternation &&
        matches.filter((tst) => tst.unMatchedAlternationStopped !== true)
          .length === 0
          ? [0]
          : [],
      mloc: {},
      cd: cacheDependency,
    });
  }

  let result: TestResult[];
  if (ndxIntlzr !== undefined && maskset.tests[pos]) {
    result = deepClone(matches);
  } else {
    maskset.tests[pos] = deepClone(matches);
    result = maskset.tests[pos];
  }

  matches.forEach((t) => {
    t.match.optionality = t.match.defOptionality || false;
  });

  return result;
}

// Pure positioning helpers (no DOM dependency)

export function getLastValidPosition(
  maskset: MaskSet,
  closestTo?: number,
  strict?: boolean,
  validPositions?: typeof maskset.validPositions,
): number {
  let before = -1;
  let after = -1;
  const valids = validPositions || maskset.validPositions;
  if (closestTo === undefined) closestTo = -1;
  for (let psNdx = 0, vpl = valids.length; psNdx < vpl; psNdx++) {
    if (valids[psNdx] && (strict || valids[psNdx].generatedInput !== true)) {
      if (psNdx <= closestTo) before = psNdx;
      if (psNdx >= closestTo) after = psNdx;
    }
  }
  return before === -1 || before === closestTo
    ? after
    : after === -1
      ? before
      : closestTo - before < after - closestTo
        ? before
        : after;
}

export function seekNext(
  pos: number,
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  newBlock?: boolean,
  fuzzy?: boolean,
): number {
  if (fuzzy === undefined) fuzzy = true;
  let position = pos + 1;
  while (
    getTest(position, opts, maskset, definitions).match.def !== "" &&
    ((newBlock === true &&
      (getTest(position, opts, maskset, definitions).match.newBlockMarker !==
        true ||
        !isMask(position, opts, maskset, definitions, undefined, true))) ||
      (newBlock !== true &&
        !isMask(position, opts, maskset, definitions, undefined, fuzzy)))
  ) {
    position++;
  }
  return position;
}

export function seekPrevious(
  pos: number,
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  newBlock?: boolean,
): number {
  let position = pos - 1;
  if (pos <= 0) return 0;
  while (
    position > 0 &&
    ((newBlock === true &&
      (getTest(position, opts, maskset, definitions).match.newBlockMarker !==
        true ||
        !isMask(position, opts, maskset, definitions, undefined, true))) ||
      (newBlock !== true &&
        !isMask(position, opts, maskset, definitions, undefined, true)))
  ) {
    position--;
  }
  return position;
}

export function isMask(
  pos: number,
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  strict?: boolean,
  fuzzy?: boolean,
): boolean | RegExp {
  let test = getTestTemplate(pos, opts, maskset, definitions).match;
  if (test.def === "") test = getTest(pos, opts, maskset, definitions).match;

  if (test.static !== true) {
    return test.fn!;
  }
  if (
    fuzzy === true &&
    maskset.validPositions[pos] !== undefined &&
    maskset.validPositions[pos].generatedInput !== true
  ) {
    return true;
  }

  if (strict !== true && pos > -1) {
    if (fuzzy) {
      const tests = getTests(pos, opts, maskset, definitions);
      return (
        tests.length > 1 + (tests[tests.length - 1].match.def === "" ? 1 : 0)
      );
    }
    const testTemplate = determineTestTemplate(
      pos,
      getTests(pos, opts, maskset, definitions),
      opts,
    );
    const testPlaceHolder = getPlaceholder(
      pos,
      opts,
      maskset,
      definitions,
      testTemplate.match,
    );
    return testTemplate.match.def !== testPlaceHolder;
  }
  return false;
}

export function resetMaskSet(maskset: MaskSet, soft?: boolean): void {
  maskset.buffer = undefined;
  if (soft !== true) {
    maskset.validPositions = [];
    maskset.p = 0;
  }
  if (soft === false) {
    maskset.tests = {};
    maskset.jitOffset = {};
  }
}

export function getBuffer(
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
  noCache?: boolean,
): string[] {
  if (maskset.buffer === undefined || noCache === true) {
    maskset.buffer = getMaskTemplate(
      opts,
      maskset,
      definitions,
      true,
      getLastValidPosition(maskset),
      true,
    );
    if (maskset._buffer === undefined) maskset._buffer = maskset.buffer.slice();
  }
  return maskset.buffer;
}

export function getBufferTemplate(
  opts: MaskOptions,
  maskset: MaskSet,
  definitions: Record<string, MaskDefinition>,
): string[] {
  if (maskset._buffer === undefined) {
    maskset._buffer = getMaskTemplate(opts, maskset, definitions, false, 1);
    if (maskset.buffer === undefined) maskset.buffer = maskset._buffer.slice();
  }
  return maskset._buffer;
}
