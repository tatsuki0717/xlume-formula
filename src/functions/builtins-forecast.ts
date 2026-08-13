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

function flattenValues(arg: ExcelValue): ExcelValue[] {
  if (arg.kind === "array") return arg.values.flatMap(flattenValues);
  return [arg];
}

function toNumberArray(
  arg: ExcelValue,
): { ok: true; values: number[] } | { ok: false; error: ExcelValue } {
  const flat = flattenValues(arg);
  const out: number[] = [];
  for (const v of flat) {
    const n = excelCoerceNumber(v);
    if (n.kind === "error") return { ok: false, error: n };
    if (n.kind === "number") out.push(n.value);
  }
  return { ok: true, values: out };
}

function requireNumber(
  arg: ExcelValue | undefined,
  defaultValue: number,
): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  if (arg === undefined || arg.kind === "blank") return { ok: true, value: defaultValue };
  const n = excelCoerceNumber(arg);
  if (n.kind === "number") return { ok: true, value: n.value };
  return { ok: false, error: n };
}

function normSInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const p_low = 0.02425;
  const p_high = 1 - p_low;
  let q: number;
  let num: number;
  let denom: number;
  if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    num = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!);
    denom = (((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1));
    return num / denom;
  } else if (p <= p_high) {
    q = p - 0.5;
    const r = q * q;
    num = (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q;
    denom = (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
    return num / denom;
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    num = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!);
    denom = (((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1));
    return -num / denom;
  }
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function preprocess(
  values: number[],
  timeline: number[],
  dataCompletion: number,
  aggregation: number,
):
  | { ok: true; y: number[]; t: number[]; step: number }
  | { ok: false; error: ExcelValue } {
  if (values.length !== timeline.length) return { ok: false, error: err(ExcelErrorCode.Num) };
  if (values.length < 2) return { ok: false, error: err(ExcelErrorCode.Num) };

  // Pair and sort by timeline
  const pairs = timeline.map((t, i) => ({ t, y: values[i]! }));
  pairs.sort((a, b) => a.t - b.t);

  // Aggregate duplicates
  const aggregated: { t: number; y: number }[] = [];
  for (const p of pairs) {
    const last = aggregated[aggregated.length - 1];
    if (last && last.t === p.t) {
      switch (aggregation) {
        case 1:
          last.y = (last.y + p.y) / 2;
          break; // AVERAGE becomes mean (naive for 2+)
        case 2:
        case 3:
          last.y += 1;
          break;
        case 4:
          last.y = Math.max(last.y, p.y);
          break;
        case 5: {
          // MEDIAN requires collecting; keep simple: average for now
          last.y = (last.y + p.y) / 2;
          break;
        }
        case 6:
          last.y = Math.min(last.y, p.y);
          break;
        case 7:
          last.y += p.y;
          break;
        default:
          last.y = (last.y + p.y) / 2;
      }
    } else {
      aggregated.push({ t: p.t, y: p.y });
    }
  }

  const sortedT = aggregated.map((p) => p.t);
  const sortedY = aggregated.map((p) => p.y);

  // Check uniform step
  const diffs = sortedT.slice(1).map((t, i) => t - sortedT[i]!);
  const step = mean(diffs);
  const tol = 1e-9;
  for (const d of diffs) {
    if (Math.abs(d - step) > tol) return { ok: false, error: err(ExcelErrorCode.Num) };
  }
  if (step <= 0) return { ok: false, error: err(ExcelErrorCode.Num) };

  // Fill missing timeline points
  const filledT: number[] = [];
  const filledY: number[] = [];
  let current = sortedT[0]!;
  const end = sortedT[sortedT.length - 1]!;
  let dataIdx = 0;
  while (current <= end + tol) {
    if (dataIdx < sortedT.length && Math.abs(sortedT[dataIdx]! - current) < tol) {
      filledT.push(current);
      filledY.push(sortedY[dataIdx]!);
      dataIdx++;
    } else {
      filledT.push(current);
      if (dataCompletion === 0) {
        filledY.push(0);
      } else {
        // Interpolate between nearest known points
        const prev = filledY[filledY.length - 1];
        const nextIdx = sortedT.findIndex((x) => x >= current - tol);
        const next = nextIdx >= 0 ? sortedY[nextIdx] : prev;
        const prevT = filledT[filledT.length - 1] ?? current - step;
        const nextT = nextIdx >= 0 ? sortedT[nextIdx]! : current + step;
        if (prev !== undefined && next !== undefined && nextT !== prevT) {
          filledY.push(prev + ((next - prev) * (current - prevT)) / (nextT - prevT));
        } else {
          filledY.push(prev ?? 0);
        }
      }
    }
    current += step;
  }

  return { ok: true, y: filledY, t: filledT, step };
}

function initialLevelTrend(y: number[], m: number): { l0: number; b0: number; s: number[] } {
  const n = y.length;
  if (m <= 1 || n < m) {
    const l0 = y[0] ?? 0;
    const diffs: number[] = [];
    for (let i = 1; i < Math.min(n, 5); i++) {
      diffs.push(y[i]! - y[i - 1]!);
    }
    const b0 = diffs.length > 0 ? mean(diffs) : 0;
    return { l0, b0, s: [] };
  }
  const first = y.slice(0, m);
  const second = y.slice(m, Math.min(2 * m, n));
  const l0 = mean(first);
  const b0 = second.length > 0 ? (mean(second) - mean(first)) / m : 0;
  const s = first.map((v, i) => v - l0 - i * b0);
  return { l0, b0, s };
}

interface HWResult {
  fitted: number[];
  sse: number;
  mae: number;
  mape: number;
  l: number;
  b: number;
  s: number[];
  alpha: number;
  beta: number;
  gamma: number;
}

function holtWinters(
  y: number[],
  m: number,
  alpha: number,
  beta: number,
  gamma: number,
  providedInitial?: { l0: number; b0: number; s: number[] },
): HWResult {
  const n = y.length;
  let { l0, b0, s } = providedInitial ?? initialLevelTrend(y, m);
  if (m <= 1) s = [];
  let l = l0;
  let b = b0;
  const seasonal = s.length > 0 ? [...s] : [];
  const fitted: number[] = [];
  let sse = 0;
  let mae = 0;
  let mapeSum = 0;
  let mapeCount = 0;
  for (let t = 0; t < n; t++) {
    const idx = m > 1 ? ((t % m) + m) % m : 0;
    const st = m > 1 ? seasonal[idx] ?? 0 : 0;
    const forecast = l + b + st;
    fitted.push(forecast);
    const error = (y[t] ?? 0) - forecast;
    sse += error * error;
    mae += Math.abs(error);
    if (y[t] !== 0) {
      mapeSum += Math.abs(error / (y[t] ?? 1));
      mapeCount++;
    }
    const prevL = l;
    const prevB = b;
    l = alpha * ((y[t] ?? 0) - st) + (1 - alpha) * (prevL + prevB);
    b = beta * (l - prevL) + (1 - beta) * prevB;
    if (m > 1) {
      seasonal[idx] = gamma * ((y[t] ?? 0) - prevL - prevB) + (1 - gamma) * st;
    }
  }
  return {
    fitted,
    sse,
    mae,
    mape: mapeCount > 0 ? (mapeSum / mapeCount) * 100 : 0,
    l,
    b,
    s: seasonal,
    alpha,
    beta,
    gamma,
  };
}

function optimize(
  y: number[],
  m: number,
): HWResult {
  let best: HWResult | undefined;
  let bestAlpha = 0.2;
  let bestBeta = 0.1;
  let bestGamma = m > 1 ? 0.1 : 0;
  const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  for (const alpha of steps) {
    for (const beta of steps) {
      const gammaSteps = m > 1 ? steps : [0];
      for (const gamma of gammaSteps) {
        const r = holtWinters(y, m, alpha, beta, gamma);
        if (!best || r.sse < best.sse) {
          best = r;
          bestAlpha = alpha;
          bestBeta = beta;
          bestGamma = gamma;
        }
      }
    }
  }
  // Refine around best
  const refineSteps = [-0.04, -0.02, 0, 0.02, 0.04];
  for (const da of refineSteps) {
    for (const db of refineSteps) {
      const dgSteps = m > 1 ? refineSteps : [0];
      for (const dg of dgSteps) {
        const alpha = Math.max(0, Math.min(1, bestAlpha + da));
        const beta = Math.max(0, Math.min(1, bestBeta + db));
        const gamma = Math.max(0, Math.min(1, bestGamma + dg));
        const r = holtWinters(y, m, alpha, beta, gamma);
        if (!best || r.sse < best.sse) {
          best = r;
        }
      }
    }
  }
  return best!;
}

function detectSeasonality(y: number[]): number {
  const n = y.length;
  if (n < 4) return 1;
  const d: number[] = [];
  for (let i = 1; i < n; i++) d.push(y[i]! - y[i - 1]!);
  const dMean = mean(d);
  let bestM = 1;
  let bestCorr = 0.1;
  const maxM = Math.min(24, Math.floor(n / 2));
  for (let m = 2; m <= maxM; m++) {
    const x1 = d.slice(0, d.length - m);
    const x2 = d.slice(m);
    if (x1.length < 2) continue;
    const mx1 = mean(x1);
    const mx2 = mean(x2);
    let num = 0;
    let den1 = 0;
    let den2 = 0;
    for (let i = 0; i < x1.length; i++) {
      const a = x1[i]! - mx1;
      const b = x2[i]! - mx2;
      num += a * b;
      den1 += a * a;
      den2 += b * b;
    }
    const denom = Math.sqrt(den1 * den2);
    if (denom === 0) continue;
    const corr = num / denom;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestM = m;
    }
  }
  return bestM;
}

function etsForecast(
  y: number[],
  targetT: number,
  t: number[],
  step: number,
  seasonality: number | undefined,
  dataCompletion: number,
  aggregation: number,
): { ok: true; result: HWResult; h: number } | { ok: false; error: ExcelValue } {
  const pre = preprocess(y, t, dataCompletion, aggregation);
  if (!pre.ok) return pre;
  const n = pre.y.length;
  if (n < 2) return { ok: false, error: err(ExcelErrorCode.Num) };
  const lastT = pre.t[pre.t.length - 1]!;
  const h = Math.round((targetT - lastT) / step);
  if (h < 1) return { ok: false, error: err(ExcelErrorCode.Num) };
  const m = seasonality === undefined ? detectSeasonality(pre.y) : Math.max(1, Math.round(seasonality));
  if (m < 1 || m >= n) return { ok: false, error: err(ExcelErrorCode.Num) };
  const result = optimize(pre.y, m);
  return { ok: true, result, h };
}

export function registerForecastFunctions(add: (f: ExcelFunction) => void): void {
  add(
    fn("FORECAST.ETS", "none", (args) => {
      const target = requireNumber(args[0], 0);
      const values = toNumberArray(args[1] ?? BLANK);
      const timeline = toNumberArray(args[2] ?? BLANK);
      const seasonality = requireNumber(args[3] ?? BLANK, NaN);
      const dataCompletion = requireNumber(args[4] ?? BLANK, 1);
      const aggregation = requireNumber(args[5] ?? BLANK, 1);
      if (!target.ok) return target.error;
      if (!values.ok) return values.error;
      if (!timeline.ok) return timeline.error;
      if (!seasonality.ok) return seasonality.error;
      if (!dataCompletion.ok) return dataCompletion.error;
      if (!aggregation.ok) return aggregation.error;
      const agg = Math.round(aggregation.value);
      if (![0, 1].includes(dataCompletion.value) || ![1, 2, 3, 4, 5, 6, 7].includes(agg)) {
        return err(ExcelErrorCode.Num);
      }
      const targetT = target.value;
      const season = Number.isNaN(seasonality.value) ? undefined : Math.round(seasonality.value);
      const r = etsForecast(values.values, targetT, timeline.values, 1, season, dataCompletion.value, agg);
      if (!r.ok) return r.error;
      const { result, h } = r;
      const idx = ((result.s.length > 0 ? ((result.s.length + ((h - 1) % result.s.length)) % result.s.length) : 0));
      const seasonal = result.s.length > 0 ? (result.s[idx] ?? 0) : 0;
      return num(result.l + h * result.b + seasonal);
    }),
  );

  add(
    fn("FORECAST.ETS.CONFINT", "none", (args) => {
      const target = requireNumber(args[0], 0);
      const values = toNumberArray(args[1] ?? BLANK);
      const timeline = toNumberArray(args[2] ?? BLANK);
      const confidence = requireNumber(args[3] ?? BLANK, 0.95);
      const seasonality = requireNumber(args[4] ?? BLANK, NaN);
      const dataCompletion = requireNumber(args[5] ?? BLANK, 1);
      const aggregation = requireNumber(args[6] ?? BLANK, 1);
      if (!target.ok) return target.error;
      if (!values.ok) return values.error;
      if (!timeline.ok) return timeline.error;
      if (!confidence.ok) return confidence.error;
      if (!seasonality.ok) return seasonality.error;
      if (!dataCompletion.ok) return dataCompletion.error;
      if (!aggregation.ok) return aggregation.error;
      if (confidence.value <= 0 || confidence.value >= 1) return err(ExcelErrorCode.Num);
      const agg = Math.round(aggregation.value);
      if (![0, 1].includes(dataCompletion.value) || ![1, 2, 3, 4, 5, 6, 7].includes(agg)) {
        return err(ExcelErrorCode.Num);
      }
      const targetT = target.value;
      const season = Number.isNaN(seasonality.value) ? undefined : Math.round(seasonality.value);
      const stepResult = preprocess(values.values, timeline.values, dataCompletion.value, agg);
      if (!stepResult.ok) return stepResult.error;
      const r = etsForecast(values.values, targetT, timeline.values, 1, season, dataCompletion.value, agg);
      if (!r.ok) return r.error;
      const n = stepResult.y.length;
      const mse = r.result.sse / n;
      const sigma = Math.sqrt(mse);
      const z = normSInv(1 - (1 - confidence.value) / 2);
      return num(z * sigma * Math.sqrt(r.h));
    }),
  );

  add(
    fn("FORECAST.ETS.SEASONALITY", "none", (args) => {
      const values = toNumberArray(args[0] ?? BLANK);
      const timeline = toNumberArray(args[1] ?? BLANK);
      const dataCompletion = requireNumber(args[2] ?? BLANK, 1);
      const aggregation = requireNumber(args[3] ?? BLANK, 1);
      if (!values.ok) return values.error;
      if (!timeline.ok) return timeline.error;
      if (!dataCompletion.ok) return dataCompletion.error;
      if (!aggregation.ok) return aggregation.error;
      const agg = Math.round(aggregation.value);
      if (![0, 1].includes(dataCompletion.value) || ![1, 2, 3, 4, 5, 6, 7].includes(agg)) {
        return err(ExcelErrorCode.Num);
      }
      const pre = preprocess(values.values, timeline.values, dataCompletion.value, agg);
      if (!pre.ok) return pre.error;
      if (pre.y.length < 2) return err(ExcelErrorCode.Num);
      return num(detectSeasonality(pre.y));
    }),
  );

  add(
    fn("FORECAST.ETS.STAT", "none", (args) => {
      const values = toNumberArray(args[0] ?? BLANK);
      const timeline = toNumberArray(args[1] ?? BLANK);
      const statType = requireNumber(args[2] ?? BLANK, 0);
      const seasonality = requireNumber(args[3] ?? BLANK, NaN);
      const dataCompletion = requireNumber(args[4] ?? BLANK, 1);
      const aggregation = requireNumber(args[5] ?? BLANK, 1);
      if (!values.ok) return values.error;
      if (!timeline.ok) return timeline.error;
      if (!statType.ok) return statType.error;
      if (!seasonality.ok) return seasonality.error;
      if (!dataCompletion.ok) return dataCompletion.error;
      if (!aggregation.ok) return aggregation.error;
      const type = Math.round(statType.value);
      if (type < 1 || type > 9) return err(ExcelErrorCode.Num);
      const agg = Math.round(aggregation.value);
      if (![0, 1].includes(dataCompletion.value) || ![1, 2, 3, 4, 5, 6, 7].includes(agg)) {
        return err(ExcelErrorCode.Num);
      }
      const season = Number.isNaN(seasonality.value) ? undefined : Math.round(seasonality.value);
      const pre = preprocess(values.values, timeline.values, dataCompletion.value, agg);
      if (!pre.ok) return pre.error;
      if (pre.y.length < 2) return err(ExcelErrorCode.Num);
      const m = season === undefined ? detectSeasonality(pre.y) : Math.max(1, season);
      if (m < 1 || m >= pre.y.length) return err(ExcelErrorCode.Num);
      const result = optimize(pre.y, m);
      const n = result.fitted.length;
      switch (type) {
        case 1:
          return num(result.alpha);
        case 2:
          return num(result.beta);
        case 3:
          return num(result.gamma);
        case 4:
          return n > 0 ? num(result.sse / n) : num(0);
        case 5:
          return num(result.sse);
        case 6:
          return n > 0 ? num(result.mae / n) : num(0);
        case 7:
          return num(result.mape);
        case 8:
          return n > 0 ? num(Math.sqrt(result.sse / n)) : num(0);
        case 9:
          return num(pre.step);
        default:
          return err(ExcelErrorCode.Num);
      }
    }),
  );
}
