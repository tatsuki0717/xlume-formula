import { createBuiltinFunctions } from "../functions/builtins.js";
import { defineCustomFunction, defineFunction } from "../functions/custom.js";
import type { ExcelValue } from "../model/value.js";
import type { UserFunction } from "../functions/custom.js";
import { FormulaEvaluator } from "./evaluator.js";
import type { EvaluationContext, ExcelFunction, ExternalFunctionProvider } from "./functions-types.js";

/** High-level formula engine that wraps the registry and evaluator.
 * Users can register custom Excel functions and evaluate formulas against a context.
 */
export class XlumeFormulaEngine {
  private functions = createBuiltinFunctions();
  private evaluator = new FormulaEvaluator(this.functions);

  constructor(private external?: ExternalFunctionProvider) {}

  /** Register an already-built ExcelFunction. */
  registerFunction(fn: ExcelFunction): this {
    this.functions.register(fn);
    return this;
  }

  /** Register a custom function by name and implementation. */
  addCustom(name: string, fn: UserFunction, volatility: ExcelFunction["volatility"] = "none"): this {
    this.functions.register(defineFunction(name, volatility, fn));
    return this;
  }

  /** Convenience alias for non-volatile custom functions. */
  add(name: string, fn: UserFunction): this {
    this.functions.register(defineCustomFunction(name, fn));
    return this;
  }

  /** Evaluate a formula string. The leading = is optional. */
  evaluate(formula: string, ctx?: EvaluationContext): ExcelValue {
    return this.evaluator.evaluateText(formula, ctx ?? this.defaultContext());
  }

  private defaultContext(): EvaluationContext {
    return {
      sheetId: 0,
      row: 0,
      column: 0,
      getCell: () => ({ kind: "blank" }),
      getRangeValues: () => [],
      resolveName: () => undefined,
      resolveTableColumn: () => [],
      todaySerial: () => {
        const now = new Date();
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.floor((now.getTime() - epoch) / 86400000);
        return serial >= 60 ? serial + 1 : serial;
      },
      random: () => Math.random(),
      external: this.external,
    };
  }

  /** List built-in and registered function names. */
  listFunctions(): string[] {
    return this.functions.list();
  }
}
