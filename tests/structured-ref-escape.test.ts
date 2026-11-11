import { describe, expect, it } from "vitest";
import { lexFormula } from "../src/formula/lexer.js";
import { parseFormula } from "../src/formula/ast.js";
import { XlumeFormulaEngine } from "../src/formula/engine.js";
import type { EvaluationContext } from "../src/formula/functions-types.js";
import { num, str, type ExcelValue } from "../src/model/value.js";

/**
 * Structured references with `'` escapes (Excel structured-reference
 * syntax): inside Table[...], a `'` escapes the next character, so
 * column names may contain `[`, `]`, `#`, `@` and `'` itself:
 *
 *   Table[A']B]    -> column named  A]B
 *   Table[It''s]   -> column named  It's
 *   Table['#Tag]   -> column named  #Tag
 *   Table[A'[B]    -> column named  A[B
 *
 * Contract: the lexer emits ONE ref token with the raw (still-escaped)
 * text and the parser stores that raw inner text in the structured
 * node; unescaping is the host resolver's job (resolveTableColumn),
 * matching what hosts such as xlume implement.
 */

describe("lexer: structured reference escapes", () => {
  const refOf = (formula: string) =>
    lexFormula(formula).filter((t) => t.kind === "ref");

  it("escaped ] does not terminate the reference", () => {
    expect(refOf("SUM(Sales[A']B])")).toEqual([{ kind: "ref", value: "Sales[A']B]" }]);
  });

  it("escaped [ does not nest", () => {
    expect(refOf("Sales[A'[B]")).toEqual([{ kind: "ref", value: "Sales[A'[B]" }]);
  });

  it("'' is an escaped apostrophe inside a column name", () => {
    expect(refOf("Sales[It''s]")).toEqual([{ kind: "ref", value: "Sales[It''s]" }]);
  });

  it("escaped # and @ are literal column-name characters", () => {
    expect(refOf("Sales['#Tag]")).toEqual([{ kind: "ref", value: "Sales['#Tag]" }]);
    expect(refOf("Sales['@Home]")).toEqual([{ kind: "ref", value: "Sales['@Home]" }]);
  });

  it("column name that is only an escaped ]", () => {
    // Column named `A]` is written A'] and then the closing bracket follows.
    expect(refOf("Sales[A']]")).toEqual([{ kind: "ref", value: "Sales[A']]" }]);
  });

  it("escapes work inside nested item brackets", () => {
    expect(refOf("Sales[[#All],[A']B]]")).toEqual([
      { kind: "ref", value: "Sales[[#All],[A']B]]" },
    ]);
    expect(refOf("Sales[[A']B]:[It''s]]")).toEqual([
      { kind: "ref", value: "Sales[[A']B]:[It''s]]" },
    ]);
  });

  it("tokens after an escaped reference lex normally", () => {
    const toks = lexFormula("Sales[A']B]+1");
    expect(toks[0]).toEqual({ kind: "ref", value: "Sales[A']B]" });
    expect(toks[1]).toEqual({ kind: "op", value: "+" });
    expect(toks[2]).toEqual({ kind: "number", value: 1 });
  });

  it("unescaped structured references are unchanged", () => {
    expect(refOf("Sales[#All]")).toEqual([{ kind: "ref", value: "Sales[#All]" }]);
    expect(refOf("Sales[Amount]")).toEqual([{ kind: "ref", value: "Sales[Amount]" }]);
    expect(refOf("Sales[[#Headers],[Amount]]")).toEqual([
      { kind: "ref", value: "Sales[[#Headers],[Amount]]" },
    ]);
    expect(refOf("Sales[@Amount]")).toEqual([{ kind: "ref", value: "Sales[@Amount]" }]);
  });
});

