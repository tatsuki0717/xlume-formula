import { describe, expect, it } from "vitest";
import { Workbook } from "../src/model/workbook.js";
import { num } from "../src/model/value.js";

function evalFormula(formula: string) {
  const wb = new Workbook();
  const sheet = wb.addSheet();
  wb.setFormula(sheet, 0, 0, formula);
  return wb.getValue(sheet, 0, 0);
}

function evalGrid(formula: string, rows: number, cols: number) {
  const wb = new Workbook();
  const sheet = wb.addSheet();
  wb.setFormula(sheet, 0, 0, formula);
  const out: unknown[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: unknown[] = [];
    for (let c = 0; c < cols; c++) {
      const v = wb.getValue(sheet, r, c);
      row.push(v.kind === "number" ? v.value : v.kind);
    }
    out.push(row);
  }
  return out;
}

describe("TAKE / DROP", () => {
  it("TAKE keeps the first rows and all columns when columns are omitted", () => {
    expect(evalGrid("=TAKE({1,2;3,4},1)", 1, 2)).toEqual([[1, 2]]);
    expect(evalFormula("=SUM(TAKE({1,2;3,4},1))")).toEqual(num(3));
  });

  it("TAKE with a negative count keeps the last rows", () => {
    expect(evalGrid("=TAKE({1,2;3,4},-1)", 1, 2)).toEqual([[3, 4]]);
  });

  it("TAKE honours an explicit column count", () => {
    expect(evalGrid("=TAKE({1,2;3,4},1,1)", 1, 1)).toEqual([[1]]);
  });

  it("DROP removes the first rows and keeps the rest", () => {
    expect(evalGrid("=DROP({1,2;3,4},1)", 1, 2)).toEqual([[3, 4]]);
    expect(evalFormula("=SUM(DROP({1,2;3,4},1))")).toEqual(num(7));
  });

  it("DROP can drop columns only", () => {
    expect(evalGrid("=DROP({1,2;3,4},0,1)", 2, 1)).toEqual([[2], [4]]);
  });

  it("DROP with a negative count removes from the end", () => {
    expect(evalGrid("=DROP({1,2;3,4},-1)", 1, 2)).toEqual([[1, 2]]);
  });
});

describe("LAMBDA invocation", () => {
  it("invokes a LAMBDA value immediately: LAMBDA(x,x+1)(5)", () => {
    expect(evalFormula("=LAMBDA(x,x+1)(5)")).toEqual(num(6));
  });

  it("invokes a parenthesised LAMBDA with multiple arguments", () => {
    expect(evalFormula("=(LAMBDA(x,y,x*y))(3,4)")).toEqual(num(12));
  });

  it("supports [optional] parameters and ISOMITTED", () => {
    expect(evalFormula("=LAMBDA([x],ISOMITTED(x))()")).toEqual({ kind: "boolean", value: true });
    expect(evalFormula("=LAMBDA([x],ISOMITTED(x))(9)")).toEqual({ kind: "boolean", value: false });
    expect(evalFormula("=LAMBDA([x],IF(ISOMITTED(x),100,x))()")).toEqual(num(100));
    expect(evalFormula("=LAMBDA([x],IF(ISOMITTED(x),100,x))(7)")).toEqual(num(7));
  });

  it("still invokes LET-bound lambdas by name", () => {
    expect(evalFormula("=LET(f,LAMBDA(x,x*3),f(4))")).toEqual(num(12));
  });
});
