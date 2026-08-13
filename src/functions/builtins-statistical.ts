/**
 * Native implementations for statistical worksheet functions using jStat.
 */
import jStat from "jstat";
import {
  BLANK,
  err,
  ExcelErrorCode,
  num,
  str,
  type ArrayValue,
  type ExcelValue,
} from "../model/value.js";
import { excelCoerceNumber, excelCoerceString } from "../formula/coercion.js";
import { flattenArgs } from "../formula/evaluator.js";
import type { ExcelFunction } from "../formula/functions-types.js";

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function toFlatValues(arg: ExcelValue): ExcelValue[] {
  if (arg.kind === "array") return arg.values;
  if (arg.kind === "blank" || arg.kind === "omitted") return [];
  return [arg];
}

function flattenValues(args: (ExcelValue | undefined)[]): ExcelValue[] {
  const out: ExcelValue[] = [];
  for (const a of args) {
    if (a === undefined || a.kind === "blank" || a.kind === "omitted") continue;
    out.push(...toFlatValues(a));
  }
  return out;
}

function numericValueA(v: ExcelValue): number | undefined {
  if (v.kind === "number") return v.value;
  if (v.kind === "boolean") return v.value ? 1 : 0;
  if (v.kind === "string") return 0;
  return undefined;
}

function numericValueStrict(v: ExcelValue): number | undefined {
  if (v.kind === "number") return v.value;
  return undefined;
}

function flattenNumbersA(args: (ExcelValue | undefined)[]): { values: number[]; count: number; error?: ExcelValue } {
  const values: number[] = [];
  let count = 0;
  for (const v of flattenValues(args)) {
    if (v.kind === "error") return { values: [], count: 0, error: v };
    const n = numericValueA(v);
    if (n !== undefined) {
      values.push(n);
      count++;
    }
  }
  return { values, count };
}

function flattenNumbersStrict(args: (ExcelValue | undefined)[]): { values: number[]; error?: ExcelValue } {
  const values: number[] = [];
  for (const v of flattenValues(args)) {
    if (v.kind === "error") return { values: [], error: v };
    const n = numericValueStrict(v);
    if (n !== undefined) values.push(n);
  }
  return { values };
}

function as2D(value: ExcelValue): ExcelValue[][] {
  if (value.kind === "array") {
    const rows: ExcelValue[][] = [];
    for (let r = 0; r < value.height; r++) {
      const row: ExcelValue[] = [];
      for (let c = 0; c < value.width; c++) row.push(value.values[r * value.width + c] ?? BLANK);
      rows.push(row);
    }
    return rows;
  }
  return [[value]];
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

function optNumber(arg: ExcelValue | undefined, defaultValue: number): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  if (arg === undefined || arg.kind === "blank" || arg.kind === "omitted") return { ok: true, value: defaultValue };
  return toNumber(arg);
}

function optInteger(arg: ExcelValue | undefined, defaultValue: number): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  const n = optNumber(arg, defaultValue);
  if (!n.ok) return n;
  return { ok: true, value: Math.trunc(n.value) };
}

function matchesCriteria(cell: ExcelValue, criteria: ExcelValue): boolean {
  if (criteria.kind === "number") return cell.kind === "number" && cell.value === criteria.value;
  if (criteria.kind === "boolean") return cell.kind === "boolean" && cell.value === criteria.value;
  if (criteria.kind !== "string") return false;
  const s = criteria.value;
  const opMatch = /^([<>]=?|<>|=)(.*)$/.exec(s);
  if (opMatch) {
    const op = opMatch[1]!;
    const raw = opMatch[2]!;
    const target = /^-?\d+(\.\d+)?$/.test(raw) ? num(Number(raw)) : str(raw);
    return compare(cell, target, op as "=" | "<>" | "<" | ">" | "<=" | ">=");
  }
  if (s.includes("*") || s.includes("?")) {
    const cellStr = cell.kind === "string" ? cell.value : cell.kind === "number" ? String(cell.value) : "";
    const pattern = "^" + s.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
    return new RegExp(pattern, "i").test(cellStr);
  }
  const cellStr = cell.kind === "string" ? cell.value : cell.kind === "number" ? String(cell.value) : "";
  return cellStr.toLowerCase() === s.toLowerCase();
}

