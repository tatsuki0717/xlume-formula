import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formula/evaluator.js";
import { createBuiltinFunctions } from "../src/functions/builtins.js";
import { BLANK, ExcelErrorCode, num, str } from "../src/model/value.js";
import type { EvaluationContext } from "../src/formula/functions-types.js";

function ctx(cells: Record<string, import("../src/model/value.js").ExcelValue> = {}): EvaluationContext {
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
    resolveName: () => undefined,
    resolveTableColumn: () => [],
    todaySerial: () => 45000,
    random: () => 0.5,
  };
}

describe("Extra functions toward full compatibility", () => {
  const functions = createBuiltinFunctions();
  const ev = new FormulaEvaluator(functions);

  it("registers extra functions", () => {
    const list = functions.list();
    expect(list).toContain("TRANSPOSE");
    expect(list).toContain("TEXTJOIN");
    expect(list).toContain("XMATCH");
    expect(list).toContain("FV");
    expect(list).toContain("IRR");
    expect(list.length).toBeGreaterThan(110);
  });

  it("TRANSPOSE swaps rows and columns", () => {
    const result = ev.evaluateText("TRANSPOSE({1,2;3,4})", ctx());
    expect(result.kind).toBe("array");
    if (result.kind !== "array") return;
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.values.map((v) => (v as { value: number }).value)).toEqual([1, 3, 2, 4]);
  });

  it("TEXTJOIN concatenates with delimiter", () => {
    expect(ev.evaluateText('TEXTJOIN("-", TRUE, "a", "b", "c")', ctx())).toEqual(str("a-b-c"));
    expect(ev.evaluateText('TEXTJOIN("-", TRUE, {"a","","b"})', ctx())).toEqual(str("a-b"));
  });

  it("TEXTSPLIT returns a matrix", () => {
    const result = ev.evaluateText('TEXTSPLIT("a,b;c,d", ",", ";")', ctx());
    expect(result.kind).toBe("array");
    if (result.kind !== "array") return;
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it("TEXTBEFORE and TEXTAFTER extract substrings", () => {
    expect(ev.evaluateText('TEXTBEFORE("a-b-c", "-")', ctx())).toEqual(str("a"));
    expect(ev.evaluateText('TEXTAFTER("a-b-c", "-")', ctx())).toEqual(str("b-c"));
    expect(ev.evaluateText('TEXTAFTER("a-b-c", "-", 2)', ctx())).toEqual(str("c"));
  });

  it("XMATCH finds exact and last matches", () => {
    expect(ev.evaluateText("XMATCH(2, {1,2,3})", ctx())).toEqual(num(2));
    expect(ev.evaluateText("XMATCH(2, {1,2,3,2}, 0, -1)", ctx())).toEqual(num(4));
  });

  it("SORTBY sorts by keys", () => {
    const result = ev.evaluateText("SORTBY({3;1;2}, {3;1;2})", ctx());
    expect(result.kind).toBe("array");
    if (result.kind !== "array") return;
    expect(result.values.map((v) => (v as { value: number }).value)).toEqual([1, 2, 3]);
  });

  it("MMULT multiplies matrices", () => {
    const result = ev.evaluateText("MMULT({1,2;3,4}, {5,6;7,8})", ctx());
    expect(result.kind).toBe("array");
    if (result.kind !== "array") return;
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.values.map((v) => (v as { value: number }).value)).toEqual([19, 22, 43, 50]);
  });

  it("financial functions compute loan values", () => {
    const pmt = ev.evaluateText("PMT(0.05/12, 360, 100000)", ctx());
    expect(pmt.kind).toBe("number");
    if (pmt.kind === "number") expect(pmt.value).toBeCloseTo(-536.82, 1);

    const rate = ev.evaluateText("RATE(360, -536.82, 100000)", ctx());
    expect(rate.kind).toBe("number");
    if (rate.kind === "number") expect(rate.value).toBeCloseTo(0.00417, 4);

    const pv = ev.evaluateText("PV(0.05/12, 360, -536.82)", ctx());
    expect(pv.kind).toBe("number");
    if (pv.kind === "number") expect(pv.value).toBeCloseTo(100000, -1);

    const nper = ev.evaluateText("NPER(0.05/12, -600, 100000)", ctx());
    expect(nper.kind).toBe("number");
    if (nper.kind === "number") expect(nper.value).toBeGreaterThan(0);
  });

  it("NPV and IRR evaluate cash flows", () => {
    const npv = ev.evaluateText("NPV(0.1, 3000, 4200, 6800)", ctx());
    expect(npv.kind).toBe("number");
    if (npv.kind === "number") expect(npv.value).toBeCloseTo(11307.3, 0);

    const irr = ev.evaluateText("IRR({-10000,3000,4200,6800})", ctx());
    expect(irr.kind).toBe("number");
    if (irr.kind === "number") expect(irr.value).toBeCloseTo(0.1634, 2);
  });

  it("FREQUENCY counts bins", () => {
    const result = ev.evaluateText("FREQUENCY({1,2,3,4,5}, {2,4})", ctx());
    expect(result.kind).toBe("array");
    if (result.kind !== "array") return;
    expect(result.values.map((v) => (v as { value: number }).value)).toEqual([2, 2, 1]);
  });

  it("FORECAST performs linear regression", () => {
    expect(ev.evaluateText("FORECAST(5, {1,2,3}, {2,4,6})", ctx())).toEqual(num(2.5));
  });

  it("SUBTOTAL and AGGREGATE dispatch common functions", () => {
    expect(ev.evaluateText("SUBTOTAL(9, {1,2,3})", ctx())).toEqual(num(6));
    expect(ev.evaluateText("AGGREGATE(14, 4, {1,2,3}, 2)", ctx())).toEqual(num(2));
  });

  it("HYPERLINK returns friendly name", () => {
    expect(ev.evaluateText('HYPERLINK("https://x", "Link")', ctx())).toEqual(str("Link"));
  });

  it("STDEVP and VARP use population denominator", () => {
    const stdevp = ev.evaluateText("STDEVP({1,2,3})", ctx());
    expect(stdevp.kind).toBe("number");
    if (stdevp.kind === "number") expect(stdevp.value).toBeCloseTo(0.816, 2);

    const varp = ev.evaluateText("VARP({1,2,3})", ctx());
    expect(varp.kind).toBe("number");
    if (varp.kind === "number") expect(varp.value).toBeCloseTo(0.667, 2);
  });

  it("GETPIVOTDATA is stubbed to #N/A", () => {
    const result = ev.evaluateText('GETPIVOTDATA("Sum", "Pivot")', ctx());
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.code).toBe(ExcelErrorCode.NA);
  });

  it("XMATCH supports wildcards and descending binary search", () => {
    expect(ev.evaluateText('XMATCH("a*", {"ab","bc","cd"}, 2)', ctx())).toEqual(num(1));
    expect(ev.evaluateText("XMATCH(3, {4,3,2,1}, 0, -2)", ctx())).toEqual(num(2));
  });

  it("SUBTOTAL and AGGREGATE propagate and ignore values correctly", () => {
    expect(ev.evaluateText("SUBTOTAL(2, {TRUE,1})", ctx())).toEqual(num(1));

    const subtotalError = ev.evaluateText("SUBTOTAL(9, 1, 1/0, 3)", ctx());
    expect(subtotalError.kind).toBe("error");
    if (subtotalError.kind === "error") expect(subtotalError.code).toBe(ExcelErrorCode.Div0);

    const aggregateError = ev.evaluateText("AGGREGATE(9, 0, 1, 1/0, 3)", ctx());
    expect(aggregateError.kind).toBe("error");
    if (aggregateError.kind === "error") expect(aggregateError.code).toBe(ExcelErrorCode.Div0);

    expect(ev.evaluateText("AGGREGATE(2, 6, 1, 1/0, 3)", ctx())).toEqual(num(2));
  });

  it("RATE returns 0 for exact zero-interest cases", () => {
    const rate = ev.evaluateText("RATE(10, -1000, 10000, 0, 0, 0.1)", ctx());
    expect(rate.kind).toBe("number");
    if (rate.kind === "number") expect(rate.value).toBeCloseTo(0, 10);
  });
});
