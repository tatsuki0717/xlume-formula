import { describe, expect, it } from "vitest";
import { Workbook } from "../src/model/workbook.js";
import { bool, num, str } from "../src/model/value.js";

/**
 * Direct-literal coercion (Excel semantics): aggregate functions convert
 * string/logical values typed directly into the argument list, but ignore
 * the same values when they arrive through a cell, a range, an array
 * constant or an expression result.
 */
function evaluate(formula: string, setup?: (wb: Workbook, sheet: number) => void): unknown {
  const wb = new Workbook();
  const sheet = wb.addSheet();
  if (setup) setup(wb, sheet);
  wb.setFormula(sheet, 0, 0, formula);
  const v = wb.getValue(sheet, 0, 0);
  return v.kind === "number" || v.kind === "string" || v.kind === "boolean" ? v.value : v.kind === "error" ? v.code : v.kind;
}

describe("direct literal coercion in aggregate functions", () => {
  it("converts numeric string literals", () => {
    expect(evaluate('=SUM("3",1)')).toBe(4);
    expect(evaluate('=SUM("3.5",1)')).toBe(4.5);
    expect(evaluate('=SUM(" 3 ",1)')).toBe(4);
    expect(evaluate('=SUM("-2",5)')).toBe(3);
    expect(evaluate('=SUM("1e2")')).toBe(100);
    expect(evaluate('=SUM("50%")')).toBe(0.5);
    expect(evaluate('=AVERAGE("4",2)')).toBe(3);
    expect(evaluate('=MIN("5",3)')).toBe(3);
    expect(evaluate('=MAX("5",3)')).toBe(5);
    expect(evaluate('=COUNT("3",1)')).toBe(2);
  });

  it("converts logical literals", () => {
    expect(evaluate("=SUM(TRUE,1)")).toBe(2);
    expect(evaluate("=SUM(FALSE,1)")).toBe(1);
    expect(evaluate("=AVERAGE(TRUE,3)")).toBe(2);
    expect(evaluate("=COUNT(TRUE)")).toBe(1);
    expect(evaluate("=COUNT(FALSE)")).toBe(1);
    expect(evaluate("=MIN(TRUE,3)")).toBe(1);
  });

  it("raises #VALUE! for non-numeric string literals in strict functions", () => {
    expect(evaluate('=SUM("abc")')).toBe("#VALUE!");
    expect(evaluate('=SUM("")')).toBe("#VALUE!");
    expect(evaluate('=AVERAGE("abc")')).toBe("#VALUE!");
    expect(evaluate('=MIN("abc")')).toBe("#VALUE!");
    expect(evaluate('=MAX("abc")')).toBe("#VALUE!");
  });

  it("COUNT ignores and COUNTA counts non-numeric string literals", () => {
    expect(evaluate('=COUNT("abc")')).toBe(0);
    expect(evaluate('=COUNT("abc",1)')).toBe(1);
    expect(evaluate('=COUNTA("abc")')).toBe(1);
    expect(evaluate('=COUNTA("3")')).toBe(1);
    expect(evaluate('=COUNTA("")')).toBe(1);
  });

  it("propagates error literals unchanged", () => {
    expect(evaluate("=SUM(#N/A)")).toBe("#N/A");
    expect(evaluate("=SUM(#N/A,1)")).toBe("#N/A");
  });

  it("does not convert values arriving through cells or ranges", () => {
    const textCell = (wb: Workbook, s: number) => wb.setValue(s, 0, 1, str("3"));
    expect(evaluate("=SUM(B1,1)", textCell)).toBe(1);
    expect(evaluate("=COUNT(B1,1)", textCell)).toBe(1);
    expect(evaluate("=AVERAGE(B1,4)", textCell)).toBe(4);
    const boolCell = (wb: Workbook, s: number) => wb.setValue(s, 0, 1, bool(true));
    expect(evaluate("=AVERAGE(B1,4)", boolCell)).toBe(4);
    expect(evaluate("=COUNT(B1)", boolCell)).toBe(0);
    expect(evaluate("=MIN(B1,3)", boolCell)).toBe(3);
    const range = (wb: Workbook, s: number) => {
      wb.setValue(s, 0, 1, str("3"));
      wb.setValue(s, 1, 1, num(5));
    };
    expect(evaluate("=SUM(B1:B2)", range)).toBe(5);
    expect(evaluate("=COUNT(B1:B2)", range)).toBe(1);
  });

  it("does not convert array constants or expression results", () => {
    expect(evaluate('=SUM({1,"3"})')).toBe(1);
    expect(evaluate('=COUNT({1,"a",TRUE})')).toBe(1);
    expect(evaluate('=SUM(IF(TRUE,"3",0),1)')).toBe(1);
    expect(evaluate('=SUM("3"&"",1)')).toBe(1);
  });

  it("leaves non-target functions and number literals untouched", () => {
    expect(evaluate("=SUM(3,1)")).toBe(4);
    expect(evaluate("=SUMPRODUCT({1,2},{3,4})")).toBe(11);
    expect(evaluate('=SUMPRODUCT("3",2)')).toBe("#VALUE!"); // unchanged: not a direct-literal target
  });
});
