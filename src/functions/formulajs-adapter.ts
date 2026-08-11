/**
 * Fallback adapter to @formulajs/formulajs for functions not yet ported natively.
 * This is a compatibility shim: arguments/returns are translated to/from the
 * engine's ExcelValue model, and results are mapped to the closest Excel error.
 */
import * as formulas from "@formulajs/formulajs";
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
import type { ExcelFunction } from "../formula/functions-types.js";

const formulaLib = (formulas as unknown) as Record<string, any>;

const specialNameOverrides: Record<string, string> = {
  "ERF.PRECISE": "ERF",
  "ERFC.PRECISE": "ERFC",
  "FORECAST.LINEAR": "FORECAST",
  "ISO.CEILING": "CEILINGPRECISE",
};

const defaultChildForNamespace: Record<string, string> = {
  BETA: "DIST",
  BINOM: "DIST",
  CHISQ: "DIST",
  CONFIDENCE: "NORM",
  EXPON: "DIST",
  F: "DIST",
  GAMMA: "DIST",
  HYPGEOM: "DIST",
  LOGNORM: "DIST",
  NEGBINOM: "DIST",
  NORM: "DIST",
  PERCENTILE: "INC",
  PERCENTRANK: "INC",
  POISSON: "DIST",
  QUARTILE: "INC",
  RANK: "EQ",
  T: "DIST",
  STDEV: "S",
  VAR: "S",
  WEIBULL: "DIST",
  MODE: "SNGL",
};

function resolveByPath(path: string): unknown {
  const parts = path.toUpperCase().split(".");
  let cur: unknown = formulaLib;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function resolveFlat(name: string): unknown {
  return formulaLib[name.toUpperCase().replace(/\./g, "")];
}

function resolveFormulaJs(name: string): Function | undefined {
  const upper = name.toUpperCase();
  const overrideTarget = specialNameOverrides[upper];
  if (overrideTarget) {
    const fn = resolveByPath(overrideTarget) || resolveFlat(overrideTarget);
    if (typeof fn === "function") return fn;
  }

  let candidate = resolveByPath(upper);
  if (typeof candidate === "function") return candidate;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const parts = upper.split(".");
    const ns = parts[parts.length - 1]!;
    const child = defaultChildForNamespace[ns];
    if (child && typeof (candidate as Record<string, unknown>)[child] === "function") {
      return (candidate as Record<string, (...args: any[]) => any>)[child];
    }
  }

  candidate = resolveFlat(upper);
  if (typeof candidate === "function") return candidate;
  return undefined;
}

function isExcelValue(x: unknown): x is ExcelValue {
  return x !== null && typeof x === "object" && "kind" in x;
}

function excelToJs(value: ExcelValue): unknown {
  if (value.kind === "error") return value;
  if (value.kind === "number") return value.value;
  if (value.kind === "string") return value.value;
  if (value.kind === "boolean") return value.value;
  if (value.kind === "blank") return undefined;
  if (value.kind === "array") {
    const { width, height, values } = value;
    const rows: unknown[][] = [];
    for (let r = 0; r < height; r++) {
      const row: unknown[] = [];
      for (let c = 0; c < width; c++) {
        const v = values[r * width + c];
        const js = excelToJs(v ?? BLANK);
        if (isExcelValue(js)) return js;
        row.push(js);
      }
      rows.push(row);
    }
    return rows;
  }
  return undefined;
}

function jsToExcel(value: unknown): ExcelValue {
  if (value instanceof Error) {
    const msg = value.message;
    const code = Object.values(ExcelErrorCode).find((c) => msg === c);
    return err(code ?? ExcelErrorCode.Value);
  }
  if (value === null || value === undefined) return BLANK;
  if (typeof value === "number") {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return err(ExcelErrorCode.Num);
    }
    return num(value);
  }
  if (typeof value === "string") return str(value);
  if (typeof value === "boolean") return bool(value);
  if (Array.isArray(value)) {
    const rows = value as unknown[];
    if (rows.length === 0) return BLANK;
    const isMatrix = rows.every((row) => Array.isArray(row));
    if (isMatrix) {
      const height = rows.length;
      const width = Math.max(0, ...rows.map((row) => (row as unknown[]).length));
      const values: ExcelValue[] = [];
      for (let r = 0; r < height; r++) {
        const row = rows[r] as unknown[];
        for (let c = 0; c < width; c++) {
          values.push(jsToExcel(row[c]));
        }
      }
      return { kind: "array", width, height, values } as ArrayValue;
    }
    // 1-D vector
    return {
      kind: "array",
      width: rows.length,
      height: 1,
      values: rows.map((v) => jsToExcel(v)),
    } as ArrayValue;
  }
  return err(ExcelErrorCode.Value);
}

export function formulaJsFallback(name: string): ExcelFunction | undefined {
  const impl = resolveFormulaJs(name);
  if (typeof impl !== "function") return undefined;

  return {
    name,
    volatility: "none",
    evaluate(args: ExcelValue[]) {
      const jsArgs: unknown[] = [];
      for (const arg of args) {
        const js = excelToJs(arg);
        if (isExcelValue(js)) return js;
        jsArgs.push(js);
      }
      let result: unknown;
      try {
        result = impl(...jsArgs);
      } catch {
        return err(ExcelErrorCode.Value);
      }
      return jsToExcel(result);
    },
  };
}
