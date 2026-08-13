/**
 * Additional Excel-compatible functions toward full compatibility.
 * These are registered by src/functions/builtins.ts so they share
 * the same runtime contract as built-in functions.
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
  type NumberValue,
} from "../model/value.js";
import {
  excelCoerceBoolean,
  excelCoerceNumber,
  excelCoerceString,
  excelCompare,
} from "../formula/coercion.js";
import { flattenArgs } from "../formula/evaluator.js";
import type { ExcelFunction, EvaluationContext } from "../formula/functions-types.js";

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

function requireNumber(
  arg: ExcelValue | undefined,
  defaultValue: number,
): { ok: true; value: number } | { ok: false; error: ExcelValue } {
  if (arg === undefined) return { ok: true, value: defaultValue };
  const n = excelCoerceNumber(arg);
  if (n.kind === "number") return { ok: true, value: n.value };
  return { ok: false, error: n };
}

function rankValue(a: ExcelValue, b: ExcelValue): number {
  if (a.kind === "number" && b.kind === "number") {
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  }
  if (a.kind === "string" && b.kind === "string") {
    const x = a.value.toUpperCase();
    const y = b.value.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  const xn = excelCoerceNumber(a);
  const yn = excelCoerceNumber(b);
  if (xn.kind === "number" && yn.kind === "number") {
    return xn.value < yn.value ? -1 : xn.value > yn.value ? 1 : 0;
  }
  const xs = excelCoerceString(a);
  const ys = excelCoerceString(b);
  if (xs.kind === "string" && ys.kind === "string") {
    const xu = xs.value.toUpperCase();
    const yu = ys.value.toUpperCase();
    return xu < yu ? -1 : xu > yu ? 1 : 0;
  }
  return 0;
}

function matchesWildcard(cell: ExcelValue, pattern: string): boolean {
  const s = cell.kind === "string" ? cell.value : cell.kind === "number" ? String(cell.value) : "";
  const regex = "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
  return new RegExp(regex, "i").test(s);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitLiteral(text: string, delimiter: string, caseInsensitive: boolean): string[] {
  if (delimiter === "") return [text];
  if (caseInsensitive) return text.split(new RegExp(escapeRegex(delimiter), "i"));
  return text.split(delimiter);
}

function medianOf(nums: number[]): number {
  nums.sort((a, b) => a - b);
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid]! : (nums[mid - 1]! + nums[mid]!) / 2;
}

function sampleStdDev(nums: number[]): ExcelValue {
  if (nums.length < 2) return err(ExcelErrorCode.Div0);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
  return num(Math.sqrt(variance));
}

function populationStdDev(nums: number[]): ExcelValue {
  if (nums.length === 0) return err(ExcelErrorCode.Div0);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return num(Math.sqrt(variance));
}

function sampleVariance(nums: number[]): ExcelValue {
  if (nums.length < 2) return err(ExcelErrorCode.Div0);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return num(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1));
}

function populationVariance(nums: number[]): ExcelValue {
  if (nums.length === 0) return err(ExcelErrorCode.Div0);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return num(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
}

function numericAggregateValues(values: ExcelValue[]): { numbers: number[]; error?: ExcelValue } {
  const numbers: number[] = [];
  for (const v of values) {
    if (v.kind === "error") return { numbers, error: v };
    if (v.kind === "number") numbers.push(v.value);
    else if (v.kind === "boolean") numbers.push(v.value ? 1 : 0);
  }
  return { numbers };
}

function aggregate(fn: number, values: ExcelValue[], k: number | undefined): ExcelValue {
  if (fn === 2 || fn === 102) return num(values.filter((v) => v.kind === "number").length);
  if (fn === 3 || fn === 103) return num(values.filter((v) => v.kind !== "blank").length);
  const { numbers: nums, error } = numericAggregateValues(values);
  if (error) return error;
  switch (fn) {
    case 1:
    case 101:
      return nums.length ? num(nums.reduce((a, b) => a + b, 0) / nums.length) : err(ExcelErrorCode.Div0);
    case 2:
    case 102:
      return num(nums.length);
    case 3:
    case 103:
      return num(values.filter((v) => v.kind !== "blank").length);
    case 4:
    case 104:
      return nums.length ? num(Math.max(...nums)) : num(0);
    case 5:
    case 105:
      return nums.length ? num(Math.min(...nums)) : num(0);
    case 6:
    case 106:
      return nums.length ? num(nums.reduce((a, b) => a * b, 1)) : num(0);
    case 7:
    case 107:
      return sampleStdDev(nums);
    case 8:
    case 108:
      return populationStdDev(nums);
    case 9:
    case 109:
      return num(nums.reduce((a, b) => a + b, 0));
    case 10:
    case 110:
      return sampleVariance(nums);
    case 11:
    case 111:
      return populationVariance(nums);
    case 12:
      return nums.length ? num(medianOf(nums)) : err(ExcelErrorCode.Num);
    case 14:
    case 114: {
      if (k === undefined) return err(ExcelErrorCode.Value);
      const sorted = [...nums].sort((a, b) => b - a);
      const idx = Math.trunc(k) - 1;
      return idx >= 0 && idx < sorted.length ? num(sorted[idx]!) : err(ExcelErrorCode.Num);
    }
    case 15:
    case 115: {
      if (k === undefined) return err(ExcelErrorCode.Value);
      const sorted = [...nums].sort((a, b) => a - b);
      const idx = Math.trunc(k) - 1;
      return idx >= 0 && idx < sorted.length ? num(sorted[idx]!) : err(ExcelErrorCode.Num);
    }
    default:
      return err(ExcelErrorCode.Value);
  }
}

function findOccurrence(text: string, delim: string, instance: number, caseInsensitive: boolean): number {
  const t = caseInsensitive ? text.toLowerCase() : text;
  const d = caseInsensitive ? delim.toLowerCase() : delim;
  if (instance > 0) {
    let pos = -d.length;
    for (let i = 0; i < instance; i++) {
      pos = t.indexOf(d, pos + d.length);
      if (pos < 0) return -1;
    }
    return pos;
  }
  if (instance < 0) {
    const positions: number[] = [];
    let pos = 0;
    while ((pos = t.indexOf(d, pos)) >= 0) {
      positions.push(pos);
      pos += d.length;
    }
    const idx = positions.length + instance;
    return idx >= 0 ? positions[idx]! : -1;
  }
  return -1;
}

function npv(rate: number, cashFlows: number[]): number {
  let sum = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    sum += cashFlows[i]! / (1 + rate) ** (i + 1);
  }
  return sum;
}

function irrFunction(values: number[], guess: number): ExcelValue {
  const hasPositive = values.some((v) => v > 0);
  const hasNegative = values.some((v) => v < 0);
  if (!hasPositive || !hasNegative) return err(ExcelErrorCode.Num);

  const f = (r: number) => {
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i]! / (1 + r) ** i;
    return sum;
  };

  let r = guess;
  for (let i = 0; i < 100; i++) {
    const fr = f(r);
    const dr = (f(r + 1e-7) - f(r - 1e-7)) / 2e-7;
    if (Math.abs(fr) < 1e-7) return num(r);
    if (dr === 0) break;
    r = r - fr / dr;
  }
  return err(ExcelErrorCode.Num);
}

function annuityFactor(r: number, n: number): number {
  if (Math.abs(r) < 1e-15) return n;
  return ((1 + r) ** n - 1) / r;
}

export function registerExtraFunctions(add: (f: ExcelFunction) => void): void {
  // Array
  add(
    fn("TRANSPOSE", "none", (args) => {
      const arr = args[0];
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
      const values: ExcelValue[] = [];
      for (let c = 0; c < arr.width; c++) {
        for (let r = 0; r < arr.height; r++) {
          values.push(arr.values[r * arr.width + c] ?? BLANK);
        }
      }
      return { kind: "array", width: arr.height, height: arr.width, values };
    }),
  );

  add(
    fn("SORTBY", "none", (args) => {
      const arr = args[0];
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.Value);
      const rows: ExcelValue[][] = [];
      for (let r = 0; r < arr.height; r++) {
        rows.push(arr.values.slice(r * arr.width, (r + 1) * arr.width));
      }
      const keys: { values: ExcelValue[]; order: number }[] = [];
      for (let i = 1; i < args.length; i += 2) {
        const byArr = args[i];
        if (!byArr || byArr.kind !== "array") return err(ExcelErrorCode.Value);
        const orderArg = requireNumber(args[i + 1], 1);
        if (!orderArg.ok) return orderArg.error;
        keys.push({ values: byArr.values, order: orderArg.value === -1 ? -1 : 1 });
      }
      if (keys.length === 0) return arr;
      const indices = rows.map((_, i) => i);
      indices.sort((a, b) => {
        for (const key of keys) {
          const va = key.values[a] ?? BLANK;
          const vb = key.values[b] ?? BLANK;
          const c = rankValue(va, vb);
          if (c === 0) continue;
          return c * key.order;
        }
        return 0;
      });
      const out: ExcelValue[] = [];
      for (const i of indices) out.push(...rows[i]!);
      return { kind: "array", width: arr.width, height: arr.height, values: out };
    }),
  );

  add(
    fn("MMULT", "none", (args) => {
      const a = args[0];
      const b = args[1];
      if (!a || a.kind !== "array" || !b || b.kind !== "array") return err(ExcelErrorCode.Value);
      if (a.width !== b.height) return err(ExcelErrorCode.Value);
      const values: ExcelValue[] = [];
      for (let i = 0; i < a.height; i++) {
        for (let j = 0; j < b.width; j++) {
          let sum = 0;
          for (let k = 0; k < a.width; k++) {
            const av = a.values[i * a.width + k] ?? BLANK;
            const bv = b.values[k * b.width + j] ?? BLANK;
            const an = excelCoerceNumber(av);
            const bn = excelCoerceNumber(bv);
            if (an.kind !== "number" || bn.kind !== "number") return err(ExcelErrorCode.Value);
            sum += an.value * bn.value;
          }
          values.push(num(sum));
        }
      }
      return { kind: "array", width: b.width, height: a.height, values };
    }),
  );

  // Text
  add(
    fn("TEXTJOIN", "none", (args) => {
      const delim = excelCoerceString(args[0] ?? BLANK);
      if (delim.kind !== "string") return err(ExcelErrorCode.Value);
      const ignoreEmptyArg = args[1] ?? BLANK;
      const ignoreEmptyVal = excelCoerceBoolean(ignoreEmptyArg);
      if (ignoreEmptyVal.kind === "error") return ignoreEmptyVal;
      if (ignoreEmptyVal.kind !== "boolean") return ignoreEmptyVal;
      const ignoreEmpty = ignoreEmptyArg.kind === "blank" ? true : ignoreEmptyVal.value;
      const parts: string[] = [];
      for (let i = 2; i < args.length; i++) {
        const a = args[i];
        if (!a) continue;
        const list = a.kind === "array" ? a.values : [a];
        for (const v of list) {
          if (ignoreEmpty && v.kind === "blank") continue;
          if (v.kind === "error") return v;
          const s = excelCoerceString(v);
          if (s.kind !== "string") return err(ExcelErrorCode.Value);
          if (ignoreEmpty && s.value === "") continue;
          parts.push(s.value);
        }
      }
      return str(parts.join(delim.value));
    }),
  );

  add(
    fn("TEXTSPLIT", "none", (args) => {
      const textArg = args[0];
      const colDelimArg = args[1];
      if (!textArg || textArg.kind !== "string" || !colDelimArg || colDelimArg.kind !== "string") {
        return err(ExcelErrorCode.Value);
      }
      const rowDelimArg = args[2];
      const rowDelim = rowDelimArg?.kind === "string" && rowDelimArg.value !== "" ? rowDelimArg.value : undefined;
      const ignoreEmptyArg = excelCoerceBoolean(args[3] ?? BLANK);
      if (ignoreEmptyArg.kind === "error") return ignoreEmptyArg;
      if (ignoreEmptyArg.kind !== "boolean") return ignoreEmptyArg;
      const ignoreEmpty = args[3] === undefined ? false : ignoreEmptyArg.value;
      const matchMode = requireNumber(args[4], 0);
      if (!matchMode.ok) return matchMode.error;
      const caseInsensitive = matchMode.value === 1;
      let padWith: ExcelValue | undefined;
      if (args[5] !== undefined) {
        const p = excelCoerceString(args[5]);
        if (p.kind !== "string") return err(ExcelErrorCode.Value);
        padWith = p;
      }

      const rows: string[][] = [];
      const rawRows = rowDelim !== undefined ? splitLiteral(textArg.value, rowDelim, caseInsensitive) : [textArg.value];
      for (const rowText of rawRows) {
        const cols = splitLiteral(rowText, colDelimArg.value, caseInsensitive);
        rows.push(ignoreEmpty ? cols.filter((c) => c !== "") : cols);
      }
      const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
      const padValue: ExcelValue = padWith ?? err(ExcelErrorCode.NA);
      const values: ExcelValue[] = [];
      for (const row of rows) {
        for (let c = 0; c < maxCols; c++) {
          const cell = row[c];
          values.push(cell === undefined ? padValue : str(cell));
        }
      }
      return { kind: "array", width: maxCols, height: rows.length, values };
    }),
  );

  add(
    fn("TEXTBEFORE", "none", (args) => {
      const textArg = args[0];
      const delimArg = args[1];
      if (!textArg || textArg.kind !== "string" || !delimArg || delimArg.kind !== "string") {
        return err(ExcelErrorCode.Value);
      }
      const instance = requireNumber(args[2], 1);
      if (!instance.ok) return instance.error;
      const matchMode = requireNumber(args[3], 0);
      if (!matchMode.ok) return matchMode.error;
      const instanceNum = Math.trunc(instance.value);
      if (instanceNum === 0) return err(ExcelErrorCode.Value);
      const pos = findOccurrence(textArg.value, delimArg.value, instanceNum, matchMode.value === 1);
      if (pos < 0) {
        if (args[5] !== undefined) {
          const fallback = excelCoerceString(args[5]!);
          if (fallback.kind === "string") return fallback;
          return fallback;
        }
        return err(ExcelErrorCode.NA);
      }
      return str(textArg.value.slice(0, pos));
    }),
  );

  add(
    fn("TEXTAFTER", "none", (args) => {
      const textArg = args[0];
      const delimArg = args[1];
      if (!textArg || textArg.kind !== "string" || !delimArg || delimArg.kind !== "string") {
        return err(ExcelErrorCode.Value);
      }
      const instance = requireNumber(args[2], 1);
      if (!instance.ok) return instance.error;
      const matchMode = requireNumber(args[3], 0);
      if (!matchMode.ok) return matchMode.error;
      const instanceNum = Math.trunc(instance.value);
      if (instanceNum === 0) return err(ExcelErrorCode.Value);
      const pos = findOccurrence(textArg.value, delimArg.value, instanceNum, matchMode.value === 1);
      if (pos < 0) {
        if (args[5] !== undefined) {
          const fallback = excelCoerceString(args[5]!);
          if (fallback.kind === "string") return fallback;
          return fallback;
        }
        return err(ExcelErrorCode.NA);
      }
      return str(textArg.value.slice(pos + delimArg.value.length));
    }),
  );

  // Lookup
  add(
    fn("XMATCH", "none", (args) => {
      const lookup = args[0] ?? BLANK;
      const arr = args[1];
      const matchModeArg = requireNumber(args[2], 0);
      if (!matchModeArg.ok) return matchModeArg.error;
      const searchModeArg = requireNumber(args[3], 1);
      if (!searchModeArg.ok) return searchModeArg.error;
      if (!arr || arr.kind !== "array") return err(ExcelErrorCode.NA);
      const matchMode = Math.trunc(matchModeArg.value);
      const searchMode = Math.trunc(searchModeArg.value);

      const exact = (v: ExcelValue) => {
        if (matchMode === 2 && lookup.kind === "string") return matchesWildcard(v, lookup.value);
        return rankValue(v, lookup) === 0;
      };

      // Binary search modes require sorted data; fall back to linear for wildcard / -1 / 1.
      if ((searchMode === 2 || searchMode === -2) && matchMode === 0) {
        const order = searchMode === 2 ? 1 : -1;
        const sortedIdx = arr.values
          .map((v, i) => ({ v, i }))
          .sort((a, b) => order * rankValue(a.v, b.v));
        let lo = 0;
        let hi = sortedIdx.length;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          const cmp = rankValue(sortedIdx[mid]!.v, lookup);
          if (cmp === 0) return num(sortedIdx[mid]!.i + 1);
          if (order * cmp < 0) lo = mid + 1;
          else hi = mid;
        }
        return err(ExcelErrorCode.NA);
      }

      const values = searchMode === -1 ? [...arr.values].reverse() : arr.values;
      let bestIdx = -1;
      for (let i = 0; i < values.length; i++) {
        const v = values[i] ?? BLANK;
        const originalIdx = searchMode === -1 ? values.length - 1 - i : i;
        if (matchMode === 0 || matchMode === 2) {
          if (exact(v)) return num(originalIdx + 1);
        } else if (matchMode === -1) {
          if (rankValue(v, lookup) <= 0 && (bestIdx < 0 || rankValue(v, values[bestIdx]!) > 0)) {
            bestIdx = i;
          }
        } else if (matchMode === 1) {
          if (rankValue(v, lookup) >= 0 && (bestIdx < 0 || rankValue(v, values[bestIdx]!) < 0)) {
            bestIdx = i;
          }
        }
      }
      if (bestIdx >= 0) {
        const originalIdx = searchMode === -1 ? values.length - 1 - bestIdx : bestIdx;
        return num(originalIdx + 1);
      }
      return err(ExcelErrorCode.NA);
    }),
  );

  add(
    fn("HYPERLINK", "none", (args) => {
      const link = excelCoerceString(args[0] ?? BLANK);
      if (link.kind !== "string") return err(ExcelErrorCode.Value);
      if (args[1] !== undefined) {
        const friendly = excelCoerceString(args[1]);
        if (friendly.kind === "error") return friendly;
        return friendly;
      }
      return link;
    }),
  );

  // Statistical array
  add(
    fn("FREQUENCY", "none", (args) => {
      const dataArr = args[0];
      const binsArr = args[1];
      if (!dataArr || !binsArr || dataArr.kind !== "array" || binsArr.kind !== "array") {
        return err(ExcelErrorCode.Value);
      }
      const data = toNumbers(dataArr.values);
      const bins = toNumbers(binsArr.values);
      if (bins.length === 0) return err(ExcelErrorCode.Value);
      bins.sort((a, b) => a - b);
      const counts = new Array(bins.length + 1).fill(0) as number[];
      for (const d of data) {
        let inserted = false;
        for (let i = 0; i < bins.length; i++) {
          if (d <= bins[i]!) {
            counts[i]!++;
            inserted = true;
            break;
          }
        }
        if (!inserted) counts[bins.length]!++;
      }
      return { kind: "array", width: 1, height: counts.length, values: counts.map((c) => num(c)) };
    }),
  );

  add(
    fn("FORECAST", "none", (args) => {
      const x = excelCoerceNumber(args[0] ?? BLANK);
      const ys = args[1];
      const xs = args[2];
      if (x.kind !== "number" || !ys || ys.kind !== "array" || !xs || xs.kind !== "array") {
        return err(ExcelErrorCode.NA);
      }
      const yvals = toNumbers(ys.values);
      const xvals = toNumbers(xs.values);
      if (yvals.length !== xvals.length || yvals.length === 0) return err(ExcelErrorCode.NA);
      const n = yvals.length;
      const meanX = xvals.reduce((a, b) => a + b, 0) / n;
      const meanY = yvals.reduce((a, b) => a + b, 0) / n;
      let sxy = 0;
      let sxx = 0;
      for (let i = 0; i < n; i++) {
        const dx = xvals[i]! - meanX;
        sxy += dx * (yvals[i]! - meanY);
        sxx += dx * dx;
      }
      if (sxx === 0) return err(ExcelErrorCode.Div0);
      const slope = sxy / sxx;
      const intercept = meanY - slope * meanX;
      return num(intercept + slope * x.value);
    }),
  );

  // Aggregate / Subtotal
  add(
    fn("SUBTOTAL", "none", (args) => {
      const fnNum = excelCoerceNumber(args[0] ?? BLANK);
      if (fnNum.kind !== "number") return fnNum;
      const values: ExcelValue[] = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (!a) continue;
        if (a.kind === "array") values.push(...a.values);
        else values.push(a);
      }
      return aggregate(Math.trunc(fnNum.value), values, undefined);
    }),
  );

  add(
    fn("AGGREGATE", "none", (args) => {
      const fnNum = excelCoerceNumber(args[0] ?? BLANK);
      if (fnNum.kind !== "number") return fnNum;
      const options = excelCoerceNumber(args[1] ?? BLANK);
      if (options.kind !== "number") return options;
      const fn = Math.trunc(fnNum.value);
      const opt = Math.trunc(options.value);
      const ignoreErrors = [2, 3, 6, 7].includes(opt);
      const needsK = fn === 14 || fn === 15;
      let values: ExcelValue[] = [];
      let k: number | undefined;
      if (needsK) {
        const ref = args[2];
        if (!ref || ref.kind !== "array") return err(ExcelErrorCode.Value);
        values = [...ref.values];
        const kArg = excelCoerceNumber(args[3] ?? BLANK);
        if (kArg.kind !== "number") return kArg;
        k = kArg.value;
      } else {
        for (let i = 2; i < args.length; i++) {
          const a = args[i];
          if (!a) continue;
          if (a.kind === "array") values.push(...a.values);
          else values.push(a);
        }
      }
      if (ignoreErrors) values = values.filter((v) => v.kind !== "error");
      return aggregate(fn, values, k);
    }),
  );

  // Financial
  add(
    fn("FV", "none", (args) => {
      const rate = excelCoerceNumber(args[0] ?? BLANK);
      const nper = excelCoerceNumber(args[1] ?? BLANK);
      const pmt = excelCoerceNumber(args[2] ?? BLANK);
      const pv = excelCoerceNumber(args[3] ?? num(0));
      const type = excelCoerceNumber(args[4] ?? num(0));
      if (rate.kind !== "number" || nper.kind !== "number" || pmt.kind !== "number" || pv.kind !== "number" || type.kind !== "number") {
        return err(ExcelErrorCode.Value);
      }
      const r = rate.value;
      const n = nper.value;
      const p = pmt.value;
      const pv0 = pv.value;
      const t = type.value === 1 ? 1 : 0;
      if (n === 0) return num(-pv0);
      if (r === 0) return num(-pv0 - p * n);
      const factor = (1 + r) ** n;
      return num(-pv0 * factor - p * ((factor - 1) / r) * (1 + r * t));
    }),
  );

  add(
    fn("PV", "none", (args) => {
      const rate = excelCoerceNumber(args[0] ?? BLANK);
      const nper = excelCoerceNumber(args[1] ?? BLANK);
      const pmt = excelCoerceNumber(args[2] ?? BLANK);
      const fv = excelCoerceNumber(args[3] ?? num(0));
      const type = excelCoerceNumber(args[4] ?? num(0));
      if (rate.kind !== "number" || nper.kind !== "number" || pmt.kind !== "number" || fv.kind !== "number" || type.kind !== "number") {
        return err(ExcelErrorCode.Value);
      }
      const r = rate.value;
      const n = nper.value;
      const p = pmt.value;
      const fv0 = fv.value;
      const t = type.value === 1 ? 1 : 0;
      if (n === 0) return num(-fv0);
      if (r === 0) return num(-(p * n + fv0));
      const factor = (1 + r) ** n;
      return num(-(fv0 / factor + p * (1 + r * t) * ((factor - 1) / (r * factor))));
    }),
  );

  add(
    fn("NPER", "none", (args) => {
      const rate = excelCoerceNumber(args[0] ?? BLANK);
      const pmt = excelCoerceNumber(args[1] ?? BLANK);
      const pv = excelCoerceNumber(args[2] ?? BLANK);
      const fv = excelCoerceNumber(args[3] ?? num(0));
      const type = excelCoerceNumber(args[4] ?? num(0));
      if (rate.kind !== "number" || pmt.kind !== "number" || pv.kind !== "number" || fv.kind !== "number" || type.kind !== "number") {
        return err(ExcelErrorCode.Value);
      }
      const r = rate.value;
      const p = pmt.value;
      const pv0 = pv.value;
      const fv0 = fv.value;
      const t = type.value === 1 ? 1 : 0;
      if (r === 0) {
        if (p === 0) return err(ExcelErrorCode.Num);
        return num(-(pv0 + fv0) / p);
      }
      const numerator = p * (1 + r * t) - fv0 * r;
      const denominator = pv0 * r + p * (1 + r * t);
      if (denominator === 0 || numerator / denominator <= 0) return err(ExcelErrorCode.Num);
      return num(Math.log(numerator / denominator) / Math.log(1 + r));
    }),
  );

  add(
    fn("RATE", "none", (args) => {
      const nper = excelCoerceNumber(args[0] ?? BLANK);
      const pmt = excelCoerceNumber(args[1] ?? BLANK);
      const pv = excelCoerceNumber(args[2] ?? BLANK);
      const fv = excelCoerceNumber(args[3] ?? num(0));
      const type = excelCoerceNumber(args[4] ?? num(0));
      const guess = excelCoerceNumber(args[5] ?? num(0.1));
      if (nper.kind !== "number" || pmt.kind !== "number" || pv.kind !== "number" || fv.kind !== "number" || type.kind !== "number" || guess.kind !== "number") {
        return err(ExcelErrorCode.Value);
      }
      const n = nper.value;
      const p = pmt.value;
      const pv0 = pv.value;
      const fv0 = fv.value;
      const t = type.value === 1 ? 1 : 0;
      const g = guess.value;
      if (n <= 0) return err(ExcelErrorCode.Num);

      const f = (r: number) => pv0 * (1 + r) ** n + p * (1 + r * t) * annuityFactor(r, n) + fv0;
      if (Math.abs(pv0 + p * n + fv0) < 1e-9) return num(0);
      let r = g;
      for (let i = 0; i < 100; i++) {
        const fr = f(r);
        const dr = (f(r + 1e-7) - f(r - 1e-7)) / 2e-7;
        if (Math.abs(fr) < 1e-7) return num(r);
        if (dr === 0) break;
        r = r - fr / dr;
      }
      return err(ExcelErrorCode.Num);
    }),
  );

  add(
    fn("PMT", "none", (args) => {
      const rate = excelCoerceNumber(args[0] ?? BLANK);
      const nper = excelCoerceNumber(args[1] ?? BLANK);
      const pv = excelCoerceNumber(args[2] ?? BLANK);
      const fv = excelCoerceNumber(args[3] ?? num(0));
      const type = excelCoerceNumber(args[4] ?? num(0));
      if (rate.kind !== "number" || nper.kind !== "number" || pv.kind !== "number" || fv.kind !== "number" || type.kind !== "number") {
        return err(ExcelErrorCode.Value);
      }
      const r = rate.value;
      const n = nper.value;
      const p = pv.value;
      const f = fv.value;
      const t = type.value === 1 ? 1 : 0;
      if (n === 0) return err(ExcelErrorCode.Num);
      if (r === 0) return num(-(p + f) / n);
      const factor = (1 + r) ** n;
      return num(-(p * r * factor + f * r) / ((1 + r * t) * (factor - 1)));
    }),
  );

  add(
    fn("NPV", "none", (args) => {
      const rate = excelCoerceNumber(args[0] ?? BLANK);
      if (rate.kind !== "number") return rate;
      const r = rate.value;
      const cashFlows: number[] = [];
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (!a) continue;
        if (a.kind === "array") {
          for (const v of a.values) {
            const n = excelCoerceNumber(v);
            if (n.kind !== "number") return n;
            cashFlows.push(n.value);
          }
        } else {
          const n = excelCoerceNumber(a);
          if (n.kind !== "number") return n;
          cashFlows.push(n.value);
        }
      }
      return num(npv(r, cashFlows));
    }),
  );

  add(
    fn("IRR", "none", (args) => {
      const valuesArg = args[0];
      const guess = excelCoerceNumber(args[1] ?? num(0.1));
      if (!valuesArg || valuesArg.kind !== "array") return err(ExcelErrorCode.Value);
      if (guess.kind !== "number") return guess;
      const values: number[] = [];
      for (const v of valuesArg.values) {
        const n = excelCoerceNumber(v);
        if (n.kind !== "number") return n;
        values.push(n.value);
      }
      return irrFunction(values, guess.value);
    }),
  );

  // Statistical dot-function aliases
  add(fn("STDEVP", "none", (args) => populationStdDev(toNumbers(flattenArgs(args)))));
  add(fn("STDEV.P", "none", (args) => populationStdDev(toNumbers(flattenArgs(args)))));
  add(fn("VARP", "none", (args) => populationVariance(toNumbers(flattenArgs(args)))));
  add(fn("VAR.P", "none", (args) => populationVariance(toNumbers(flattenArgs(args)))));

  // GETPIVOTDATA delegates to EvaluationContext.external.pivot.
  add(fn("GETPIVOTDATA", "none", (args, ctx) => {
    if (args.length < 2) return err(ExcelErrorCode.Value);
    let dataField: string | undefined;
    let pivotTableIdx: number;
    if (args.length % 2 === 0) {
      // GETPIVOTDATA(data_field, pivot_table, field1, item1, ...)
      const df = excelCoerceString(args[0]!);
      if (df.kind !== "string") return df;
      dataField = df.value || undefined;
      pivotTableIdx = 1;
    } else {
      // GETPIVOTDATA(pivot_table, field1, item1, ...)
      pivotTableIdx = 0;
    }
    const pivot = excelCoerceString(args[pivotTableIdx]!);
    if (pivot.kind !== "string") return pivot;
    const filters: { field: string; item: ExcelValue }[] = [];
    for (let i = pivotTableIdx + 1; i < args.length; i += 2) {
      const fieldArg = args[i];
      const itemArg = args[i + 1];
      if (!fieldArg || itemArg === undefined) return err(ExcelErrorCode.Value);
      const f = excelCoerceString(fieldArg);
      if (f.kind !== "string") return f;
      filters.push({ field: f.value, item: itemArg });
    }
    const provider = ctx.external?.pivot;
    if (!provider) return err(ExcelErrorCode.NA);
    try {
      const result = provider(dataField, pivot.value, filters);
      return result === undefined ? err(ExcelErrorCode.NA) : result;
    } catch {
      return err(ExcelErrorCode.Value);
    }
  }));
}
