import { describe, expect, it } from "vitest";
import { Workbook } from "../src/model/workbook.js";
import { bool, err, ExcelErrorCode, num, str } from "../src/model/value.js";
import { parseFormula } from "../src/formula/ast.js";

/**
 * Reference semantics (Excel): text and logical values that arrive through
 * a reference, range, union, structured reference or a name bound to one
 * are ignored by SUM / AVERAGE / MIN / MAX and never counted by COUNT.
 * COUNTA counts every non-blank cell regardless of origin. Direct literals
 * keep the coercion implemented separately (see literal-coercion.test.ts),
 * and array constants are direct values, not references.
 */
function evaluateAt(
  formula: string,
  row: number,
  column: number,
  setup?: (wb: Workbook, sheet: number) => void,
): unknown {
  const wb = new Workbook();
  const sheet = wb.addSheet();
  if (setup) setup(wb, sheet);
  wb.setFormula(sheet, row, column, formula);
  const v = wb.getValue(sheet, row, column);
  return v.kind === "number" || v.kind === "string" || v.kind === "boolean"
    ? v.value
    : v.kind === "error"
      ? v.code
      : v.kind;
}

function evaluate(formula: string, setup?: (wb: Workbook, sheet: number) => void): unknown {
  return evaluateAt(formula, 0, 0, setup);
}

/** B1="3" (text), B2=TRUE, B3=5, B4=#DIV/0!, B5="abc". B6 stays blank. */
function matrix(wb: Workbook, s: number): void {
  wb.setValue(s, 0, 1, str("3"));
  wb.setValue(s, 1, 1, bool(true));
  wb.setValue(s, 2, 1, num(5));
  wb.setValue(s, 3, 1, err(ExcelErrorCode.Div0));
  wb.setValue(s, 4, 1, str("abc"));
}

describe("reference semantics in aggregate functions", () => {
  it("reproduces the reported deviation: SUM over text+logical cells", () => {
    const setup = (wb: Workbook, s: number) => {
      wb.setValue(s, 1, 0, str("3")); // A2
      wb.setValue(s, 2, 0, bool(true)); // A3
    };
    expect(evaluateAt("=SUM(A2:A3)", 0, 2, setup)).toBe(0);
  });

  it("SUM ignores text and logicals arriving through references and ranges", () => {
    expect(evaluate("=SUM(B1)", matrix)).toBe(0);
    expect(evaluate("=SUM(B2)", matrix)).toBe(0);
    expect(evaluate("=SUM(B2,10)", matrix)).toBe(10);
    expect(evaluate("=SUM(B3)", matrix)).toBe(5);
    expect(evaluate("=SUM(B1:B3)", matrix)).toBe(5);
    expect(evaluate("=SUM(B1:B3,10)", matrix)).toBe(15);
  });

  it("AVERAGE / MIN / MAX ignore text and logicals from references", () => {
    expect(evaluate("=AVERAGE(B1:B3)", matrix)).toBe(5);
    expect(evaluate("=AVERAGE(B2,10)", matrix)).toBe(10);
    expect(evaluate("=AVERAGE(B1:B2)", matrix)).toBe("#DIV/0!");
    expect(evaluate("=MIN(B1:B3)", matrix)).toBe(5);
    expect(evaluate("=MAX(B1:B3)", matrix)).toBe(5);
    expect(evaluate("=MIN(B2,3)", matrix)).toBe(3);
    expect(evaluate("=MAX(B1,-1)", matrix)).toBe(-1);
    expect(evaluate("=MIN(B1:B2)", matrix)).toBe(0); // no numbers at all -> 0
  });

  it("COUNT counts only numeric cells in references", () => {
    expect(evaluate("=COUNT(B1:B3)", matrix)).toBe(1);
    expect(evaluate("=COUNT(B1)", matrix)).toBe(0);
    expect(evaluate("=COUNT(B2)", matrix)).toBe(0);
    expect(evaluate("=COUNT(B3)", matrix)).toBe(1);
  });

  it("COUNTA counts every non-blank cell regardless of origin", () => {
    expect(evaluate("=COUNTA(B1:B3)", matrix)).toBe(3);
    expect(evaluate("=COUNTA(B1:B5)", matrix)).toBe(5); // error cell counts too
    expect(evaluate("=COUNTA(B1:B6)", matrix)).toBe(5); // trailing blank excluded
    expect(evaluate("=COUNTA(B2)", matrix)).toBe(1);
  });

  it("propagates errors contained in references", () => {
    expect(evaluate("=SUM(B3:B4)", matrix)).toBe("#DIV/0!");
    expect(evaluate("=SUM(B4)", matrix)).toBe("#DIV/0!");
    expect(evaluate("=AVERAGE(B3:B4)", matrix)).toBe("#DIV/0!");
    expect(evaluate("=MIN(B3:B4)", matrix)).toBe("#DIV/0!");
    expect(evaluate("=MAX(B3:B4)", matrix)).toBe("#DIV/0!");
    expect(evaluate("=COUNT(B3:B4)", matrix)).toBe("#DIV/0!");
    expect(evaluate("=COUNT(B4)", matrix)).toBe("#DIV/0!");
  });

  it("applies reference semantics through unions and the implicit-intersection operator", () => {
    expect(evaluate("=SUM((B2,B3))", matrix)).toBe(5);
    // @ picks the cell on the formula's row: row 2 -> B2 (TRUE) must be ignored.
    expect(evaluateAt("=SUM(@B1:B3)", 1, 0, matrix)).toBe(0);
    expect(evaluateAt("=SUM(@B1:B3)", 2, 0, matrix)).toBe(5);
  });

  it("applies reference semantics through a defined name bound to a range", () => {
    const setup = (wb: Workbook, s: number) => {
      matrix(wb, s);
      wb.defineName("Data", parseFormula("B1:B3"));
    };
    expect(evaluate("=SUM(Data)", setup)).toBe(5);
    expect(evaluate("=COUNT(Data)", setup)).toBe(1);
  });

  it("keeps direct values untouched: literals and array constants", () => {
    expect(evaluate('=SUM("3",1)')).toBe(4);
    expect(evaluate("=SUM(TRUE,1)")).toBe(2);
    expect(evaluate("=COUNT({1,2,3})")).toBe(3);
    // Array constants are direct values, not references: SUM counts the logical.
    expect(evaluate("=SUM({1,TRUE})")).toBe(2);
    expect(evaluate("=SUM({1,TRUE},B2)", matrix)).toBe(2);
  });
});
