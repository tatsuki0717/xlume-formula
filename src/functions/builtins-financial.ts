/**
 * Financial bond / money-market functions.
 * PRICE/YIELD use @floydspace/bond-calculator; other functions are implemented
 * with Excel day-count / coupon-date arithmetic.
 */
import bondCalculator from "@floydspace/bond-calculator";
import {
  BLANK,
  err,
  ExcelErrorCode,
  num,
  type ExcelValue,
} from "../model/value.js";
import type { ExcelFunction } from "../formula/functions-types.js";
import {
  buildCouponSchedule,
  daysBetween,
  requireDate,
  requireNumber,
  yearDays,
} from "./financial-utils.js";

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

const basisToConvention: Record<number, string> = {
  0: "30U/360",
  1: "ACTUAL/ACTUAL",
  2: "ACTUAL/360",
  3: "ACTUAL/365",
  4: "30E/360",
};

interface BondInputs {
  settlement: Date;
  maturity: Date;
  rate: number;
  redemption: number;
  frequency: number;
  basis: number;
}

function validateBondArgs(
  args: ExcelValue[],
  hasRedemption: boolean,
  rateIdx: number,
  redemptionOrFrequencyIdx: number,
  frequencyOrBasisIdx: number,
  basisIdx: number,
): { ok: true; inputs: BondInputs } | { ok: false; error: ExcelValue } {
  const settlement = requireDate(args[0]);
  const maturity = requireDate(args[1]);
  const rate = requireNumber(args[rateIdx], 0);
  const redemption = hasRedemption
    ? requireNumber(args[redemptionOrFrequencyIdx] ?? BLANK, 100)
    : { ok: true as const, value: 100 };
  const frequency = hasRedemption
    ? requireNumber(args[frequencyOrBasisIdx] ?? BLANK, 2)
    : requireNumber(args[redemptionOrFrequencyIdx] ?? BLANK, 2);
  const basis = hasRedemption
    ? requireNumber(args[basisIdx] ?? BLANK, 0)
    : requireNumber(args[frequencyOrBasisIdx] ?? BLANK, 0);
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
  if (settlement.date.getTime() >= maturity.date.getTime()) return { ok: false, error: err(ExcelErrorCode.Num) };
  return {
    ok: true,
    inputs: {
      settlement: settlement.date,
      maturity: maturity.date,
      rate: rate.value,
      redemption: redemption.value,
      frequency: frequency.value,
      basis: Math.trunc(basis.value),
    },
  };
}

function priceYieldArgs(args: ExcelValue[]) {
  return validateBondArgs(args, true, 2, 4, 5, 6);
}

function durationArgs(args: ExcelValue[]) {
  return validateBondArgs(args, false, 2, 4, 5, -1);
}

