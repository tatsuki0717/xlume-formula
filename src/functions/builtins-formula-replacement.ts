/**
 * Native replacements for functions that previously fell back to formula.js.
 *
 * This module is intentionally additive: each function added here removes one
 * formula.js dependency. The goal is to eventually eliminate the fallback
 * adapter entirely.
 */
import {
  BLANK,
  bool,
  err,
  ExcelErrorCode,
  num,
  str,
  type ArrayValue,
  type ExcelValue,
} from "../model/value.js";
import { excelCoerceBoolean, excelCoerceNumber, excelCoerceString } from "../formula/coercion.js";
import type { ExcelFunction } from "../formula/functions-types.js";

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

function formatNumberWithCommas(n: number, decimals: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const f = 10 ** decimals;
  const rounded = Math.round(abs * f) / f;
  const [intPart, fracPart] = rounded.toFixed(decimals).split(".") as [string, string | undefined];
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + withCommas + (fracPart !== undefined && decimals > 0 ? "." + fracPart : "");
}

function numberToWords(n: number, decimals: number, commas: boolean): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const f = 10 ** decimals;
  const rounded = Math.round(abs * f) / f;
  const fixed = rounded.toFixed(decimals);
  if (commas) {
    const [intPart, frac] = fixed.split(".") as [string, string | undefined];
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + withCommas + (frac !== undefined && decimals > 0 ? "." + frac : "");
  }
  return sign + fixed;
}

function toArrayValues(arg: ExcelValue): ExcelValue[] {
  if (arg.kind === "array") return [...arg.values];
  return [arg];
}

export function registerFormulaReplacementFunctions(add: (f: ExcelFunction) => void): void {
  // Text
  add(fn("DOLLAR", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const d = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(2);
    if (n.kind !== "number" || d.kind !== "number") return n.kind !== "number" ? n : d;
    const formatted = "$" + formatNumberWithCommas(n.value, d.value);
    return str(formatted);
  }));

  add(fn("FIXED", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const d = args[1] !== undefined ? excelCoerceNumber(args[1]) : num(2);
    const noCommas = args[2] !== undefined ? excelCoerceBoolean(args[2]) : bool(false);
    if (n.kind !== "number" || d.kind !== "number") return n.kind !== "number" ? n : d;
    if (noCommas.kind !== "boolean") return noCommas;
    return str(numberToWords(n.value, d.value, !noCommas.value));
  }));

  add(fn("PROPER", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    if (s.kind !== "string") return s;
    return str(s.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()));
  }));

  add(fn("UNICHAR", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    try {
      return str(String.fromCodePoint(Math.round(n.value)));
    } catch {
      return err(ExcelErrorCode.Value);
    }
  }));

  add(fn("UNICODE", "none", (args) => {
    const s = excelCoerceString(args[0] ?? BLANK);
    if (s.kind !== "string") return s;
    if (s.value.length === 0) return err(ExcelErrorCode.Value);
    const cp = s.value.codePointAt(0);
    return cp === undefined ? err(ExcelErrorCode.Value) : num(cp);
  }));

  // Lookup
  add(fn("HSTACK", "none", (args) => {
    const arrays = args.filter((a) => a.kind === "array") as ArrayValue[];
    if (arrays.length === 0) return err(ExcelErrorCode.Value);
    const height = Math.max(...arrays.map((a) => a.height));
    const width = arrays.reduce((s, a) => s + a.width, 0);
    const values: ExcelValue[] = [];
    for (let r = 0; r < height; r++) {
      for (const arr of arrays) {
        for (let c = 0; c < arr.width; c++) {
          if (r < arr.height) values.push(arr.values[r * arr.width + c] ?? BLANK);
          else values.push(err(ExcelErrorCode.NA));
        }
      }
    }
    return { kind: "array", width, height, values } as ArrayValue;
  }));

  add(fn("VSTACK", "none", (args) => {
    const arrays = args.filter((a) => a.kind === "array") as ArrayValue[];
    if (arrays.length === 0) return err(ExcelErrorCode.Value);
    const width = Math.max(...arrays.map((a) => a.width));
    const height = arrays.reduce((s, a) => s + a.height, 0);
    const values: ExcelValue[] = [];
    for (const arr of arrays) {
      for (let r = 0; r < arr.height; r++) {
        for (let c = 0; c < width; c++) {
          if (c < arr.width) values.push(arr.values[r * arr.width + c] ?? BLANK);
          else values.push(err(ExcelErrorCode.NA));
        }
      }
    }
    return { kind: "array", width, height, values } as ArrayValue;
  }));

  add(fn("LOOKUP", "none", (args) => {
    const lookupVal = excelCoerceNumber(args[0] ?? BLANK);
    const vector = args[1];
    if (lookupVal.kind !== "number") return lookupVal;
    if (!vector) return err(ExcelErrorCode.Value);
    let lookupArray: ExcelValue[] = [];
    let resultArray: ExcelValue[] = [];
    if (vector.kind === "array") {
      if (args.length === 2) {
        // array form: return value from last row/column
        if (vector.width === 1) {
          lookupArray = [];
          for (let r = 0; r < vector.height; r++) lookupArray.push(vector.values[r * vector.width] ?? BLANK);
          resultArray = lookupArray;
        } else if (vector.height === 1) {
          lookupArray = [...vector.values];
          resultArray = lookupArray;
        } else {
          // table form: find in first column, return last column
          for (let r = 0; r < vector.height; r++) lookupArray.push(vector.values[r * vector.width] ?? BLANK);
          for (let r = 0; r < vector.height; r++) resultArray.push(vector.values[r * vector.width + (vector.width - 1)] ?? BLANK);
        }
      } else {
        const result = args[2]!;
        if (result.kind === "array") {
          lookupArray = vector.values;
          resultArray = result.values;
        } else {
          return err(ExcelErrorCode.Value);
        }
      }
    } else {
      return err(ExcelErrorCode.Value);
    }
    // Approximate match: largest value <= lookup_value
    const nums = lookupArray.map((v) => {
      const n = excelCoerceNumber(v);
      return n.kind === "number" ? n.value : -Infinity;
    });
    const value = lookupVal.value;
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < nums.length; i++) {
      if (nums[i]! <= value && nums[i]! > bestVal) {
        bestVal = nums[i]!;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return err(ExcelErrorCode.NA);
    return resultArray[bestIdx] ?? BLANK;
  }));
}
