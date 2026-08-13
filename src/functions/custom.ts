import type { EvaluationContext, ExcelFunction } from "../formula/functions-types.js";
import type { ExcelValue } from "../model/value.js";

export type UserFunction = (args: ExcelValue[], ctx: EvaluationContext) => ExcelValue;

/** Build an ExcelFunction from a plain JS function. */
export function defineFunction(
  name: string,
  volatility: ExcelFunction["volatility"],
  fn: UserFunction,
): ExcelFunction {
  return { name, volatility, evaluate: fn };
}

/** Convenience builder for non-volatile custom functions. */
export function defineCustomFunction(name: string, fn: UserFunction): ExcelFunction {
  return defineFunction(name, "none", fn);
}
