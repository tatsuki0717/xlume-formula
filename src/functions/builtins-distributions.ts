/**
 * Native implementations for Excel statistical distribution functions using jStat.
 */
import jStat from "jstat";
import {
  BLANK,
  err,
  ExcelErrorCode,
  num,
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

function toNumber(arg: ExcelValue | undefined): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  if (arg === undefined) return { ok: true, value: 0 };
  const n = excelCoerceNumber(arg);
  if (n.kind === "number") return { ok: true, value: n.value };
  return { ok: false, error: n };
}

function toInteger(arg: ExcelValue | undefined): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  const n = toNumber(arg);
  if (!n.ok) return n;
  return { ok: true, value: Math.trunc(n.value) };
}

function flattenNumbers(value: ExcelValue | undefined): { values: number[]; error?: ExcelValue } {
  if (value === undefined || value.kind === "blank" || value.kind === "omitted") return { values: [] };
  const out: number[] = [];
  const items: ExcelValue[] = value.kind === "array" ? value.values : [value];
  for (const v of items) {
    if (v.kind === "error") return { values: [], error: v };
    if (v.kind === "number") out.push(v.value);
  }
  return { values: out };
}

function positive(value: number): number {
  return Math.abs(value);
}

export function registerDistributionFunctions(add: (f: ExcelFunction) => void): void {
  // BETA
  add(fn("BETA.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const alpha = toNumber(args[1]);
    if (!alpha.ok) return alpha.error;
    const betaParam = toNumber(args[2]);
    if (!betaParam.ok) return betaParam.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    const a = toNumber(args[4] ?? BLANK);
    if (!a.ok) return a.error;
    const b = toNumber(args[5] ?? BLANK);
    if (!b.ok) return b.error;
    const lower = a.value || 0;
    const upper = b.value || 1;
    if (alpha.value <= 0 || betaParam.value <= 0 || lower >= upper) return err(ExcelErrorCode.Num);
    if (x.value < lower || x.value > upper) {
      return num(cumulative.value ? (x.value < lower ? 0 : 1) : 0);
    }
    const z = (x.value - lower) / (upper - lower);
    if (cumulative.value) return num(jStat.beta.cdf(z, alpha.value, betaParam.value));
    return num(jStat.beta.pdf(z, alpha.value, betaParam.value) / (upper - lower));
  }));

  add(fn("BETA.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const alpha = toNumber(args[1]);
    if (!alpha.ok) return alpha.error;
    const betaParam = toNumber(args[2]);
    if (!betaParam.ok) return betaParam.error;
    const a = toNumber(args[3] ?? BLANK);
    if (!a.ok) return a.error;
    const b = toNumber(args[4] ?? BLANK);
    if (!b.ok) return b.error;
    const lower = a.value || 0;
    const upper = b.value || 1;
    if (alpha.value <= 0 || betaParam.value <= 0 || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    const z = jStat.beta.inv(p.value, alpha.value, betaParam.value);
    return num(lower + z * (upper - lower));
  }));

  // BINOMIAL
  add(fn("BINOM.DIST", "none", (args) => {
    const numberS = toInteger(args[0]);
    if (!numberS.ok) return numberS.error;
    const trials = toInteger(args[1]);
    if (!trials.ok) return trials.error;
    const prob = toNumber(args[2]);
    if (!prob.ok) return prob.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (trials.value < 0 || numberS.value < 0 || numberS.value > trials.value || prob.value < 0 || prob.value > 1) return err(ExcelErrorCode.Num);
    if (cumulative.value) return num(jStat.binomial.cdf(numberS.value, trials.value, prob.value));
    return num(jStat.binomial.pdf(numberS.value, trials.value, prob.value));
  }));

  add(fn("BINOM.DIST.RANGE", "none", (args) => {
    const trials = toInteger(args[0]);
    if (!trials.ok) return trials.error;
    const prob = toNumber(args[1]);
    if (!prob.ok) return prob.error;
    const lower = toInteger(args[2]);
    if (!lower.ok) return lower.error;
    const upperArg = args[3] ? toInteger(args[3]) : null;
    if (upperArg && !upperArg.ok) return upperArg.error;
    const upper = upperArg ? upperArg.value : lower.value;
    if (trials.value < 0 || prob.value < 0 || prob.value > 1 || lower.value < 0 || upper < lower.value || upper > trials.value) return err(ExcelErrorCode.Num);
    if (lower.value === 0) return num(jStat.binomial.cdf(upper, trials.value, prob.value));
    return num(jStat.binomial.cdf(upper, trials.value, prob.value) - jStat.binomial.cdf(lower.value - 1, trials.value, prob.value));
  }));

  add(fn("BINOM.INV", "none", (args) => {
    const trials = toInteger(args[0]);
    if (!trials.ok) return trials.error;
    const prob = toNumber(args[1]);
    if (!prob.ok) return prob.error;
    const alpha = toNumber(args[2]);
    if (!alpha.ok) return alpha.error;
    if (trials.value < 0 || prob.value < 0 || prob.value > 1 || alpha.value < 0 || alpha.value > 1) return err(ExcelErrorCode.Num);
    for (let x = 0; x <= trials.value; x++) {
      if (jStat.binomial.cdf(x, trials.value, prob.value) >= alpha.value) return num(x);
    }
    return num(trials.value);
  }));

  // CHISQ
  add(fn("CHISQ.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    const cumulative = toNumber(args[2] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (deg.value < 1 || !Number.isInteger(deg.value)) return err(ExcelErrorCode.Num);
    if (x.value < 0) return num(cumulative.value ? 0 : 0);
    if (cumulative.value) return num(jStat.chisquare.cdf(x.value, deg.value));
    return num(jStat.chisquare.pdf(x.value, deg.value));
  }));

  add(fn("CHISQ.DIST.RT", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    if (deg.value < 1 || !Number.isInteger(deg.value) || x.value < 0) return err(ExcelErrorCode.Num);
    return num(1 - jStat.chisquare.cdf(x.value, deg.value));
  }));

  add(fn("CHISQ.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    if (deg.value < 1 || !Number.isInteger(deg.value) || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.chisquare.inv(p.value, deg.value));
  }));

  add(fn("CHISQ.INV.RT", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    if (deg.value < 1 || !Number.isInteger(deg.value) || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.chisquare.inv(1 - p.value, deg.value));
  }));

  add(fn("CHISQ.TEST", "none", (args) => {
    const actual = args[0];
    const expected = args[1];
    if (!actual || !expected) return err(ExcelErrorCode.Value);
    const act = flattenNumbers(actual);
    const exp = flattenNumbers(expected);
    if (act.error) return act.error;
    if (exp.error) return exp.error;
    if (act.values.length !== exp.values.length) return err(ExcelErrorCode.NA);
    let chi = 0;
    let rows = 1;
    let cols = act.values.length;
    if (actual.kind === "array") {
      rows = actual.height;
      cols = actual.width;
    }
    for (let i = 0; i < act.values.length; i++) {
      const e = exp.values[i]!;
      if (e === 0) return err(ExcelErrorCode.Div0);
      chi += (act.values[i]! - e) ** 2 / e;
    }
    const df = (rows - 1) * (cols - 1);
    if (df <= 0) return err(ExcelErrorCode.Num);
    return num(1 - jStat.chisquare.cdf(chi, df));
  }));

  // CONFIDENCE
  add(fn("CONFIDENCE.NORM", "none", (args) => {
    const alpha = toNumber(args[0]);
    if (!alpha.ok) return alpha.error;
    const sd = toNumber(args[1]);
    if (!sd.ok) return sd.error;
    const size = toNumber(args[2]);
    if (!size.ok) return size.error;
    if (alpha.value <= 0 || alpha.value >= 1 || sd.value <= 0 || size.value < 1) return err(ExcelErrorCode.Num);
    const z = jStat.normal.inv(1 - alpha.value / 2, 0, 1);
    return num(z * sd.value / Math.sqrt(size.value));
  }));

  add(fn("CONFIDENCE.T", "none", (args) => {
    const alpha = toNumber(args[0]);
    if (!alpha.ok) return alpha.error;
    const sd = toNumber(args[1]);
    if (!sd.ok) return sd.error;
    const size = toNumber(args[2]);
    if (!size.ok) return size.error;
    if (alpha.value <= 0 || alpha.value >= 1 || sd.value <= 0 || size.value < 1) return err(ExcelErrorCode.Num);
    const t = jStat.studentt.inv(1 - alpha.value / 2, size.value - 1);
    return num(t * sd.value / Math.sqrt(size.value));
  }));

  // EXPONENTIAL
  add(fn("EXPON.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const lambda = toNumber(args[1]);
    if (!lambda.ok) return lambda.error;
    const cumulative = toNumber(args[2] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (lambda.value <= 0) return err(ExcelErrorCode.Num);
    if (x.value < 0) return num(cumulative.value ? 0 : 0);
    if (cumulative.value) return num(jStat.exponential.cdf(x.value, lambda.value));
    return num(jStat.exponential.pdf(x.value, lambda.value));
  }));

  // F
  add(fn("F.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const d1 = toNumber(args[1]);
    if (!d1.ok) return d1.error;
    const d2 = toNumber(args[2]);
    if (!d2.ok) return d2.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (d1.value < 1 || d2.value < 1 || !Number.isInteger(d1.value) || !Number.isInteger(d2.value)) return err(ExcelErrorCode.Num);
    if (x.value < 0) return num(cumulative.value ? 0 : 0);
    if (cumulative.value) return num(jStat.centralF.cdf(x.value, d1.value, d2.value));
    return num(jStat.centralF.pdf(x.value, d1.value, d2.value));
  }));

  add(fn("F.DIST.RT", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const d1 = toNumber(args[1]);
    if (!d1.ok) return d1.error;
    const d2 = toNumber(args[2]);
    if (!d2.ok) return d2.error;
    if (d1.value < 1 || d2.value < 1 || !Number.isInteger(d1.value) || !Number.isInteger(d2.value) || x.value < 0) return err(ExcelErrorCode.Num);
    return num(1 - jStat.centralF.cdf(x.value, d1.value, d2.value));
  }));

  add(fn("F.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const d1 = toNumber(args[1]);
    if (!d1.ok) return d1.error;
    const d2 = toNumber(args[2]);
    if (!d2.ok) return d2.error;
    if (d1.value < 1 || d2.value < 1 || !Number.isInteger(d1.value) || !Number.isInteger(d2.value) || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.centralF.inv(p.value, d1.value, d2.value));
  }));

  add(fn("F.INV.RT", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const d1 = toNumber(args[1]);
    if (!d1.ok) return d1.error;
    const d2 = toNumber(args[2]);
    if (!d2.ok) return d2.error;
    if (d1.value < 1 || d2.value < 1 || !Number.isInteger(d1.value) || !Number.isInteger(d2.value) || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.centralF.inv(1 - p.value, d1.value, d2.value));
  }));

  add(fn("F.TEST", "none", (args) => {
    const a = flattenNumbers(args[0]);
    const b = flattenNumbers(args[1]);
    if (a.error) return a.error;
    if (b.error) return b.error;
    if (a.values.length < 2 || b.values.length < 2) return err(ExcelErrorCode.Num);
    const varA = jStat.variance(a.values);
    const varB = jStat.variance(b.values);
    if (varA === 0 || varB === 0) return err(ExcelErrorCode.Div0);
    const f = varA > varB ? varA / varB : varB / varA;
    const df1 = a.values.length - 1;
    const df2 = b.values.length - 1;
    const lower = jStat.centralF.cdf(f, df1, df2);
    return num(2 * Math.min(lower, 1 - lower));
  }));

  // GAMMA
  add(fn("GAMMA.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const alpha = toNumber(args[1]);
    if (!alpha.ok) return alpha.error;
    const betaParam = toNumber(args[2]);
    if (!betaParam.ok) return betaParam.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (alpha.value <= 0 || betaParam.value <= 0) return err(ExcelErrorCode.Num);
    if (x.value < 0) return num(cumulative.value ? 0 : 0);
    if (cumulative.value) return num(jStat.gamma.cdf(x.value, alpha.value, betaParam.value));
    return num(jStat.gamma.pdf(x.value, alpha.value, betaParam.value));
  }));

  add(fn("GAMMA.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const alpha = toNumber(args[1]);
    if (!alpha.ok) return alpha.error;
    const betaParam = toNumber(args[2]);
    if (!betaParam.ok) return betaParam.error;
    if (alpha.value <= 0 || betaParam.value <= 0 || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.gamma.inv(p.value, alpha.value, betaParam.value));
  }));

  // HYPERGEOMETRIC
  add(fn("HYPGEOM.DIST", "none", (args) => {
    const sampleS = toInteger(args[0]);
    if (!sampleS.ok) return sampleS.error;
    const numberSample = toInteger(args[1]);
    if (!numberSample.ok) return numberSample.error;
    const populationS = toInteger(args[2]);
    if (!populationS.ok) return populationS.error;
    const numberPop = toInteger(args[3]);
    if (!numberPop.ok) return numberPop.error;
    const cumulative = toNumber(args[4] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (
      sampleS.value < 0 || numberSample.value < 0 || populationS.value < 0 || numberPop.value < 0 ||
      sampleS.value > numberSample.value || populationS.value > numberPop.value ||
      numberSample.value > numberPop.value || sampleS.value > populationS.value
    ) return err(ExcelErrorCode.Num);
    if (cumulative.value) return num(jStat.hypgeom.cdf(sampleS.value, numberPop.value, populationS.value, numberSample.value));
    return num(jStat.hypgeom.pdf(sampleS.value, numberPop.value, populationS.value, numberSample.value));
  }));

  // LOGNORM
  add(fn("LOGNORM.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const m = toNumber(args[1]);
    if (!m.ok) return m.error;
    const sd = toNumber(args[2]);
    if (!sd.ok) return sd.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (sd.value <= 0 || x.value < 0) return err(ExcelErrorCode.Num);
    if (cumulative.value) return num(jStat.lognormal.cdf(x.value, m.value, sd.value));
    return num(jStat.lognormal.pdf(x.value, m.value, sd.value));
  }));

  add(fn("LOGNORM.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const m = toNumber(args[1]);
    if (!m.ok) return m.error;
    const sd = toNumber(args[2]);
    if (!sd.ok) return sd.error;
    if (sd.value <= 0 || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.lognormal.inv(p.value, m.value, sd.value));
  }));

  // NEGBINOM
  add(fn("NEGBINOM.DIST", "none", (args) => {
    const numberF = toInteger(args[0]);
    if (!numberF.ok) return numberF.error;
    const numberS = toInteger(args[1]);
    if (!numberS.ok) return numberS.error;
    const prob = toNumber(args[2]);
    if (!prob.ok) return prob.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (numberF.value < 0 || numberS.value < 1 || prob.value <= 0 || prob.value > 1) return err(ExcelErrorCode.Num);
    if (cumulative.value) return num(jStat.negbin.cdf(numberF.value, numberS.value, prob.value));
    return num(jStat.negbin.pdf(numberF.value, numberS.value, prob.value));
  }));

  // NORM
  add(fn("NORM.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const m = toNumber(args[1]);
    if (!m.ok) return m.error;
    const sd = toNumber(args[2]);
    if (!sd.ok) return sd.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (sd.value <= 0) return err(ExcelErrorCode.Num);
    if (cumulative.value) return num(jStat.normal.cdf(x.value, m.value, sd.value));
    return num(jStat.normal.pdf(x.value, m.value, sd.value));
  }));

  add(fn("NORM.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const m = toNumber(args[1]);
    if (!m.ok) return m.error;
    const sd = toNumber(args[2]);
    if (!sd.ok) return sd.error;
    if (sd.value <= 0 || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.normal.inv(p.value, m.value, sd.value));
  }));

  add(fn("NORM.S.DIST", "none", (args) => {
    const z = toNumber(args[0]);
    if (!z.ok) return z.error;
    const cumulative = toNumber(args[1] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (cumulative.value) return num(jStat.normal.cdf(z.value, 0, 1));
    return num(jStat.normal.pdf(z.value, 0, 1));
  }));

  add(fn("NORM.S.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    if (p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.normal.inv(p.value, 0, 1));
  }));

  // POISSON
  add(fn("POISSON.DIST", "none", (args) => {
    const x = toInteger(args[0]);
    if (!x.ok) return x.error;
    const mean = toNumber(args[1]);
    if (!mean.ok) return mean.error;
    const cumulative = toNumber(args[2] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (mean.value <= 0 || x.value < 0) return err(ExcelErrorCode.Num);
    if (cumulative.value) return num(jStat.poisson.cdf(x.value, mean.value));
    return num(jStat.poisson.pdf(x.value, mean.value));
  }));

  // T
  add(fn("T.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    const cumulative = toNumber(args[2] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (deg.value < 1 || !Number.isInteger(deg.value)) return err(ExcelErrorCode.Num);
    if (cumulative.value) return num(jStat.studentt.cdf(x.value, deg.value));
    return num(jStat.studentt.pdf(x.value, deg.value));
  }));

  add(fn("T.DIST.RT", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    if (deg.value < 1 || !Number.isInteger(deg.value)) return err(ExcelErrorCode.Num);
    return num(1 - jStat.studentt.cdf(x.value, deg.value));
  }));

  add(fn("T.DIST.2T", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    if (deg.value < 1 || !Number.isInteger(deg.value) || x.value < 0) return err(ExcelErrorCode.Num);
    return num(2 * (1 - jStat.studentt.cdf(x.value, deg.value)));
  }));

  add(fn("T.INV", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    if (deg.value < 1 || !Number.isInteger(deg.value) || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.studentt.inv(p.value, deg.value));
  }));

  add(fn("T.INV.2T", "none", (args) => {
    const p = toNumber(args[0]);
    if (!p.ok) return p.error;
    const deg = toNumber(args[1]);
    if (!deg.ok) return deg.error;
    if (deg.value < 1 || !Number.isInteger(deg.value) || p.value < 0 || p.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.studentt.inv(1 - p.value / 2, deg.value));
  }));

  add(fn("T.TEST", "none", (args) => {
    const a = flattenNumbers(args[0]);
    const b = flattenNumbers(args[1]);
    if (a.error) return a.error;
    if (b.error) return b.error;
    const defaultTails: { ok: true; value: number } = { ok: true, value: 2 };
    const tails = args[2] ? toInteger(args[2]) : defaultTails;
    if (!tails.ok) return tails.error;
    const defaultType: { ok: true; value: number } = { ok: true, value: 1 };
    const type = args[3] ? toInteger(args[3]) : defaultType;
    if (!type.ok) return type.error;
    if (a.values.length < 2 || b.values.length < 2) return err(ExcelErrorCode.NA);
    const meanA = jStat.mean(a.values);
    const meanB = jStat.mean(b.values);
    const varA = jStat.variance(a.values);
    const varB = jStat.variance(b.values);
    const nA = a.values.length;
    const nB = b.values.length;
    let t = 0;
    let df = 0;
    if (type.value === 1) {
      // paired
      if (a.values.length !== b.values.length) return err(ExcelErrorCode.NA);
      const diffs: number[] = [];
      for (let i = 0; i < nA; i++) diffs.push(a.values[i]! - b.values[i]!);
      const meanDiff = jStat.mean(diffs);
      const sdDiff = Math.sqrt(jStat.variance(diffs));
      t = meanDiff / (sdDiff / Math.sqrt(nA));
      df = nA - 1;
    } else if (type.value === 2) {
      const sp2 = ((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2);
      t = (meanA - meanB) / Math.sqrt(sp2 * (1 / nA + 1 / nB));
      df = nA + nB - 2;
    } else if (type.value === 3) {
      t = (meanA - meanB) / Math.sqrt(varA / nA + varB / nB);
      const num = (varA / nA + varB / nB) ** 2;
      const den = (varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1);
      df = num / den;
    } else {
      return err(ExcelErrorCode.Num);
    }
    if (tails.value === 1) {
      return num(1 - jStat.studentt.cdf(Math.abs(t), df));
    } else if (tails.value === 2) {
      return num(2 * (1 - jStat.studentt.cdf(Math.abs(t), df)));
    }
    return err(ExcelErrorCode.Num);
  }));

  // WEIBULL
  add(fn("WEIBULL.DIST", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const alpha = toNumber(args[1]);
    if (!alpha.ok) return alpha.error;
    const betaParam = toNumber(args[2]);
    if (!betaParam.ok) return betaParam.error;
    const cumulative = toNumber(args[3] ?? BLANK);
    if (!cumulative.ok) return cumulative.error;
    if (alpha.value <= 0 || betaParam.value <= 0) return err(ExcelErrorCode.Num);
    if (x.value < 0) return num(cumulative.value ? 0 : 0);
    if (cumulative.value) return num(jStat.weibull.cdf(x.value, alpha.value, betaParam.value));
    return num(jStat.weibull.pdf(x.value, alpha.value, betaParam.value));
  }));

  // Z.TEST
  add(fn("Z.TEST", "none", (args) => {
    const arr = flattenNumbers(args[0]);
    if (arr.error) return arr.error;
    const x = toNumber(args[1]);
    if (!x.ok) return x.error;
    const defaultSigma: { ok: true; value: number } = { ok: true, value: Math.sqrt(jStat.variance(arr.values)) };
    const sigma = args[2] ? toNumber(args[2]) : defaultSigma;
    if (!sigma.ok) return sigma.error;
    if (arr.values.length < 2 || sigma.value <= 0) return err(ExcelErrorCode.Num);
    const m = jStat.mean(arr.values);
    const z = (x.value - m) / (sigma.value / Math.sqrt(arr.values.length));
    return num(1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  }));
}
