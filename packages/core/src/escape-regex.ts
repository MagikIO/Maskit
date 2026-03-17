const escapeRegexRegex = new RegExp(
  "(\\" +
    [
      "/",
      ".",
      "*",
      "+",
      "?",
      "|",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      "\\",
      "$",
      "^",
    ].join("|\\") +
    ")",
  "gim",
);

export function escapeRegex(str: string): string {
  return str.replace(escapeRegexRegex, "\\$1");
}
