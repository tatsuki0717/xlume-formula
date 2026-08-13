/**
 * Native implementations for financial worksheet functions previously handled by formula.js.
 */
import {
  BLANK,
  err,
  ExcelErrorCode,
  num,
  str,
  type ExcelValue,
} from "../model/value.js";
import { excelCoerceNumber, excelCoerceString } from "../formula/coercion.js";
import type { ExcelFunction } from "../formula/functions-types.js";
import {
  addMonths,
  cloneDate,
  dateFromSerial,
  dateToSerial,
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

// ------------------------------------------------------------------
// Local annuity helpers (signs follow Excel convention)
// ------------------------------------------------------------------

function pmt(rate: number, nper: number, pv: number, fv = 0, type = 0): number {
  if (nper === 0) return NaN;
  if (rate === 0) return -(pv + fv) / nper;
  const factor = (1 + rate) ** nper;
  return -(pv * rate * factor + fv * rate) / ((1 + rate * type) * (factor - 1));
}

function fv(rate: number, nper: number, pmtVal: number, pv: number, type = 0): number {
  if (nper === 0) return -pv;
  if (rate === 0) return -pv - pmtVal * nper;
  const factor = (1 + rate) ** nper;
  return -pv * factor - pmtVal * ((factor - 1) / rate) * (1 + rate * type);
}

function npv(rate: number, cashFlows: number[]): number {
  let sum = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    sum += cashFlows[i]! / (1 + rate) ** (i + 1);
  }
  return sum;
}

function yearFrac(d1: Date, d2: Date, basis: number): number {
  const days = daysBetween(d1, d2, basis);
  const yd = yearDays(basis, d2);
  return days / yd;
}

// ------------------------------------------------------------------
// Date and number parsing
// ------------------------------------------------------------------

function dateOrError(arg: ExcelValue | undefined): { ok: true; date: Date } | { ok: false; error: ExcelValue } {
  const d = requireDate(arg);
  if ("error" in d) return { ok: false, error: d.error };
  return { ok: true, date: d.date };
}

function numberOrError(arg: ExcelValue | undefined, defaultValue: number): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  return requireNumber(arg, defaultValue);
}

function flattenNumbers(arg: ExcelValue | undefined): number[] | null {
  if (!arg || arg.kind === "blank") return [];
  const out: number[] = [];
  const items: ExcelValue[] = arg.kind === "array" ? arg.values : [arg];
  for (const v of items) {
    if (v.kind === "array") {
      const nested = flattenNumbers(v);
      if (!nested) return null;
      out.push(...nested);
    } else {
      const n = excelCoerceNumber(v);
      if (n.kind !== "number") return null;
      out.push(n.value);
    }
  }
  return out;
}

function flattenDates(arg: ExcelValue | undefined): Date[] | null {
  if (!arg || arg.kind === "blank") return [];
  const out: Date[] = [];
  const items: ExcelValue[] = arg.kind === "array" ? arg.values : [arg];
  for (const v of items) {
    if (v.kind === "array") {
      const nested = flattenDates(v);
      if (!nested) return null;
      out.push(...nested);
    } else {
      const d = dateFromSerial(v);
      if (!d.ok) return null;
      out.push(d.date);
    }
  }
  return out;
}

// ------------------------------------------------------------------
// Depreciation
// ------------------------------------------------------------------

