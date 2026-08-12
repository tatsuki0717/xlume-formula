/**
 * Offline-implementable Google Sheets functions.
 *
 * These do not require network access or external APIs.
 */
import {
  BLANK,
  bool,
  err,
  ExcelErrorCode,
  num,
  sparkline,
  str,
  type ArrayValue,
  type ExcelValue,
  type NumberValue,
} from "../model/value.js";
import {
  excelCoerceBoolean,
  excelCoerceNumber,
  excelCoerceString,
  excelCompare,
} from "../formula/coercion.js";
import { flattenArgs } from "../formula/evaluator.js";
import type { ExcelFunction } from "../formula/functions-types.js";

const EPOCH = Date.UTC(1899, 11, 30);
const UNIX_EPOCH_SERIAL = 25569; // days between 1899-12-30 and 1970-01-01

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

function asNumber(value: ExcelValue | undefined, defaultValue: number): NumberValue | null {
  const v = value === undefined || value.kind === "blank" || value.kind === "omitted" ? num(defaultValue) : excelCoerceNumber(value);
  if (v.kind !== "number") return null;
  return v;
}

function asBoolean(value: ExcelValue | undefined, defaultValue: boolean): { ok: false; error: ExcelValue } | { ok: true; value: boolean } {
  if (value === undefined || value.kind === "blank" || value.kind === "omitted") return { ok: true, value: defaultValue };
  const b = excelCoerceBoolean(value);
  if (b.kind !== "boolean") return { ok: false, error: b };
  return { ok: true, value: b.value };
}

function escapeRegexForClass(c: string): string {
  if (/[\\\[\]\^\-]/.test(c)) return "\\" + c;
  return c;
}

function regexFor(pattern: string, caseInsensitive: boolean): RegExp {
  let p = pattern;
  if (p.startsWith("/") && p.endsWith("/")) p = p.slice(1, -1);
  return new RegExp(p, caseInsensitive ? "i" : "");
}

function valueToKey(v: ExcelValue): string {
  if (v.kind === "number") return `n:${v.value}`;
  if (v.kind === "string") return `s:${v.value.toLowerCase()}`;
  if (v.kind === "boolean") return `b:${v.value}`;
  if (v.kind === "blank" || v.kind === "omitted") return "blank";
  if (v.kind === "error") return `e:${v.code}`;
  if (v.kind === "array") return `a:${v.width}:${v.height}:${v.values.map(valueToKey).join(",")}`;
  return "unknown";
}

function toArrayValues(arg: ExcelValue): ExcelValue[] {
  if (arg.kind === "array") return [...arg.values];
  return [arg];
}

function toJsValue(v: ExcelValue | undefined): unknown {
  if (!v || v.kind === "blank" || v.kind === "omitted") return undefined;
  if (v.kind === "number") return v.value;
  if (v.kind === "string") return v.value;
  if (v.kind === "boolean") return v.value;
  if (v.kind === "error") return v.code;
  return undefined;
}

function rowKey(arr: ArrayValue, r: number): string {
  const cells: string[] = [];
  for (let c = 0; c < arr.width; c++) {
    cells.push(valueToKey(arr.values[r * arr.width + c] ?? BLANK));
  }
  return cells.join("|");
}

