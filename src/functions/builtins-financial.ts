/**
 * Financial bond functions implemented with @floydspace/bond-calculator.
 */
import bondCalculator from "@floydspace/bond-calculator";
import {
  BLANK,
  err,
  ExcelErrorCode,
  num,
  serialToUtcDate,
  type ExcelValue,
} from "../model/value.js";
import { excelCoerceNumber } from "../formula/coercion.js";
import type { ExcelFunction } from "../formula/functions-types.js";

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

function requireNumber(
  arg: ExcelValue | undefined,
  defaultValue: number,
): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  if (arg === undefined) return { ok: true, value: defaultValue };
  const n = excelCoerceNumber(arg);
  if (n.kind === "number") return { ok: true, value: n.value };
  return { ok: false, error: n };
}

function dateSerialToString(value: ExcelValue): { ok: true; date: string } | { ok: false; error: ExcelValue } {
  const n = excelCoerceNumber(value);
  if (n.kind !== "number") return { ok: false, error: n };
  const d = serialToUtcDate({ serial: n.value, dateSystem: "1900" });
  const iso = d.toISOString().slice(0, 10);
  return { ok: true, date: iso };
}

const basisToConvention: Record<number, string> = {
  0: "30U/360",
  1: "ACTUAL/ACTUAL",
  2: "ACTUAL/360",
  3: "ACTUAL/365",
  4: "30E/360",
};

function validateBondArgs(args: ExcelValue[]): { ok: true; settlement: string; maturity: string; rate: number; redemption: number; frequency: number; convention: string } | { ok: false; error: ExcelValue } {
  const settlement = dateSerialToString(args[0] ?? BLANK);
  const maturity = dateSerialToString(args[1] ?? BLANK);
  const rate = requireNumber(args[2], 0);
  const redemption = requireNumber(args[4] ?? BLANK, 100);
  const frequency = requireNumber(args[5] ?? BLANK, 2);
  const basis = requireNumber(args[6] ?? BLANK, 0);
  if (!settlement.ok) return { ok: false, error: settlement.error };
  if (!maturity.ok) return { ok: false, error: maturity.error };
  if (!rate.ok) return { ok: false, error: rate.error };
  if (!redemption.ok) return { ok: false, error: redemption.error };
  if (!frequency.ok) return { ok: false, error: frequency.error };
  if (!basis.ok) return { ok: false, error: basis.error };
  if (![1, 2, 4].includes(frequency.value)) return { ok: false, error: err(ExcelErrorCode.Num) };
  if (basis.value < 0 || basis.value > 4) return { ok: false, error: err(ExcelErrorCode.Num) };
  if (rate.value < 0) return { ok: false, error: err(ExcelErrorCode.Num) };
  if (redemption.value <= 0) return { ok: false, error: err(ExcelErrorCode.Num) };
  return {
    ok: true,
    settlement: settlement.date,
    maturity: maturity.date,
    rate: rate.value,
    redemption: redemption.value,
    frequency: frequency.value,
    convention: basisToConvention[Math.trunc(basis.value)] ?? "30U/360",
  };
}

export function registerFinancialFunctions(add: (f: ExcelFunction) => void): void {
  add(
    fn("PRICE", "none", (args) => {
      const inputs = validateBondArgs(args);
      if (!inputs.ok) return inputs.error;
      const yld = requireNumber(args[3] ?? BLANK, 0);
      if (!yld.ok) return yld.error;
      if (yld.value < 0) return err(ExcelErrorCode.Num);
      try {
        const bond = bondCalculator({
          settlement: inputs.settlement,
          maturity: inputs.maturity,
          rate: inputs.rate,
          redemption: inputs.redemption,
          frequency: inputs.frequency,
          convention: inputs.convention as any,
        });
        return num(bond.price(yld.value));
      } catch {
        return err(ExcelErrorCode.Num);
      }
    }),
  );

  add(
    fn("YIELD", "none", (args) => {
      const inputs = validateBondArgs(args);
      if (!inputs.ok) return inputs.error;
      const pr = requireNumber(args[3] ?? BLANK, 0);
      if (!pr.ok) return pr.error;
      if (pr.value <= 0) return err(ExcelErrorCode.Num);
      try {
        const bond = bondCalculator({
          settlement: inputs.settlement,
          maturity: inputs.maturity,
          rate: inputs.rate,
          redemption: inputs.redemption,
          frequency: inputs.frequency,
          convention: inputs.convention as any,
        });
        return num(bond.yield(pr.value));
      } catch {
        return err(ExcelErrorCode.Num);
      }
    }),
  );
}