describe("parser: structured node keeps the raw inner text", () => {
  it("bare escaped column", () => {
    expect(parseFormula("=Sales[A']B]")).toEqual({
      kind: "structured",
      table: "Sales",
      column: "A']B",
    });
  });

  it("escaped apostrophe column", () => {
    expect(parseFormula("=Sales[It''s]")).toEqual({
      kind: "structured",
      table: "Sales",
      column: "It''s",
    });
  });

  it("region + escaped column keeps the whole raw spec", () => {
    expect(parseFormula("=Sales[[#All],[A']B]]")).toEqual({
      kind: "structured",
      table: "Sales",
      column: "[#All],[A']B]",
    });
  });

  it("plain specifiers are unchanged", () => {
    expect(parseFormula("=Sales[#Totals]")).toEqual({
      kind: "structured",
      table: "Sales",
      column: "#Totals",
    });
  });
});

/* ------------------------------------------------------------------ */
/* Evaluation against a real table definition                          */
/* ------------------------------------------------------------------ */

const HEADERS = ["Item", "Amount", "A]B", "It's", "#Tag", "A[B", "#"];
const DATA: (string | number)[][] = [
  ["pen", 10, 1, 4, 7, 2, 5],
  ["book", 20, 2, 5, 8, 4, 5],
  ["bag", 30, 3, 6, 9, 6, 5],
];
const TOTALS: (string | number)[] = ["Total", 60, 6, 15, 24, 12, 15];

const toValue = (v: string | number): ExcelValue =>
  typeof v === "number" ? num(v) : str(v);

/** Unescape one column-name segment: `'x` -> `x` (Excel rule). */
function unescapeName(raw: string): string {
  return raw.replace(/'(.)/g, "$1");
}

/** Split a raw spec into its bracketed items, honoring `'` escapes. */
function splitItems(inner: string): string[] {
  const trimmed = inner.trim();
  if (!trimmed.startsWith("[")) return [unescapeName(trimmed)];
  const items: string[] = [];
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed[i] !== "[") break;
    let j = i + 1;
    let content = "";
    while (j < trimmed.length) {
      const ch = trimmed[j]!;
      if (ch === "'" && j + 1 < trimmed.length) {
        content += trimmed[j + 1];
        j += 2;
        continue;
      }
      if (ch === "]") break;
      content += ch;
      j++;
    }
    items.push(content);
    i = j + 1;
    while (i < trimmed.length && (trimmed[i] === "," || trimmed[i] === ":" || trimmed[i] === " ")) i++;
  }
  return items;
}

/**
 * Host-side resolver for the test table, following Excel semantics on
 * the raw spec text — the same contract xlume's runtime implements.
 * `thisRowIndex` stands in for the formula cell's row within the table
 * (hosts map the cell position to a table row).
 */
function makeHost(thisRowIndex: number, calls: { table: string; column?: string }[]) {
  return (table: string, column?: string): ExcelValue[] => {
    calls.push({ table, column });
    if (table !== "Sales" || column === undefined) return [];
    const colIndex = (name: string) => HEADERS.indexOf(name);
    const dataOf = (name: string) => {
      const ci = colIndex(name);
      return ci < 0 ? [] : DATA.map((row) => toValue(row[ci]!));
    };

    const raw = column;
    if (!raw.startsWith("[") && !raw.startsWith("#") && !raw.startsWith("@")) {
      return dataOf(unescapeName(raw));
    }
    if (raw.startsWith("@")) {
      // This-row: [@Column] or @[Column]
      const rest = raw.slice(1);
      const name = rest.startsWith("[") ? splitItems(rest)[0]! : unescapeName(rest);
      const ci = colIndex(name);
      return ci < 0 ? [] : [toValue(DATA[thisRowIndex]![ci]!)];
    }
    const items = splitItems(raw);
    const first = items[0]!;
    if (first.startsWith("#")) {
      const region = first.toLowerCase();
      const name = items[1];
      if (name === undefined) {
        if (region === "#headers") return HEADERS.map((h) => str(h));
        return [];
      }
      const ci = colIndex(name);
      if (ci < 0) return [];
      if (region === "#headers") return [str(HEADERS[ci]!)];
      if (region === "#totals") return [toValue(TOTALS[ci]!)];
      if (region === "#all") return [str(HEADERS[ci]!), ...dataOf(name), toValue(TOTALS[ci]!)];
      return dataOf(name); // #Data
    }
    // Column range [From]:[To] — flattened per the resolver contract.
    if (items.length === 2) {
      const out: ExcelValue[] = [];
      const a = colIndex(items[0]!);
      const b = colIndex(items[1]!);
      for (let ci = a; ci <= b; ci++) out.push(...DATA.map((row) => toValue(row[ci]!)));
      return out;
    }
    return dataOf(first);
  };
}