function compareCell(a: ExcelValue, b: ExcelValue): number {
  if (a.kind === "number" && b.kind === "number") return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  if (a.kind === "string" && b.kind === "string") {
    const x = a.value.toUpperCase();
    const y = b.value.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (a.kind === "boolean" && b.kind === "boolean") return a.value === b.value ? 0 : a.value ? 1 : -1;
  // Mixed: try numeric coercion
  const an = excelCoerceNumber(a);
  const bn = excelCoerceNumber(b);
  if (an.kind === "number" && bn.kind === "number") return an.value < bn.value ? -1 : an.value > bn.value ? 1 : 0;
  const as = excelCoerceString(a);
  const bs = excelCoerceString(b);
  if (as.kind === "string" && bs.kind === "string") {
    const x = as.value.toUpperCase();
    const y = bs.value.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return 0;
}

function compareRows(arr: ArrayValue, a: number, b: number, keys: { col: number; asc: boolean }[]): number {
  for (const key of keys) {
    const av = a < arr.height ? (arr.values[a * arr.width + key.col] ?? BLANK) : BLANK;
    const bv = b < arr.height ? (arr.values[b * arr.width + key.col] ?? BLANK) : BLANK;
    const cmp = compareCell(av, bv);
    if (cmp !== 0) return key.asc ? cmp : -cmp;
  }
  // Stable: preserve original order for equal keys
  return a - b;
}

// ------------------------------------------------------------------
// Operator functions
// ------------------------------------------------------------------

function binaryOp(a: ExcelValue | undefined, b: ExcelValue | undefined, op: (x: number, y: number) => ExcelValue): ExcelValue {
  const x = excelCoerceNumber(a ?? BLANK);
  const y = excelCoerceNumber(b ?? BLANK);
  if (x.kind !== "number") return x;
  if (y.kind !== "number") return y;
  return op(x.value, y.value);
}

function divOp(x: number, y: number): ExcelValue {
  if (y === 0) return err(ExcelErrorCode.Div0);
  return num(x / y);
}

function powOp(x: number, y: number): ExcelValue {
  const r = x ** y;
  if (!Number.isFinite(r)) return err(ExcelErrorCode.Num);
  return num(r);
}

// ------------------------------------------------------------------
// Normal inverse (Acklam approximation) for MARGINOFERROR
// ------------------------------------------------------------------
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a1 = -39.6968302866538;
  const a2 = 220.946098424521;
  const a3 = -275.928510446969;
  const a4 = 138.357751867269;
  const a5 = -30.6647980661472;
  const a6 = 2.50662827745924;
  const b1 = -54.4760987982241;
  const b2 = 161.58583685805;
  const b3 = -155.698979859887;
  const b4 = 66.8013118877197;
  const b5 = -13.2806815528857;
  const c1 = -0.00778489400243029;
  const c2 = -0.322396458441136;
  const c3 = -2.40075827716183;
  const c4 = -2.54973253934373;
  const c5 = 4.37466414146497;
  const c6 = 2.93816398269878;
  const d1 = 0.00778469570904146;
  const d2 = 0.32246712907004;
  const d3 = 2.445134137143;
  const d4 = 3.75440866190742;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
}

// ------------------------------------------------------------------
// Complex number helpers
// ------------------------------------------------------------------

function parseComplex(s: string): { re: number; im: number } | null {
  s = s.trim();
  if (!s) return null;
  // Normalize unary plus/minus
  s = s.replace(/\+i/g, "+1i").replace(/-i/g, "-1i").replace(/\si\b/g, s.includes("+") || s.includes("-") ? " 1i" : "1i");
  // Try patterns: a+bi, a-bi, bi, a
  const m = /^(?:([+-]?\d+(?:\.\d+)?)?\s*([+-])\s*(\d+(?:\.\d+)?)?i|(\d+(?:\.\d+)?)i|([+-]?\d+(?:\.\d+)?))$/.exec(s);
  if (!m) return null;
  if (m[4]) {
    // pure imaginary coefficient e.g. 3i
    const im = Number(m[4]);
    return { re: 0, im };
  }
  if (m[5]) {
    // pure real
    return { re: Number(m[5]), im: 0 };
  }
  const reStr = m[1] ?? "0";
  const sign = m[2] === "-" ? -1 : 1;
  const imStr = m[3] ?? "1";
  const re = reStr === "" ? 0 : Number(reStr);
  const im = sign * Number(imStr);
  return { re, im };
}

function complexToString(re: number, im: number): string {
  const r = Math.round(re * 1e12) / 1e12;
  const i = Math.round(im * 1e12) / 1e12;
  if (i === 0) return String(r);
  if (r === 0) return `${i}i`;
  const sign = i >= 0 ? "+" : "-";
  return `${r}${sign}${Math.abs(i)}i`;
}

function complexLog(re: number, im: number): { re: number; im: number } {
  const abs = Math.sqrt(re * re + im * im);
  return { re: Math.log(abs), im: Math.atan2(im, re) };
}

function complexSinh(re: number, im: number): { re: number; im: number } {
  return {
    re: Math.sinh(re) * Math.cos(im),
    im: Math.cosh(re) * Math.sin(im),
  };
}

function complexCosh(re: number, im: number): { re: number; im: number } {
  return {
    re: Math.cosh(re) * Math.cos(im),
    im: Math.sinh(re) * Math.sin(im),
  };
}

function complexDivide(aRe: number, aIm: number, bRe: number, bIm: number): { re: number; im: number } | null {
  const denom = bRe * bRe + bIm * bIm;
  if (denom === 0) return null;
  return { re: (aRe * bRe + aIm * bIm) / denom, im: (aIm * bRe - aRe * bIm) / denom };
}

export function registerGoogleSheetsFunctions(add: (f: ExcelFunction) => void): void {
  // Operator functions
  add(fn("ADD", "none", (args) => binaryOp(args[0], args[1], (x, y) => num(x + y))));
  add(fn("MINUS", "none", (args) => binaryOp(args[0], args[1], (x, y) => num(x - y))));
  add(fn("MULTIPLY", "none", (args) => binaryOp(args[0], args[1], (x, y) => num(x * y))));
  add(fn("DIVIDE", "none", (args) => binaryOp(args[0], args[1], divOp)));
  add(fn("POW", "none", (args) => binaryOp(args[0], args[1], powOp)));
  add(fn("UMINUS", "none", (args) => binaryOp(BLANK, args[0], (_x, y) => num(-y))));
  add(fn("UPLUS", "none", (args) => excelCoerceNumber(args[0] ?? BLANK)));
  add(fn("UNARY_PERCENT", "none", (args) => binaryOp(args[0], num(100), (x, y) => num(x / y))));

  add(fn("EQ", "none", (args) => excelCompare(args[0] ?? BLANK, args[1] ?? BLANK, "=")));
  add(fn("NE", "none", (args) => excelCompare(args[0] ?? BLANK, args[1] ?? BLANK, "<>")));
  add(fn("GT", "none", (args) => excelCompare(args[0] ?? BLANK, args[1] ?? BLANK, ">")));
  add(fn("GTE", "none", (args) => excelCompare(args[0] ?? BLANK, args[1] ?? BLANK, ">=")));
  add(fn("LT", "none", (args) => excelCompare(args[0] ?? BLANK, args[1] ?? BLANK, "<")));
  add(fn("LTE", "none", (args) => excelCompare(args[0] ?? BLANK, args[1] ?? BLANK, "<=")));

  add(fn("ISBETWEEN", "none", (args) => {
    const value = excelCoerceNumber(args[0] ?? BLANK);
    const lower = excelCoerceNumber(args[1] ?? BLANK);
    const upper = excelCoerceNumber(args[2] ?? BLANK);
    if (value.kind !== "number") return value;
    if (lower.kind !== "number") return lower;
    if (upper.kind !== "number") return upper;
    const loInc = asBoolean(args[3], true);
    const hiInc = asBoolean(args[4], true);
    if (!loInc.ok) return loInc.error;
    if (!hiInc.ok) return hiInc.error;
    const lowerOk = loInc.value ? value.value >= lower.value : value.value > lower.value;
    const upperOk = hiInc.value ? value.value <= upper.value : value.value < upper.value;
    return bool(lowerOk && upperOk);
  }));

  // Information
  add(fn("ISDATE", "none", (args) => {
    const v = args[0];
    if (!v || v.kind === "blank" || v.kind === "omitted") return bool(false);
    if (v.kind === "number") return bool(Number.isFinite(v.value) && v.value >= 0);
    if (v.kind === "string") {
      const d = Date.parse(v.value);
      return bool(!Number.isNaN(d));
    }
    return bool(false);
  }));

  add(fn("ISEMAIL", "none", (args) => {
    const v = excelCoerceString(args[0] ?? BLANK);
    if (v.kind !== "string") return v;
    // Reasonable email shape: local@domain.tld
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.value);
    return bool(ok);
  }));

  add(fn("ISURL", "none", (args) => {
    const v = excelCoerceString(args[0] ?? BLANK);
    if (v.kind !== "string") return v;
    const ok = /^(https?|ftp):\/\/[^\s\/$.?#].[^\s]*$/i.test(v.value);
    return bool(ok);
  }));

  // Math
  add(fn("COUNTUNIQUE", "none", (args) => {
    const seen = new Set<string>();
    const flat = flattenArgs(args);
    for (const v of flat) {
      if (v.kind === "error") return v;
      if (v.kind === "blank" || v.kind === "omitted") continue;
      seen.add(valueToKey(v));
    }
    return num(seen.size);
  }));

  // Date
  add(fn("EPOCHTODATE", "none", (args) => {
    const ts = excelCoerceNumber(args[0] ?? BLANK);
    const unit = asNumber(args[1], 1);
    if (ts.kind !== "number") return ts;
    if (unit === null) return err(ExcelErrorCode.Value);
    let divisor = 86400;
    if (unit.value === 2) divisor = 86400000;
    else if (unit.value === 3) divisor = 86400000000;
    else if (unit.value !== 1) return err(ExcelErrorCode.Value);
    const serial = ts.value / divisor + UNIX_EPOCH_SERIAL;
    return num(serial);
  }));

  // Parser helpers
  add(fn("TO_DATE", "none", (args) => {
    const v = args[0];
    if (!v || v.kind === "blank" || v.kind === "omitted") return err(ExcelErrorCode.Value);
    if (v.kind === "number") return num(v.value);
    if (v.kind === "string") {
      const d = Date.parse(v.value);
      if (!Number.isNaN(d)) {
        const serial = Math.round((d - EPOCH) / 86400000);
        return num(serial);
      }
      const n = excelCoerceNumber(v);
      if (n.kind === "number") return n;
      return err(ExcelErrorCode.Value);
    }
    return err(ExcelErrorCode.Value);
  }));

  add(fn("TO_DOLLARS", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    return num(Math.round(n.value * 100) / 100);
  }));

  add(fn("TO_PERCENT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    return num(n.value);
  }));

  add(fn("TO_PURE_NUMBER", "none", (args) => {
    const v = args[0];
    if (!v || v.kind === "blank" || v.kind === "omitted") return num(0);
    if (v.kind === "number") return v;
    if (v.kind === "boolean") return num(v.value ? 1 : 0);
    if (v.kind === "string") {
      let s = v.value.trim();
      if (s.endsWith("%")) {
        const n = Number(s.slice(0, -1).replace(/[$,]/g, ""));
        if (!Number.isNaN(n)) return num(n / 100);
      }
      s = s.replace(/[$,]/g, "");
      const n = Number(s);
      if (!Number.isNaN(n)) return num(n);
      const d = Date.parse(v.value);
      if (!Number.isNaN(d)) return num(Math.round((d - EPOCH) / 86400000));
      return err(ExcelErrorCode.Value);
    }
    return err(ExcelErrorCode.Value);
  }));

  add(fn("TO_TEXT", "none", (args) => {
    const v = args[0];
    if (!v || v.kind === "blank" || v.kind === "omitted") return str("");
    if (v.kind === "number") return str(String(v.value));
    if (v.kind === "string") return v;
    if (v.kind === "boolean") return str(v.value ? "TRUE" : "FALSE");
    if (v.kind === "error") return str(v.code);
    if (v.kind === "array") return err(ExcelErrorCode.Value);
    return str("");
  }));

  // Text
  add(fn("JOIN", "none", (args) => {
    const delim = excelCoerceString(args[0] ?? BLANK);
    if (delim.kind !== "string") return delim;
    const parts: string[] = [];
    for (let i = 1; i < args.length; i++) {
      const a = args[i]!;
      if (a.kind === "array") {
        for (const cell of a.values) {
          const s = excelCoerceString(cell ?? BLANK);
          if (s.kind !== "string") return s;
          parts.push(s.value);
        }
      } else {
        const s = excelCoerceString(a);
        if (s.kind !== "string") return s;
        parts.push(s.value);
      }
    }
    return str(parts.join(delim.value));
  }));

  add(fn("SPLIT", "none", (args) => {
    const text = excelCoerceString(args[0] ?? BLANK);
    const delim = excelCoerceString(args[1] ?? BLANK);
    if (text.kind !== "string") return text;
    if (delim.kind !== "string") return delim;
    const splitEach = asBoolean(args[2], true);
    const removeEmpty = asBoolean(args[3], true);
    if (!splitEach.ok) return splitEach.error;
    if (!removeEmpty.ok) return removeEmpty.error;

    let parts: string[];
    if (delim.value === "") {
      parts = splitEach.value ? text.value.split("") : [text.value];
    } else if (splitEach.value) {
      const chars = [...new Set(delim.value)].map(escapeRegexForClass).join("");
      const re = new RegExp(`[${chars}]`, "g");
      parts = text.value.split(re);
    } else {
      parts = text.value.split(delim.value);
    }

    if (removeEmpty.value) {
      parts = parts.filter((p) => p !== "");
    }
    return { kind: "array", width: parts.length, height: 1, values: parts.map((p) => str(p)) } as ArrayValue;
  }));

  add(fn("REGEXMATCH", "none", (args) => {
    const text = excelCoerceString(args[0] ?? BLANK);
    const pattern = excelCoerceString(args[1] ?? BLANK);
    if (text.kind !== "string") return text;
    if (pattern.kind !== "string") return pattern;
    let p = pattern.value;
    let caseInsensitive = false;
    if (p.startsWith("(?i)") || p.startsWith("(?i-)")) {
      caseInsensitive = true;
      p = p.replace(/^\(\?i-?\)/, "");
    }
    try {
      return bool(regexFor(p, caseInsensitive).test(text.value));
    } catch {
      return err(ExcelErrorCode.Value);
    }
  }));

  // Statistical
  add(fn("AVERAGE.WEIGHTED", "none", (args) => {
    let total = 0;
    let weightSum = 0;
    for (let i = 0; i < args.length; i += 2) {
      const vArg = args[i];
      const wArg = args[i + 1];
      if (!vArg) continue;
      if (!wArg) return err(ExcelErrorCode.Value);
      const vArr = toArrayValues(vArg);
      const wArr = toArrayValues(wArg);
      if (wArr.length === 0 || vArr.length === 0) return err(ExcelErrorCode.Value);
      const weights: number[] = [];
      for (const w of wArr) {
        const n = excelCoerceNumber(w);
        if (n.kind !== "number") return n;
        weights.push(n.value);
      }
      const values: number[] = [];
      for (const v of vArr) {
        const n = excelCoerceNumber(v);
        if (n.kind !== "number") return n;
        values.push(n.value);
      }
      if (weights.length !== values.length && weights.length !== 1) return err(ExcelErrorCode.Value);
      for (let j = 0; j < values.length; j++) {
        const w = weights.length === 1 ? weights[0]! : weights[j]!;
        total += values[j]! * w;
        weightSum += w;
      }
    }
    if (weightSum === 0) return err(ExcelErrorCode.Div0);
    return num(total / weightSum);
  }));

  add(fn("MARGINOFERROR", "none", (args) => {
    const flat = flattenArgs([args[0] ?? BLANK]);
    const numbers: number[] = [];
    for (const v of flat) {
      const n = excelCoerceNumber(v);
      if (n.kind !== "number") return n;
      numbers.push(n.value);
    }
    const confidenceArg = asNumber(args[1], 0.95);
    if (confidenceArg === null) return err(ExcelErrorCode.Value);
    if (numbers.length < 2) return err(ExcelErrorCode.Num);
    const mean = numbers.reduce((s, x) => s + x, 0) / numbers.length;
    const variance = numbers.reduce((s, x) => s + (x - mean) ** 2, 0) / (numbers.length - 1);
    const stddev = Math.sqrt(variance);
    const alpha = 1 - confidenceArg.value;
    const z = normalQuantile(1 - alpha / 2);
    return num(z * (stddev / Math.sqrt(numbers.length)));
  }));

  // Array
  add(fn("ARRAY_CONSTRAIN", "none", (args) => {
    const input = args[0];
    if (!input) return err(ExcelErrorCode.Value);
    let arr: ArrayValue;
    if (input.kind === "array") {
      arr = input;
    } else {
      arr = { kind: "array", width: 1, height: 1, values: [input] };
    }
    const rows = asNumber(args[1], Number.NaN);
    const cols = asNumber(args[2], Number.NaN);
    if (rows === null) return err(ExcelErrorCode.Value);
    if (cols === null) return err(ExcelErrorCode.Value);
    if (!Number.isFinite(rows.value) || !Number.isFinite(cols.value) || rows.value < 0 || cols.value < 0) {
      return err(ExcelErrorCode.Value);
    }
    const h = Math.floor(rows.value);
    const w = Math.floor(cols.value);
    const values: ExcelValue[] = [];
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (r < arr.height && c < arr.width) {
          values.push(arr.values[r * arr.width + c] ?? BLANK);
        } else {
          values.push(BLANK);
        }
      }
    }
    return { kind: "array", width: w, height: h, values } as ArrayValue;
  }));

  add(fn("FLATTEN", "none", (args) => {
    const values: ExcelValue[] = [];
    for (const a of args) {
      if (a.kind === "array") values.push(...a.values);
      else values.push(a);
    }
    return { kind: "array", width: 1, height: values.length, values } as ArrayValue;
  }));

  add(fn("SORTN", "none", (args) => {
    const input = args[0];
    if (!input) return err(ExcelErrorCode.Value);
    let arr: ArrayValue;
    if (input.kind === "array") {
      arr = input;
    } else {
      arr = { kind: "array", width: 1, height: 1, values: [input] };
    }
    const n = asNumber(args[1], 1);
    if (n === null) return err(ExcelErrorCode.Value);
    if (!Number.isFinite(n.value) || n.value <= 0) return err(ExcelErrorCode.Value);
    const displayMode = asNumber(args[2], 0);
    if (displayMode === null) return err(ExcelErrorCode.Value);

    const keys: { col: number; asc: boolean }[] = [];
    for (let i = 3; i < args.length; i += 2) {
      const colArg = args[i];
      const ascArg = args[i + 1];
      if (colArg === undefined) continue;
      const col = excelCoerceNumber(colArg);
      if (col.kind !== "number") return col;
      const colIdx = Math.floor(col.value) - 1;
      if (colIdx < 0 || colIdx >= arr.width) return err(ExcelErrorCode.Value);
      const asc = asBoolean(ascArg, true);
      if (!asc.ok) return asc.error;
      keys.push({ col: colIdx, asc: asc.value });
    }
    if (keys.length === 0) {
      for (let c = 0; c < arr.width; c++) keys.push({ col: c, asc: true });
    }

    const indices = Array.from({ length: arr.height }, (_, i) => i);
    indices.sort((a, b) => compareRows(arr, a, b, keys));

    const sortedRows = indices.map((r) => rowKey(arr, r));
    const result: ExcelValue[] = [];
    const limit = Math.floor(n.value);

    switch (displayMode.value) {
      case 0:
      default: {
        for (let i = 0; i < Math.min(limit, arr.height); i++) {
          for (let c = 0; c < arr.width; c++) result.push(arr.values[indices[i]! * arr.width + c] ?? BLANK);
        }
        break;
      }
      case 1: {
        let taken = 0;
        for (let i = 0; i < arr.height && taken < limit; i++) {
          for (let c = 0; c < arr.width; c++) result.push(arr.values[indices[i]! * arr.width + c] ?? BLANK);
          taken++;
        }
        // include additional rows identical to the nth row in sort order
        if (limit < arr.height) {
          const nthKey = sortedRows[limit - 1];
          for (let i = limit; i < arr.height; i++) {
            if (sortedRows[i] === nthKey) {
              for (let c = 0; c < arr.width; c++) result.push(arr.values[indices[i]! * arr.width + c] ?? BLANK);
            } else {
              break;
            }
          }
        }
        break;
      }
      case 2: {
        const seen = new Set<string>();
        for (let i = 0; i < arr.height && seen.size < limit; i++) {
          const k = sortedRows[i]!;
          if (!seen.has(k)) {
            seen.add(k);
            for (let c = 0; c < arr.width; c++) result.push(arr.values[indices[i]! * arr.width + c] ?? BLANK);
          }
        }
        break;
      }
      case 3: {
        const selectedKeys = new Set(sortedRows.slice(0, Math.min(limit, arr.height)));
        for (let i = 0; i < arr.height; i++) {
          if (selectedKeys.has(sortedRows[i]!)) {
            for (let c = 0; c < arr.width; c++) result.push(arr.values[indices[i]! * arr.width + c] ?? BLANK);
          }
        }
        break;
      }
    }

    const resultHeight = result.length / arr.width;
    return { kind: "array", width: arr.width, height: resultHeight, values: result } as ArrayValue;
  }));

  // Engineering: complex numbers
  add(fn("IMCOTH", "none", (args) => {
    const v = args[0];
    if (!v || v.kind === "blank" || v.kind === "omitted") return err(ExcelErrorCode.Value);
    if (v.kind === "error") return v;
    let z: { re: number; im: number } | null = null;
    if (v.kind === "number") z = { re: v.value, im: 0 };
    else if (v.kind === "string") z = parseComplex(v.value);
    if (!z) return err(ExcelErrorCode.Value);
    const coshZ = complexCosh(z.re, z.im);
    const sinhZ = complexSinh(z.re, z.im);
    const div = complexDivide(coshZ.re, coshZ.im, sinhZ.re, sinhZ.im);
    if (!div) return err(ExcelErrorCode.Div0);
    if (Math.abs(div.im) < 1e-12) return num(div.re);
    return str(complexToString(div.re, div.im));
  }));

  add(fn("IMLOG", "none", (args) => {
    const v = args[0];
    if (!v || v.kind === "blank" || v.kind === "omitted") return err(ExcelErrorCode.Value);
    if (v.kind === "error") return v;
    const base = asNumber(args[1], Math.E);
    if (base === null) return err(ExcelErrorCode.Value);
    if (!Number.isFinite(base.value) || base.value <= 0) return err(ExcelErrorCode.Num);

    let z: { re: number; im: number } | null = null;
    if (v.kind === "number") z = { re: v.value, im: 0 };
    else if (v.kind === "string") z = parseComplex(v.value);
    if (!z) return err(ExcelErrorCode.Value);

    const lnBase = Math.log(base.value);
    // Real positive number -> real logarithm
    if (z.im === 0 && z.re > 0) {
      return num(Math.log(z.re) / lnBase);
    }
    const lnz = complexLog(z.re, z.im);
    const re = lnz.re / lnBase;
    const im = lnz.im / lnBase;
    if (Math.abs(im) < 1e-12) return num(re);
    return str(complexToString(re, im));
  }));

  add(fn("IMTANH", "none", (args) => {
    const v = args[0];
    if (!v || v.kind === "blank" || v.kind === "omitted") return err(ExcelErrorCode.Value);
    if (v.kind === "error") return v;
    let z: { re: number; im: number } | null = null;
    if (v.kind === "number") z = { re: v.value, im: 0 };
    else if (v.kind === "string") z = parseComplex(v.value);
    if (!z) return err(ExcelErrorCode.Value);
    const sinhZ = complexSinh(z.re, z.im);
    const coshZ = complexCosh(z.re, z.im);
    const div = complexDivide(sinhZ.re, sinhZ.im, coshZ.re, coshZ.im);
    if (!div) return err(ExcelErrorCode.Div0);
    if (Math.abs(div.im) < 1e-12) return num(div.re);
    return str(complexToString(div.re, div.im));
  }));

  // Meta: sparkline rendering metadata
  add(fn("SPARKLINE", "none", (args) => {
    const dataArg = args[0];
    const data: number[] = [];
    if (dataArg && dataArg.kind === "array") {
      for (const v of dataArg.values) {
        if (v.kind === "blank" || v.kind === "omitted") continue;
        const n = excelCoerceNumber(v);
        if (n.kind === "number") data.push(n.value);
        else if (n.kind === "error") return n;
      }
    } else if (dataArg) {
      const n = excelCoerceNumber(dataArg);
      if (n.kind === "error") return n;
      if (n.kind === "number") data.push(n.value);
    }
    if (data.length === 0) return err(ExcelErrorCode.Value);

    const options: Record<string, unknown> = { charttype: "line" };
    const optArg = args[1];
    if (optArg && optArg.kind === "array") {
      const vals = optArg.values;
      for (let i = 0; i + 1 < vals.length; i += 2) {
        const k = vals[i]!;
        const v = vals[i + 1];
        if (k.kind === "string") {
          options[k.value] = toJsValue(v);
        }
      }
    } else if (optArg && optArg.kind === "string") {
      try {
        const parsed = JSON.parse(optArg.value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          Object.assign(options, parsed);
        }
      } catch {
        // ignore invalid JSON string options
      }
    }
    return sparkline(data, options);
  }));
}
