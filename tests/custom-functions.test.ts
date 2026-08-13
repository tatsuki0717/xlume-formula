import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formula/evaluator.js";
import { XlumeFormulaEngine } from "../src/formula/engine.js";
import { createBuiltinFunctions } from "../src/functions/builtins.js";
import { defineCustomFunction, defineFunction } from "../src/functions/custom.js";
import { BLANK, err, ExcelErrorCode, num } from "../src/model/value.js";
import type { EvaluationContext, ExcelValue } from "../src/formula/functions-types.js";

function ctx(): EvaluationContext {
  return {
    sheetId: 1,
    row: 0,
    column: 0,
    getCell: () => BLANK,
    getRangeValues: () => [],
    resolveName: () => undefined,
    resolveTableColumn: () => [],
    todaySerial: () => 45000,
    random: () => 0.5,
  };
}

describe("Custom functions", () => {
  it("allows users to register a custom worksheet function", () => {
    const functions = createBuiltinFunctions();
    functions.register(defineCustomFunction("DOUBLE", (args: ExcelValue[]) => {
      const x = args[0];
      if (!x || x.kind !== "number") return err(ExcelErrorCode.Value);
      return num(x.value * 2);
    }));

    const ev = new FormulaEvaluator(functions);
    expect(ev.evaluateText("DOUBLE(21)", ctx())).toEqual(num(42));
  });

  it("supports volatile custom functions via defineFunction", () => {
    const functions = createBuiltinFunctions();
    functions.register(defineFunction("RANDMAX", "volatile", (args: ExcelValue[], c) => {
      const maxArg = args[0];
      const max = maxArg && maxArg.kind === "number" ? maxArg.value : 100;
      return num(Math.floor(c.random() * max));
    }));

    const ev = new FormulaEvaluator(functions);
    const result = ev.evaluateText("RANDMAX(10)", ctx());
    expect(result.kind).toBe("number");
    if (result.kind === "number") {
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(10);
    }
  });

  it("reports unknown functions as #NAME?", () => {
    const ev = new FormulaEvaluator(createBuiltinFunctions());
    const result = ev.evaluateText("UNKNOWN(1)", ctx());
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.code).toBe(ExcelErrorCode.Name);
  });

  it("XlumeFormulaEngine provides a fluent API for custom functions", () => {
    const engine = new XlumeFormulaEngine();
    engine.add("TRIPLE", (args: ExcelValue[]) => {
      const x = args[0];
      if (!x || x.kind !== "number") return err(ExcelErrorCode.Value);
      return num(x.value * 3);
    });
    expect(engine.evaluate("TRIPLE(7)", ctx())).toEqual(num(21));
    expect(engine.listFunctions()).toContain("TRIPLE");
  });
});
