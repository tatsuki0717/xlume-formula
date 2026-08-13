/**
 * Native implementations for missing math and trigonometry worksheet functions.
 */
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
import type { ExcelFunction } from "../formula/functions-types.js";

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

function gcd2(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

const romanNumerals: { v: number; s: string }[] = [
  { v: 1000, s: "M" }, { v: 900, s: "CM" }, { v: 500, s: "D" }, { v: 400, s: "CD" },
  { v: 100, s: "C" }, { v: 90, s: "XC" }, { v: 50, s: "L" }, { v: 40, s: "XL" },
  { v: 10, s: "X" }, { v: 9, s: "IX" }, { v: 5, s: "V" }, { v: 4, s: "IV" }, { v: 1, s: "I" },
];

const romanMap: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
};

export function registerMath2Functions(add: (f: ExcelFunction) => void): void {
  // Hyperbolic / inverse
  add(fn("SINH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.sinh(n.value)) : n;
  }));
  add(fn("COSH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.cosh(n.value)) : n;
  }));
  add(fn("COTH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const s = Math.sinh(n.value);
    if (s === 0) return err(ExcelErrorCode.Div0);
    return num(Math.cosh(n.value) / s);
  }));
  add(fn("CSCH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const s = Math.sinh(n.value);
    if (s === 0) return err(ExcelErrorCode.Div0);
    return num(1 / s);
  }));
  add(fn("SECH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(1 / Math.cosh(n.value)) : n;
  }));
  add(fn("ASINH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.asinh(n.value)) : n;
  }));
  add(fn("ACOSH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    if (n.value < 1) return err(ExcelErrorCode.Num);
    return num(Math.acosh(n.value));
  }));
  add(fn("ATANH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    if (Math.abs(n.value) >= 1) return err(ExcelErrorCode.Num);
    return num(Math.atanh(n.value));
  }));
  add(fn("ACOTH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    if (Math.abs(n.value) <= 1) return err(ExcelErrorCode.Num);
    return num(0.5 * Math.log((n.value + 1) / (n.value - 1)));
  }));

  // Reciprocal trig
  add(fn("COT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const t = Math.tan(n.value);
    if (t === 0) return err(ExcelErrorCode.Div0);
    return num(1 / t);
  }));
  add(fn("CSC", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const s = Math.sin(n.value);
    if (s === 0) return err(ExcelErrorCode.Div0);
    return num(1 / s);
  }));
  add(fn("SEC", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const c = Math.cos(n.value);
    if (c === 0) return err(ExcelErrorCode.Div0);
    return num(1 / c);
  }));
  add(fn("ACOT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.PI / 2 - Math.atan(n.value)) : n;
  }));

  // Rounding / multiple
  add(fn("MROUND", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const m = excelCoerceNumber(args[1] ?? BLANK);
    if (n.kind !== "number" || m.kind !== "number") return n.kind !== "number" ? n : m;
    if (m.value === 0) return err(ExcelErrorCode.Num);
    if ((n.value > 0 && m.value < 0) || (n.value < 0 && m.value > 0)) return err(ExcelErrorCode.Num);
    return num(Math.round(n.value / m.value) * m.value);
  }));
  add(fn("QUOTIENT", "none", (args) => {
    const a = excelCoerceNumber(args[0] ?? BLANK);
    const b = excelCoerceNumber(args[1] ?? BLANK);
    if (a.kind !== "number" || b.kind !== "number") return a.kind !== "number" ? a : b;
    if (b.value === 0) return err(ExcelErrorCode.Div0);
    return num(Math.trunc(a.value / b.value));
  }));
  add(fn("CEILING.PRECISE", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const s = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(1);
    if (n.kind !== "number" || s.kind !== "number") return n.kind !== "number" ? n : s;
    if (s.value === 0) return err(ExcelErrorCode.Div0);
    const sig = Math.abs(s.value);
    return num(Math.ceil(n.value / sig) * sig);
  }));
  add(fn("FLOOR.PRECISE", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const s = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(1);
    if (n.kind !== "number" || s.kind !== "number") return n.kind !== "number" ? n : s;
    if (s.value === 0) return err(ExcelErrorCode.Div0);
    const sig = Math.abs(s.value);
    return num(Math.floor(n.value / sig) * sig);
  }));
  add(fn("ISO.CEILING", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const s = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(1);
    if (n.kind !== "number" || s.kind !== "number") return n.kind !== "number" ? n : s;
    if (s.value === 0) return err(ExcelErrorCode.Div0);
    const sig = Math.abs(s.value);
    return num(Math.ceil(n.value / sig) * sig);
  }));

  // Combinatorial
  add(fn("COMBINA", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const k = excelCoerceNumber(args[1] ?? BLANK);
    if (n.kind !== "number" || k.kind !== "number") return n.kind !== "number" ? n : k;
    const N = Math.round(n.value);
    const K = Math.round(k.value);
    if (N < 0 || K < 0 || K > N) return err(ExcelErrorCode.Num);
    // C(N+K-1, K)
    const total = factorial(N + K - 1) / (factorial(K) * factorial(N - 1));
    return num(total);
  }));
  add(fn("MULTINOMIAL", "none", (args) => {
    const vals: number[] = [];
    for (const a of args) {
      if (a.kind === "array") for (const v of a.values) pushNumber(vals, v);
      else pushNumber(vals, a);
    }
    if (vals.some((v) => v < 0 || !Number.isInteger(v))) return err(ExcelErrorCode.Num);
    const sum = vals.reduce((s, v) => s + v, 0);
    let numerator = factorial(sum);
    let denominator = 1;
    for (const v of vals) denominator *= factorial(v);
    return num(numerator / denominator);
  }));
  add(fn("FACTDOUBLE", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const v = Math.round(n.value);
    if (v < 0) return err(ExcelErrorCode.Num);
    let prod = 1;
    const step = v % 2 === 0 ? 2 : 2;
    for (let i = v; i > 0; i -= step) prod *= i;
    return num(prod);
  }));
  add(fn("GCD", "none", (args) => {
    const vals: number[] = [];
    for (const a of args) {
      if (a.kind === "array") for (const v of a.values) pushNumber(vals, v);
      else pushNumber(vals, a);
    }
    if (vals.length === 0) return num(0);
    let result = Math.abs(vals[0]!);
    for (let i = 1; i < vals.length; i++) result = gcd2(result, vals[i]!);
    return num(result);
  }));
  add(fn("LCM", "none", (args) => {
    const vals: number[] = [];
    for (const a of args) {
      if (a.kind === "array") for (const v of a.values) pushNumber(vals, v);
      else pushNumber(vals, a);
    }
    if (vals.length === 0) return num(1);
    if (vals.some((v) => v === 0)) return num(0);
    let result = Math.abs(vals[0]!);
    for (let i = 1; i < vals.length; i++) {
      const a = Math.abs(vals[i]!);
      result = (result * a) / gcd2(result, a);
    }
    return num(result);
  }));

  // Number base
  add(fn("BASE", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const radix = excelCoerceNumber(args[1] ?? BLANK);
    const minLenArg = args[2] !== undefined ? excelCoerceNumber(args[2]) : num(0);
    if (n.kind !== "number" || radix.kind !== "number") return n.kind !== "number" ? n : radix;
    if (minLenArg.kind !== "number") return minLenArg;
    const val = Math.trunc(n.value);
    const base = Math.round(radix.value);
    const minLen = Math.max(0, Math.round(minLenArg.value));
    if (base < 2 || base > 36) return err(ExcelErrorCode.Num);
    const negative = val < 0;
    const out = (negative ? "-" : "") + Math.abs(val).toString(base).toUpperCase();
    return str(out.padStart((negative ? 1 : 0) + minLen, "0"));
  }));
  add(fn("DECIMAL", "none", (args) => {
    const text = excelCoerceString(args[0] ?? BLANK);
    const radix = excelCoerceNumber(args[1] ?? BLANK);
    if (text.kind !== "string" || radix.kind !== "number") return text.kind !== "string" ? text : radix;
    const base = Math.round(radix.value);
    if (base < 2 || base > 36) return err(ExcelErrorCode.Num);
    const value = parseInt(text.value, base);
    if (Number.isNaN(value)) return err(ExcelErrorCode.Num);
    return num(value);
  }));

  // Roman
  add(fn("ARABIC", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    if (s.kind !== "string") return s;
    let total = 0;
    let prev = 0;
    for (const ch of s.value.toUpperCase().split("").reverse()) {
      const cur = romanMap[ch] ?? 0;
      if (cur < prev) total -= cur;
      else total += cur;
      prev = cur;
    }
    if (total <= 0 || total > 3999) return err(ExcelErrorCode.Value);
    return num(total);
  }));
  add(fn("ROMAN", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const form = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(0);
    if (n.kind !== "number") return n;
    if (form.kind !== "number") return form;
    const value = Math.round(n.value);
    if (value <= 0 || value > 3999) return err(ExcelErrorCode.Value);
    // form argument ignored; output classic Roman numerals
    let v = value;
    let out = "";
    for (const item of romanNumerals) {
      while (v >= item.v) { out += item.s; v -= item.v; }
    }
    return str(out);
  }));

  // Array / series
  add(fn("MUNIT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const size = Math.round(n.value);
    if (size <= 0) return err(ExcelErrorCode.Value);
    const values: ExcelValue[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) values.push(num(r === c ? 1 : 0));
    }
    return { kind: "array", width: size, height: size, values } as ArrayValue;
  }));
  add(fn("SERIESSUM", "none", (args) => {
    const x = excelCoerceNumber(args[0] ?? BLANK);
    const n = excelCoerceNumber(args[1] ?? BLANK);
    const m = excelCoerceNumber(args[2] ?? BLANK);
    const coeffs = args[3];
    if (x.kind !== "number" || n.kind !== "number" || m.kind !== "number") return err(ExcelErrorCode.Value);
    if (!coeffs || coeffs.kind !== "array") return err(ExcelErrorCode.Value);
    let sum = 0;
    for (let i = 0; i < coeffs.values.length; i++) {
      const v = excelCoerceNumber(coeffs.values[i] ?? BLANK);
      if (v.kind !== "number") continue;
      sum += v.value * (x.value ** (n.value + i * m.value));
    }
    return num(sum);
  }));

  add(fn("TANH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.tanh(n.value)) : n;
  }));

  function sumXY(args: ExcelValue[], op: (x: number, y: number) => number): ExcelValue {
    if (args.length < 2) return err(ExcelErrorCode.Value);
    const a = args[0]!;
    const b = args[1]!;
    if (a.kind !== "array" || b.kind !== "array") return err(ExcelErrorCode.Value);
    if (a.values.length !== b.values.length) return err(ExcelErrorCode.NA);
    let sum = 0;
    for (let i = 0; i < a.values.length; i++) {
      const x = excelCoerceNumber(a.values[i] ?? BLANK);
      const y = excelCoerceNumber(b.values[i] ?? BLANK);
      if (x.kind !== "number" || y.kind !== "number") return err(ExcelErrorCode.Value);
      sum += op(x.value, y.value);
    }
    return num(sum);
  }
  add(fn("SUMX2MY2", "none", (args) => sumXY(args, (x, y) => x * x - y * y)));
  add(fn("SUMX2PY2", "none", (args) => sumXY(args, (x, y) => x * x + y * y)));
  add(fn("SUMXMY2", "none", (args) => sumXY(args, (x, y) => (x - y) ** 2)));

  add(fn("SUMSQ", "none", (args) => {
    let sum = 0;
    for (const a of args) {
      if (a.kind === "array") {
        for (const v of a.values) {
          const n = excelCoerceNumber(v);
          if (n.kind === "number") sum += n.value ** 2;
        }
      } else {
        const n = excelCoerceNumber(a);
        if (n.kind === "number") sum += n.value ** 2;
      }
    }
    return num(sum);
  }));
}

function pushNumber(arr: number[], v: ExcelValue): void {
  const n = excelCoerceNumber(v);
  if (n.kind === "number") arr.push(Math.trunc(n.value));
}

function factorial(n: number): number {
  if (n < 0) return Number.NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
