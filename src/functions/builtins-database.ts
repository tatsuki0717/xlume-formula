/**
 * Native implementations for Excel database functions.
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

function arrayValues(arr: ExcelValue): ExcelValue[] {
  return arr.kind === "array" ? [...arr.values] : [arr];
}

function fieldIndex(database: ArrayValue, field: ExcelValue): number {
  if (field.kind === "number") {
    const idx = Math.round(field.value) - 1;
    if (idx >= 0 && idx < database.width) return idx;
    return -1;
  }
  const s = excelCoerceString(field);
  if (s.kind !== "string") return -1;
  const header = s.value.trim().toLowerCase();
  for (let c = 0; c < database.width; c++) {
    const cell = database.values[c] ?? BLANK;
    const hs = excelCoerceString(cell);
    if (hs.kind === "string" && hs.value.trim().toLowerCase() === header) return c;
  }
  return -1;
}

function rowMatches(row: ExcelValue[], headers: string[], criteria: ArrayValue): boolean {
  const cHeight = criteria.height;
  const cWidth = criteria.width;
  if (cHeight <= 1 || cWidth === 0) return true;
  // build header index map for criteria
  const critHeaders: string[] = [];
  for (let c = 0; c < cWidth; c++) {
    const cell = criteria.values[c] ?? BLANK;
    const hs = excelCoerceString(cell);
    critHeaders.push(hs.kind === "string" ? hs.value.trim().toLowerCase() : "");
  }
  // each data row must match at least one criteria row
  for (let r = 1; r < cHeight; r++) {
    let matchesRow = true;
    for (let cc = 0; cc < cWidth; cc++) {
      const critHeader = critHeaders[cc];
      if (!critHeader) continue;
      const colIdx = headers.indexOf(critHeader);
      if (colIdx < 0 || colIdx >= row.length) continue;
      const critCell = criteria.values[r * cWidth + cc] ?? BLANK;
      if (critCell.kind === "blank" || critCell.kind === "omitted") continue;
      if (!valueMatchesCriteria(row[colIdx]!, critCell)) {
        matchesRow = false;
        break;
      }
    }
    if (matchesRow) return true;
  }
  return false;
}

function valueMatchesCriteria(cell: ExcelValue, criteria: ExcelValue): boolean {
  const cs = excelCoerceString(criteria);
  if (cs.kind !== "string") {
    const cn = excelCoerceNumber(criteria);
    const celln = excelCoerceNumber(cell);
    if (cn.kind === "number" && celln.kind === "number") return celln.value === cn.value;
    return false;
  }
  const s = cs.value;
  // comparison operator
  const opMatch = /^([<>]=?|<>|=)(.*)$/.exec(s);
  if (opMatch) {
    const op = opMatch[1]!;
    const raw = opMatch[2]!;
    const target = /^-?\d+(\.\d+)?$/.test(raw) ? num(Number(raw)) : str(raw);
    return compare(cell, target, op);
  }
  // wildcard
  if (s.includes("*") || s.includes("?")) {
    const cellStr = cell.kind === "string" ? cell.value : cell.kind === "number" ? String(cell.value) : "";
    const pattern = "^" + s.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
    return new RegExp(pattern, "i").test(cellStr);
  }
  const cellStr = cell.kind === "string" ? cell.value : cell.kind === "number" ? String(cell.value) : "";
  return cellStr.toLowerCase() === s.toLowerCase();
}

function compare(cell: ExcelValue, target: ExcelValue, op: string): boolean {
  const a = excelCoerceNumber(cell);
  const b = excelCoerceNumber(target);
  if (a.kind !== "number" || b.kind !== "number") {
    const as = excelCoerceString(cell);
    const bs = excelCoerceString(target);
    if (as.kind !== "string" || bs.kind !== "string") return false;
    const av = as.value.toLowerCase();
    const bv = bs.value.toLowerCase();
    switch (op) {
      case "=": return av === bv;
      case "<>": return av !== bv;
      case "<": return av < bv;
      case ">": return av > bv;
      case "<=": return av <= bv;
      case ">=": return av >= bv;
    }
    return false;
  }
  switch (op) {
    case "=": return a.value === b.value;
    case "<>": return a.value !== b.value;
    case "<": return a.value < b.value;
    case ">": return a.value > b.value;
    case "<=": return a.value <= b.value;
    case ">=": return a.value >= b.value;
  }
  return false;
}

function aggregateDatabase(
  database: ArrayValue,
  fieldIdx: number,
  criteria: ArrayValue,
  aggregate: "sum" | "count" | "counta" | "max" | "min" | "product" | "avg" | "stdev" | "stdevp" | "var" | "varp",
): ExcelValue {
  const headers: string[] = [];
  for (let c = 0; c < database.width; c++) {
    const h = excelCoerceString(database.values[c] ?? BLANK);
    headers.push(h.kind === "string" ? h.value.trim().toLowerCase() : "");
  }
  const values: number[] = [];
  for (let r = 1; r < database.height; r++) {
    const row: ExcelValue[] = [];
    for (let c = 0; c < database.width; c++) row.push(database.values[r * database.width + c] ?? BLANK);
    if (!rowMatches(row, headers, criteria)) continue;
    const v = row[fieldIdx];
    if (v === undefined || v.kind === "blank" || v.kind === "omitted") {
      if (aggregate === "counta") values.push(0); // count non-blank values
      continue;
    }
    const n = excelCoerceNumber(v);
    if (n.kind === "number") values.push(n.value);
    else if (aggregate === "counta") values.push(0);
  }

  switch (aggregate) {
    case "counta":
    case "count":
      return num(values.length);
    case "sum":
      return num(values.reduce((s, x) => s + x, 0));
    case "product":
      return num(values.reduce((p, x) => p * x, 1));
    case "avg":
      return values.length ? num(values.reduce((s, x) => s + x, 0) / values.length) : err(ExcelErrorCode.Div0);
    case "max":
      return values.length ? num(Math.max(...values)) : err(ExcelErrorCode.Num);
    case "min":
      return values.length ? num(Math.min(...values)) : err(ExcelErrorCode.Num);
    case "stdev":
      return sampleStat(values, false);
    case "stdevp":
      return sampleStat(values, true);
    case "var":
      return sampleStat(values, false, true);
    case "varp":
      return sampleStat(values, true, true);
  }
}

function sampleStat(values: number[], population: boolean, variance = false): ExcelValue {
  if (values.length < (population ? 1 : 2)) return err(ExcelErrorCode.Num);
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const sq = values.reduce((s, x) => s + (x - mean) ** 2, 0);
  const div = population ? values.length : values.length - 1;
  const result = sq / div;
  return variance ? num(result) : num(Math.sqrt(result));
}

export function registerDatabaseFunctions(add: (f: ExcelFunction) => void): void {
  function db(aggregate: "sum" | "count" | "counta" | "max" | "min" | "product" | "avg" | "stdev" | "stdevp" | "var" | "varp") {
    return (args: ExcelValue[]): ExcelValue => {
      const dbArg = args[0];
      const field = args[1];
      const crit = args[2];
      if (dbArg?.kind !== "array" || crit?.kind !== "array") return err(ExcelErrorCode.Value);
      const idx = fieldIndex(dbArg, field ?? BLANK);
      if (idx < 0) return err(ExcelErrorCode.Value);
      return aggregateDatabase(dbArg, idx, crit, aggregate);
    };
  }

  add(fn("DSUM", "none", db("sum")));
  add(fn("DAVERAGE", "none", db("avg")));
  add(fn("DCOUNT", "none", db("count")));
  add(fn("DCOUNTA", "none", db("counta")));
  add(fn("DMAX", "none", db("max")));
  add(fn("DMIN", "none", db("min")));
  add(fn("DPRODUCT", "none", db("product")));
  add(fn("DSTDEV", "none", db("stdev")));
  add(fn("DSTDEVP", "none", db("stdevp")));
  add(fn("DVAR", "none", db("var")));
  add(fn("DVARP", "none", db("varp")));
  add(fn("DGET", "none", (args) => {
    const dbArg = args[0];
    const field = args[1];
    const crit = args[2];
    if (dbArg?.kind !== "array" || crit?.kind !== "array") return err(ExcelErrorCode.Value);
    const idx = fieldIndex(dbArg, field ?? BLANK);
    if (idx < 0) return err(ExcelErrorCode.Value);
    const headers: string[] = [];
    for (let c = 0; c < dbArg.width; c++) {
      const h = excelCoerceString(dbArg.values[c] ?? BLANK);
      headers.push(h.kind === "string" ? h.value.trim().toLowerCase() : "");
    }
    let result: ExcelValue | undefined;
    let count = 0;
    for (let r = 1; r < dbArg.height; r++) {
      const row: ExcelValue[] = [];
      for (let c = 0; c < dbArg.width; c++) row.push(dbArg.values[r * dbArg.width + c] ?? BLANK);
      if (!rowMatches(row, headers, crit)) continue;
      result = row[idx];
      count++;
      if (count > 1) return err(ExcelErrorCode.Num);
    }
    if (count === 0 || result === undefined) return err(ExcelErrorCode.Value);
    return result;
  }));
}
