import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formula/evaluator.js";
import { createBuiltinFunctions } from "../src/functions/builtins.js";
import { BLANK, ExcelErrorCode, num, str, bool } from "../src/model/value.js";
import type { EvaluationContext } from "../src/formula/functions-types.js";

function ctx(
  cells: Record<string, import("../src/model/value.js").ExcelValue> = {},
): EvaluationContext {
  const map = new Map(Object.entries(cells));
  return {
    sheetId: 1,
    row: 0,
    column: 0,
    getCell: (_s, r, c) => map.get(`${r}:${c}`) ?? BLANK,
    getRangeValues: (_s, sr, sc, er, ec) => {
      const out = [];
      for (let r = sr; r <= er; r++) for (let c = sc; c <= ec; c++) out.push(map.get(`${r}:${c}`) ?? BLANK);
      return out;
    },
    getFormulaText: () => undefined,
    resolveName: () => undefined,
    resolveTableColumn: () => [],
    todaySerial: () => 45000,
    random: () => 0.5,
  };
}

function array(values: (number | string | boolean)[][], width = values[0]?.length ?? 0) {
  const flat: import("../src/model/value.js").ExcelValue[] = [];
  for (const row of values) {
    for (const v of row) {
      if (typeof v === "number") flat.push(num(v));
      else if (typeof v === "string") flat.push(str(v));
      else flat.push(bool(v));
    }
  }
  return { kind: "array" as const, width, height: values.length, values: flat };
}

