import {
  BLANK,
  bool,
  err,
  ExcelErrorCode,
  num,
  str,
  type ExcelValue,
} from "../model/value.js";
import { FunctionRegistry, type ExcelFunction } from "../formula/functions-types.js";
import { excelCoerceBoolean, excelCoerceNumber, flattenArgs } from "../formula/evaluator.js";
import { excelCompare, excelConcat } from "../formula/coercion.js";
import { registerExtraFunctions } from "./builtins-extra.js";
import { registerMissingFunctions } from "./builtins-missing.js";
import { registerFinancialFunctions } from "./builtins-financial.js";
import { registerFinancial2Functions } from "./builtins-financial2.js";
import { registerStatisticalFunctions } from "./builtins-statistical.js";
import { registerDistributionFunctions } from "./builtins-distributions.js";
import { registerCompatibilityFunctions } from "./builtins-compatibility.js";
import { registerFilterXmlFunction } from "./builtins-filterxml.js";
import { registerDatabaseFunctions } from "./builtins-database.js";
import { registerDate2Functions } from "./builtins-date2.js";
import { registerEngineeringFunctions } from "./builtins-engineering.js";
import { registerForecastFunctions } from "./builtins-forecast.js";
import { registerFormulaReplacementFunctions } from "./builtins-formula-replacement.js";
import { registerMath2Functions } from "./builtins-math2.js";
import { registerGoogleSheetsFunctions } from "./builtins-google-sheets.js";

function fn(
  name: string,
  volatility: ExcelFunction["volatility"],
  evaluate: ExcelFunction["evaluate"],
): ExcelFunction {
  return { name, volatility, evaluate };
}

/**
 * COUNTIF / SUMIF criteria matching.
 * Supports: numbers, strings, ">5", "<=10", "<>abc", "*wild*", "?".
 */
function matchesCriteria(cell: ExcelValue, criteria: ExcelValue): boolean {
  if (criteria.kind === "number") {
    return cell.kind === "number" && cell.value === criteria.value;
  }
  if (criteria.kind === "boolean") {
    return cell.kind === "boolean" && cell.value === criteria.value;
  }
  if (criteria.kind !== "string") return false;
  const s = criteria.value;
  const opMatch = /^([<>]=?|<>|=)(.*)$/.exec(s);
  if (opMatch) {
    const op = opMatch[1]!;
    const raw = opMatch[2]!;
    const target = /^-?\d+(\.\d+)?$/.test(raw) ? num(Number(raw)) : str(raw);
    const cmp = excelCompare(cell, target, op as "=" | "<>" | "<" | ">" | "<=" | ">=");
    return cmp.kind === "boolean" && cmp.value;
  }
  // Wildcard
  if (s.includes("*") || s.includes("?")) {
    const cellStr = cell.kind === "string" ? cell.value : cell.kind === "number" ? String(cell.value) : "";
    const pattern = "^" + s.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
    return new RegExp(pattern, "i").test(cellStr);
  }
  // Exact (case-insensitive)
  const cellStr = cell.kind === "string" ? cell.value : cell.kind === "number" ? String(cell.value) : "";
  return cellStr.toLowerCase() === s.toLowerCase();
}