function makeContext(thisRowIndex = 0) {
  const calls: { table: string; column?: string }[] = [];
  const ctx: EvaluationContext = {
    sheetId: 0,
    sheetName: "Sheet1",
    row: thisRowIndex,
    column: 9,
    getCell: () => num(0),
    getRangeValues: () => [],
    getFormulaText: () => undefined,
    resolveName: () => undefined,
    resolveTableColumn: makeHost(thisRowIndex, calls),
    todaySerial: () => 45292,
    random: () => 0.5,
  };
  return { ctx, calls };
}

const engine = new XlumeFormulaEngine();
const evalFormula = (formula: string, thisRowIndex = 0) => {
  const { ctx, calls } = makeContext(thisRowIndex);
  return { value: engine.evaluate(formula, ctx), calls };
};

describe("evaluation: escaped structured references resolve", () => {
  it("SUM over a column whose name contains ]", () => {
    const { value, calls } = evalFormula("=SUM(Sales[A']B])");
    expect(value).toEqual(num(6));
    // The resolver receives the raw escaped spec (host unescapes).
    expect(calls).toEqual([{ table: "Sales", column: "A']B" }]);
  });

  it("SUM over a column whose name contains an apostrophe", () => {
    expect(evalFormula("=SUM(Sales[It''s])").value).toEqual(num(15));
  });

  it("SUM over a column whose name starts with #", () => {
    expect(evalFormula("=SUM(Sales['#Tag])").value).toEqual(num(24));
  });

  it("SUM over a column named exactly #", () => {
    expect(evalFormula("=SUM(Sales['#])").value).toEqual(num(15));
  });

  it("SUM over a column whose name contains [", () => {
    expect(evalFormula("=SUM(Sales[A'[B])").value).toEqual(num(12));
  });

  it("bare escaped column returns the data array", () => {
    const { value } = evalFormula("=Sales[A']B]");
    expect(value).toEqual({ kind: "array", width: 1, height: 3, values: [num(1), num(2), num(3)] });
  });

  it("region + escaped column forms", () => {
    expect(evalFormula("=SUM(Sales[[#Data],[A']B]])").value).toEqual(num(6));
    expect(evalFormula("=SUM(Sales[[#All],[Amount]])").value).toEqual(num(120));
    expect(evalFormula("=SUM(Sales[[#Totals],[A']B]])").value).toEqual(num(6));
    const headers = evalFormula("=Sales[[#Headers],[A']B]]");
    expect(headers.value).toEqual({
      kind: "array",
      width: 1,
      height: 1,
      values: [str("A]B")],
    });
  });

  it("column range including an escaped column", () => {
    // [Amount]:[A]B] flattened: 10,20,30 + 1,2,3
    expect(evalFormula("=SUM(Sales[[Amount]:[A']B]])").value).toEqual(num(66));
  });

  it("this-row form with an escaped column", () => {
    const { value } = evalFormula("=Sales[@[A']B]]", 1);
    expect(value).toEqual({ kind: "array", width: 1, height: 1, values: [num(2)] });
  });

  it("unescaped columns still resolve as before", () => {
    expect(evalFormula("=SUM(Sales[Amount])").value).toEqual(num(60));
    expect(evalFormula("=SUM(Sales[#Totals])").value).toEqual(num(0)); // no column -> host returns []
  });
});
