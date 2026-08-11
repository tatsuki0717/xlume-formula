export type FormulaToken =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "error"; value: string }
  | { kind: "identifier"; value: string }
  | { kind: "function"; value: string }
  | { kind: "op"; value: string }
  | { kind: "ref"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "lbrace" }
  | { kind: "rbrace" }
  | { kind: "comma" }
  | { kind: "semicolon" }
  | { kind: "colon" }
  | { kind: "bang" }
  | { kind: "hash" } // spill
  | { kind: "at" }; // implicit intersection

const OPS = ["<=", ">=", "<>", "<<", ">>", "+", "-", "*", "/", "^", "&", "=", "<", ">", "%", " "];

export function lexFormula(input: string): FormulaToken[] {
  let s = input.trim();
  if (s.startsWith("=")) s = s.slice(1);
  const tokens: FormulaToken[] = [];
  let i = 0;

  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (c === "{") {
      tokens.push({ kind: "lbrace" });
      i++;
      continue;
    }
    if (c === "}") {
      tokens.push({ kind: "rbrace" });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ kind: "comma" });
      i++;
      continue;
    }
    if (c === ";") {
      tokens.push({ kind: "semicolon" });
      i++;
      continue;
    }
    if (c === ":") {
      tokens.push({ kind: "colon" });
      i++;
      continue;
    }
    if (c === "!") {
      tokens.push({ kind: "bang" });
      i++;
      continue;
    }
    if (c === "#") {
      // error literal or spill
      const err = /^#(NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|GETTING_DATA|SPILL!|CALC!|FIELD!|BLOCKED!)/i.exec(
        s.slice(i),
      );
      if (err) {
        tokens.push({ kind: "error", value: err[0]!.toUpperCase() });
        i += err[0]!.length;
        continue;
      }
      tokens.push({ kind: "hash" });
      i++;
      continue;
    }
    if (c === "@") {
      tokens.push({ kind: "at" });
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let val = "";
      while (j < s.length) {
        if (s[j] === '"' && s[j + 1] === '"') {
          val += '"';
          j += 2;
          continue;
        }
        if (s[j] === '"') break;
        val += s[j];
        j++;
      }
      tokens.push({ kind: "string", value: val });
      i = j + 1;
      continue;
    }

    let matchedOp = false;
    for (const op of OPS) {
      if (op === " ") continue;
      if (s.startsWith(op, i)) {
        tokens.push({ kind: "op", value: op });
        i += op.length;
        matchedOp = true;
        break;
      }
    }
    if (matchedOp) continue;

    // number
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
      if (m) {
        tokens.push({ kind: "number", value: parseFloat(m[0]) });
        i += m[0].length;
        continue;
      }
    }

    // boolean
    if (/^(TRUE|FALSE)\b/i.test(s.slice(i))) {
      const m = /^(TRUE|FALSE)/i.exec(s.slice(i))!;
      tokens.push({ kind: "boolean", value: m[0]!.toUpperCase() === "TRUE" });
      i += m[0]!.length;
      continue;
    }

    // sheet-qualified / structured / A1 / name / function
    // Match sheet!'ref' or Sheet1!A1 or Table1[Col] or A1 or Name
    const sheetRef = /^(?:'([^']+)'|([A-Za-z_][\w.]*))!/.exec(s.slice(i));
    if (sheetRef) {
      const sheet = sheetRef[1] ?? sheetRef[2]!;
      i += sheetRef[0].length;
      const rest = /^(\$?[A-Za-z]+\$?\d+(?::\$?[A-Za-z]+\$?\d+)?|\$?[A-Za-z]+:\$?[A-Za-z]+|\$?\d+:\$?\d+)/.exec(
        s.slice(i),
      );
      if (rest) {
        tokens.push({ kind: "ref", value: `${sheet}!${rest[1]}` });
        i += rest[1]!.length;
        continue;
      }
    }

    const a1 = /^(\$?[A-Za-z]+\$?\d+(?::\$?[A-Za-z]+\$?\d+)?)/.exec(s.slice(i));
    if (a1) {
      // Could be function if followed by (
      const after = s.slice(i + a1[0].length);
      if (/^\s*\(/.test(after) && /^[A-Za-z]/.test(a1[0])) {
        // fallthrough to identifier
      } else {
        tokens.push({ kind: "ref", value: a1[1]! });
        i += a1[0].length;
        continue;
      }
    }

    const id = /^[A-Za-z_.\\][\w.\\]*/.exec(s.slice(i));
    if (id) {
      const name = id[0];
      const after = s.slice(i + name.length);
      if (/^\s*\(/.test(after)) {
        tokens.push({ kind: "function", value: name.toUpperCase() });
      } else if (after.startsWith("[")) {
        // structured reference start — consume Table[... ]
        let j = i + name.length;
        let depth = 0;
        while (j < s.length) {
          if (s[j] === "[") depth++;
          if (s[j] === "]") {
            depth--;
            j++;
            if (depth === 0) break;
            continue;
          }
          j++;
        }
        tokens.push({ kind: "ref", value: s.slice(i, j) });
        i = j;
        continue;
      } else {
        tokens.push({ kind: "identifier", value: name });
      }
      i += name.length;
      continue;
    }

    throw new Error(`Formula lex error at ${i}: ${s.slice(i, i + 20)}`);
  }
  return tokens;
}