export function createBuiltinFunctions(): FunctionRegistry {
  const reg = new FunctionRegistry();
  const add = (f: ExcelFunction) => reg.register(f);

  // Math
  add(
    fn("SUM", "none", (args) => {
      let s = 0;
      for (const v of flattenArgs(args)) {
        if (v.kind === "error") return v;
        if (v.kind === "number") s += v.value;
        if (v.kind === "boolean") s += v.value ? 1 : 0;
        // strings ignored in SUM
      }
      return num(s);
    }),
  );
  add(
    fn("PRODUCT", "none", (args) => {
      let p = 1;
      let any = false;
      for (const v of flattenArgs(args)) {
        if (v.kind === "error") return v;
        if (v.kind === "number") {
          p *= v.value;
          any = true;
        }
      }
      return num(any ? p : 0);
    }),
  );
  add(fn("ABS", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.abs(n.value)) : n;
  }));
  add(fn("SQRT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    if (n.value < 0) return err(ExcelErrorCode.Num);
    return num(Math.sqrt(n.value));
  }));
  add(fn("POWER", "none", (args) => {
    const a = excelCoerceNumber(args[0] ?? BLANK);
    const b = excelCoerceNumber(args[1] ?? BLANK);
    if (a.kind === "error") return a;
    if (b.kind === "error") return b;
    if (a.kind === "number" && b.kind === "number") return num(a.value ** b.value);
    return err(ExcelErrorCode.Value);
  }));
  add(fn("MOD", "none", (args) => {
    const a = excelCoerceNumber(args[0] ?? BLANK);
    const b = excelCoerceNumber(args[1] ?? BLANK);
    if (a.kind === "error") return a;
    if (b.kind === "error") return b;
    if (a.kind === "number" && b.kind === "number") {
      if (b.value === 0) return err(ExcelErrorCode.Div0);
      return num(((a.value % b.value) + b.value) % b.value);
    }
    return err(ExcelErrorCode.Value);
  }));
  add(fn("ROUND", "none", (args) => {
    const a = excelCoerceNumber(args[0] ?? BLANK);
    const b = excelCoerceNumber(args[1] ?? num(0));
    if (a.kind !== "number" || b.kind !== "number") return a.kind === "error" ? a : b;
    const f = 10 ** b.value;
    return num(Math.round(a.value * f) / f);
  }));
  add(fn("INT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.floor(n.value)) : n;
  }));
  add(fn("SIGN", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? num(Math.sign(n.value)) : n;
  }));
  add(fn("PI", "none", () => num(Math.PI)));
  add(fn("SQRTPI", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    if (n.value < 0) return err(ExcelErrorCode.Num);
    return num(Math.sqrt(n.value * Math.PI));
  }));

  // Statistical
  add(
    fn("AVERAGE", "none", (args) => {
      let s = 0;
      let c = 0;
      for (const v of flattenArgs(args)) {
        if (v.kind === "error") return v;
        if (v.kind === "number") {
          s += v.value;
          c++;
        }
      }
      if (c === 0) return err(ExcelErrorCode.Div0);
      return num(s / c);
    }),
  );
  add(
    fn("COUNT", "none", (args) => {
      let c = 0;
      for (const v of flattenArgs(args)) if (v.kind === "number") c++;
      return num(c);
    }),
  );
  add(
    fn("COUNTA", "none", (args) => {
      let c = 0;
      for (const v of flattenArgs(args)) if (v.kind !== "blank") c++;
      return num(c);
    }),
  );
  add(
    fn("MIN", "none", (args) => {
      let m = Infinity;
      let any = false;
      for (const v of flattenArgs(args)) {
        if (v.kind === "error") return v;
        if (v.kind === "number") {
          m = Math.min(m, v.value);
          any = true;
        }
      }
      return num(any ? m : 0);
    }),
  );
  add(
    fn("MAX", "none", (args) => {
      let m = -Infinity;
      let any = false;
      for (const v of flattenArgs(args)) {
        if (v.kind === "error") return v;
        if (v.kind === "number") {
          m = Math.max(m, v.value);
          any = true;
        }
      }
      return num(any ? m : 0);
    }),
  );

  // Logical
  add(
    fn("IF", "none", (args) => {
      const c = excelCoerceBoolean(args[0] ?? BLANK);
      if (c.kind === "error") return c;
      if (c.kind === "boolean" && c.value) return args[1] ?? num(0);
      return args[2] ?? bool(false);
    }),
  );
  add(
    fn("AND", "none", (args) => {
      for (const v of flattenArgs(args)) {
        const b = excelCoerceBoolean(v);
        if (b.kind === "error") return b;
        if (b.kind === "boolean" && !b.value) return bool(false);
      }
      return bool(true);
    }),
  );
  add(
    fn("OR", "none", (args) => {
      for (const v of flattenArgs(args)) {
        const b = excelCoerceBoolean(v);
        if (b.kind === "error") return b;
        if (b.kind === "boolean" && b.value) return bool(true);
      }
      return bool(false);
    }),
  );
  add(
    fn("NOT", "none", (args) => {
      const b = excelCoerceBoolean(args[0] ?? BLANK);
      return b.kind === "boolean" ? bool(!b.value) : b;
    }),
  );
  add(fn("TRUE", "none", () => bool(true)));
  add(fn("FALSE", "none", () => bool(false)));
  add(
    fn("IFERROR", "none", (args) => {
      const v = args[0] ?? BLANK;
      if (v.kind === "error") return args[1] ?? BLANK;
      return v;
    }),
  );

  // Text
  add(
    fn("LEN", "none", (args) => {
      const s = args[0] ?? BLANK;
      if (s.kind === "error") return s;
      if (s.kind === "string") return num(s.value.length);
      if (s.kind === "number") return num(String(s.value).length);
      if (s.kind === "boolean") return num(s.value ? 4 : 5);
      return num(0);
    }),
  );
  add(
    fn("UPPER", "none", (args) => {
      const s = args[0] ?? BLANK;
      if (s.kind === "error") return s;
      if (s.kind === "string") return str(s.value.toUpperCase());
      return str(String((s as { value?: unknown }).value ?? ""));
    }),
  );
  add(
    fn("LOWER", "none", (args) => {
      const s = args[0] ?? BLANK;
      if (s.kind === "error") return s;
      if (s.kind === "string") return str(s.value.toLowerCase());
      return str(String((s as { value?: unknown }).value ?? "").toLowerCase());
    }),
  );
  add(
    fn("TRIM", "none", (args) => {
      const s = args[0] ?? BLANK;
      if (s.kind !== "string") return s.kind === "error" ? s : str("");
      return str(s.value.trim().replace(/\s+/g, " "));
    }),
  );
  add(
    fn("LEFT", "none", (args) => {
      const s = args[0];
      const n = excelCoerceNumber(args[1] ?? num(1));
      if (!s || s.kind === "error") return s ?? BLANK;
      if (n.kind !== "number") return n;
      const text = s.kind === "string" ? s.value : String((s as { value?: unknown }).value ?? "");
      return str(text.slice(0, Math.max(0, n.value)));
    }),
  );
  add(
    fn("RIGHT", "none", (args) => {
      const s = args[0];
      const n = excelCoerceNumber(args[1] ?? num(1));
      if (!s || s.kind === "error") return s ?? BLANK;
      if (n.kind !== "number") return n;
      const text = s.kind === "string" ? s.value : String((s as { value?: unknown }).value ?? "");
      return str(text.slice(Math.max(0, text.length - n.value)));
    }),
  );
  add(
    fn("MID", "none", (args) => {
      const s = args[0];
      const start = excelCoerceNumber(args[1] ?? num(1));
      const len = excelCoerceNumber(args[2] ?? num(0));
      if (!s || s.kind === "error") return s ?? BLANK;
      if (start.kind !== "number" || len.kind !== "number") return err(ExcelErrorCode.Value);
      const text = s.kind === "string" ? s.value : String((s as { value?: unknown }).value ?? "");
      return str(text.substr(Math.max(0, start.value - 1), Math.max(0, len.value)));
    }),
  );
  add(
    fn("CONCATENATE", "none", (args) => {
      let out: ExcelValue = str("");
      for (const a of args) out = excelConcat(out, a);
      return out;
    }),
  );
  add(
    fn("CONCAT", "none", (args) => {
      let out: ExcelValue = str("");
      for (const a of flattenArgs(args)) out = excelConcat(out, a);
      return out;
    }),
  );
  add(
    fn("TEXT", "none", (args) => {
      // Simplified — full number format via number-format package at call sites
      const v = args[0] ?? BLANK;
      if (v.kind === "number") return str(String(v.value));
      if (v.kind === "string") return v;
      return str("");
    }),
  );
  add(
    fn("VALUE", "none", (args) => excelCoerceNumber(args[0] ?? BLANK)),
  );
  add(
    fn("FIND", "none", (args) => {
      const find = args[0];
      const within = args[1];
      const start = excelCoerceNumber(args[2] ?? num(1));
      if (find?.kind !== "string" || within?.kind !== "string" || start.kind !== "number") {
        return err(ExcelErrorCode.Value);
      }
      const idx = within.value.indexOf(find.value, Math.max(0, start.value - 1));
      if (idx < 0) return err(ExcelErrorCode.Value);
      return num(idx + 1);
    }),
  );
  add(
    fn("SUBSTITUTE", "none", (args) => {
      const text = args[0];
      const oldT = args[1];
      const newT = args[2];
      if (text?.kind !== "string" || oldT?.kind !== "string" || newT?.kind !== "string") {
        return err(ExcelErrorCode.Value);
      }
      return str(text.value.split(oldT.value).join(newT.value));
    }),
  );

  // Lookup
  add(
    fn("INDEX", "none", (args) => {
      const arr = args[0];
      const row = excelCoerceNumber(args[1] ?? num(1));
      const col = excelCoerceNumber(args[2] ?? num(1));
      if (!arr || arr.kind !== "array") return arr ?? err(ExcelErrorCode.Ref);
      if (row.kind !== "number" || col.kind !== "number") return err(ExcelErrorCode.Value);
      const r = Math.max(1, row.value) - 1;
      const c = Math.max(1, col.value) - 1;
      const i = r * arr.width + c;
      return arr.values[i] ?? err(ExcelErrorCode.Ref);
    }),
  );
  add(
    fn("MATCH", "none", (args) => {
      const lookup = args[0] ?? BLANK;
      const arr = args[1];
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.NA);
      for (let i = 0; i < arr.values.length; i++) {
        const cmp = excelCompare(lookup, arr.values[i]!, "=");
        if (cmp.kind === "boolean" && cmp.value) return num(i + 1);
      }
      return err(ExcelErrorCode.NA);
    }),
  );
  add(
    fn("VLOOKUP", "none", (args) => {
      const lookup = args[0] ?? BLANK;
      const table = args[1];
      const colIdx = excelCoerceNumber(args[2] ?? num(1));
      const exact = args[3] === undefined ? true : excelCoerceBoolean(args[3]).kind === "boolean" && !(args[3].kind === "boolean" && args[3].value === false);
      // approximate vs exact — simplified exact
      void exact;
      if (!table || table.kind !== "array" || colIdx.kind !== "number") return err(ExcelErrorCode.Ref);
      const width = table.width;
      for (let r = 0; r < table.height; r++) {
        const cell = table.values[r * width] ?? BLANK;
        const cmp = excelCompare(lookup, cell, "=");
        if (cmp.kind === "boolean" && cmp.value) {
          const c = colIdx.value - 1;
          return table.values[r * width + c] ?? err(ExcelErrorCode.Ref);
        }
      }
      return err(ExcelErrorCode.NA);
    }),
  );
  add(
    fn("HLOOKUP", "none", (args) => {
      const lookup = args[0] ?? BLANK;
      const table = args[1];
      const rowIdx = excelCoerceNumber(args[2] ?? num(1));
      if (!table || table.kind !== "array" || rowIdx.kind !== "number") return err(ExcelErrorCode.Ref);
      for (let c = 0; c < table.width; c++) {
        const cell = table.values[c] ?? BLANK;
        const cmp = excelCompare(lookup, cell, "=");
        if (cmp.kind === "boolean" && cmp.value) {
          return table.values[(rowIdx.value - 1) * table.width + c] ?? err(ExcelErrorCode.Ref);
        }
      }
      return err(ExcelErrorCode.NA);
    }),
  );
  add(
    fn("CHOOSE", "none", (args) => {
      const idx = excelCoerceNumber(args[0] ?? BLANK);
      if (idx.kind !== "number") return idx;
      const i = Math.floor(idx.value);
      if (i < 1 || i >= args.length) return err(ExcelErrorCode.Value);
      return args[i] ?? err(ExcelErrorCode.Value);
    }),
  );
  add(
    fn("XLOOKUP", "none", (args) => {
      const lookup = args[0] ?? BLANK;
      const lookupArr = args[1];
      const returnArr = args[2];
      if (!lookupArr || lookupArr.kind !== "array" || !returnArr || returnArr.kind !== "array") {
        return err(ExcelErrorCode.Value);
      }
      for (let i = 0; i < lookupArr.values.length; i++) {
        const cmp = excelCompare(lookup, lookupArr.values[i]!, "=");
        if (cmp.kind === "boolean" && cmp.value) return returnArr.values[i] ?? err(ExcelErrorCode.NA);
      }
      return args[3] ?? err(ExcelErrorCode.NA);
    }),
  );

  // Date
  add(
    fn("DATE", "none", (args) => {
      const y = excelCoerceNumber(args[0] ?? BLANK);
      const m = excelCoerceNumber(args[1] ?? BLANK);
      const d = excelCoerceNumber(args[2] ?? BLANK);
      if (y.kind !== "number" || m.kind !== "number" || d.kind !== "number") return err(ExcelErrorCode.Value);
      const dt = new Date(Date.UTC(y.value, m.value - 1, d.value));
      const epoch = Date.UTC(1899, 11, 30);
      return num((dt.getTime() - epoch) / 86400000);
    }),
  );
  add(fn("TODAY", "semi-volatile", (args, ctx) => {
    void args;
    return num(ctx.todaySerial());
  }));
  add(fn("NOW", "volatile", (args, ctx) => {
    void args;
    return num(ctx.todaySerial() + (Date.now() % 86400000) / 86400000);
  }));
  add(fn("YEAR", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + n.value * 86400000);
    return num(d.getUTCFullYear());
  }));
  add(fn("MONTH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + n.value * 86400000);
    return num(d.getUTCMonth() + 1);
  }));
  add(fn("DAY", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + n.value * 86400000);
    return num(d.getUTCDate());
  }));

  // Info
  add(fn("ISBLANK", "none", (args) => bool((args[0] ?? BLANK).kind === "blank")));
  add(fn("ISERROR", "none", (args) => bool((args[0] ?? BLANK).kind === "error")));
  add(fn("ISNUMBER", "none", (args) => bool((args[0] ?? BLANK).kind === "number")));
  add(fn("ISTEXT", "none", (args) => bool((args[0] ?? BLANK).kind === "string")));
  add(fn("N", "none", (args) => excelCoerceNumber(args[0] ?? BLANK)));
  add(fn("NA", "none", () => err(ExcelErrorCode.NA)));

  // Dynamic array
  add(
    fn("FILTER", "none", (args) => {
      const arr = args[0];
      const include = args[1];
      if (!arr || arr.kind !== "array" || !include || include.kind !== "array") {
        return err(ExcelErrorCode.Value);
      }
      const out: ExcelValue[] = [];
      for (let i = 0; i < arr.height; i++) {
        const flag = include.values[i];
        const b = excelCoerceBoolean(flag ?? BLANK);
        if (b.kind === "boolean" && b.value) {
          for (let c = 0; c < arr.width; c++) out.push(arr.values[i * arr.width + c] ?? BLANK);
        }
      }
      if (out.length === 0) return args[2] ?? err(ExcelErrorCode.Calc);
      return { kind: "array", width: arr.width, height: out.length / arr.width, values: out };
    }),
  );
  add(
    fn("UNIQUE", "none", (args) => {
      const arr = args[0];
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
      const seen = new Set<string>();
      const out: ExcelValue[] = [];
      for (let i = 0; i < arr.height; i++) {
        const row = arr.values.slice(i * arr.width, (i + 1) * arr.width);
        const key = JSON.stringify(row);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(...row);
        }
      }
      return { kind: "array", width: arr.width, height: out.length / arr.width, values: out };
    }),
  );
  add(
    fn("SORT", "none", (args) => {
      const arr = args[0];
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
      const rows: ExcelValue[][] = [];
      for (let i = 0; i < arr.height; i++) {
        rows.push(arr.values.slice(i * arr.width, (i + 1) * arr.width));
      }
      rows.sort((a, b) => {
        const av = a[0];
        const bv = b[0];
        if (av?.kind === "number" && bv?.kind === "number") return av.value - bv.value;
        return String(av).localeCompare(String(bv));
      });
      return { kind: "array", width: arr.width, height: arr.height, values: rows.flat() };
    }),
  );
  add(
    fn("SEQUENCE", "none", (args) => {
      const rows = excelCoerceNumber(args[0] ?? num(1));
      const cols = excelCoerceNumber(args[1] ?? num(1));
      const start = excelCoerceNumber(args[2] ?? num(1));
      const step = excelCoerceNumber(args[3] ?? num(1));
      if (rows.kind !== "number" || cols.kind !== "number" || start.kind !== "number" || step.kind !== "number") {
        return err(ExcelErrorCode.Value);
      }
      const values: ExcelValue[] = [];
      let v = start.value;
      for (let r = 0; r < rows.value; r++) {
        for (let c = 0; c < cols.value; c++) {
          values.push(num(v));
          v += step.value;
        }
      }
      return { kind: "array", width: cols.value, height: rows.value, values };
    }),
  );
  add(
    fn("RANDARRAY", "volatile", (args, ctx) => {
      const rows = excelCoerceNumber(args[0] ?? num(1));
      const cols = excelCoerceNumber(args[1] ?? num(1));
      if (rows.kind !== "number" || cols.kind !== "number") return err(ExcelErrorCode.Value);
      const rh = Math.max(1, Math.floor(rows.value));
      const cw = Math.max(1, Math.floor(cols.value));
      const values: ExcelValue[] = [];
      for (let i = 0; i < rh * cw; i++) values.push(num(ctx.random()));
      return { kind: "array", width: cw, height: rh, values };
    }),
  );
  add(
    fn("TOCOL", "none", (args) => {
      const arr = args[0];
      if (arr && arr.kind === "array") {
        return { kind: "array", width: 1, height: arr.values.length, values: [...arr.values] };
      }
      return { kind: "array", width: 1, height: 1, values: [args[0] ?? BLANK] };
    }),
  );
  add(
    fn("TOROW", "none", (args) => {
      const arr = args[0];
      if (arr && arr.kind === "array") {
        return { kind: "array", width: arr.values.length, height: 1, values: [...arr.values] };
      }
      return { kind: "array", width: 1, height: 1, values: [args[0] ?? BLANK] };
    }),
  );
  add(fn("RAND", "volatile", (_a, ctx) => num(ctx.random())));
  add(fn("RANDBETWEEN", "volatile", (args, ctx) => {
    const lo = excelCoerceNumber(args[0] ?? num(0));
    const hi = excelCoerceNumber(args[1] ?? num(1));
    if (lo.kind !== "number" || hi.kind !== "number") return err(ExcelErrorCode.Value);
    const r = ctx.random();
    return num(Math.floor(r * (hi.value - lo.value + 1)) + lo.value);
  }));

  // Additional math
  add(fn("ROUNDUP", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const d = excelCoerceNumber(args[1] ?? num(0));
    if (n.kind !== "number" || d.kind !== "number") return err(ExcelErrorCode.Value);
    const f = 10 ** Math.floor(d.value);
    return num(Math.sign(n.value) * Math.ceil(Math.abs(n.value) * f) / f);
  }));
  add(fn("ROUNDDOWN", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const d = excelCoerceNumber(args[1] ?? num(0));
    if (n.kind !== "number" || d.kind !== "number") return err(ExcelErrorCode.Value);
    const f = 10 ** Math.floor(d.value);
    return num(Math.sign(n.value) * Math.floor(Math.abs(n.value) * f) / f);
  }));
  add(fn("CEILING", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const sig = excelCoerceNumber(args[1] ?? num(1));
    if (n.kind !== "number" || sig.kind !== "number" || sig.value === 0) return err(ExcelErrorCode.Value);
    return num(Math.ceil(n.value / sig.value) * sig.value);
  }));
  add(fn("CEILING.MATH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const sig = excelCoerceNumber(args[1] ?? num(1));
    if (n.kind !== "number" || sig.kind !== "number" || sig.value === 0) return err(ExcelErrorCode.Value);
    return num(Math.ceil(n.value / sig.value) * sig.value);
  }));
  add(fn("FLOOR", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const sig = excelCoerceNumber(args[1] ?? num(1));
    if (n.kind !== "number" || sig.kind !== "number" || sig.value === 0) return err(ExcelErrorCode.Value);
    return num(Math.floor(n.value / sig.value) * sig.value);
  }));
  add(fn("FLOOR.MATH", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const sig = excelCoerceNumber(args[1] ?? num(1));
    if (n.kind !== "number" || sig.kind !== "number" || sig.value === 0) return err(ExcelErrorCode.Value);
    return num(Math.floor(n.value / sig.value) * sig.value);
  }));
  add(fn("LOG", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const base = excelCoerceNumber(args[1] ?? num(10));
    if (n.kind !== "number" || base.kind !== "number") return err(ExcelErrorCode.Value);
    if (n.value <= 0 || base.value <= 0 || base.value === 1) return err(ExcelErrorCode.Num);
    return num(Math.log(n.value) / Math.log(base.value));
  }));
  add(fn("LOG10", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number" || n.value <= 0) return err(ExcelErrorCode.Num);
    return num(Math.log10(n.value));
  }));
  add(fn("LN", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number" || n.value <= 0) return err(ExcelErrorCode.Num);
    return num(Math.log(n.value));
  }));
  add(fn("EXP", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    return num(Math.exp(n.value));
  }));
  add(fn("FACT", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number" || n.value < 0) return err(ExcelErrorCode.Num);
    let f = 1;
    for (let i = 2; i <= Math.floor(n.value); i++) f *= i;
    return num(f);
  }));
  add(fn("COMBIN", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const k = excelCoerceNumber(args[1] ?? BLANK);
    if (n.kind !== "number" || k.kind !== "number") return err(ExcelErrorCode.Value);
    const ni = Math.floor(n.value);
    const ki = Math.floor(k.value);
    if (ki < 0 || ki > ni) return err(ExcelErrorCode.Num);
    let r = 1;
    for (let i = 0; i < ki; i++) r = (r * (ni - i)) / (i + 1);
    return num(Math.round(r));
  }));
  add(fn("EVEN", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const v = Math.ceil(Math.abs(n.value));
    const r = v % 2 === 0 ? v : v + 1;
    return num(n.value >= 0 ? r : -r);
  }));
  add(fn("ODD", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const v = Math.ceil(Math.abs(n.value));
    const r = v % 2 === 1 ? v : v + 1;
    return num(n.value >= 0 ? r : -r);
  }));
  add(fn("TRUNC", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    const d = excelCoerceNumber(args[1] ?? num(0));
    if (n.kind !== "number" || d.kind !== "number") return err(ExcelErrorCode.Value);
    const f = 10 ** Math.floor(d.value);
    return num(Math.trunc(n.value * f) / f);
  }));

  // Additional statistical
  add(fn("MEDIAN", "none", (args) => {
    const nums: number[] = [];
    for (const v of flattenArgs(args)) if (v.kind === "number") nums.push(v.value);
    if (nums.length === 0) return err(ExcelErrorCode.Num);
    nums.sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    return num(nums.length % 2 ? nums[mid]! : (nums[mid - 1]! + nums[mid]!) / 2);
  }));
  add(fn("LARGE", "none", (args) => {
    const arr = args[0];
    const k = excelCoerceNumber(args[1] ?? num(1));
    if (!arr || arr.kind !== "array" || k.kind !== "number") return err(ExcelErrorCode.Value);
    const nums = arr.values.filter((v) => v.kind === "number").map((v) => (v as { value: number }).value);
    nums.sort((a, b) => b - a);
    const i = Math.floor(k.value) - 1;
    return i >= 0 && i < nums.length ? num(nums[i]!) : err(ExcelErrorCode.Num);
  }));
  add(fn("SMALL", "none", (args) => {
    const arr = args[0];
    const k = excelCoerceNumber(args[1] ?? num(1));
    if (!arr || arr.kind !== "array" || k.kind !== "number") return err(ExcelErrorCode.Value);
    const nums = arr.values.filter((v) => v.kind === "number").map((v) => (v as { value: number }).value);
    nums.sort((a, b) => a - b);
    const i = Math.floor(k.value) - 1;
    return i >= 0 && i < nums.length ? num(nums[i]!) : err(ExcelErrorCode.Num);
  }));
  add(fn("RANK", "none", (args) => {
    const val = excelCoerceNumber(args[0] ?? BLANK);
    const arr = args[1];
    const order = excelCoerceNumber(args[2] ?? num(0));
    if (val.kind !== "number" || !arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
    const nums = arr.values.filter((v) => v.kind === "number").map((v) => (v as { value: number }).value);
    const asc = order.kind === "number" && order.value !== 0;
    nums.sort((a, b) => (asc ? a - b : b - a));
    const idx = nums.indexOf(val.value);
    return idx >= 0 ? num(idx + 1) : err(ExcelErrorCode.NA);
  }));
  add(fn("RANK.EQ", "none", (args) => {
    const val = excelCoerceNumber(args[0] ?? BLANK);
    const arr = args[1];
    const order = excelCoerceNumber(args[2] ?? num(0));
    if (val.kind !== "number" || !arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
    const nums = arr.values.filter((v) => v.kind === "number").map((v) => (v as { value: number }).value);
    const asc = order.kind === "number" && order.value !== 0;
    nums.sort((a, b) => (asc ? a - b : b - a));
    const idx = nums.indexOf(val.value);
    return idx >= 0 ? num(idx + 1) : err(ExcelErrorCode.NA);
  }));
  add(fn("STDEV", "none", (args) => {
    const nums: number[] = [];
    for (const v of flattenArgs(args)) if (v.kind === "number") nums.push(v.value);
    if (nums.length < 2) return err(ExcelErrorCode.Div0);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
    return num(Math.sqrt(variance));
  }));
  add(fn("STDEV.S", "none", (args) => {
    const nums: number[] = [];
    for (const v of flattenArgs(args)) if (v.kind === "number") nums.push(v.value);
    if (nums.length < 2) return err(ExcelErrorCode.Div0);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
    return num(Math.sqrt(variance));
  }));
  add(fn("VAR", "none", (args) => {
    const nums: number[] = [];
    for (const v of flattenArgs(args)) if (v.kind === "number") nums.push(v.value);
    if (nums.length < 2) return err(ExcelErrorCode.Div0);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return num(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1));
  }));

  // COUNTIF / SUMIF / AVERAGEIF / COUNTIFS / SUMIFS / SUMPRODUCT
  add(fn("COUNTIF", "none", (args) => {
    const range = args[0];
    const criteria = args[1] ?? BLANK;
    if (!range || range.kind !== "array") return num(0);
    let count = 0;
    for (const v of range.values) if (matchesCriteria(v, criteria)) count++;
    return num(count);
  }));
  add(fn("COUNTIFS", "none", (args) => {
    if (args.length < 2 || args.length % 2 !== 0) return err(ExcelErrorCode.Value);
    const ranges: ExcelValue[][] = [];
    const criteria: ExcelValue[] = [];
    for (let i = 0; i < args.length; i += 2) {
      const r = args[i]!;
      ranges.push(r.kind === "array" ? r.values : [r]);
      criteria.push(args[i + 1] ?? BLANK);
    }
    const len = ranges[0]!.length;
    let count = 0;
    for (let i = 0; i < len; i++) {
      if (ranges.every((r, j) => matchesCriteria(r[i] ?? BLANK, criteria[j]!))) count++;
    }
    return num(count);
  }));
  add(fn("SUMIF", "none", (args) => {
    const range = args[0];
    const criteria = args[1] ?? BLANK;
    const sumRange = args[2] ?? range;
    if (!range || range.kind !== "array") return num(0);
    const sums = sumRange?.kind === "array" ? sumRange.values : range.values;
    let s = 0;
    for (let i = 0; i < range.values.length; i++) {
      if (matchesCriteria(range.values[i]!, criteria)) {
        const sv = sums[i];
        if (sv?.kind === "number") s += sv.value;
      }
    }
    return num(s);
  }));
  add(fn("SUMIFS", "none", (args) => {
    const sumRange = args[0];
    if (!sumRange || sumRange.kind !== "array") return num(0);
    if (args.length < 3 || (args.length - 1) % 2 !== 0) return err(ExcelErrorCode.Value);
    const ranges: ExcelValue[][] = [];
    const criteria: ExcelValue[] = [];
    for (let i = 1; i < args.length; i += 2) {
      const r = args[i]!;
      ranges.push(r.kind === "array" ? r.values : [r]);
      criteria.push(args[i + 1] ?? BLANK);
    }
    let s = 0;
    for (let i = 0; i < sumRange.values.length; i++) {
      if (ranges.every((r, j) => matchesCriteria(r[i] ?? BLANK, criteria[j]!))) {
        const sv = sumRange.values[i];
        if (sv?.kind === "number") s += sv.value;
      }
    }
    return num(s);
  }));
  add(fn("AVERAGEIF", "none", (args) => {
    const range = args[0];
    const criteria = args[1] ?? BLANK;
    const avgRange = args[2] ?? range;
    if (!range || range.kind !== "array") return err(ExcelErrorCode.Div0);
    const sums = avgRange?.kind === "array" ? avgRange.values : range.values;
    let s = 0;
    let c = 0;
    for (let i = 0; i < range.values.length; i++) {
      if (matchesCriteria(range.values[i]!, criteria)) {
        const sv = sums[i];
        if (sv?.kind === "number") { s += sv.value; c++; }
      }
    }
    return c ? num(s / c) : err(ExcelErrorCode.Div0);
  }));
  add(fn("SUMPRODUCT", "none", (args) => {
    const arrays = args.filter((a) => a?.kind === "array") as Extract<ExcelValue, { kind: "array" }>[];
    if (arrays.length === 0) return err(ExcelErrorCode.Value);
    const len = Math.min(...arrays.map((a) => a.values.length));
    let s = 0;
    for (let i = 0; i < len; i++) {
      let product = 1;
      for (const a of arrays) {
        const v = a.values[i];
        product *= v?.kind === "number" ? v.value : 0;
      }
      s += product;
    }
    return num(s);
  }));

  // Additional text
  add(fn("REPT", "none", (args) => {
    const s = args[0];
    const n = excelCoerceNumber(args[1] ?? num(0));
    if (!s || s.kind !== "string" || n.kind !== "number") return err(ExcelErrorCode.Value);
    if (n.value < 0) return err(ExcelErrorCode.Value);
    return str(s.value.repeat(Math.floor(n.value)));
  }));
  add(fn("EXACT", "none", (args) => {
    const a = args[0];
    const b = args[1];
    if (a?.kind === "string" && b?.kind === "string") return bool(a.value === b.value);
    return bool(false);
  }));
  add(fn("CLEAN", "none", (args) => {
    const s = args[0];
    if (!s || s.kind !== "string") return str("");
    return str(s.value.replace(/[\x00-\x1f]/g, ""));
  }));
  add(fn("CHAR", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    return str(String.fromCharCode(Math.floor(n.value)));
  }));
  add(fn("CODE", "none", (args) => {
    const s = args[0];
    if (!s || s.kind !== "string" || s.value.length === 0) return err(ExcelErrorCode.Value);
    return num(s.value.charCodeAt(0));
  }));
  add(fn("REPLACE", "none", (args) => {
    const s = args[0];
    const start = excelCoerceNumber(args[1] ?? num(1));
    const len = excelCoerceNumber(args[2] ?? num(0));
    const newText = args[3];
    if (!s || s.kind !== "string" || start.kind !== "number" || len.kind !== "number" || !newText || newText.kind !== "string") {
      return err(ExcelErrorCode.Value);
    }
    const i = Math.max(0, start.value - 1);
    return str(s.value.slice(0, i) + newText.value + s.value.slice(i + Math.max(0, len.value)));
  }));
  add(fn("SEARCH", "none", (args) => {
    const find = args[0];
    const within = args[1];
    const start = excelCoerceNumber(args[2] ?? num(1));
    if (find?.kind !== "string" || within?.kind !== "string" || start.kind !== "number") return err(ExcelErrorCode.Value);
    const idx = within.value.toLowerCase().indexOf(find.value.toLowerCase(), Math.max(0, start.value - 1));
    if (idx < 0) return err(ExcelErrorCode.Value);
    return num(idx + 1);
  }));
  add(fn("T", "none", (args) => {
    const v = args[0] ?? BLANK;
    return v.kind === "string" ? v : str("");
  }));
  add(fn("NUMBERVALUE", "none", (args) => excelCoerceNumber(args[0] ?? BLANK)));

  // Additional logical
  add(fn("IFS", "none", (args) => {
    for (let i = 0; i < args.length - 1; i += 2) {
      const cond = excelCoerceBoolean(args[i] ?? BLANK);
      if (cond.kind === "error") return cond;
      if (cond.kind === "boolean" && cond.value) return args[i + 1] ?? BLANK;
    }
    return err(ExcelErrorCode.NA);
  }));
  add(fn("SWITCH", "none", (args) => {
    const expr = args[0] ?? BLANK;
    for (let i = 1; i < args.length - 1; i += 2) {
      const cmp = excelCompare(expr, args[i]!, "=");
      if (cmp.kind === "boolean" && cmp.value) return args[i + 1] ?? BLANK;
    }
    return args.length % 2 === 0 ? args[args.length - 1] ?? err(ExcelErrorCode.NA) : err(ExcelErrorCode.NA);
  }));
  add(fn("IFNA", "none", (args) => {
    const v = args[0] ?? BLANK;
    if (v.kind === "error" && v.code === ExcelErrorCode.NA) return args[1] ?? BLANK;
    return v;
  }));
  add(fn("XOR", "none", (args) => {
    let trueCount = 0;
    for (const v of flattenArgs(args)) {
      const b = excelCoerceBoolean(v);
      if (b.kind === "error") return b;
      if (b.kind === "boolean" && b.value) trueCount++;
    }
    return bool(trueCount % 2 === 1);
  }));

  // Additional lookup
  add(fn("ROW", "none", (_args, ctx) => num(ctx.row + 1)));
  add(fn("COLUMN", "none", (_args, ctx) => num(ctx.column + 1)));
  add(fn("ROWS", "none", (args) => {
    const a = args[0];
    if (a?.kind === "array") return num(a.height);
    return num(1);
  }));
  add(fn("COLUMNS", "none", (args) => {
    const a = args[0];
    if (a?.kind === "array") return num(a.width);
    return num(1);
  }));
  add(fn("INDIRECT", "none", () => err(ExcelErrorCode.Ref)));
  add(fn("OFFSET", "none", () => err(ExcelErrorCode.Ref)));
  add(fn("TYPE", "none", (args) => {
    const v = args[0] ?? BLANK;
    if (v.kind === "number") return num(1);
    if (v.kind === "string") return num(2);
    if (v.kind === "boolean") return num(4);
    if (v.kind === "error") return num(16);
    if (v.kind === "array") return num(64);
    return num(1);
  }));
  add(fn("ISNA", "none", (args) => bool((args[0] ?? BLANK).kind === "error" && (args[0] as { code: string }).code === ExcelErrorCode.NA)));
  add(fn("ISLOGICAL", "none", (args) => bool((args[0] ?? BLANK).kind === "boolean")));
  add(fn("ISEVEN", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? bool(Math.floor(n.value) % 2 === 0) : err(ExcelErrorCode.Value);
  }));
  add(fn("ISODD", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    return n.kind === "number" ? bool(Math.floor(n.value) % 2 === 1) : err(ExcelErrorCode.Value);
  }));

  // Trig
  add(fn("SIN", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(Math.sin(n.value)) : n; }));
  add(fn("COS", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(Math.cos(n.value)) : n; }));
  add(fn("TAN", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(Math.tan(n.value)) : n; }));
  add(fn("ASIN", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(Math.asin(n.value)) : n; }));
  add(fn("ACOS", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(Math.acos(n.value)) : n; }));
  add(fn("ATAN", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(Math.atan(n.value)) : n; }));
  add(fn("ATAN2", "none", (args) => {
    const x = excelCoerceNumber(args[0] ?? BLANK);
    const y = excelCoerceNumber(args[1] ?? BLANK);
    if (x.kind !== "number" || y.kind !== "number") return err(ExcelErrorCode.Value);
    return num(Math.atan2(y.value, x.value));
  }));
  add(fn("RADIANS", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(n.value * Math.PI / 180) : n; }));
  add(fn("DEGREES", "none", (args) => { const n = excelCoerceNumber(args[0] ?? BLANK); return n.kind === "number" ? num(n.value * 180 / Math.PI) : n; }));

  // Date extras
  add(fn("DATE", "none", (args) => {
    const y = excelCoerceNumber(args[0] ?? BLANK);
    const m = excelCoerceNumber(args[1] ?? BLANK);
    const d = excelCoerceNumber(args[2] ?? BLANK);
    if (y.kind !== "number" || m.kind !== "number" || d.kind !== "number") return err(ExcelErrorCode.Value);
    const epoch = Date.UTC(1899, 11, 30);
    const dt = Date.UTC(y.value, m.value - 1, d.value);
    return num(Math.round((dt - epoch) / 86400000));
  }));
  add(fn("HOUR", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const frac = n.value - Math.floor(n.value);
    return num(Math.floor(frac * 24) % 24);
  }));
  add(fn("MINUTE", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const frac = n.value - Math.floor(n.value);
    return num(Math.floor(frac * 1440) % 60);
  }));
  add(fn("SECOND", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const frac = n.value - Math.floor(n.value);
    return num(Math.floor(frac * 86400) % 60);
  }));
  add(fn("WEEKDAY", "none", (args) => {
    const n = excelCoerceNumber(args[0] ?? BLANK);
    if (n.kind !== "number") return n;
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + n.value * 86400000);
    return num(d.getUTCDay() + 1);
  }));
  add(fn("EOMONTH", "none", (args) => {
    const start = excelCoerceNumber(args[0] ?? BLANK);
    const months = excelCoerceNumber(args[1] ?? num(0));
    if (start.kind !== "number" || months.kind !== "number") return err(ExcelErrorCode.Value);
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + start.value * 86400000);
    d.setUTCMonth(d.getUTCMonth() + months.value + 1, 0);
    return num(Math.round((d.getTime() - epoch) / 86400000));
  }));
  add(fn("DATEVALUE", "none", (args) => {
    const s = args[0];
    if (!s || s.kind !== "string") return err(ExcelErrorCode.Value);
    const d = Date.parse(s.value);
    if (isNaN(d)) return err(ExcelErrorCode.Value);
    const epoch = Date.UTC(1899, 11, 30);
    return num(Math.round((d - epoch) / 86400000));
  }));

  // Financial
  add(fn("PMT", "none", (args) => {
    const rate = excelCoerceNumber(args[0] ?? BLANK);
    const nper = excelCoerceNumber(args[1] ?? BLANK);
    const pv = excelCoerceNumber(args[2] ?? BLANK);
    if (rate.kind !== "number" || nper.kind !== "number" || pv.kind !== "number") return err(ExcelErrorCode.Value);
    if (rate.value === 0) return num(-pv.value / nper.value);
    const r = rate.value;
    return num((-pv.value * r * (1 + r) ** nper.value) / ((1 + r) ** nper.value - 1));
  }));

  registerExtraFunctions(add);
  registerFinancialFunctions(add);
  registerForecastFunctions(add);
  registerGoogleSheetsFunctions(add);
  registerStatisticalFunctions(add);
  registerDistributionFunctions(add);
  registerCompatibilityFunctions(add, reg);
  registerMissingFunctions(add, reg);
  registerDate2Functions(add);
  registerDatabaseFunctions(add);
  registerMath2Functions(add);
  registerEngineeringFunctions(add);
  registerFinancial2Functions(add);
  registerFormulaReplacementFunctions(add);
  registerFilterXmlFunction(add);

  return reg;
}
