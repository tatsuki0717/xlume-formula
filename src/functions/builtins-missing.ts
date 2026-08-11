/**
 * Additional missing Excel worksheet functions and stubs for out-of-scope/impossible
 * functions. These are registered by `src/functions/builtins.ts`.
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
import { excelCoerceNumber, excelCoerceString, excelCompare } from "../formula/coercion.js";
import { flattenArgs } from "../formula/evaluator.js";
import type { EvaluationContext, ExcelFunction, FunctionRegistry } from "../formula/functions-types.js";
import { columnIndexToLetters } from "../model/address.js";

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

function toNumbers(values: ExcelValue[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    const n = excelCoerceNumber(v);
    if (n.kind === "number") out.push(n.value);
  }
  return out;
}

function toArray2D(value: ExcelValue): ExcelValue[][] {
  if (value.kind !== "array") return [[value]];
  const rows: ExcelValue[][] = [];
  for (let r = 0; r < value.height; r++) {
    const row: ExcelValue[] = [];
    for (let c = 0; c < value.width; c++) {
      row.push(value.values[r * value.width + c] ?? BLANK);
    }
    rows.push(row);
  }
  return rows;
}

function fromArray2D(rows: ExcelValue[][]): ArrayValue {
  const height = rows.length;
  const width = height === 0 ? 0 : rows[0]!.length;
  const values: ExcelValue[] = [];
  for (const row of rows) {
    for (let c = 0; c < width; c++) {
      values.push(row[c] ?? BLANK);
    }
  }
  return { kind: "array", width, height, values };
}

function arrayToString(value: ExcelValue, strict: boolean): string {
  if (value.kind === "array") {
    const rows: string[] = [];
    for (let r = 0; r < value.height; r++) {
      const cells: string[] = [];
      for (let c = 0; c < value.width; c++) {
        const v = value.values[r * value.width + c] ?? BLANK;
        cells.push(arrayToString(v, strict));
      }
      rows.push(strict ? cells.join(",") : cells.join(","));
    }
    return strict ? "{" + rows.join(";") + "}" : rows.join(";");
  }
  if (value.kind === "string") {
    if (strict) return JSON.stringify(value.value);
    return value.value;
  }
  if (value.kind === "number") return String(value.value);
  if (value.kind === "boolean") return value.value ? "TRUE" : "FALSE";
  if (value.kind === "error") return value.code;
  return "";
}

function valueToText(value: ExcelValue, strict: boolean): string {
  if (value.kind === "array") return arrayToString(value, strict);
  if (value.kind === "string") return strict ? JSON.stringify(value.value) : value.value;
  if (value.kind === "number") return String(value.value);
  if (value.kind === "boolean") return value.value ? "TRUE" : "FALSE";
  if (value.kind === "error") return value.code;
  return "";
}

function determinant(m: number[][]): number {
  const n = m.length;
  if (n === 0) return 0;
  if (n === 1) return m[0]![0]!;
  let det = 0;
  for (let col = 0; col < n; col++) {
    const sub: number[][] = [];
    for (let i = 1; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (j !== col) row.push(m[i]![j]!);
      }
      sub.push(row);
    }
    det += ((col % 2 === 0 ? 1 : -1) * m[0]![col]! * determinant(sub));
  }
  return det;
}

function inverseMatrix(m: number[][]): number[][] | undefined {
  const n = m.length;
  if (n === 0) return undefined;
  // Augment with identity
  const aug: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [...m[i]!];
    for (let j = 0; j < n; j++) row.push(i === j ? 1 : 0);
    aug.push(row);
  }
  // Gaussian elimination
  for (let i = 0; i < n; i++) {
    let pivot = aug[i]![i]!;
    if (Math.abs(pivot) < 1e-12) {
      // Find row to swap
      let swap = -1;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r]![i]!) > 1e-12) {
          swap = r;
          break;
        }
      }
      if (swap === -1) return undefined;
      [aug[i], aug[swap]] = [aug[swap]!, aug[i]!];
      pivot = aug[i]![i]!;
    }
    for (let j = 0; j < 2 * n; j++) aug[i]![j]! /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = aug[r]![i]!;
      if (Math.abs(factor) > 1e-12) {
        for (let j = 0; j < 2 * n; j++) {
          aug[r]![j] = (aug[r]![j] ?? 0) - factor * (aug[i]![j] ?? 0);
        }
      }
    }
  }
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    inv.push(aug[i]!.slice(n, 2 * n));
  }
  return inv;
}

function regexFor(pattern: string, caseInsensitive: boolean): RegExp {
  // Strip leading and trailing / if present
  let p = pattern;
  if (p.startsWith("/") && p.endsWith("/")) p = p.slice(1, -1);
  return new RegExp(p, caseInsensitive ? "i" : "");
}

function requireNumber(
  arg: ExcelValue | undefined,
  defaultValue: number,
): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  if (arg === undefined) return { ok: true, value: defaultValue };
  const n = excelCoerceNumber(arg);
  if (n.kind === "number") return { ok: true, value: n.value };
  return { ok: false, error: n };
}

function normalizeRowsCols(rows: number, max: number): { start: number; end: number } {
  if (rows >= 0) return { start: 0, end: Math.min(rows, max) - 1 };
  return { start: Math.max(0, max + rows), end: max - 1 };
}

export function registerMissingFunctions(add: (f: ExcelFunction) => void, reg: FunctionRegistry): void {
  // Byte-string aliases (ASCII only; full-width handling is locale-specific and deferred)
  for (const [alias, target] of [
    ["FINDB", "FIND"],
    ["SEARCHB", "SEARCH"],
    ["LEFTB", "LEFT"],
    ["RIGHTB", "RIGHT"],
    ["MIDB", "MID"],
    ["LENB", "LEN"],
    ["REPLACEB", "REPLACE"],
  ] as const) {
    reg.alias(alias, target);
  }

  // Lookup & reference
  add(
    fn("ADDRESS", "none", (args) => {
      const rowArg = excelCoerceNumber(args[0] ?? BLANK);
      const colArg = excelCoerceNumber(args[1] ?? BLANK);
      const absArg = requireNumber(args[2], 1);
      const a1Arg = requireNumber(args[3], 1);
      const sheetArg = args[4];
      if (rowArg.kind !== "number" || colArg.kind !== "number" || !absArg.ok || !a1Arg.ok) {
        return err(ExcelErrorCode.Value);
      }
      const row = rowArg.value;
      const col = colArg.value;
      if (row < 1 || col < 1) return err(ExcelErrorCode.Value);
      const abs = Math.trunc(absArg.value);
      const a1 = a1Arg.value !== 0;
      const absCol = abs === 1 || abs === 3 || abs === 5 || abs === 7;
      const absRow = abs === 1 || abs === 2 || abs === 5 || abs === 6;
      let ref = "";
      if (a1) {
        const colStr = columnIndexToLetters(col - 1);
        if (absCol) ref += "$";
        ref += colStr;
        if (absRow) ref += "$";
        ref += String(row);
      } else {
        if (absRow) ref += "R" + row;
        else ref += "R[" + row + "]";
        if (absCol) ref += "C" + col;
        else ref += "C[" + col + "]";
      }
      if (sheetArg && sheetArg.kind !== "blank") {
        const sheetText = excelCoerceString(sheetArg);
        if (sheetText.kind === "error") return sheetText;
        if (sheetText.kind !== "string") return err(ExcelErrorCode.Value);
        const s = sheetText.value;
        if (s.includes(" ")) ref = `'${s}'!${ref}`;
        else ref = `${s}!${ref}`;
      }
      return str(ref);
    }),
  );

  add(
    fn("AREAS", "none", (args) => {
      if (args.length === 0) return err(ExcelErrorCode.Value);
      return num(1);
    }),
  );

  // Information
  add(
    fn("ERROR.TYPE", "none", (args) => {
      const v = args[0];
      if (!v || v.kind !== "error") return err(ExcelErrorCode.NA);
      const map: Record<string, number> = {
        [ExcelErrorCode.Null]: 1,
        [ExcelErrorCode.Div0]: 2,
        [ExcelErrorCode.Value]: 3,
        [ExcelErrorCode.Ref]: 4,
        [ExcelErrorCode.Name]: 5,
        [ExcelErrorCode.Num]: 6,
        [ExcelErrorCode.NA]: 7,
        [ExcelErrorCode.GettingData]: 8,
      };
      return num(map[v.code] ?? 8);
    }),
  );

  add(
    fn("ISERR", "none", (args) => {
      const v = args[0] ?? BLANK;
      if (v.kind === "error" && v.code !== ExcelErrorCode.NA) return bool(true);
      return bool(false);
    }),
  );

  add(
    fn("ISNONTEXT", "none", (args) => {
      const v = args[0] ?? BLANK;
      return bool(v.kind !== "string");
    }),
  );

  add(
    fn("SHEET", "none", () => num(1)));

  add(
    fn("SHEETS", "none", () => num(1)));

  // Math: matrix and percent-of
  add(
    fn("MDETERM", "none", (args) => {
      const a = args[0];
      if (!a || a.kind !== "array") return err(ExcelErrorCode.Value);
      const rows = toArray2D(a);
      if (rows.length === 0 || rows.some((r) => r.length !== rows.length)) return err(ExcelErrorCode.Value);
      const m: number[][] = [];
      for (const row of rows) {
        const nums: number[] = [];
        for (const v of row) {
          const n = excelCoerceNumber(v);
          if (n.kind !== "number") return err(ExcelErrorCode.Value);
          nums.push(n.value);
        }
        m.push(nums);
      }
      return num(determinant(m));
    }),
  );

  add(
    fn("MINVERSE", "none", (args) => {
      const a = args[0];
      if (!a || a.kind !== "array") return err(ExcelErrorCode.Value);
      const rows = toArray2D(a);
      if (rows.length === 0 || rows.some((r) => r.length !== rows.length)) return err(ExcelErrorCode.Value);
      const m: number[][] = [];
      for (const row of rows) {
        const nums: number[] = [];
        for (const v of row) {
          const n = excelCoerceNumber(v);
          if (n.kind !== "number") return err(ExcelErrorCode.Value);
          nums.push(n.value);
        }
        m.push(nums);
      }
      const inv = inverseMatrix(m);
      if (!inv) return err(ExcelErrorCode.Num);
      const outRows: ExcelValue[][] = inv.map((row) => row.map((v) => num(v)));
      return fromArray2D(outRows);
    }),
  );

  add(
    fn("PERCENTOF", "none", (args) => {
      function sumValues(values: ExcelValue[]): { ok: true; value: number } | { ok: false; error: ExcelValue } {
        let total = 0;
        for (const v of values) {
          if (v.kind === "error") return { ok: false, error: v };
          const n = excelCoerceNumber(v);
          if (n.kind !== "number") return { ok: false, error: n };
          total += n.value;
        }
        return { ok: true, value: total };
      }
      const subset = flattenArgs(args[0] ? [args[0]] : []);
      const all = flattenArgs(args[1] ? [args[1]] : []);
      const sumSubset = sumValues(subset);
      if (!sumSubset.ok) return sumSubset.error;
      const sumAll = sumValues(all);
      if (!sumAll.ok) return sumAll.error;
      if (sumAll.value === 0) return err(ExcelErrorCode.Div0);
      return num(sumSubset.value / sumAll.value);
    }),
  );

  // Text: regex and modern text extraction
  add(
    fn("REGEXTEST", "none", (args) => {
      const text = excelCoerceString(args[0] ?? BLANK);
      const pattern = excelCoerceString(args[1] ?? BLANK);
      const returnMode = requireNumber(args[2], 0);
      if (text.kind !== "string" || pattern.kind !== "string" || !returnMode.ok) return err(ExcelErrorCode.Value);
      let caseInsensitive = false;
      let p = pattern.value;
      if (p.startsWith("(?i)") || p.startsWith("(?i-)")) {
        caseInsensitive = true;
        p = p.replace(/^\(\?i-?\)/, "");
      }
      if (returnMode.value === 0) {
        try {
          return bool(regexFor(p, caseInsensitive).test(text.value));
        } catch {
          return err(ExcelErrorCode.Value);
        }
      }
      // return_mode 1: first match index
      try {
        const m = text.value.match(regexFor(p, caseInsensitive));
        return num(m && m.index !== undefined ? m.index + 1 : -1);
      } catch {
        return err(ExcelErrorCode.Value);
      }
    }),
  );

  add(
    fn("REGEXEXTRACT", "none", (args) => {
      const text = excelCoerceString(args[0] ?? BLANK);
      const pattern = excelCoerceString(args[1] ?? BLANK);
      const groupNum = requireNumber(args[2], 1);
      const matchMode = requireNumber(args[3], 0);
      if (text.kind !== "string" || pattern.kind !== "string" || !groupNum.ok || !matchMode.ok) {
        return err(ExcelErrorCode.Value);
      }
      let caseInsensitive = false;
      let p = pattern.value;
      if (p.startsWith("(?i)") || p.startsWith("(?i-)")) {
        caseInsensitive = true;
        p = p.replace(/^\(\?i-?\)/, "");
      }
      try {
        const re = regexFor(p, caseInsensitive);
        const m = text.value.match(re);
        if (!m) return err(ExcelErrorCode.NA);
        const group = groupNum.value === 0 ? m[0] : m[groupNum.value];
        return group === undefined ? err(ExcelErrorCode.NA) : str(group);
      } catch {
        return err(ExcelErrorCode.Value);
      }
    }),
  );

  add(
    fn("REGEXREPLACE", "none", (args) => {
      const text = excelCoerceString(args[0] ?? BLANK);
      const pattern = excelCoerceString(args[1] ?? BLANK);
      const replacement = excelCoerceString(args[2] ?? BLANK);
      const occurrence = requireNumber(args[3], 0);
      const matchMode = requireNumber(args[4], 0);
      if (text.kind !== "string" || pattern.kind !== "string" || replacement.kind !== "string" || !occurrence.ok || !matchMode.ok) {
        return err(ExcelErrorCode.Value);
      }
      let caseInsensitive = false;
      let p = pattern.value;
      if (p.startsWith("(?i)") || p.startsWith("(?i-)")) {
        caseInsensitive = true;
        p = p.replace(/^\(\?i-?\)/, "");
      }
      try {
        const re = regexFor(p, caseInsensitive);
        if (occurrence.value === 0) return str(text.value.replace(re, replacement.value));
        let count = 0;
        const result = text.value.replace(re, (match) => {
          count++;
          return count === occurrence.value ? replacement.value : match;
        });
        return str(result);
      } catch {
        return err(ExcelErrorCode.Value);
      }
    }),
  );

  add(
    fn("TEXTAFTER", "none", (args) => {
      const text = excelCoerceString(args[0] ?? BLANK);
      const delimiter = excelCoerceString(args[1] ?? BLANK);
      const instanceNum = requireNumber(args[2], 1);
      const matchMode = requireNumber(args[3], 0);
      const matchEnd = requireNumber(args[4], 0);
      const ifNotFound = args[5];
      if (text.kind !== "string" || delimiter.kind !== "string" || !instanceNum.ok || !matchMode.ok || !matchEnd.ok) {
        return err(ExcelErrorCode.Value);
      }
      const parts = text.value.split(delimiter.value);
      const idx = instanceNum.value > 0 ? instanceNum.value - 1 : parts.length + instanceNum.value;
      if (idx < 0 || idx >= parts.length - (matchEnd.value ? 0 : 1)) {
        if (ifNotFound) return ifNotFound;
        return err(ExcelErrorCode.NA);
      }
      return str(parts.slice(idx + 1).join(delimiter.value));
    }),
  );

  add(
    fn("TEXTBEFORE", "none", (args) => {
      const text = excelCoerceString(args[0] ?? BLANK);
      const delimiter = excelCoerceString(args[1] ?? BLANK);
      const instanceNum = requireNumber(args[2], 1);
      const matchMode = requireNumber(args[3], 0);
      const matchEnd = requireNumber(args[4], 0);
      const ifNotFound = args[5];
      if (text.kind !== "string" || delimiter.kind !== "string" || !instanceNum.ok || !matchMode.ok || !matchEnd.ok) {
        return err(ExcelErrorCode.Value);
      }
      const parts = text.value.split(delimiter.value);
      const idx = instanceNum.value > 0 ? instanceNum.value - 1 : parts.length + instanceNum.value;
      if (idx < 0 || idx >= parts.length) {
        if (ifNotFound) return ifNotFound;
        return err(ExcelErrorCode.NA);
      }
      return str(parts.slice(0, idx + 1).join(delimiter.value));
    }),
  );

  add(
    fn("ARRAYTOTEXT", "none", (args) => {
      const value = args[0] ?? BLANK;
      const format = requireNumber(args[1], 0);
      if (!format.ok) return err(ExcelErrorCode.Value);
      return str(arrayToString(value, format.value !== 0));
    }),
  );

  add(
    fn("VALUETOTEXT", "none", (args) => {
      const value = args[0] ?? BLANK;
      const format = requireNumber(args[1], 0);
      if (!format.ok) return err(ExcelErrorCode.Value);
      return str(valueToText(value, format.value !== 0));
    }),
  );

  // Dynamic array helpers
  add(
    fn("DROP", "none", (args) => {
      const arr = args[0];
      const rowsArg = requireNumber(args[1], 0);
      const colsArg = requireNumber(args[2], 0);
      if (!arr || arr.kind !== "array" || !rowsArg.ok || !colsArg.ok) return err(ExcelErrorCode.Value);
      const rows = toArray2D(arr);
      const height = rows.length;
      const width = height === 0 ? 0 : rows[0]!.length;
      const rDrop = normalizeRowsCols(rowsArg.value, height);
      const cDrop = normalizeRowsCols(colsArg.value, width);
      const out: ExcelValue[][] = [];
      for (let r = rDrop.start; r <= rDrop.end; r++) {
        const row: ExcelValue[] = [];
        for (let c = cDrop.start; c <= cDrop.end; c++) row.push(rows[r]![c] ?? BLANK);
        out.push(row);
      }
      return fromArray2D(out);
    }),
  );

  add(
    fn("TAKE", "none", (args) => {
      const arr = args[0];
      const rowsArg = requireNumber(args[1], 0);
      const colsArg = requireNumber(args[2], 0);
      if (!arr || arr.kind !== "array" || !rowsArg.ok || !colsArg.ok) return err(ExcelErrorCode.Value);
      const rows = toArray2D(arr);
      const height = rows.length;
      const width = height === 0 ? 0 : rows[0]!.length;
      const rTake = normalizeRowsCols(rowsArg.value, height);
      const cTake = normalizeRowsCols(colsArg.value, width);
      const out: ExcelValue[][] = [];
      for (let r = rTake.start; r <= rTake.end; r++) {
        const row: ExcelValue[] = [];
        for (let c = cTake.start; c <= cTake.end; c++) row.push(rows[r]![c] ?? BLANK);
        out.push(row);
      }
      return fromArray2D(out);
    }),
  );

  add(
    fn("EXPAND", "none", (args) => {
      const arr = args[0];
      const rowsArg = requireNumber(args[1], 0);
      const colsArg = requireNumber(args[2], 0);
      const pad = args[3] ?? BLANK;
      if (!arr || arr.kind !== "array" || !rowsArg.ok || !colsArg.ok) return err(ExcelErrorCode.Value);
      const rows = toArray2D(arr);
      const height = Math.max(0, rowsArg.value);
      const width = Math.max(0, colsArg.value);
      const out: ExcelValue[][] = [];
      for (let r = 0; r < height; r++) {
        const row: ExcelValue[] = [];
        for (let c = 0; c < width; c++) {
          row.push(rows[r]?.[c] ?? pad);
        }
        out.push(row);
      }
      return fromArray2D(out);
    }),
  );

  add(
    fn("CHOOSECOLS", "none", (args) => {
      const arr = args[0];
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
      const rows = toArray2D(arr);
      const height = rows.length;
      const width = height === 0 ? 0 : rows[0]!.length;
      const cols: number[] = [];
      for (let i = 1; i < args.length; i++) {
        const n = requireNumber(args[i], 0);
        if (!n.ok) return err(ExcelErrorCode.Value);
        let c = n.value;
        if (c < 0) c = width + c + 1;
        if (c < 1 || c > width) return err(ExcelErrorCode.Value);
        cols.push(c - 1);
      }
      const out: ExcelValue[][] = [];
      for (let r = 0; r < height; r++) {
        const row: ExcelValue[] = cols.map((c) => rows[r]![c] ?? BLANK);
        out.push(row);
      }
      return fromArray2D(out);
    }),
  );

  add(
    fn("CHOOSEROWS", "none", (args) => {
      const arr = args[0];
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
      const rows = toArray2D(arr);
      const height = rows.length;
      const width = height === 0 ? 0 : rows[0]!.length;
      const selected: number[] = [];
      for (let i = 1; i < args.length; i++) {
        const n = requireNumber(args[i], 0);
        if (!n.ok) return err(ExcelErrorCode.Value);
        let r = n.value;
        if (r < 0) r = height + r + 1;
        if (r < 1 || r > height) return err(ExcelErrorCode.Value);
        selected.push(r - 1);
      }
      const out: ExcelValue[][] = selected.map((r) => rows[r]!.slice(0, width));
      return fromArray2D(out);
    }),
  );

  add(
    fn("TRIMRANGE", "none", (args) => {
      const arr = args[0];
      const rowsArg = requireNumber(args[1], 0);
      const colsArg = requireNumber(args[2], 0);
      if (!arr || arr.kind !== "array" || !rowsArg.ok || !colsArg.ok) return err(ExcelErrorCode.Value);
      const rows = toArray2D(arr);
      let top = 0;
      let bottom = rows.length - 1;
      let left = 0;
      let right = rows.length === 0 ? -1 : rows[0]!.length - 1;
      // Trim empty rows from top/bottom
      while (top <= bottom && rows[top]!.every((v) => v.kind === "blank")) top++;
      while (bottom >= top && rows[bottom]!.every((v) => v.kind === "blank")) bottom--;
      // Trim empty columns from left/right
      while (left <= right && rows.every((row) => (row[left] ?? BLANK).kind === "blank")) left++;
      while (right >= left && rows.every((row) => (row[right] ?? BLANK).kind === "blank")) right--;
      const out: ExcelValue[][] = [];
      for (let r = top; r <= bottom; r++) {
        const row: ExcelValue[] = [];
        for (let c = left; c <= right; c++) row.push(rows[r]![c] ?? BLANK);
        out.push(row);
      }
      return fromArray2D(out);
    }),
  );

  add(
    fn("WRAPROWS", "none", (args) => {
      const value = args[0];
      const wrap = requireNumber(args[1], 0);
      const pad = args[2] ?? err(ExcelErrorCode.NA);
      if (!value || !wrap.ok || wrap.value <= 0) return err(ExcelErrorCode.Value);
      const values = flattenArgs([value]);
      const width = wrap.value;
      const height = Math.ceil(values.length / width);
      const out: ExcelValue[][] = [];
      for (let r = 0; r < height; r++) {
        const row: ExcelValue[] = [];
        for (let c = 0; c < width; c++) {
          row.push(values[r * width + c] ?? pad);
        }
        out.push(row);
      }
      return fromArray2D(out);
    }),
  );

  add(
    fn("WRAPCOLS", "none", (args) => {
      const value = args[0];
      const wrap = requireNumber(args[1], 0);
      const pad = args[2] ?? err(ExcelErrorCode.NA);
      if (!value || !wrap.ok || wrap.value <= 0) return err(ExcelErrorCode.Value);
      const values = flattenArgs([value]);
      const wrapCount = wrap.value;
      const height = wrapCount;
      const width = Math.ceil(values.length / wrapCount);
      const out: ExcelValue[][] = [];
      for (let r = 0; r < height; r++) {
        const row: ExcelValue[] = [];
        for (let c = 0; c < width; c++) {
          row.push(values[c * wrapCount + r] ?? pad);
        }
        out.push(row);
      }
      return fromArray2D(out);
    }),
  );

  // Stubs for functions that require external data, locale handling, or LAMBDA support
  const stubNames = [
    // External / locale / add-in
    "ASC", "BAHTTEXT", "CALL", "CELL", "CUBEKPIMEMBER", "CUBEMEMBER",
    "CUBEMEMBERPROPERTY", "CUBERANKEDMEMBER", "CUBESET", "CUBESETCOUNT",
    "CUBEVALUE", "DBCS", "DETECTLANGUAGE", "ENCODEURL", "EUROCONVERT",
    "FILTERXML", "FORMULATEXT", "IMAGE", "INFO", "ISFORMULA", "ISREF",
    "LAMBDA", "LET", "MAKEARRAY", "MAP", "PHONETIC", "PIVOTBY", "REDUCE",
    "REGISTER.ID", "RTD", "SCAN", "STOCKHISTORY", "TRANSLATE", "WEBSERVICE",
    // LAMBDA helpers that need first-class function support
    "BYCOL", "BYROW", "GROUPBY", "ISOMITTED",
  ];
  for (const name of stubNames) {
    add(fn(name, "none", () => err(ExcelErrorCode.NA)));
  }
}