function compare(a: ExcelValue, b: ExcelValue, op: "=" | "<>" | "<" | ">" | "<=" | ">="): boolean {
  if (a.kind === "error" || b.kind === "error") return false;
  let cmp = 0;
  const na = excelCoerceNumber(a);
  const nb = excelCoerceNumber(b);
  if (na.kind === "number" && nb.kind === "number") {
    cmp = na.value < nb.value ? -1 : na.value > nb.value ? 1 : 0;
  } else {
    const s1 = excelCoerceString(a);
    const s2 = excelCoerceString(b);
    const sa = s1.kind === "string" ? s1.value : "";
    const sb = s2.kind === "string" ? s2.value : "";
    cmp = sa.toUpperCase() < sb.toUpperCase() ? -1 : sa.toUpperCase() > sb.toUpperCase() ? 1 : 0;
  }
  switch (op) {
    case "=": return cmp === 0;
    case "<>": return cmp !== 0;
    case "<": return cmp < 0;
    case ">": return cmp > 0;
    case "<=": return cmp <= 0;
    case ">=": return cmp >= 0;
  }
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function varianceP(values: number[]): number {
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
}

function varianceS(values: number[]): number {
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

function standardize(x: number, m: number, sd: number): number {
  return (x - m) / sd;
}

function skewPopulation(values: number[]): number {
  const n = values.length;
  const m = mean(values);
  const varP = varianceP(values);
  if (varP === 0) return err(ExcelErrorCode.Div0) as unknown as number;
  const num = values.reduce((s, v) => s + (v - m) ** 3, 0) / n;
  return num / Math.pow(varP, 1.5);
}

function kurtosisPopulation(values: number[]): number {
  const n = values.length;
  const m = mean(values);
  const varP = varianceP(values);
  if (varP === 0) return err(ExcelErrorCode.Div0) as unknown as number;
  const num = values.reduce((s, v) => s + (v - m) ** 4, 0) / n;
  return num / (varP * varP) - 3;
}

function percentileRank(values: number[], x: number, exc: boolean): number | null {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;
  if (exc) {
    if (x < sorted[0]! || x > sorted[n - 1]!) return null;
  } else {
    if (x < sorted[0]!) return 0;
    if (x > sorted[n - 1]!) return 1;
  }
  // find rank by interpolation
  let rank = 0;
  for (let i = 0; i < n - 1; i++) {
    if (x >= sorted[i]! && x <= sorted[i + 1]!) {
      if (sorted[i + 1]! === sorted[i]!) {
        rank = i + 1;
      } else {
        rank = i + 1 + (x - sorted[i]!) / (sorted[i + 1]! - sorted[i]!);
      }
      break;
    }
  }
  if (x >= sorted[n - 1]!) rank = n;
  if (exc) return rank / (n + 1);
  if (n === 1) return 0;
  return (rank - 1) / (n - 1);
}

function buildArray(rows: number, cols: number, fill: (r: number, c: number) => ExcelValue): ArrayValue {
  const values: ExcelValue[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) values.push(fill(r, c));
  return { kind: "array", width: cols, height: rows, values };
}

// ------------------------------------------------------------------
// Descriptive / central tendency
// ------------------------------------------------------------------

export function registerStatisticalFunctions(add: (f: ExcelFunction) => void): void {
  add(fn("AVEDEV", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length === 0) return err(ExcelErrorCode.Num);
    return num(jStat.meandev(values));
  }));

  add(fn("AVERAGEA", "none", (args) => {
    const { values, count, error } = flattenNumbersA(args);
    if (error) return error;
    if (count === 0) return err(ExcelErrorCode.Div0);
    return num(values.reduce((a, b) => a + b, 0) / count);
  }));

  add(fn("AVERAGEIFS", "none", (args) => {
    if (args.length < 3) return err(ExcelErrorCode.Value);
    const avgRange = toFlatValues(args[0] ?? BLANK);
    let sum = 0;
    let count = 0;
    const pairCount = Math.floor((args.length - 1) / 2);
    const ranges: ExcelValue[][] = [];
    const crits: ExcelValue[] = [];
    for (let i = 0; i < pairCount; i++) {
      ranges.push(toFlatValues(args[1 + i * 2] ?? BLANK));
      crits.push(args[2 + i * 2] ?? BLANK);
    }
    for (let idx = 0; idx < avgRange.length; idx++) {
      let ok = true;
      for (let i = 0; i < ranges.length; i++) {
        if (!matchesCriteria(ranges[i]![idx] ?? BLANK, crits[i]!)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const v = avgRange[idx];
      if (v && v.kind === "number") {
        sum += v.value;
        count++;
      }
    }
    if (count === 0) return err(ExcelErrorCode.Div0);
    return num(sum / count);
  }));

  add(fn("COUNTBLANK", "none", (args) => {
    let count = 0;
    for (const a of args) {
      if (!a || a.kind === "blank" || a.kind === "omitted") {
        count++;
      } else if (a.kind === "array") {
        for (const v of a.values) if (v.kind === "blank" || v.kind === "omitted") count++;
      }
    }
    return num(count);
  }));

  add(fn("DEVSQ", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const n = values.length;
    if (n < 1) return err(ExcelErrorCode.Num);
    const m = mean(values);
    return num(values.reduce((s, v) => s + (v - m) ** 2, 0));
  }));

  add(fn("GEOMEAN", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length === 0) return err(ExcelErrorCode.Num);
    if (values.some((v) => v <= 0)) return err(ExcelErrorCode.Num);
    return num(jStat.geomean(values));
  }));

  add(fn("HARMEAN", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length === 0) return err(ExcelErrorCode.Num);
    if (values.some((v) => v <= 0)) return err(ExcelErrorCode.Num);
    let sum = 0;
    for (const v of values) sum += 1 / v;
    return num(values.length / sum);
  }));

  add(fn("KURT", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length < 4) return err(ExcelErrorCode.Num);
    return num(jStat.kurtosis(values));
  }));

  add(fn("MAXA", "none", (args) => {
    const { values, count, error } = flattenNumbersA(args);
    if (error) return error;
    if (count === 0) return num(0);
    return num(Math.max(...values));
  }));

  add(fn("MAXIFS", "none", (args) => {
    if (args.length < 3) return err(ExcelErrorCode.Value);
    const maxRange = toFlatValues(args[0] ?? BLANK);
    const pairCount = Math.floor((args.length - 1) / 2);
    const ranges: ExcelValue[][] = [];
    const crits: ExcelValue[] = [];
    for (let i = 0; i < pairCount; i++) {
      ranges.push(toFlatValues(args[1 + i * 2] ?? BLANK));
      crits.push(args[2 + i * 2] ?? BLANK);
    }
    let max: number | null = null;
    for (let idx = 0; idx < maxRange.length; idx++) {
      let ok = true;
      for (let i = 0; i < ranges.length; i++) {
        if (!matchesCriteria(ranges[i]![idx] ?? BLANK, crits[i]!)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const v = maxRange[idx];
      if (v && v.kind === "number") {
        if (max === null || v.value > max) max = v.value;
      }
    }
    if (max === null) return num(0);
    return num(max);
  }));

  add(fn("MINA", "none", (args) => {
    const { values, count, error } = flattenNumbersA(args);
    if (error) return error;
    if (count === 0) return num(0);
    return num(Math.min(...values));
  }));

  add(fn("MINIFS", "none", (args) => {
    if (args.length < 3) return err(ExcelErrorCode.Value);
    const minRange = toFlatValues(args[0] ?? BLANK);
    const pairCount = Math.floor((args.length - 1) / 2);
    const ranges: ExcelValue[][] = [];
    const crits: ExcelValue[] = [];
    for (let i = 0; i < pairCount; i++) {
      ranges.push(toFlatValues(args[1 + i * 2] ?? BLANK));
      crits.push(args[2 + i * 2] ?? BLANK);
    }
    let min: number | null = null;
    for (let idx = 0; idx < minRange.length; idx++) {
      let ok = true;
      for (let i = 0; i < ranges.length; i++) {
        if (!matchesCriteria(ranges[i]![idx] ?? BLANK, crits[i]!)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const v = minRange[idx];
      if (v && v.kind === "number") {
        if (min === null || v.value < min) min = v.value;
      }
    }
    if (min === null) return num(0);
    return num(min);
  }));

  add(fn("SKEW", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length < 3) return err(ExcelErrorCode.Num);
    return num(jStat.skewness(values));
  }));

  add(fn("SKEW.P", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length < 3) return err(ExcelErrorCode.Num);
    return num(skewPopulation(values));
  }));

  add(fn("STDEVA", "none", (args) => {
    const { values, count, error } = flattenNumbersA(args);
    if (error) return error;
    if (count < 2) return err(ExcelErrorCode.Num);
    return num(Math.sqrt(varianceS(values)));
  }));

  add(fn("STDEVPA", "none", (args) => {
    const { values, count, error } = flattenNumbersA(args);
    if (error) return error;
    if (count < 2) return err(ExcelErrorCode.Num);
    return num(Math.sqrt(varianceP(values)));
  }));

  add(fn("TRIMMEAN", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const p = toNumber(args[args.length - 1]);
    if (!p.ok) return p.error;
    const valuesOnly = values;
    if (valuesOnly.length === 0 || p.value < 0 || p.value >= 1) return err(ExcelErrorCode.Num);
    const sorted = valuesOnly.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const k = Math.trunc(n * p.value);
    const exclude = Math.floor(k / 2);
    const trimmed = sorted.slice(exclude, n - exclude);
    if (trimmed.length === 0) return err(ExcelErrorCode.Num);
    return num(mean(trimmed));
  }));

  add(fn("VAR.S", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length < 2) return err(ExcelErrorCode.Num);
    return num(varianceS(values));
  }));

  add(fn("VARA", "none", (args) => {
    const { values, count, error } = flattenNumbersA(args);
    if (error) return error;
    if (count < 2) return err(ExcelErrorCode.Num);
    return num(varianceS(values));
  }));

  add(fn("VARPA", "none", (args) => {
    const { values, count, error } = flattenNumbersA(args);
    if (error) return error;
    if (count < 2) return err(ExcelErrorCode.Num);
    return num(varianceP(values));
  }));

  // Position / rank
  add(fn("LARGE", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const k = toInteger(args[1]);
    if (!k.ok) return k.error;
    if (values.length === 0 || k.value < 1 || k.value > values.length) return err(ExcelErrorCode.Num);
    const sorted = values.slice().sort((a, b) => b - a);
    return num(sorted[k.value - 1]!);
  }));

  add(fn("SMALL", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const k = toInteger(args[1]);
    if (!k.ok) return k.error;
    if (values.length === 0 || k.value < 1 || k.value > values.length) return err(ExcelErrorCode.Num);
    const sorted = values.slice().sort((a, b) => a - b);
    return num(sorted[k.value - 1]!);
  }));

  add(fn("MODE.SNGL", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length === 0) return err(ExcelErrorCode.Num);
    const freq = new Map<number, number>();
    for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
    let best: number = values[0]!;
    let bestCount = 0;
    const candidates = Array.from(freq.entries()).sort((a, b) => a[0] - b[0]);
    for (const [val, c] of candidates) {
      if (c > bestCount) {
        best = val;
        bestCount = c;
      }
    }
    return num(best);
  }));

  add(fn("MODE.MULT", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    if (values.length === 0) return err(ExcelErrorCode.Num);
    const freq = new Map<number, number>();
    for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
    let bestCount = 0;
    for (const c of freq.values()) if (c > bestCount) bestCount = c;
    const modes = Array.from(freq.entries()).filter(([, c]) => c === bestCount).map(([v]) => v).sort((a, b) => a - b);
    if (modes.length === 0 || bestCount <= 1) return err(ExcelErrorCode.NA);
    return buildArray(modes.length, 1, (r) => num(modes[r]!));
  }));

  add(fn("PERCENTILE.INC", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const k = toNumber(args[1]);
    if (!k.ok) return k.error;
    if (values.length === 0 || k.value < 0 || k.value > 1) return err(ExcelErrorCode.Num);
    return num(jStat.percentile(values, k.value));
  }));

  add(fn("PERCENTILE.EXC", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const k = toNumber(args[1]);
    if (!k.ok) return k.error;
    if (values.length === 0 || k.value <= 0 || k.value >= 1) return err(ExcelErrorCode.Num);
    return num(jStat.percentile(values, k.value));
  }));

  add(fn("PERCENTRANK.INC", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const x = toNumber(args[1]);
    if (!x.ok) return x.error;
    if (values.length === 0) return err(ExcelErrorCode.Num);
    const r = percentileRank(values, x.value, false);
    if (r === null) return err(ExcelErrorCode.Num);
    return num(r);
  }));

  add(fn("PERCENTRANK.EXC", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const x = toNumber(args[1]);
    if (!x.ok) return x.error;
    if (values.length === 0) return err(ExcelErrorCode.Num);
    const r = percentileRank(values, x.value, true);
    if (r === null) return err(ExcelErrorCode.Num);
    return num(r);
  }));

  add(fn("QUARTILE.INC", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const q = toInteger(args[1]);
    if (!q.ok) return q.error;
    if (values.length === 0 || q.value < 0 || q.value > 4) return err(ExcelErrorCode.Num);
    return num(jStat.percentile(values, q.value / 4));
  }));

  add(fn("QUARTILE.EXC", "none", (args) => {
    const { values, error } = flattenNumbersStrict(args);
    if (error) return error;
    const q = toInteger(args[1]);
    if (!q.ok) return q.error;
    if (values.length === 0 || q.value < 1 || q.value > 3) return err(ExcelErrorCode.Num);
    return num(jStat.percentile(values, q.value / 4));
  }));

  // Correlation / regression
  add(fn("CORREL", "none", (args) => {
    const a = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const b = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (a.error) return a.error;
    if (b.error) return b.error;
    if (a.values.length !== b.values.length || a.values.length < 2) return err(ExcelErrorCode.NA);
    return num(jStat.corrcoeff(a.values, b.values));
  }));

  add(fn("PEARSON", "none", (args) => {
    const a = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const b = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (a.error) return a.error;
    if (b.error) return b.error;
    if (a.values.length !== b.values.length || a.values.length < 2) return err(ExcelErrorCode.NA);
    return num(jStat.corrcoeff(a.values, b.values));
  }));

  add(fn("COVARIANCE.P", "none", (args) => {
    const a = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const b = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (a.error) return a.error;
    if (b.error) return b.error;
    if (a.values.length !== b.values.length || a.values.length < 1) return err(ExcelErrorCode.NA);
    const ma = mean(a.values);
    const mb = mean(b.values);
    let sum = 0;
    for (let i = 0; i < a.values.length; i++) sum += (a.values[i]! - ma) * (b.values[i]! - mb);
    return num(sum / a.values.length);
  }));

  add(fn("COVARIANCE.S", "none", (args) => {
    const a = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const b = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (a.error) return a.error;
    if (b.error) return b.error;
    if (a.values.length !== b.values.length || a.values.length < 2) return err(ExcelErrorCode.NA);
    return num(jStat.covariance(a.values, b.values));
  }));

  add(fn("RSQ", "none", (args) => {
    const a = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const b = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (a.error) return a.error;
    if (b.error) return b.error;
    if (a.values.length !== b.values.length || a.values.length < 2) return err(ExcelErrorCode.NA);
    const r = jStat.corrcoeff(a.values, b.values);
    return num(r * r);
  }));

  add(fn("SLOPE", "none", (args) => {
    const xs = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const ys = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (xs.error) return xs.error;
    if (ys.error) return ys.error;
    if (xs.values.length !== ys.values.length || xs.values.length < 2) return err(ExcelErrorCode.NA);
    const cov = jStat.covariance(xs.values, ys.values);
    const varX = varianceS(xs.values);
    if (varX === 0) return err(ExcelErrorCode.Div0);
    return num(cov / varX);
  }));

  add(fn("INTERCEPT", "none", (args) => {
    const xs = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const ys = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (xs.error) return xs.error;
    if (ys.error) return ys.error;
    if (xs.values.length !== ys.values.length || xs.values.length < 2) return err(ExcelErrorCode.NA);
    const cov = jStat.covariance(xs.values, ys.values);
    const varX = varianceS(xs.values);
    if (varX === 0) return err(ExcelErrorCode.Div0);
    const slope = cov / varX;
    return num(mean(ys.values) - slope * mean(xs.values));
  }));

  add(fn("STEYX", "none", (args) => {
    const xs = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const ys = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (xs.error) return xs.error;
    if (ys.error) return ys.error;
    if (xs.values.length !== ys.values.length || xs.values.length < 3) return err(ExcelErrorCode.NA);
    const cov = jStat.covariance(xs.values, ys.values);
    const varX = varianceS(xs.values);
    if (varX === 0) return err(ExcelErrorCode.Div0);
    const slope = cov / varX;
    const intercept = mean(ys.values) - slope * mean(xs.values);
    let sse = 0;
    for (let i = 0; i < xs.values.length; i++) {
      const pred = slope * xs.values[i]! + intercept;
      sse += (ys.values[i]! - pred) ** 2;
    }
    return num(Math.sqrt(sse / (xs.values.length - 2)));
  }));

  add(fn("FORECAST.LINEAR", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const ys = flattenNumbersStrict(args[1] ? [args[1]] : []);
    const xs = flattenNumbersStrict(args[2] ? [args[2]] : []);
    if (ys.error) return ys.error;
    if (xs.error) return xs.error;
    if (xs.values.length !== ys.values.length || xs.values.length < 2) return err(ExcelErrorCode.NA);
    const cov = jStat.covariance(xs.values, ys.values);
    const varX = varianceS(xs.values);
    if (varX === 0) return err(ExcelErrorCode.Div0);
    const slope = cov / varX;
    const intercept = mean(ys.values) - slope * mean(xs.values);
    return num(slope * x.value + intercept);
  }));

  // Fisher and gamma
  add(fn("FISHER", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    if (x.value <= -1 || x.value >= 1) return err(ExcelErrorCode.Num);
    return num(0.5 * Math.log((1 + x.value) / (1 - x.value)));
  }));

  add(fn("FISHERINV", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const e2x = Math.exp(2 * x.value);
    return num((e2x - 1) / (e2x + 1));
  }));

  add(fn("STANDARDIZE", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const m = toNumber(args[1]);
    if (!m.ok) return m.error;
    const sd = toNumber(args[2]);
    if (!sd.ok) return sd.error;
    if (sd.value <= 0) return err(ExcelErrorCode.Num);
    return num((x.value - m.value) / sd.value);
  }));

  add(fn("GAMMA", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const r = jStat.gammafn(x.value);
    if (!Number.isFinite(r)) return err(ExcelErrorCode.Num);
    return num(r);
  }));

  add(fn("GAMMALN", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const r = jStat.gammaln(x.value);
    if (!Number.isFinite(r)) return err(ExcelErrorCode.Num);
    return num(r);
  }));

  add(fn("GAMMALN.PRECISE", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const r = jStat.gammaln(x.value);
    if (!Number.isFinite(r)) return err(ExcelErrorCode.Num);
    return num(r);
  }));

  add(fn("GAUSS", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    return num(jStat.normal.cdf(x.value, 0, 1) - 0.5);
  }));

  add(fn("PHI", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    return num(jStat.normal.pdf(x.value, 0, 1));
  }));

  // Permutations / probability
  add(fn("PERMUT", "none", (args) => {
    const n = toInteger(args[0]);
    if (!n.ok) return n.error;
    const k = toInteger(args[1]);
    if (!k.ok) return k.error;
    if (n.value < 0 || k.value < 0 || k.value > n.value) return err(ExcelErrorCode.Num);
    let res = 1;
    for (let i = 0; i < k.value; i++) res *= n.value - i;
    return num(res);
  }));

  add(fn("PERMUTATIONA", "none", (args) => {
    const n = toNumber(args[0]);
    if (!n.ok) return n.error;
    const k = toNumber(args[1]);
    if (!k.ok) return k.error;
    if (n.value < 0 || k.value < 0) return err(ExcelErrorCode.Num);
    return num(n.value ** k.value);
  }));

  add(fn("PROB", "none", (args) => {
    const xRange = flattenNumbersStrict(args[0] ? [args[0]] : []);
    const pRange = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (xRange.error) return xRange.error;
    if (pRange.error) return pRange.error;
    if (xRange.values.length !== pRange.values.length) return err(ExcelErrorCode.NA);
    const lower = toNumber(args[2]);
    if (!lower.ok) return lower.error;
    const upper = args[3] ? toNumber(args[3]) : null;
    if (upper && !upper.ok) return upper.error;
    let sum = 0;
    for (let i = 0; i < xRange.values.length; i++) {
      const x = xRange.values[i]!;
      if (upper) {
        if (x >= lower.value && x <= upper.value) sum += pRange.values[i]!;
      } else {
        if (x === lower.value) sum += pRange.values[i]!;
      }
    }
    return num(sum);
  }));

  // Ranking
  add(fn("RANK.AVG", "none", (args) => {
    const x = toNumber(args[0]);
    if (!x.ok) return x.error;
    const ref = flattenNumbersStrict(args[1] ? [args[1]] : []);
    if (ref.error) return ref.error;
    const defaultOrder: { ok: true; value: number } = { ok: true, value: 0 };
    const order = args[2] ? toNumber(args[2]) : defaultOrder;
    if (!order.ok) return order.error;
    if (ref.values.length === 0) return err(ExcelErrorCode.NA);
    const sorted = ref.values
      .map((v, i) => ({ v, i }))
      .sort((a, b) => (order.value === 0 ? b.v - a.v : a.v - b.v));
    let i = 0;
    let found: number | null = null;
    while (i < sorted.length) {
      let j = i;
      let sumRank = 0;
      while (j < sorted.length && sorted[j]!.v === sorted[i]!.v) {
        sumRank += j + 1;
        j++;
      }
      const avgRank = sumRank / (j - i);
      for (let k = i; k < j; k++) {
        if (sorted[k]!.v === x.value) found = avgRank;
      }
      i = j;
    }
    if (found === null) return err(ExcelErrorCode.NA);
    return num(found);
  }));

  // Regression arrays
  function linearRegression(xs: number[], ys: number[], intercept: boolean): { slope: number; intercept: number } | null {
    if (xs.length !== ys.length || xs.length < 2) return null;
    if (!intercept) {
      // y = slope * x, no intercept
      const num = xs.reduce((s, x, i) => s + x * ys[i]!, 0);
      const den = xs.reduce((s, x) => s + x * x, 0);
      if (den === 0) return null;
      return { slope: num / den, intercept: 0 };
    }
    const cov = jStat.covariance(xs, ys);
    const varX = varianceS(xs);
    if (varX === 0) return null;
    const slope = cov / varX;
    return { slope, intercept: mean(ys) - slope * mean(xs) };
  }

  function regressionPredict(xs: number[], ys: number[], newXs: number[], intercept: boolean): { ok: false } | { ok: true; values: number[] } {
    const reg = linearRegression(xs, ys, intercept);
    if (!reg) return { ok: false };
    return { ok: true, values: newXs.map((x) => reg.slope * x + reg.intercept) };
  }

  add(fn("TREND", "none", (args) => {
    const knownYs = flattenNumbersStrict(args[0] ? [args[0]] : []);
    if (knownYs.error) return knownYs.error;
    const n = knownYs.values.length;
    const knownXs = args[1] ? flattenNumbersStrict([args[1]]) : { values: Array.from({ length: n }, (_, i) => i + 1) };
    if (knownXs.error) return knownXs.error;
    const newXsArg = args[2] ? flattenNumbersStrict([args[2]]) : { values: knownXs.values.slice() };
    if (newXsArg.error) return newXsArg.error;
    const constOpt = optNumber(args[3], 1);
    if (!constOpt.ok) return constOpt.error;
    const intercept = constOpt.value !== 0;
    const result = regressionPredict(knownXs.values, knownYs.values, newXsArg.values, intercept);
    if (!result.ok) return err(ExcelErrorCode.Num);
    return buildArray(1, result.values.length, (_, c) => num(result.values[c]!));
  }));

  add(fn("GROWTH", "none", (args) => {
    const knownYs = flattenNumbersStrict(args[0] ? [args[0]] : []);
    if (knownYs.error) return knownYs.error;
    if (knownYs.values.some((y) => y <= 0)) return err(ExcelErrorCode.Num);
    const n = knownYs.values.length;
    const logYs = knownYs.values.map((y) => Math.log(y));
    const knownXs = args[1] ? flattenNumbersStrict([args[1]]) : { values: Array.from({ length: n }, (_, i) => i + 1) };
    if (knownXs.error) return knownXs.error;
    const newXsArg = args[2] ? flattenNumbersStrict([args[2]]) : { values: knownXs.values.slice() };
    if (newXsArg.error) return newXsArg.error;
    const constOpt = optNumber(args[3], 1);
    if (!constOpt.ok) return constOpt.error;
    const intercept = constOpt.value !== 0;
    const reg = linearRegression(knownXs.values, logYs, intercept);
    if (!reg) return err(ExcelErrorCode.Num);
    const preds = newXsArg.values.map((x) => Math.exp(reg.slope * x + reg.intercept));
    return buildArray(1, preds.length, (_, c) => num(preds[c]!));
  }));

  add(fn("LINEST", "none", (args) => {
    const knownYs = flattenNumbersStrict(args[0] ? [args[0]] : []);
    if (knownYs.error) return knownYs.error;
    const n = knownYs.values.length;
    const knownXs = args[1] ? flattenNumbersStrict([args[1]]) : { values: Array.from({ length: n }, (_, i) => i + 1) };
    if (knownXs.error) return knownXs.error;
    const constOpt = optNumber(args[2], 1);
    if (!constOpt.ok) return constOpt.error;
    const intercept = constOpt.value !== 0;
    const stats = optNumber(args[3], 0);
    if (!stats.ok) return stats.error;
    const reg = linearRegression(knownXs.values, knownYs.values, intercept);
    if (!reg) return err(ExcelErrorCode.Num);
    if (stats.value) {
      // Minimal stats layout: slope, intercept; se_slope, se_intercept; r2, se_y; F, df; ssreg, ssresid
      const ys = knownYs.values;
      const xs = knownXs.values;
      const yMean = mean(ys);
      const preds = xs.map((x) => reg.slope * x + reg.intercept);
      const ssRes = ys.reduce((s, y, i) => s + (y - preds[i]!) ** 2, 0);
      const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
      const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
      const df = xs.length - 2;
      const seY = df > 0 ? Math.sqrt(ssRes / df) : 0;
      const ssReg = ssTot - ssRes;
      const f = df > 0 && ssRes > 0 ? (ssReg / 1) / (ssRes / df) : 0;
      const xMean = mean(xs);
      const sxx = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
      const seSlope = df > 0 && sxx > 0 ? seY / Math.sqrt(sxx) : 0;
      const seIntercept = df > 0 && sxx > 0 ? seY * Math.sqrt(1 / xs.length + xMean * xMean / sxx) : 0;
      return buildArray(5, 2, (r, c) => {
        if (r === 0) return c === 0 ? num(reg.slope) : num(reg.intercept);
        if (r === 1) return c === 0 ? num(seSlope) : num(seIntercept);
        if (r === 2) return c === 0 ? num(r2) : num(seY);
        if (r === 3) return c === 0 ? num(f) : num(df);
        return c === 0 ? num(ssReg) : num(ssRes);
      });
    }
    return buildArray(1, 2, (_, c) => num(c === 0 ? reg.slope : reg.intercept));
  }));

  add(fn("LOGEST", "none", (args) => {
    const knownYs = flattenNumbersStrict(args[0] ? [args[0]] : []);
    if (knownYs.error) return knownYs.error;
    if (knownYs.values.some((y) => y <= 0)) return err(ExcelErrorCode.Num);
    const n = knownYs.values.length;
    const logYs = knownYs.values.map((y) => Math.log(y));
    const knownXs = args[1] ? flattenNumbersStrict([args[1]]) : { values: Array.from({ length: n }, (_, i) => i + 1) };
    if (knownXs.error) return knownXs.error;
    const constOpt = optNumber(args[2], 1);
    if (!constOpt.ok) return constOpt.error;
    const intercept = constOpt.value !== 0;
    const reg = linearRegression(knownXs.values, logYs, intercept);
    if (!reg) return err(ExcelErrorCode.Num);
    const m = Math.exp(reg.slope);
    const b = Math.exp(reg.intercept);
    return buildArray(1, 2, (_, c) => num(c === 0 ? m : b));
  }));
}
