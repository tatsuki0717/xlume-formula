/**
 * Native implementations for engineering worksheet functions.
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

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

const MAX_PLACES = 10;
const BITMASK = (1n << 48n) - 1n;

// ------------------------------------------------------------------
// Base conversion helpers
// ------------------------------------------------------------------

const DIGITS = "0123456789ABCDEF";

function base2dec(input: string, base: number): bigint {
  const upper = input.trim().toUpperCase();
  if (upper.length === 0) throw new Error("empty");
  if (upper.length > MAX_PLACES) return errValue();
  let value = 0n;
  for (const ch of upper) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return errValue();
    value = value * BigInt(base) + BigInt(d);
  }
  const mod = BigInt(base) ** BigInt(MAX_PLACES);
  const half = mod / 2n;
  if (value >= half) value -= mod;
  return value;
}

function dec2base(value: bigint, base: number, places?: number): string {
  if (places !== undefined) {
    const p = Math.round(places);
    if (p < 0 || p > MAX_PLACES) return errValue() as unknown as string;
    const mod = BigInt(base) ** BigInt(p);
    const half = mod / 2n;
    let v = value;
    if (v < 0n) {
      if (-v > half) return errValue() as unknown as string;
      v = mod + v;
    } else {
      if (v >= mod) return errValue() as unknown as string;
    }
    return v.toString(base).toUpperCase().padStart(p, "0");
  }
  if (value < 0n) {
    const mod = BigInt(base) ** BigInt(MAX_PLACES);
    const half = mod / 2n;
    if (-value > half) return errValue() as unknown as string;
    value = mod + value;
    return value.toString(base).toUpperCase().padStart(MAX_PLACES, "0");
  }
  if (value >= BigInt(base) ** BigInt(MAX_PLACES)) return errValue() as unknown as string;
  return value.toString(base).toUpperCase();
}

function errValue(): never {
  throw new Error("num");
}

function parseBigInt(arg: ExcelValue): bigint | null {
  const n = excelCoerceNumber(arg);
  if (n.kind !== "number") return null;
  const v = Math.trunc(n.value);
  return BigInt(v);
}

function parsePlaces(arg: ExcelValue | undefined): number | undefined {
  if (!arg || arg.kind === "blank" || arg.kind === "omitted") return undefined;
  const n = excelCoerceNumber(arg);
  if (n.kind !== "number") return NaN;
  return Math.round(n.value);
}

// ------------------------------------------------------------------
// Complex number helpers
// ------------------------------------------------------------------

interface Complex {
  re: number;
  im: number;
  suffix: string;
}

function parseComplex(inumber: string): Complex | null {
  const s = inumber.trim();
  if (s === "" || s === "0" || s === "0i" || s === "0j") return { re: 0, im: 0, suffix: "i" };
  const suffix = s.endsWith("j") ? "j" : "i";
  // Replace standalone i/j with 1i
  let work = s.replace(/\b([+-]?)([ij])\b/g, "$11$2").replace(/([ij])$/, "");
  // If only i/j marker remains at end, remove it
  if (work.endsWith("i") || work.endsWith("j")) work = work.slice(0, -1);
  // handle pure real or pure imaginary
  if (work === "") return { re: 0, im: 1 * (s.startsWith("-") ? -1 : 1), suffix };
  const parts = work.match(/^([+-]?\d*\.?\d+)?([+-]?\d*\.?\d+)?$/);
  if (!parts) return null;
  let re = 0;
  let im = 0;
  const a = parts[1];
  const b = parts[2];
  if (a !== undefined && a !== "" && a !== "+" && a !== "-") re = Number(a);
  if (b !== undefined && b !== "" && b !== "+" && b !== "-") im = Number(b);
  // If we only parsed one number, assume it is the real part unless input ended with suffix
  if (parts[2] === undefined || parts[2] === "") {
    if (s.endsWith("i") || s.endsWith("j")) {
      // it was pure imaginary; the parsed real is actually imaginary
      im = re;
      re = 0;
    }
  }
  return { re, im, suffix };
}

function complexToString(c: Complex): string {
  const s = c.suffix || "i";
  if (Math.abs(c.im) < Number.EPSILON) return String(c.re);
  if (Math.abs(c.re) < Number.EPSILON) {
    if (Math.abs(Math.abs(c.im) - 1) < Number.EPSILON) return (c.im < 0 ? "-" : "") + s;
    return String(c.im) + s;
  }
  const sign = c.im < 0 ? "-" : "+";
  const imag = Math.abs(c.im);
  const imagStr = Math.abs(Math.abs(imag) - 1) < Number.EPSILON ? s : String(imag) + s;
  return `${c.re}${sign}${imagStr}`;
}

function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im, suffix: a.suffix };
}

function complexSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im, suffix: a.suffix };
}

function complexMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re, suffix: a.suffix };
}

function complexDiv(a: Complex, b: Complex): Complex | null {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return null;
  return { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom, suffix: a.suffix };
}

function complexExp(c: Complex): Complex {
  const e = Math.exp(c.re);
  return { re: e * Math.cos(c.im), im: e * Math.sin(c.im), suffix: c.suffix };
}

function complexLog(c: Complex): Complex {
  const r = Math.hypot(c.re, c.im);
  if (r === 0) return { re: -Infinity, im: 0, suffix: c.suffix };
  return { re: Math.log(r), im: Math.atan2(c.im, c.re), suffix: c.suffix };
}

function complexSqrt(c: Complex): Complex {
  const r = Math.hypot(c.re, c.im);
  const theta = Math.atan2(c.im, c.re) / 2;
  const s = Math.sqrt(r);
  return { re: s * Math.cos(theta), im: s * Math.sin(theta), suffix: c.suffix };
}

function complexPow(c: Complex, n: number): Complex {
  if (n === 0) return { re: 1, im: 0, suffix: c.suffix };
  if (n === 1) return { re: c.re, im: c.im, suffix: c.suffix };
  const r = Math.hypot(c.re, c.im);
  const theta = Math.atan2(c.im, c.re);
  const rn = r ** n;
  return { re: rn * Math.cos(n * theta), im: rn * Math.sin(n * theta), suffix: c.suffix };
}

function parseComplexArg(arg: ExcelValue): Complex | null {
  const s = excelCoerceString(arg);
  if (s.kind !== "string") return null;
  return parseComplex(s.value);
}

function toComplexResult(c: Complex | null): ExcelValue {
  if (!c) return err(ExcelErrorCode.Num);
  return str(complexToString(c));
}

// ------------------------------------------------------------------
// ERF approximation
// ------------------------------------------------------------------

function erfApprox(x: number): number {
  if (x < 0) return -erfApprox(-x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = Math.sign(x);
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-(x * x));
  return sign * y;
}

// ------------------------------------------------------------------
// CONVERT helpers (common units)
// ------------------------------------------------------------------

interface UnitSpec {
  factor: number;
  offset?: number; // for temperature
  power?: number; // 2 for square, 3 for cubic
}

const CONVERT_UNITS: Record<string, UnitSpec> = {
  // length (base: m)
  m: { factor: 1 }, mi: { factor: 1609.344 }, Nmi: { factor: 1852 }, in: { factor: 0.0254 }, ft: { factor: 0.3048 }, yd: { factor: 0.9144 }, ang: { factor: 1e-10 }, ell: { factor: 1.143 }, ly: { factor: 9.46073e15 }, parsec: { factor: 3.085678e16 }, pc: { factor: 3.085678e16 },
  // weight (base: g)
  g: { factor: 1 }, sg: { factor: 14593.9 }, lbm: { factor: 453.59237 }, u: { factor: 1.66054e-24 }, ozm: { factor: 28.34952 }, grain: { factor: 0.06479891 }, cwt: { factor: 50802.3 }, shweight: { factor: 50802.3 }, uk_cwt: { factor: 50802.3 }, stone: { factor: 6350.29 }, ton: { factor: 907184.74 }, LTON: { factor: 1016046.91 }, U: { factor: 1.66054e-24 }, brton: { factor: 1016046.91 },
  // time (base: s)
  yr: { factor: 31557600 }, day: { factor: 86400 }, hr: { factor: 3600 }, mn: { factor: 60 }, sec: { factor: 1 }, s: { factor: 1 },
  // pressure (base: Pa)
  Pa: { factor: 1 }, mmHg: { factor: 133.322 }, psi: { factor: 6894.76 }, atm: { factor: 101325 }, Torr: { factor: 133.322 },
  // force (base: N)
  N: { factor: 1 }, dyn: { factor: 1e-5 }, lbf: { factor: 4.44822 }, pond: { factor: 0.00980665 },
  // energy (base: J)
  J: { factor: 1 }, e: { factor: 1e-7 }, c: { factor: 4.184 }, cal: { factor: 4.184 }, eV: { factor: 1.60218e-19 }, HPh: { factor: 2.68452e6 }, Wh: { factor: 3600 }, w: { factor: 1 }, flb: { factor: 1.35582 }, BTU: { factor: 1055.06 },
  // power (base: W)
  W: { factor: 1 }, HP: { factor: 745.7 }, PS: { factor: 735.499 },
  // magnetism (base: T)
  T: { factor: 1 }, ga: { factor: 1e-4 },
  // area (base: m^2)
  m2: { factor: 1, power: 2 }, mi2: { factor: 1609.344, power: 2 }, Nmi2: { factor: 1852, power: 2 }, in2: { factor: 0.0254, power: 2 }, ft2: { factor: 0.3048, power: 2 }, yd2: { factor: 0.9144, power: 2 }, ang2: { factor: 1e-10, power: 2 }, acre: { factor: 4046.86 }, ha: { factor: 10000 },
  // volume (base: l)
  tsp: { factor: 0.00492892 }, tbs: { factor: 0.0147868 }, oz: { factor: 0.0295735 }, cup: { factor: 0.236588 }, pt: { factor: 0.473176 }, qt: { factor: 0.946353 }, gal: { factor: 3.78541 }, l: { factor: 1 }, L: { factor: 1 }, lt: { factor: 1 },
  // information (base: bit)
  bit: { factor: 1 }, byte: { factor: 8 },
  // speed (base: m/s)
  kn: { factor: 0.514444 }, mph: { factor: 0.44704 }, "m/s": { factor: 1 }, "m/h": { factor: 1 / 3600 },
};

const TEMPERATURE_UNITS = new Set(["C", "F", "K", "Rank", "Reau"]);

function convertTemperature(value: number, from: string, to: string): number | null {
  let c: number;
  switch (from) {
    case "C": c = value; break;
    case "F": c = (value - 32) * 5 / 9; break;
    case "K": c = value - 273.15; break;
    case "Rank": c = (value - 491.67) * 5 / 9; break;
    case "Reau": c = value * 5 / 4; break;
    default: return null;
  }
  switch (to) {
    case "C": return c;
    case "F": return c * 9 / 5 + 32;
    case "K": return c + 273.15;
    case "Rank": return (c + 273.15) * 9 / 5;
    case "Reau": return c * 4 / 5;
    default: return null;
  }
}

function unitFactor(unit: string): { factor: number; power: number } | null {
  // area / volume derived by trailing 2/3 on base unit
  if (unit.endsWith("2")) {
    const base = unit.slice(0, -1);
    const spec = CONVERT_UNITS[base + "2"];
    if (spec?.factor && spec.power === 2) return { factor: spec.factor, power: 2 };
    const baseSpec = CONVERT_UNITS[base];
    if (baseSpec) return { factor: baseSpec.factor, power: 2 };
    return null;
  }
  if (unit.endsWith("3")) {
    const base = unit.slice(0, -1);
    const baseSpec = CONVERT_UNITS[base];
    if (baseSpec) return { factor: baseSpec.factor, power: 3 };
    return null;
  }
  const spec = CONVERT_UNITS[unit];
  if (!spec) return null;
  return { factor: spec.factor, power: spec.power ?? 1 };
}

// ------------------------------------------------------------------
// Registration
// ------------------------------------------------------------------

export function registerEngineeringFunctions(add: (f: ExcelFunction) => void): void {
  // Base conversions
  add(fn("BIN2DEC", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    if (s.kind !== "string") return s;
    try { return num(Number(base2dec(s.value, 2))); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("BIN2HEX", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (s.kind !== "string") return s;
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(base2dec(s.value, 2), 16, places)); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("BIN2OCT", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (s.kind !== "string") return s;
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(base2dec(s.value, 2), 8, places)); } catch { return err(ExcelErrorCode.Num); }
  }));

  add(fn("DEC2BIN", "none", (args) => {
    const v = parseBigInt(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (v === null) return err(ExcelErrorCode.Value);
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(v, 2, places)); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("DEC2HEX", "none", (args) => {
    const v = parseBigInt(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (v === null) return err(ExcelErrorCode.Value);
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(v, 16, places)); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("DEC2OCT", "none", (args) => {
    const v = parseBigInt(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (v === null) return err(ExcelErrorCode.Value);
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(v, 8, places)); } catch { return err(ExcelErrorCode.Num); }
  }));

  add(fn("HEX2BIN", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (s.kind !== "string") return s;
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(base2dec(s.value, 16), 2, places)); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("HEX2DEC", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    if (s.kind !== "string") return s;
    try { return num(Number(base2dec(s.value, 16))); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("HEX2OCT", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (s.kind !== "string") return s;
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(base2dec(s.value, 16), 8, places)); } catch { return err(ExcelErrorCode.Num); }
  }));

  add(fn("OCT2BIN", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (s.kind !== "string") return s;
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(base2dec(s.value, 8), 2, places)); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("OCT2DEC", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    if (s.kind !== "string") return s;
    try { return num(Number(base2dec(s.value, 8))); } catch { return err(ExcelErrorCode.Num); }
  }));
  add(fn("OCT2HEX", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    const places = parsePlaces(args[1]);
    if (s.kind !== "string") return s;
    if (places !== undefined && Number.isNaN(places)) return err(ExcelErrorCode.Value);
    try { return str(dec2base(base2dec(s.value, 8), 16, places)); } catch { return err(ExcelErrorCode.Num); }
  }));

  // Bitwise
  add(fn("BITAND", "none", (args) => {
    const a = parseBigInt(args[0] ?? BLANK);
    const b = parseBigInt(args[1] ?? BLANK);
    if (a === null || b === null) return err(ExcelErrorCode.Value);
    if (a < 0n || b < 0n) return err(ExcelErrorCode.Num);
    return num(Number(BigInt.asUintN(48, a & b)));
  }));
  add(fn("BITOR", "none", (args) => {
    const a = parseBigInt(args[0] ?? BLANK);
    const b = parseBigInt(args[1] ?? BLANK);
    if (a === null || b === null) return err(ExcelErrorCode.Value);
    if (a < 0n || b < 0n) return err(ExcelErrorCode.Num);
    return num(Number(BigInt.asUintN(48, a | b)));
  }));
  add(fn("BITXOR", "none", (args) => {
    const a = parseBigInt(args[0] ?? BLANK);
    const b = parseBigInt(args[1] ?? BLANK);
    if (a === null || b === null) return err(ExcelErrorCode.Value);
    if (a < 0n || b < 0n) return err(ExcelErrorCode.Num);
    return num(Number(BigInt.asUintN(48, a ^ b)));
  }));
  add(fn("BITLSHIFT", "none", (args) => {
    const a = parseBigInt(args[0] ?? BLANK);
    const n = parseBigInt(args[1] ?? BLANK);
    if (a === null || n === null) return err(ExcelErrorCode.Value);
    if (a < 0n) return err(ExcelErrorCode.Num);
    let shift = Number(n);
    if (shift < -53 || shift > 53) return err(ExcelErrorCode.Num);
    let result: bigint;
    if (shift >= 0) result = a << BigInt(shift);
    else result = a >> BigInt(-shift);
    return num(Number(BigInt.asUintN(48, result)));
  }));
  add(fn("BITRSHIFT", "none", (args) => {
    const a = parseBigInt(args[0] ?? BLANK);
    const n = parseBigInt(args[1] ?? BLANK);
    if (a === null || n === null) return err(ExcelErrorCode.Value);
    if (a < 0n) return err(ExcelErrorCode.Num);
    let shift = Number(n);
    if (shift < -53 || shift > 53) return err(ExcelErrorCode.Num);
    let result: bigint;
    if (shift >= 0) result = a >> BigInt(shift);
    else result = a << BigInt(-shift);
    return num(Number(BigInt.asUintN(48, result)));
  }));

  // ERF / ERFC
  add(fn("ERF", "none", (args) => {
    const lower = excelCoerceNumber(args[0] ?? BLANK);
    if (lower.kind !== "number") return lower;
    if (args[1] === undefined) return num(erfApprox(lower.value));
    const upper = excelCoerceNumber(args[1]);
    if (upper.kind !== "number") return upper;
    return num(erfApprox(upper.value) - erfApprox(lower.value));
  }));
  add(fn("ERF.PRECISE", "none", (args) => {
    const x = excelCoerceNumber(args[0] ?? BLANK);
    return x.kind === "number" ? num(erfApprox(x.value)) : x;
  }));
  add(fn("ERFC", "none", (args) => {
    const x = excelCoerceNumber(args[0] ?? BLANK);
    return x.kind === "number" ? num(1 - erfApprox(x.value)) : x;
  }));
  add(fn("ERFC.PRECISE", "none", (args) => {
    const x = excelCoerceNumber(args[0] ?? BLANK);
    return x.kind === "number" ? num(1 - erfApprox(x.value)) : x;
  }));

  // Delta / step
  add(fn("DELTA", "none", (args) => {
    const a = excelCoerceNumber(args[0] ?? BLANK);
    const b = excelCoerceNumber(args[1] ?? BLANK);
    if (a.kind !== "number" || b.kind !== "number") return err(ExcelErrorCode.Value);
    return num(a.value === b.value ? 1 : 0);
  }));
  add(fn("GESTEP", "none", (args) => {
    const a = excelCoerceNumber(args[0] ?? BLANK);
    const step = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(0);
    if (a.kind !== "number" || step.kind !== "number") return err(ExcelErrorCode.Value);
    return num(a.value >= step.value ? 1 : 0);
  }));

  // Complex
  add(fn("COMPLEX", "none", (args) => {
    const real = excelCoerceNumber(args[0] ?? BLANK);
    const imag = excelCoerceNumber(args[1] ?? BLANK);
    const suffix = args[2] !== undefined ? excelCoerceString(args[2]) : str("i");
    if (real.kind !== "number" || imag.kind !== "number" || suffix.kind !== "string") return err(ExcelErrorCode.Value);
    const s = suffix.value === "j" ? "j" : "i";
    return str(complexToString({ re: real.value, im: imag.value, suffix: s }));
  }));

  add(fn("IMREAL", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return c ? num(c.re) : err(ExcelErrorCode.Num);
  }));
  add(fn("IMAGINARY", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return c ? num(c.im) : err(ExcelErrorCode.Num);
  }));
  add(fn("IMABS", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return c ? num(Math.hypot(c.re, c.im)) : err(ExcelErrorCode.Num);
  }));
  add(fn("IMARGUMENT", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return c ? num(Math.atan2(c.im, c.re)) : err(ExcelErrorCode.Num);
  }));
  add(fn("IMCONJUGATE", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return c ? str(complexToString({ re: c.re, im: -c.im, suffix: c.suffix })) : err(ExcelErrorCode.Num);
  }));
  add(fn("IMEXP", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return toComplexResult(c ? complexExp(c) : null);
  }));
  add(fn("IMLN", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return toComplexResult(c ? complexLog(c) : null);
  }));
  add(fn("IMLOG10", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    if (!c) return err(ExcelErrorCode.Num);
    const log = complexLog(c);
    const ln10 = Math.log(10);
    return str(complexToString({ re: log.re / ln10, im: log.im / ln10, suffix: c.suffix }));
  }));
  add(fn("IMLOG2", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    if (!c) return err(ExcelErrorCode.Num);
    const log = complexLog(c);
    const ln2 = Math.log(2);
    return str(complexToString({ re: log.re / ln2, im: log.im / ln2, suffix: c.suffix }));
  }));
  add(fn("IMSQRT", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    return toComplexResult(c ? complexSqrt(c) : null);
  }));
  add(fn("IMPOWER", "none", (args) => {
    const c = parseComplexArg(args[0] ?? BLANK);
    const n = excelCoerceNumber(args[1] ?? BLANK);
    if (!c || n.kind !== "number") return err(ExcelErrorCode.Value);
    return toComplexResult(complexPow(c, n.value));
  }));
  add(fn("IMSUB", "none", (args) => {
    const a = parseComplexArg(args[0] ?? BLANK);
    const b = parseComplexArg(args[1] ?? BLANK);
    return toComplexResult(a && b ? complexSub(a, b) : null);
  }));
  add(fn("IMDIV", "none", (args) => {
    const a = parseComplexArg(args[0] ?? BLANK);
    const b = parseComplexArg(args[1] ?? BLANK);
    return toComplexResult(a && b ? complexDiv(a, b) : null);
  }));

  // SUM / PRODUCT over complex numbers (Excel accepts up to 255 args)
  add(fn("IMSUM", "none", (args) => {
    let re = 0, im = 0, suffix = "i";
    for (const arg of args) {
      const c = parseComplexArg(arg);
      if (!c) return err(ExcelErrorCode.Value);
      re += c.re; im += c.im; suffix = c.suffix;
    }
    return str(complexToString({ re, im, suffix }));
  }));
  add(fn("IMPRODUCT", "none", (args) => {
    if (args.length === 0) return err(ExcelErrorCode.Value);
    const first = parseComplexArg(args[0]!);
    if (!first) return err(ExcelErrorCode.Value);
    let result = { re: first.re, im: first.im, suffix: first.suffix };
    for (let i = 1; i < args.length; i++) {
      const c = parseComplexArg(args[i]!);
      if (!c) return err(ExcelErrorCode.Value);
      result = complexMul(result, c);
    }
    return str(complexToString(result));
  }));

  // Unit conversion
  add(fn("CONVERT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const from = excelCoerceString(args[1] ?? BLANK);
    const to = excelCoerceString(args[2] ?? BLANK);
    if (n.kind !== "number" || from.kind !== "string" || to.kind !== "string") return err(ExcelErrorCode.Value);
    const fu = from.value.trim();
    const tu = to.value.trim();
    if (TEMPERATURE_UNITS.has(fu) && TEMPERATURE_UNITS.has(tu)) {
      const r = convertTemperature(n.value, fu, tu);
      return r === null ? err(ExcelErrorCode.NA) : num(r);
    }
    const f = unitFactor(fu);
    const t = unitFactor(tu);
    if (!f || !t || f.power !== t.power) return err(ExcelErrorCode.NA);
    const base = n.value * f.factor ** f.power;
    const result = base / (t.factor ** t.power);
    return num(result);
  }));
}