export function registerFinancial2Functions(add: (f: ExcelFunction) => void): void {
  add(fn("SLN", "none", (args) => {
    const cost = requireNumber(args[0], 0);
    const salvage = requireNumber(args[1], 0);
    const life = requireNumber(args[2], 0);
    if (!cost.ok || !salvage.ok || !life.ok) return err(ExcelErrorCode.Value);
    if (life.value === 0) return err(ExcelErrorCode.Num);
    return num((cost.value - salvage.value) / life.value);
  }));

  add(fn("SYD", "none", (args) => {
    const cost = requireNumber(args[0], 0);
    const salvage = requireNumber(args[1], 0);
    const life = requireNumber(args[2], 0);
    const per = requireNumber(args[3], 0);
    if (!cost.ok || !salvage.ok || !life.ok || !per.ok) return err(ExcelErrorCode.Value);
    if (life.value === 0) return err(ExcelErrorCode.Num);
    if (per.value < 1 || per.value > life.value) return err(ExcelErrorCode.Num);
    const p = Math.trunc(per.value);
    return num(((cost.value - salvage.value) * (life.value - p + 1) * 2) / (life.value * (life.value + 1)));
  }));

  add(fn("DB", "none", (args) => {
    const cost = requireNumber(args[0], 0);
    const salvage = requireNumber(args[1], 0);
    const life = requireNumber(args[2], 0);
    const period = requireNumber(args[3], 0);
    const month = requireNumber(args[4] ?? BLANK, 12);
    if (!cost.ok || !salvage.ok || !life.ok || !period.ok || !month.ok) return err(ExcelErrorCode.Value);
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].indexOf(month.value) === -1) return err(ExcelErrorCode.Num);
    if (cost.value < 0 || salvage.value < 0 || life.value < 0 || period.value < 0) return err(ExcelErrorCode.Num);
    if (period.value > life.value) return err(ExcelErrorCode.Num);
    if (salvage.value >= cost.value) return num(0);
    const rate = 1 - Math.pow(salvage.value / cost.value, 1 / life.value);
    const r = Number(rate.toFixed(3));
    const initial = (cost.value * r * month.value) / 12;
    let total = initial;
    let current = 0;
    const ceiling = period.value === life.value ? life.value - 1 : period.value;
    for (let i = 2; i <= ceiling; i++) {
      current = (cost.value - total) * r;
      total += current;
    }
    if (period.value === 1) return num(initial);
    if (period.value === life.value) return num((cost.value - total) * r);
    return num(current);
  }));

  add(fn("DDB", "none", (args) => {
    const cost = requireNumber(args[0], 0);
    const salvage = requireNumber(args[1], 0);
    const life = requireNumber(args[2], 0);
    const period = requireNumber(args[3], 0);
    const factor = requireNumber(args[4] ?? BLANK, 2);
    if (!cost.ok || !salvage.ok || !life.ok || !period.ok || !factor.ok) return err(ExcelErrorCode.Value);
    if (cost.value < 0 || salvage.value < 0 || life.value < 0 || period.value < 0 || factor.value <= 0) return err(ExcelErrorCode.Num);
    if (period.value > life.value) return err(ExcelErrorCode.Num);
    if (salvage.value >= cost.value) return num(0);
    let total = 0;
    let current = 0;
    for (let i = 1; i <= period.value; i++) {
      current = Math.min((cost.value - total) * (factor.value / life.value), cost.value - salvage.value - total);
      total += current;
    }
    return num(current);
  }));

  // ------------------------------------------------------------------
  // Interest / growth
  // ------------------------------------------------------------------

  add(fn("EFFECT", "none", (args) => {
    const nominal = requireNumber(args[0], 0);
    const npery = requireNumber(args[1], 0);
    if (!nominal.ok || !npery.ok) return err(ExcelErrorCode.Value);
    if (nominal.value <= 0 || npery.value < 1) return err(ExcelErrorCode.Num);
    const n = Math.trunc(npery.value);
    return num((1 + nominal.value / n) ** n - 1);
  }));

  add(fn("NOMINAL", "none", (args) => {
    const effect = requireNumber(args[0], 0);
    const npery = requireNumber(args[1], 0);
    if (!effect.ok || !npery.ok) return err(ExcelErrorCode.Value);
    if (effect.value <= 0 || npery.value < 1) return err(ExcelErrorCode.Num);
    const n = Math.trunc(npery.value);
    return num((Math.pow(effect.value + 1, 1 / n) - 1) * n);
  }));

  add(fn("RRI", "none", (args) => {
    const nper = requireNumber(args[0], 0);
    const pv = requireNumber(args[1], 0);
    const fvArg = requireNumber(args[2], 0);
    if (!nper.ok || !pv.ok || !fvArg.ok) return err(ExcelErrorCode.Value);
    if (nper.value === 0 || pv.value === 0) return err(ExcelErrorCode.Num);
    return num(Math.pow(fvArg.value / pv.value, 1 / nper.value) - 1);
  }));

  add(fn("PDURATION", "none", (args) => {
    const rate = requireNumber(args[0], 0);
    const pv = requireNumber(args[1], 0);
    const fvArg = requireNumber(args[2], 0);
    if (!rate.ok || !pv.ok || !fvArg.ok) return err(ExcelErrorCode.Value);
    if (rate.value <= 0 || pv.value <= 0 || fvArg.value <= 0) return err(ExcelErrorCode.Num);
    return num((Math.log(fvArg.value) - Math.log(pv.value)) / Math.log(1 + rate.value));
  }));

  add(fn("ISPMT", "none", (args) => {
    const rate = requireNumber(args[0], 0);
    const per = requireNumber(args[1], 0);
    const nper = requireNumber(args[2], 0);
    const pv = requireNumber(args[3], 0);
    if (!rate.ok || !per.ok || !nper.ok || !pv.ok) return err(ExcelErrorCode.Value);
    return num(pv.value * rate.value * (per.value / nper.value - 1));
  }));

  add(fn("FVSCHEDULE", "none", (args) => {
    const principal = requireNumber(args[0], 0);
    if (!principal.ok) return err(ExcelErrorCode.Value);
    let future = principal.value;
    const schedule = args[1];
    if (!schedule || schedule.kind !== "array") return err(ExcelErrorCode.Value);
    for (const v of schedule.values) {
      const n = excelCoerceNumber(v);
      if (n.kind !== "number") return err(ExcelErrorCode.Value);
      future *= 1 + n.value;
    }
    return num(future);
  }));

  // ------------------------------------------------------------------
  // Loan schedules
  // ------------------------------------------------------------------

  add(fn("CUMIPMT", "none", (args) => {
    const rate = requireNumber(args[0], 0);
    const nper = requireNumber(args[1], 0);
    const pv = requireNumber(args[2], 0);
    const start = requireNumber(args[3], 0);
    const end = requireNumber(args[4], 0);
    const type = requireNumber(args[5] ?? BLANK, 0);
    if (!rate.ok || !nper.ok || !pv.ok || !start.ok || !end.ok || !type.ok) return err(ExcelErrorCode.Value);
    if (rate.value <= 0 || nper.value <= 0 || pv.value <= 0) return err(ExcelErrorCode.Num);
    if (start.value < 1 || end.value < 1 || start.value > end.value) return err(ExcelErrorCode.Num);
    if (type.value !== 0 && type.value !== 1) return err(ExcelErrorCode.Num);
    const t = type.value as 0 | 1;
    const payment = pmt(rate.value, nper.value, pv.value, 0, t);
    let interest = 0;
    let s = Math.trunc(start.value);
    const e = Math.trunc(end.value);
    if (s === 1) {
      if (t === 0) interest = -pv.value;
      s++;
    }
    for (let i = s; i <= e; i++) {
      interest += t === 1 ? fv(rate.value, i - 2, payment, pv.value, 1) - payment : fv(rate.value, i - 1, payment, pv.value, 0);
    }
    return num(interest * rate.value);
  }));

  add(fn("CUMPRINC", "none", (args) => {
    const rate = requireNumber(args[0], 0);
    const nper = requireNumber(args[1], 0);
    const pv = requireNumber(args[2], 0);
    const start = requireNumber(args[3], 0);
    const end = requireNumber(args[4], 0);
    const type = requireNumber(args[5] ?? BLANK, 0);
    if (!rate.ok || !nper.ok || !pv.ok || !start.ok || !end.ok || !type.ok) return err(ExcelErrorCode.Value);
    if (rate.value <= 0 || nper.value <= 0 || pv.value <= 0) return err(ExcelErrorCode.Num);
    if (start.value < 1 || end.value < 1 || start.value > end.value) return err(ExcelErrorCode.Num);
    if (type.value !== 0 && type.value !== 1) return err(ExcelErrorCode.Num);
    const t = type.value as 0 | 1;
    const payment = pmt(rate.value, nper.value, pv.value, 0, t);
    let principal = 0;
    let s = Math.trunc(start.value);
    const e = Math.trunc(end.value);
    if (s === 1) {
      principal = t === 0 ? payment + pv.value * rate.value : payment;
      s++;
    }
    for (let i = s; i <= e; i++) {
      principal +=
        t === 1
          ? payment - (fv(rate.value, i - 2, payment, pv.value, 1) - payment) * rate.value
          : payment - fv(rate.value, i - 1, payment, pv.value, 0) * rate.value;
    }
    return num(principal);
  }));

  add(fn("IPMT", "none", (args) => {
    const rate = requireNumber(args[0], 0);
    const per = requireNumber(args[1], 0);
    const nper = requireNumber(args[2], 0);
    const pv = requireNumber(args[3], 0);
    const fvArg = requireNumber(args[4] ?? BLANK, 0);
    const type = requireNumber(args[5] ?? BLANK, 0);
    if (!rate.ok || !per.ok || !nper.ok || !pv.ok || !fvArg.ok || !type.ok) return err(ExcelErrorCode.Value);
    if (per.value < 1 || per.value > nper.value) return err(ExcelErrorCode.Num);
    if (type.value !== 0 && type.value !== 1) return err(ExcelErrorCode.Num);
    const t = type.value as 0 | 1;
    const payment = pmt(rate.value, nper.value, pv.value, fvArg.value, t);
    let interest;
    const p = Math.trunc(per.value);
    if (p === 1) {
      interest = t === 1 ? 0 : -pv.value;
    } else if (t === 1) {
      interest = fv(rate.value, p - 2, payment, pv.value, 1) - payment;
    } else {
      interest = fv(rate.value, p - 1, payment, pv.value, 0);
    }
    return num(interest * rate.value);
  }));

  add(fn("PPMT", "none", (args) => {
    const rate = requireNumber(args[0], 0);
    const per = requireNumber(args[1], 0);
    const nper = requireNumber(args[2], 0);
    const pv = requireNumber(args[3], 0);
    const fvArg = requireNumber(args[4] ?? BLANK, 0);
    const type = requireNumber(args[5] ?? BLANK, 0);
    if (!rate.ok || !per.ok || !nper.ok || !pv.ok || !fvArg.ok || !type.ok) return err(ExcelErrorCode.Value);
    const payment = pmt(rate.value, nper.value, pv.value, fvArg.value, type.value as 0 | 1);
    const ip = (() => {
      const p = Math.trunc(per.value);
      if (p < 1 || p > nper.value) return NaN;
      if (type.value !== 0 && type.value !== 1) return NaN;
      const t = type.value as 0 | 1;
      let interest;
      if (p === 1) {
        interest = t === 1 ? 0 : -pv.value;
      } else if (t === 1) {
        interest = fv(rate.value, p - 2, payment, pv.value, 1) - payment;
      } else {
        interest = fv(rate.value, p - 1, payment, pv.value, 0);
      }
      return interest * rate.value;
    })();
    if (Number.isNaN(ip)) return err(ExcelErrorCode.Num);
    return num(payment - ip);
  }));

  // ------------------------------------------------------------------
  // Dollar price fractions
  // ------------------------------------------------------------------

  add(fn("DOLLARDE", "none", (args) => {
    const fractional = requireNumber(args[0], 0);
    const fraction = requireNumber(args[1], 0);
    if (!fractional.ok || !fraction.ok) return err(ExcelErrorCode.Value);
    if (fraction.value < 0) return err(ExcelErrorCode.Num);
    if (fraction.value >= 0 && fraction.value < 1) return err(ExcelErrorCode.Div0);
    const f = Math.trunc(fraction.value);
    const power = Math.pow(10, Math.ceil(Math.log(f) / Math.LN10));
    const result = Math.trunc(fractional.value) + ((fractional.value % 1) * power) / f;
    const roundPower = Math.pow(10, Math.ceil(Math.log(f) / Math.LN2) + 1);
    return num(Math.round(result * roundPower) / roundPower);
  }));

  add(fn("DOLLARFR", "none", (args) => {
    const decimal = requireNumber(args[0], 0);
    const fraction = requireNumber(args[1], 0);
    if (!decimal.ok || !fraction.ok) return err(ExcelErrorCode.Value);
    if (fraction.value < 0) return err(ExcelErrorCode.Num);
    if (fraction.value >= 0 && fraction.value < 1) return err(ExcelErrorCode.Div0);
    const f = Math.trunc(fraction.value);
    const power = Math.pow(10, -Math.ceil(Math.log(f) / Math.LN10));
    const result = Math.trunc(decimal.value) + (decimal.value % 1) * power * f;
    return num(result);
  }));

  // ------------------------------------------------------------------
  // Money market / discount
  // ------------------------------------------------------------------

  add(fn("DISC", "none", (args) => {
    const settlement = dateOrError(args[0]);
    const maturity = dateOrError(args[1]);
    const pr = requireNumber(args[2], 0);
    const redemption = requireNumber(args[3], 0);
    const basis = requireNumber(args[4] ?? BLANK, 0);
    if (!settlement.ok || !maturity.ok || !pr.ok || !redemption.ok || !basis.ok) return err(ExcelErrorCode.Value);
    if (pr.value <= 0 || redemption.value <= 0) return err(ExcelErrorCode.Num);
    if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
    if (basis.value < 0 || basis.value > 4) return err(ExcelErrorCode.Num);
    const b = Math.trunc(basis.value);
    const diff = daysBetween(settlement.date, maturity.date, b);
    if (diff === 0) return err(ExcelErrorCode.Num);
    const yd = yearDays(b, maturity.date);
    return num(((redemption.value - pr.value) / redemption.value) * (yd / diff));
  }));

  add(fn("PRICEDISC", "none", (args) => {
    const settlement = dateOrError(args[0]);
    const maturity = dateOrError(args[1]);
    const discount = requireNumber(args[2], 0);
    const redemption = requireNumber(args[3], 0);
    const basis = requireNumber(args[4] ?? BLANK, 0);
    if (!settlement.ok || !maturity.ok || !discount.ok || !redemption.ok || !basis.ok) return err(ExcelErrorCode.Value);
    if (discount.value <= 0 || redemption.value <= 0) return err(ExcelErrorCode.Num);
    if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
    if (basis.value < 0 || basis.value > 4) return err(ExcelErrorCode.Num);
    const b = Math.trunc(basis.value);
    const diff = daysBetween(settlement.date, maturity.date, b);
    const yd = yearDays(b, maturity.date);
    return num(redemption.value - (discount.value * redemption.value * diff) / yd);
  }));

  add(fn("TBILLEQ", "none", (args) => {
    const settlement = dateOrError(args[0]);
    const maturity = dateOrError(args[1]);
    const discount = requireNumber(args[2], 0);
    if (!settlement.ok || !maturity.ok || !discount.ok) return err(ExcelErrorCode.Value);
    if (discount.value <= 0) return err(ExcelErrorCode.Num);
    if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
    const actualDays = daysBetween(settlement.date, maturity.date, 1);
    if (actualDays > 365) return err(ExcelErrorCode.Num);
    const diff = daysBetween(settlement.date, maturity.date, 0);
    return num((365 * discount.value) / (360 - discount.value * diff));
  }));

  add(fn("TBILLPRICE", "none", (args) => {
    const settlement = dateOrError(args[0]);
    const maturity = dateOrError(args[1]);
    const discount = requireNumber(args[2], 0);
    if (!settlement.ok || !maturity.ok || !discount.ok) return err(ExcelErrorCode.Value);
    if (discount.value <= 0) return err(ExcelErrorCode.Num);
    if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
    const actualDays = daysBetween(settlement.date, maturity.date, 1);
    if (actualDays > 365) return err(ExcelErrorCode.Num);
    const diff = daysBetween(settlement.date, maturity.date, 0);
    return num(100 * (1 - (discount.value * diff) / 360));
  }));

  add(fn("TBILLYIELD", "none", (args) => {
    const settlement = dateOrError(args[0]);
    const maturity = dateOrError(args[1]);
    const pr = requireNumber(args[2], 0);
    if (!settlement.ok || !maturity.ok || !pr.ok) return err(ExcelErrorCode.Value);
    if (pr.value <= 0) return err(ExcelErrorCode.Num);
    if (settlement.date.getTime() >= maturity.date.getTime()) return err(ExcelErrorCode.Num);
    const actualDays = daysBetween(settlement.date, maturity.date, 1);
    if (actualDays > 365) return err(ExcelErrorCode.Num);
    const diff = daysBetween(settlement.date, maturity.date, 0);
    if (diff === 0) return err(ExcelErrorCode.Num);
    return num(((100 - pr.value) * 360) / (pr.value * diff));
  }));

  // ------------------------------------------------------------------
  // Accrued interest and IRR
  // ------------------------------------------------------------------

  add(fn("ACCRINT", "none", (args) => {
    const issue = dateOrError(args[0]);
    const firstInterest = dateOrError(args[1]);
    const settlement = dateOrError(args[2]);
    const rate = requireNumber(args[3], 0);
    const par = requireNumber(args[4], 0);
    const frequency = requireNumber(args[5], 0);
    const basis = requireNumber(args[6] ?? BLANK, 0);
    if (!issue.ok || !firstInterest.ok || !settlement.ok || !rate.ok || !par.ok || !frequency.ok || !basis.ok) return err(ExcelErrorCode.Value);
    if (rate.value <= 0 || par.value <= 0) return err(ExcelErrorCode.Num);
    if (![1, 2, 4].includes(frequency.value)) return err(ExcelErrorCode.Num);
    if (basis.value < 0 || basis.value > 4) return err(ExcelErrorCode.Num);
    if (settlement.date.getTime() <= issue.date.getTime()) return err(ExcelErrorCode.Num);
    const b = Math.trunc(basis.value);
    // Simplified accrued interest following YEARFRAC from issue to settlement
    return num(par.value * rate.value * yearFrac(issue.date, settlement.date, b));
  }));

  add(fn("MIRR", "none", (args) => {
    const values = flattenNumbers(args[0]);
    const finance = requireNumber(args[1], 0);
    const reinvest = requireNumber(args[2], 0);
    if (values === null || !finance.ok || !reinvest.ok) return err(ExcelErrorCode.Value);
    const positive = values.filter((v) => v > 0);
    const negative = values.filter((v) => v < 0);
    if (positive.length === 0 || negative.length === 0) return err(ExcelErrorCode.Div0);
    const n = values.length;
    const numerator = -npv(reinvest.value, positive) * Math.pow(1 + reinvest.value, n - 1);
    const den = npv(finance.value, negative) * (1 + finance.value);
    if (den === 0 || numerator / den < 0) return err(ExcelErrorCode.Num);
    return num(Math.pow(numerator / den, 1 / (n - 1)) - 1);
  }));

  add(fn("XNPV", "none", (args) => {
    const rate = requireNumber(args[0], 0);
    const values = flattenNumbers(args[1]);
    const dates = flattenDates(args[2]);
    if (!rate.ok || values === null || dates === null) return err(ExcelErrorCode.Value);
    if (values.length !== dates.length) return err(ExcelErrorCode.Num);
    if (values.length === 0) return num(0);
    const start = dates[0]!;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      const days = daysBetween(start, dates[i]!, 1);
      sum += values[i]! / Math.pow(1 + rate.value, days / 365);
    }
    return num(sum);
  }));

  add(fn("XIRR", "none", (args) => {
    const values = flattenNumbers(args[0]);
    const dates = flattenDates(args[1]);
    const guess = requireNumber(args[2] ?? BLANK, 0.1);
    if (values === null || dates === null || !guess.ok) return err(ExcelErrorCode.Value);
    if (values.length !== dates.length) return err(ExcelErrorCode.Num);
    if (values.length < 2) return err(ExcelErrorCode.Num);
    const flows = values;
    const flowDates = dates;
    const start = flowDates[0]!;
    const days: number[] = [];
    for (const d of flowDates) days.push(daysBetween(start, d, 1));

    function xnpv(rate: number): number {
      let sum = 0;
      for (let i = 0; i < flows.length; i++) {
        sum += flows[i]! / Math.pow(1 + rate, days[i]! / 365);
      }
      return sum;
    }

    function xnpvPrime(rate: number): number {
      let sum = 0;
      for (let i = 0; i < flows.length; i++) {
        const exponent = days[i]! / 365;
        sum -= (flows[i]! * exponent) / Math.pow(1 + rate, exponent + 1);
      }
      return sum;
    }

    let r = guess.value;
    for (let i = 0; i < 100; i++) {
      const y = xnpv(r);
      if (Math.abs(y) < 1e-10) return num(r);
      const dy = xnpvPrime(r);
      if (dy === 0) break;
      const next = r - y / dy;
      if (Math.abs(next - r) < 1e-10) return num(next);
      r = next;
    }
    return err(ExcelErrorCode.Num);
  }));
}
