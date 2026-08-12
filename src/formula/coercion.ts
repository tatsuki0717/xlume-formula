import {
  BLANK,
  bool,
  err,
  ExcelErrorCode,
  num,
  str,
  type ExcelValue,
} from "../model/value.js";

function isBlankLike(value: ExcelValue): boolean {
  return value.kind === "blank" || value.kind === "omitted";
}

/** Excel-specific operations — never use JS + * === on raw values in evaluator. */

export function excelCoerceNumber(value: ExcelValue): ExcelValue {
  if (value.kind === "error") return value;
  if (value.kind === "number") return value;
  if (isBlankLike(value)) return num(0);
  if (value.kind === "boolean") return num(value.value ? 1 : 0);
  if (value.kind === "string") {
    const t = value.value.trim();
    if (t === "") return num(0);
    const n = Number(t);
    if (Number.isNaN(n)) return err(ExcelErrorCode.Value);
    return num(n);
  }
  if (value.kind === "array") {
    return excelCoerceNumber(value.values[0] ?? BLANK);
  }
  return err(ExcelErrorCode.Value);
}

export function excelCoerceBoolean(value: ExcelValue): ExcelValue {
  if (value.kind === "error") return value;
  if (value.kind === "boolean") return value;
  if (isBlankLike(value)) return bool(false);
  if (value.kind === "number") return bool(value.value !== 0);
  if (value.kind === "string") {
    const t = value.value.trim().toUpperCase();
    if (t === "TRUE") return bool(true);
    if (t === "FALSE") return bool(false);
    return err(ExcelErrorCode.Value);
  }
  return err(ExcelErrorCode.Value);
}

export function excelCoerceString(value: ExcelValue): ExcelValue {
  if (value.kind === "error") return value;
  if (value.kind === "string") return value;
  if (isBlankLike(value)) return str("");
  if (value.kind === "number") return str(String(value.value));
  if (value.kind === "boolean") return str(value.value ? "TRUE" : "FALSE");
  if (value.kind === "lambda") return str("");
  return str("");
}

export function excelAdd(a: ExcelValue, b: ExcelValue): ExcelValue {
  const x = excelCoerceNumber(a);
  const y = excelCoerceNumber(b);
  if (x.kind === "error") return x;
  if (y.kind === "error") return y;
  if (x.kind === "number" && y.kind === "number") return num(x.value + y.value);
  return err(ExcelErrorCode.Value);
}

export function excelSubtract(a: ExcelValue, b: ExcelValue): ExcelValue {
  const x = excelCoerceNumber(a);
  const y = excelCoerceNumber(b);
  if (x.kind === "error") return x;
  if (y.kind === "error") return y;
  if (x.kind === "number" && y.kind === "number") return num(x.value - y.value);
  return err(ExcelErrorCode.Value);
}

export function excelMultiply(a: ExcelValue, b: ExcelValue): ExcelValue {
  const x = excelCoerceNumber(a);
  const y = excelCoerceNumber(b);
  if (x.kind === "error") return x;
  if (y.kind === "error") return y;
  if (x.kind === "number" && y.kind === "number") return num(x.value * y.value);
  return err(ExcelErrorCode.Value);
}

export function excelDivide(a: ExcelValue, b: ExcelValue): ExcelValue {
  const x = excelCoerceNumber(a);
  const y = excelCoerceNumber(b);
  if (x.kind === "error") return x;
  if (y.kind === "error") return y;
  if (x.kind === "number" && y.kind === "number") {
    if (y.value === 0) return err(ExcelErrorCode.Div0);
    return num(x.value / y.value);
  }
  return err(ExcelErrorCode.Value);
}

export function excelPower(a: ExcelValue, b: ExcelValue): ExcelValue {
  const x = excelCoerceNumber(a);
  const y = excelCoerceNumber(b);
  if (x.kind === "error") return x;
  if (y.kind === "error") return y;
  if (x.kind === "number" && y.kind === "number") return num(x.value ** y.value);
  return err(ExcelErrorCode.Value);
}

export function excelConcat(a: ExcelValue, b: ExcelValue): ExcelValue {
  const x = excelCoerceString(a);
  const y = excelCoerceString(b);
  if (x.kind === "error") return x;
  if (y.kind === "error") return y;
  if (x.kind === "string" && y.kind === "string") return str(x.value + y.value);
  return err(ExcelErrorCode.Value);
}

export function excelCompare(a: ExcelValue, b: ExcelValue, op: string): ExcelValue {
  // Excel comparison: numbers vs strings etc. — simplified
  if (a.kind === "error") return a;
  if (b.kind === "error") return b;

  let cmp = 0;
  if (a.kind === "number" && b.kind === "number") cmp = a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  else if (a.kind === "string" && b.kind === "string") {
    const x = a.value.toUpperCase();
    const y = b.value.toUpperCase();
    cmp = x < y ? -1 : x > y ? 1 : 0;
  } else if (a.kind === "boolean" && b.kind === "boolean") cmp = a.value === b.value ? 0 : a.value ? 1 : -1;
  else if (a.kind === "blank" && b.kind === "blank") cmp = 0;
  else {
    // Mixed: coerce to number when possible
    const x = excelCoerceNumber(a);
    const y = excelCoerceNumber(b);
    if (x.kind === "number" && y.kind === "number") cmp = x.value < y.value ? -1 : x.value > y.value ? 1 : 0;
    else {
      const xs = excelCoerceString(a);
      const ys = excelCoerceString(b);
      if (xs.kind === "string" && ys.kind === "string") {
        cmp = xs.value.toUpperCase() < ys.value.toUpperCase() ? -1 : xs.value.toUpperCase() > ys.value.toUpperCase() ? 1 : 0;
      }
    }
  }

  switch (op) {
    case "=":
      return bool(cmp === 0);
    case "<>":
      return bool(cmp !== 0);
    case "<":
      return bool(cmp < 0);
    case ">":
      return bool(cmp > 0);
    case "<=":
      return bool(cmp <= 0);
    case ">=":
      return bool(cmp >= 0);
    default:
      return err(ExcelErrorCode.Value);
  }
}