describe("Google Sheets offline functions", () => {
  const functions = createBuiltinFunctions();
  const ev = new FormulaEvaluator(functions);

  it("ADD, MINUS, MULTIPLY, DIVIDE, POW operators", () => {
    expect(ev.evaluateText("=ADD(2,3)", ctx())).toEqual(num(5));
    expect(ev.evaluateText("=MINUS(10,4)", ctx())).toEqual(num(6));
    expect(ev.evaluateText("=MULTIPLY(3,4)", ctx())).toEqual(num(12));
    expect(ev.evaluateText("=DIVIDE(10,2)", ctx())).toEqual(num(5));
    expect(ev.evaluateText("=POW(2,3)", ctx())).toEqual(num(8));
    expect(ev.evaluateText("=UNARY_PERCENT(50)", ctx())).toEqual(num(0.5));
  });

  it("comparison operators", () => {
    expect(ev.evaluateText("=EQ(2,2)", ctx())).toEqual(bool(true));
    expect(ev.evaluateText("=GT(5,3)", ctx())).toEqual(bool(true));
    expect(ev.evaluateText("=ISBETWEEN(5,1,10)", ctx())).toEqual(bool(true));
  });

  it("IS* and COUNTUNIQUE", () => {
    expect(ev.evaluateText('=ISDATE("2023-01-01")', ctx())).toEqual(bool(true));
    expect(ev.evaluateText('=ISEMAIL("test@example.com")', ctx())).toEqual(bool(true));
    expect(ev.evaluateText('=ISURL("https://example.com")', ctx())).toEqual(bool(true));
    expect(ev.evaluateText("=COUNTUNIQUE(1,1,2,3,3,3)", ctx())).toEqual(num(3));
  });

  it("EPOCHTODATE and TO_*", () => {
    expect(ev.evaluateText("=EPOCHTODATE(0,1)", ctx())).toEqual(num(25569));
    expect(ev.evaluateText("=EPOCHTODATE(86400,1)", ctx())).toEqual(num(25570));
    expect(ev.evaluateText("=TO_DOLLARS(1.2345)", ctx())).toEqual(num(1.23));
    expect(ev.evaluateText("=TO_PERCENT(0.5)", ctx())).toEqual(num(0.5));
    expect(ev.evaluateText("=TO_PURE_NUMBER(\"$1,234.50\")", ctx())).toEqual(num(1234.5));
    expect(ev.evaluateText("=TO_TEXT(123)", ctx())).toEqual(str("123"));
  });

  it("JOIN and SPLIT", () => {
    expect(ev.evaluateText('=JOIN("-", "a", "b", "c")', ctx())).toEqual(str("a-b-c"));
    expect(ev.evaluateText('=SPLIT("a-b-c", "-")', ctx())).toEqual(array([["a", "b", "c"]], 3));
  });

  it("REGEXMATCH", () => {
    expect(ev.evaluateText('=REGEXMATCH("hello world", "hello")', ctx())).toEqual(bool(true));
    expect(ev.evaluateText('=REGEXMATCH("Hello", "(?i)^h")', ctx())).toEqual(bool(true));
  });

  it("AVERAGE.WEIGHTED and MARGINOFERROR", () => {
    expect(ev.evaluateText("=AVERAGE.WEIGHTED({1;2;3}, {1;1;1})", ctx())).toEqual(num(2));
    expect(ev.evaluateText("=MARGINOFERROR({1,2,3,4,5}, 0.95)", ctx())).toEqual(expect.objectContaining({ kind: "number" }));
  });

  it("SORTN", () => {
    expect(ev.evaluateText("=SORTN({3;1;2}, 2)", ctx())).toEqual(array([[1], [2]], 1));
    expect(ev.evaluateText("=SORTN({3;1;2}, 1, 0, 1, FALSE)", ctx())).toEqual(array([[3]], 1));
  });

  it("complex number functions", () => {
    expect(ev.evaluateText('=IMLOG(100,10)', ctx())).toEqual(num(2));
    expect(ev.evaluateText('=IMCOTH("3+2i")', ctx())).toEqual(expect.objectContaining({ kind: "string" }));
    expect(ev.evaluateText('=IMTANH("3+2i")', ctx())).toEqual(expect.objectContaining({ kind: "string" }));
  });

  it("ARRAY_CONSTRAIN and FLATTEN", () => {
    expect(ev.evaluateText("=ARRAY_CONSTRAIN({1,2;3,4;5,6}, 2, 2)", ctx())).toEqual(array([[1, 2], [3, 4]], 2));
    expect(ev.evaluateText("=FLATTEN({1,2;3,4})", ctx())).toEqual(array([[1], [2], [3], [4]], 1));
  });

  it("ARRAYFORMULA broadcasts operators over ranges", () => {
    const c = ctx({
      "0:0": num(1), "1:0": num(2), "2:0": num(3),
      "0:1": num(10), "1:1": num(20), "2:1": num(30),
    });
    const result = ev.evaluateText("=ARRAYFORMULA(A1:A3 * B1:B3)", c);
    expect(result).toEqual(array([[10], [40], [90]], 1));
  });

  it("SPARKLINE returns sparkline value", () => {
    const result = ev.evaluateText("=SPARKLINE({1,2,3,4})", ctx());
    expect(result).toEqual(expect.objectContaining({ kind: "sparkline" }));
  });

  it("QUERY filters and sorts a table", () => {
    const c = ctx({
      "0:0": str("Name"), "0:1": str("Score"), "0:2": str("Year"),
      "1:0": str("A"), "1:1": num(80), "1:2": num(2020),
      "2:0": str("B"), "2:1": num(50), "2:2": num(2019),
      "3:0": str("C"), "3:1": num(90), "3:2": num(2021),
      "4:0": str("D"), "4:1": num(70), "4:2": num(2020),
    });
    const result = ev.evaluateText('=QUERY(A1:C5, "SELECT A, B, C WHERE B >= 70 ORDER BY C DESC")', c);
    expect(result).toEqual(array([["Name", "Score", "Year"], ["C", 90, 2021], ["A", 80, 2020], ["D", 70, 2020]], 3));
  });

  it("QUERY groups and aggregates", () => {
    const c = ctx({
      "0:0": str("Year"), "0:1": str("Sales"),
      "1:0": num(2020), "1:1": num(100),
      "2:0": num(2020), "2:1": num(200),
      "3:0": num(2021), "3:1": num(300),
    });
    const result = ev.evaluateText('=QUERY(A1:B4, "SELECT A, SUM(B) GROUP BY A")', c);
    expect(result).toEqual(array([["Year", "SUM(Sales)"], [2020, 300], [2021, 300]], 2));
  });

  it("DOLLAR, FIXED, PROPER, UNICHAR, UNICODE", () => {
    expect(ev.evaluateText("=DOLLAR(1234.567, 2)", ctx())).toEqual(str("$1,234.57"));
    expect(ev.evaluateText("=FIXED(1234.5, 1)", ctx())).toEqual(str("1,234.5"));
    expect(ev.evaluateText("=PROPER(\"hello WORLD\")", ctx())).toEqual(str("Hello World"));
    expect(ev.evaluateText("=UNICHAR(65)", ctx())).toEqual(str("A"));
    expect(ev.evaluateText("=UNICODE(\"A\")", ctx())).toEqual(num(65));
  });

  it("HSTACK, VSTACK, LOOKUP", () => {
    expect(ev.evaluateText("=HSTACK({1,2},{3,4})", ctx())).toEqual(array([[1, 2, 3, 4]], 4));
    expect(ev.evaluateText("=VSTACK({1,2},{3,4})", ctx())).toEqual(array([[1, 2], [3, 4]], 2));
    expect(ev.evaluateText("=LOOKUP(2, {1;2;3}, {\"a\";\"b\";\"c\"})", ctx())).toEqual(str("b"));
  });

  it("DATEDIF, DAYS, YEARFRAC, TIME, NETWORKDAYS", () => {
    expect(ev.evaluateText("=DATEDIF(43831, 44197, \"D\")", ctx())).toEqual(num(366));
    expect(ev.evaluateText("=DATEDIF(43831, 44197, \"Y\")", ctx())).toEqual(num(1));
    expect(ev.evaluateText("=DAYS(44197, 43831)", ctx())).toEqual(num(366));
    expect(ev.evaluateText("=YEARFRAC(43831, 44197)", ctx())).toEqual(num(1));
    expect(ev.evaluateText("=TIME(12, 0, 0)", ctx())).toEqual(num(0.5));
    expect(ev.evaluateText("=NETWORKDAYS(43831, 43837)", ctx())).toEqual(num(5));
  });
});