function couponArgs(args: ExcelValue[]) {
  return validateBondArgs(args, false, -1, 2, 3, -1);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeSchedule(args: ExcelValue[], hasRedemption: boolean, rateIdx: number, freqIdx: number, basisIdx: number) {
  const v = validateBondArgs(args, hasRedemption, rateIdx, hasRedemption ? 4 : freqIdx, hasRedemption ? 5 : basisIdx, hasRedemption ? 6 : -1);
  if (!v.ok) return { ok: false as const, error: v.error };
  const schedule = buildCouponSchedule(v.inputs.settlement, v.inputs.maturity, v.inputs.frequency, v.inputs.basis);
  return { ok: true as const, inputs: v.inputs, schedule };
}

function durationSchedule(args: ExcelValue[]) {
  return makeSchedule(args, false, 2, 4, 5);
}

function couponSchedule(args: ExcelValue[]) {
  return makeSchedule(args, false, -1, 2, 3);
}

function macaulayDuration(inputs: BondInputs, schedule: ReturnType<typeof buildCouponSchedule>, yld: number): number {
  const coupon = (inputs.rate * 100) / inputs.frequency;
  const y = yld / inputs.frequency;
  const E = daysBetween(schedule.previousCoupon, schedule.nextCoupon, inputs.basis);
  const DSC = daysBetween(inputs.settlement, schedule.nextCoupon, inputs.basis);
  if (E === 0) return Number.NaN;
  const w = DSC / E;
  let pv = 0;
  let weighted = 0;
  const n = schedule.coupons.length;
  for (let k = 0; k < n; k++) {
    const cf = k === n - 1 ? coupon + 100 : coupon;
    const exponent = w + k;
    const df = (1 + y) ** exponent;
    const present = cf / df;
    const t = (DSC + k * E) / (E * inputs.frequency);
    pv += present;
    weighted += t * present;
  }
  if (pv === 0) return Number.NaN;
  return weighted / pv;
}

export function registerFinancialFunctions(add: (f: ExcelFunction) => void): void {
  add(
    fn("PRICE", "none", (args) => {
      const v = priceYieldArgs(args);
      if (!v.ok) return v.error;
      const { inputs } = v;
      const yld = requireNumber(args[3] ?? BLANK, 0);
      if (!yld.ok) return yld.error;
      if (yld.value < 0) return err(ExcelErrorCode.Num);
      try {
        const bond = bondCalculator({
          settlement: formatDate(inputs.settlement),
          maturity: formatDate(inputs.maturity),
          rate: inputs.rate,
          redemption: inputs.redemption,
          frequency: inputs.frequency,
          convention: basisToConvention[inputs.basis] as any,
        });
        return num(bond.price(yld.value));
      } catch {
        return err(ExcelErrorCode.Num);
      }
    }),
  );

  add(
    fn("YIELD", "none", (args) => {
      const v = priceYieldArgs(args);
      if (!v.ok) return v.error;
      const { inputs } = v;
      const pr = requireNumber(args[3] ?? BLANK, 0);
      if (!pr.ok) return pr.error;
      if (pr.value <= 0) return err(ExcelErrorCode.Num);
      try {
        const bond = bondCalculator({
          settlement: formatDate(inputs.settlement),
          maturity: formatDate(inputs.maturity),
          rate: inputs.rate,
          redemption: inputs.redemption,
          frequency: inputs.frequency,
          convention: basisToConvention[inputs.basis] as any,
        });
        return num(bond.yield(pr.value));
      } catch {
        return err(ExcelErrorCode.Num);
      }
    }),
  );

  add(
    fn("DURATION", "none", (args) => {
      const v = durationSchedule(args);
      if (!v.ok) return v.error;
      const yld = requireNumber(args[3] ?? BLANK, 0);
      if (!yld.ok) return yld.error;
      if (yld.value < 0) return err(ExcelErrorCode.Num);
      const d = macaulayDuration(v.inputs, v.schedule, yld.value);
      if (Number.isNaN(d)) return err(ExcelErrorCode.Num);
      return num(d);
    }),
  );

  add(
    fn("MDURATION", "none", (args) => {
      const v = durationSchedule(args);
      if (!v.ok) return v.error;
      const yld = requireNumber(args[3] ?? BLANK, 0);
      if (!yld.ok) return yld.error;
      if (yld.value < 0) return err(ExcelErrorCode.Num);
      const d = macaulayDuration(v.inputs, v.schedule, yld.value);
      if (Number.isNaN(d)) return err(ExcelErrorCode.Num);
      return num(d / (1 + yld.value / v.inputs.frequency));
    }),
  );

  function couponFunction(args: ExcelValue[], kind: "ncd" | "pcd" | "days" | "daybs" | "daysnc" | "num"): ExcelValue {
    const v = couponSchedule(args);
    if (!v.ok) return v.error;
    const { inputs, schedule } = v;
    const { previousCoupon, nextCoupon, coupons } = schedule;
    switch (kind) {
      case "ncd":
        return num(dateToSerial(nextCoupon));
      case "pcd":
        return num(dateToSerial(previousCoupon));
      case "days":
        return num(daysBetween(previousCoupon, nextCoupon, inputs.basis));
      case "daybs":
        return num(daysBetween(previousCoupon, inputs.settlement, inputs.basis));
      case "daysnc":
        return num(daysBetween(inputs.settlement, nextCoupon, inputs.basis));
      case "num":
        return num(coupons.length);
    }
  }

  add(fn("COUPNCD", "none", (args) => couponFunction(args, "ncd")));
  add(fn("COUPPCD", "none", (args) => couponFunction(args, "pcd")));
  add(fn("COUPDAYS", "none", (args) => couponFunction(args, "days")));
  add(fn("COUPDAYBS", "none", (args) => couponFunction(args, "daybs")));
  add(fn("COUPDAYSNC", "none", (args) => couponFunction(args, "daysnc")));
  add(fn("COUPNUM", "none", (args) => couponFunction(args, "num")));

  // Money-market / maturity functions
  add(
    fn("PRICEMAT", "none", (args) => {
      const settlement = requireDate(args[0]);
      const maturity = requireDate(args[1]);
      const issue = requireDate(args[2]);
      const rate = requireNumber(args[3], 0);
      const yld = requireNumber(args[4], 0);
      const basis = requireNumber(args[5] ?? BLANK, 0);
      if (!settlement.ok) return settlement.error;
      if (!maturity.ok) return maturity.error;
      if (!issue.ok) return issue.error;
      if (!rate.ok) return rate.error;
      if (!yld.ok) return yld.error;
      if (!basis.ok) return basis.error;
      const b = Math.trunc(basis.value);
      if (b < 0 || b > 4) return err(ExcelErrorCode.Num);
      if (rate.value < 0 || yld.value < 0) return err(ExcelErrorCode.Num);
      if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
      const B = yearDays(b, maturity.date);
      const DSM = daysBetween(settlement.date, maturity.date, b);
      const DIM = daysBetween(issue.date, maturity.date, b);
      const A = daysBetween(issue.date, settlement.date, b);
      const price = (100 + (100 * rate.value * DIM) / B) / (1 + (yld.value * DSM) / B) - (100 * rate.value * A) / B;
      return num(price);
    }),
  );

  add(
    fn("YIELDMAT", "none", (args) => {
      const settlement = requireDate(args[0]);
      const maturity = requireDate(args[1]);
      const issue = requireDate(args[2]);
      const rate = requireNumber(args[3], 0);
      const pr = requireNumber(args[4], 0);
      const basis = requireNumber(args[5] ?? BLANK, 0);
      if (!settlement.ok) return settlement.error;
      if (!maturity.ok) return maturity.error;
      if (!issue.ok) return issue.error;
      if (!rate.ok) return rate.error;
      if (!pr.ok) return pr.error;
      if (!basis.ok) return basis.error;
      const b = Math.trunc(basis.value);
      if (b < 0 || b > 4) return err(ExcelErrorCode.Num);
      if (rate.value < 0 || pr.value <= 0) return err(ExcelErrorCode.Num);
      if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
      const B = yearDays(b, maturity.date);
      const DSM = daysBetween(settlement.date, maturity.date, b);
      const DIM = daysBetween(issue.date, maturity.date, b);
      const A = daysBetween(issue.date, settlement.date, b);
      const denom = pr.value / 100 + (rate.value * A) / B;
      if (denom === 0) return err(ExcelErrorCode.Div0);
      const yieldVal = ((1 + (rate.value * DIM) / B) - (pr.value / 100 + (rate.value * A) / B)) / denom * (B / DSM);
      return num(yieldVal);
    }),
  );

  add(
    fn("INTRATE", "none", (args) => {
      const settlement = requireDate(args[0]);
      const maturity = requireDate(args[1]);
      const investment = requireNumber(args[2], 0);
      const redemption = requireNumber(args[3], 0);
      const basis = requireNumber(args[4] ?? BLANK, 0);
      if (!settlement.ok) return settlement.error;
      if (!maturity.ok) return maturity.error;
      if (!investment.ok) return investment.error;
      if (!redemption.ok) return redemption.error;
      if (!basis.ok) return basis.error;
      const b = Math.trunc(basis.value);
      if (b < 0 || b > 4) return err(ExcelErrorCode.Num);
      if (investment.value <= 0 || redemption.value <= 0) return err(ExcelErrorCode.Num);
      if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
      const B = yearDays(b, maturity.date);
      const DIM = daysBetween(settlement.date, maturity.date, b);
      if (DIM === 0) return err(ExcelErrorCode.Div0);
      return num(((redemption.value - investment.value) / investment.value) * (B / DIM));
    }),
  );

  add(
    fn("RECEIVED", "none", (args) => {
      const settlement = requireDate(args[0]);
      const maturity = requireDate(args[1]);
      const investment = requireNumber(args[2], 0);
      const discount = requireNumber(args[3], 0);
      const basis = requireNumber(args[4] ?? BLANK, 0);
      if (!settlement.ok) return settlement.error;
      if (!maturity.ok) return maturity.error;
      if (!investment.ok) return investment.error;
      if (!discount.ok) return discount.error;
      if (!basis.ok) return basis.error;
      const b = Math.trunc(basis.value);
      if (b < 0 || b > 4) return err(ExcelErrorCode.Num);
      if (investment.value <= 0 || discount.value <= 0) return err(ExcelErrorCode.Num);
      if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
      const B = yearDays(b, maturity.date);
      const DIM = daysBetween(settlement.date, maturity.date, b);
      const denom = 1 - (discount.value * DIM) / B;
      if (denom === 0) return err(ExcelErrorCode.Div0);
      return num(investment.value / denom);
    }),
  );

  add(
    fn("YIELDDISC", "none", (args) => {
      const settlement = requireDate(args[0]);
      const maturity = requireDate(args[1]);
      const pr = requireNumber(args[2], 0);
      const redemption = requireNumber(args[3], 0);
      const basis = requireNumber(args[4] ?? BLANK, 0);
      if (!settlement.ok) return settlement.error;
      if (!maturity.ok) return maturity.error;
      if (!pr.ok) return pr.error;
      if (!redemption.ok) return redemption.error;
      if (!basis.ok) return basis.error;
      const b = Math.trunc(basis.value);
      if (b < 0 || b > 4) return err(ExcelErrorCode.Num);
      if (pr.value <= 0 || redemption.value <= 0) return err(ExcelErrorCode.Num);
      if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
      const B = yearDays(b, maturity.date);
      const DSM = daysBetween(settlement.date, maturity.date, b);
      if (DSM === 0) return err(ExcelErrorCode.Div0);
      return num(((redemption.value - pr.value) / pr.value) * (B / DSM));
    }),
  );

  add(
    fn("ACCRINTM", "none", (args) => {
      const issue = requireDate(args[0]);
      const settlement = requireDate(args[1]);
      const rate = requireNumber(args[2], 0);
      const par = requireNumber(args[3] ?? BLANK, 1000);
      const basis = requireNumber(args[4] ?? BLANK, 0);
      if (!issue.ok) return issue.error;
      if (!settlement.ok) return settlement.error;
      if (!rate.ok) return rate.error;
      if (!par.ok) return par.error;
      if (!basis.ok) return basis.error;
      const b = Math.trunc(basis.value);
      if (b < 0 || b > 4) return err(ExcelErrorCode.Num);
      if (rate.value <= 0 || par.value <= 0) return err(ExcelErrorCode.Num);
      if (issue.date.getTime() >= settlement.date.getTime()) return err(ExcelErrorCode.Num);
      const B = yearDays(b, settlement.date);
      const A = daysBetween(issue.date, settlement.date, b);
      return num(par.value * rate.value * A / B);
    }),
  );
}

function dateToSerial(date: Date): number {
  const epoch = Date.UTC(1899, 11, 30);
  return (date.getTime() - epoch) / 86400000;
}
