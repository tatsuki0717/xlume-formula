import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formula/evaluator.js";
import { createBuiltinFunctions } from "../src/functions/builtins.js";
import { num } from "../src/model/value.js";
import type { EvaluationContext } from "../src/formula/functions-types.js";

function ctx(): EvaluationContext {
  return {
    sheetId: 1,
    row: 0,
    column: 0,
    getCell: () => ({ kind: "blank" }),
    getRangeValues: () => [],
    getFormulaText: () => undefined,
    resolveName: () => undefined,
    resolveTableColumn: () => [],
    todaySerial: () => 45000,
    random: () => 0.5,
  };
}

describe("EUROCONVERT", () => {
  const functions = createBuiltinFunctions();
  const ev = new FormulaEvaluator(functions);

  it("converts DEM to EUR with default rounding", () => {
    expect(ev.evaluateText('EUROCONVERT(1.20, "DEM", "EUR")', ctx())).toEqual(num(0.61));
  });

  it("converts FRF to DEM using triangulation", () => {
    expect(ev.evaluateText('EUROCONVERT(1.47, "FRF", "DEM")', ctx())).toEqual(num(0.44));
  });

  it("returns full precision when requested", () => {
    const result = ev.evaluateText('EUROCONVERT(1.20, "DEM", "EUR", TRUE)', ctx());
    expect(result.kind).toBe("number");
    if (result.kind !== "number") return;
    expect(result.value).toBeGreaterThan(0.61);
    expect(result.value).toBeLessThan(0.62);
  });
});
