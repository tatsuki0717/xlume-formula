import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formula/evaluator.js";
import { createBuiltinFunctions } from "../src/functions/builtins.js";
import { BLANK, num, str, type ExcelValue } from "../src/model/value.js";
import type { EvaluationContext } from "../src/formula/functions-types.js";

function getNum(v: ExcelValue): number {
  if (v.kind !== "number") throw new Error(`Expected number, got ${v.kind}`);
  return v.value;
}

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

const functions = createBuiltinFunctions();
const ev = new FormulaEvaluator(functions);

describe("Financial worksheet functions", () => {
  it("depreciation and dollar conversions", () => {
    expect(ev.evaluateText("=SLN(10000,1000,5)", ctx())).toEqual(num(1800));
    expect(ev.evaluateText("=SYD(10000,1000,5,2)", ctx())).toEqual(num(2400));
    expect(ev.evaluateText("=DOLLARDE(1.02, 16)", ctx())).toEqual(num(1.125));
    expect(ev.evaluateText("=DOLLARFR(1.125, 16)", ctx())).toEqual(num(1.02));
  });

  it("interest and growth", () => {
    expect(getNum(ev.evaluateText("=EFFECT(0.1, 12)", ctx()))).toBeCloseTo(0.1047, 4);
    expect(getNum(ev.evaluateText("=NOMINAL(0.1047, 12)", ctx()))).toBeCloseTo(0.1, 4);
    expect(getNum(ev.evaluateText("=RRI(5, 100, 200)", ctx()))).toBeCloseTo(0.1487, 4);
    expect(getNum(ev.evaluateText("=PDURATION(0.1, 100, 200)", ctx()))).toBeCloseTo(7.2725, 4);
    expect(ev.evaluateText("=ISPMT(0.1/12, 1, 3, 8000)", ctx())).toEqual(num(-44.44444444444445));
    expect(getNum(ev.evaluateText("=FVSCHEDULE(100, {0.05, 0.06, 0.07})", ctx()))).toBeCloseTo(119.091, 3);
  });

  it("loan schedules", () => {
    expect(getNum(ev.evaluateText("=CUMIPMT(0.1/12, 360, 100000, 1, 12, 0)", ctx()))).toBeCloseTo(-9974.98, 2);
    expect(getNum(ev.evaluateText("=CUMPRINC(0.1/12, 360, 100000, 1, 12, 0)", ctx()))).toBeCloseTo(-555.88, 2);
    expect(getNum(ev.evaluateText("=IPMT(0.1/12, 1, 36, 10000, 0, 0)", ctx()))).toBeCloseTo(-83.333, 3);
    expect(getNum(ev.evaluateText("=PPMT(0.1/12, 1, 36, 10000, 0, 0)", ctx()))).toBeCloseTo(-239.339, 3);
  });

  it("money market", () => {
    const settle = "DATE(2024,1,1)";
    const mat = "DATE(2024,4,1)";
    expect(getNum(ev.evaluateText(`=TBILLPRICE(${settle}, ${mat}, 0.1)`, ctx()))).toBeCloseTo(97.5, 2);
    expect(getNum(ev.evaluateText(`=TBILLYIELD(${settle}, ${mat}, 97.5)`, ctx()))).toBeCloseTo(0.1026, 4);
    expect(getNum(ev.evaluateText(`=TBILLEQ(${settle}, ${mat}, 0.1)`, ctx()))).toBeCloseTo(0.104, 3);
    expect(getNum(ev.evaluateText(`=PRICEDISC(${settle}, ${mat}, 0.1, 100)`, ctx()))).toBeCloseTo(97.5, 2);
    expect(getNum(ev.evaluateText(`=DISC(${settle}, ${mat}, 97.5, 100)`, ctx()))).toBeCloseTo(0.1, 4);
  });

  it("IRR helpers", () => {
    expect(getNum(ev.evaluateText("=MIRR({-1000, 300, 400, 500, 600}, 0.1, 0.12)", ctx()))).toBeCloseTo(0.2014, 4);
    expect(getNum(ev.evaluateText("=XNPV(0.1, {-10000, 2750, 4250, 3250, 2750}, {DATE(2008,1,1), DATE(2008,3,1), DATE(2008,10,30), DATE(2009,2,15), DATE(2009,4,1)})", ctx()))).toBeCloseTo(1994.51, 2);
    expect(getNum(ev.evaluateText("=XIRR({-10000, 2750, 4250, 3250, 2750}, {DATE(2008,1,1), DATE(2008,3,1), DATE(2008,10,30), DATE(2009,2,15), DATE(2009,4,1)})", ctx()))).toBeCloseTo(0.3734, 4);
  });
});
