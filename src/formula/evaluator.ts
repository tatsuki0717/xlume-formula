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
import { columnIndexToLetters, parseA1, parseA1Range } from "../model/address.js";
import { parseFormula, type FormulaNode } from "./ast.js";
import {
  excelAdd,
  excelCompare,
  excelConcat,
  excelCoerceBoolean,
  excelCoerceNumber,
  excelCoerceString,
  excelDivide,
  excelMultiply,
  excelPower,
  excelSubtract,
} from "./coercion.js";
import type { EvaluationContext, FunctionRegistry } from "./functions-types.js";

export interface SpillRegion {
  origin: { sheetId?: number; row: number; column: number };
  range: { startRow: number; startColumn: number; endRow: number; endColumn: number };
}

export class FormulaEvaluator {
  constructor(private functions: FunctionRegistry) {}

  evaluate(node: FormulaNode, ctx: EvaluationContext): ExcelValue {
    switch (node.kind) {
      case "literal": {
        if (typeof node.value === "number") return num(node.value);
        if (typeof node.value === "boolean") return bool(node.value);
        if (typeof node.value === "string" && Object.values(ExcelErrorCode).includes(node.value as ExcelErrorCode)) {
          return err(node.value as ExcelErrorCode);
        }
        if (typeof node.value === "string") return str(node.value);
        return err(ExcelErrorCode.Unknown);
      }
      case "unary": {
        const v = this.evaluate(node.expr, ctx);
        if (node.op === "-") return excelMultiply(v, num(-1));
        if (node.op === "+") return excelCoerceNumber(v);
        if (node.op === "%") return excelDivide(excelCoerceNumber(v), num(100));
        return err(ExcelErrorCode.Value);
      }
      case "binary": {
        const l = this.evaluate(node.left, ctx);
        const r = this.evaluate(node.right, ctx);
        switch (node.op) {
          case "+":
            return excelAdd(l, r);
          case "-":
            return excelSubtract(l, r);
          case "*":
            return excelMultiply(l, r);
          case "/":
            return excelDivide(l, r);
          case "^":
            return excelPower(l, r);
          case "&":
            return excelConcat(l, r);
          case "=":
          case "<>":
          case "<":
          case ">":
          case "<=":
          case ">=":
            return excelCompare(l, r, node.op);
          default:
            return err(ExcelErrorCode.Value);
        }
      }
      case "reference":
        if (node.address.row < 0) return err(ExcelErrorCode.Ref);
        return ctx.getCell(node.sheet ?? ctx.sheetId, node.address.row, node.address.column);
      case "range": {
        const values = ctx.getRangeValues(
          node.sheet ?? ctx.sheetId,
          node.range.startRow,
          node.range.startColumn,
          node.range.endRow,
          node.range.endColumn,
        );
        const width = node.range.endColumn - node.range.startColumn + 1;
        const height = node.range.endRow - node.range.startRow + 1;
        const arr: ArrayValue = { kind: "array", width, height, values };
        return arr;
      }
      case "function": {
        const fn = this.functions.get(node.name);
        if (!fn) return err(ExcelErrorCode.Name);
        const upper = node.name.toUpperCase();
        if (upper === "INDIRECT") {
          return this.evalIndirect(node.args, ctx);
        }
        if (upper === "OFFSET") {
          return this.evalOffset(node.args, ctx);
        }
        if (upper === "ISFORMULA") {
          return this.evalIsFormula(node.args, ctx);
        }
        if (upper === "FORMULATEXT") {
          return this.evalFormulaText(node.args, ctx);
        }
        if (upper === "CELL") {
          return this.evalCell(node.args, ctx);
        }
        const args = node.args.map((a) => this.evaluate(a, ctx));
        return fn.evaluate(args, ctx);
      }
      case "name": {
        const resolved = ctx.resolveName(node.name);
        if (!resolved) return err(ExcelErrorCode.Name);
        if (typeof resolved === "object" && "kind" in resolved && !("value" in resolved && (resolved as ExcelValue).kind)) {
          // FormulaNode
          return this.evaluate(resolved as FormulaNode, ctx);
        }
        // Could be ExcelValue
        if (resolved && typeof resolved === "object" && "kind" in resolved) {
          const v = resolved as ExcelValue;
          if (["blank", "number", "string", "boolean", "error", "array"].includes(v.kind)) {
            return v;
          }
          return this.evaluate(resolved as FormulaNode, ctx);
        }
        return err(ExcelErrorCode.Name);
      }
      case "array": {
        const values: ExcelValue[] = [];
        let width = 0;
        for (const row of node.rows) {
          width = Math.max(width, row.length);
          for (const cell of row) values.push(this.evaluate(cell, ctx));
        }
        return { kind: "array", width, height: node.rows.length, values };
      }
      case "structured": {
        const vals = ctx.resolveTableColumn(node.table, node.column);
        return { kind: "array", width: 1, height: vals.length, values: vals };
      }
      case "union": {
        const values: ExcelValue[] = [];
        for (const item of node.items) {
          const v = this.evaluate(item, ctx);
          if (v.kind === "array") values.push(...v.values);
          else values.push(v);
        }
        return { kind: "array", width: 1, height: values.length, values };
      }
      case "spill":
      case "implicitIntersection": {
        const v = this.evaluate(node.expr, ctx);
        if (node.kind === "implicitIntersection" && v.kind === "array") {
          return v.values[0] ?? BLANK;
        }
        return v;
      }
      case "missing":
        return BLANK;
      default:
        return err(ExcelErrorCode.Value);
    }
  }

  evaluateText(formula: string, ctx: EvaluationContext): ExcelValue {
    return this.evaluate(parseFormula(formula), ctx);
  }

  private evalIndirect(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    const refVal = args[0] ? this.evaluate(args[0], ctx) : BLANK;
    if (refVal.kind !== "string") return err(ExcelErrorCode.Ref);
    const text = refVal.value.trim();
    // Reject external workbook references
    if (text.includes("[") || text.includes("]")) return err(ExcelErrorCode.Ref);
    try {
      let sheet: string | number | undefined = ctx.sheetId;
      let ref = text;
      const bang = text.lastIndexOf("!");
      if (bang >= 0) {
        sheet = text.slice(0, bang).replace(/^'|'$/g, "");
        ref = text.slice(bang + 1);
      }
      ref = ref.replace(/\$/g, "");
      if (ref.includes(":")) {
        const range = parseA1Range(ref);
        const values = ctx.getRangeValues(sheet, range.startRow, range.startColumn, range.endRow, range.endColumn);
        return {
          kind: "array",
          width: range.endColumn - range.startColumn + 1,
          height: range.endRow - range.startRow + 1,
          values,
        };
      }
      const addr = parseA1(ref);
      return ctx.getCell(sheet, addr.row, addr.column);
    } catch {
      return err(ExcelErrorCode.Ref);
    }
  }

  private cellReferenceFromNode(node: FormulaNode, ctx: EvaluationContext): { sheet: number | string; row: number; col: number } | undefined {
    if (node.kind === "reference") {
      return { sheet: node.sheet ?? ctx.sheetId, row: node.address.row, col: node.address.column };
    }
    if (node.kind === "range") {
      return { sheet: node.sheet ?? ctx.sheetId, row: node.range.startRow, col: node.range.startColumn };
    }
    if (node.kind === "name") {
      const resolved = ctx.resolveName(node.name);
      if (resolved && typeof resolved === "object" && "kind" in resolved) {
        const n = resolved as FormulaNode;
        if (n.kind === "reference" || n.kind === "range") return this.cellReferenceFromNode(n, ctx);
      }
    }
    return undefined;
  }

  private evalIsFormula(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length === 0) return err(ExcelErrorCode.NA);
    const ref = this.cellReferenceFromNode(args[0]!, ctx);
    if (!ref) return err(ExcelErrorCode.NA);
    if (ref.row < 0 || ref.col < 0) return err(ExcelErrorCode.Ref);
    if (!ctx.getFormulaText) return err(ExcelErrorCode.NA);
    const text = ctx.getFormulaText(ref.sheet, ref.row, ref.col);
    return bool(text !== undefined && text.length > 0);
  }

  private evalFormulaText(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length === 0) return err(ExcelErrorCode.NA);
    const ref = this.cellReferenceFromNode(args[0]!, ctx);
    if (!ref) return err(ExcelErrorCode.NA);
    if (ref.row < 0 || ref.col < 0) return err(ExcelErrorCode.Ref);
    if (!ctx.getFormulaText) return err(ExcelErrorCode.NA);
    const text = ctx.getFormulaText(ref.sheet, ref.row, ref.col);
    if (text === undefined || text.length === 0) return err(ExcelErrorCode.NA);
    return str(text);
  }

  private evalCell(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length === 0) return err(ExcelErrorCode.Value);
    const infoVal = this.evaluate(args[0]!, ctx);
    const info = excelCoerceString(infoVal);
    if (info.kind !== "string") return err(ExcelErrorCode.Value);
    const key = info.value.toLowerCase();
    const ref = args.length >= 2 ? this.cellReferenceFromNode(args[1]!, ctx) : { sheet: ctx.sheetId, row: ctx.row, col: ctx.column };
    if (!ref) return err(ExcelErrorCode.Value);
    if (ref.row < 0 || ref.col < 0) return err(ExcelErrorCode.Ref);
    const value = ctx.getCell(ref.sheet, ref.row, ref.col);
    switch (key) {
      case "address":
        return str(`$${columnIndexToLetters(ref.col)}$${ref.row + 1}`);
      case "col":
        return num(ref.col + 1);
      case "row":
        return num(ref.row + 1);
      case "contents":
        return value;
      case "type": {
        if (value.kind === "blank") return str("b");
        if (value.kind === "string") return str("l");
        return str("v");
      }
      case "filename": {
        const sheetName = typeof ref.sheet === "string" ? ref.sheet : ctx.sheetName ?? String(ref.sheet);
        return str(`[xlume]${sheetName}`);
      }
      default:
        return err(ExcelErrorCode.NA);
    }
  }

  private evalOffset(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    const base = args[0];
    if (!base) return err(ExcelErrorCode.Ref);
    let startRow = ctx.row;
    let startCol = ctx.column;
    let endRow = startRow;
    let endCol = startCol;
    let sheet: string | number | undefined = ctx.sheetId;

    if (base.kind === "reference") {
      startRow = base.address.row;
      startCol = base.address.column;
      endRow = startRow;
      endCol = startCol;
      sheet = base.sheet ?? ctx.sheetId;
    } else if (base.kind === "range") {
      startRow = base.range.startRow;
      startCol = base.range.startColumn;
      endRow = base.range.endRow;
      endCol = base.range.endColumn;
      sheet = base.sheet ?? ctx.sheetId;
    } else {
      return err(ExcelErrorCode.Ref);
    }

    const rows = excelCoerceNumber(args[1] ? this.evaluate(args[1], ctx) : num(0));
    const cols = excelCoerceNumber(args[2] ? this.evaluate(args[2], ctx) : num(0));
    if (rows.kind !== "number" || cols.kind !== "number") return err(ExcelErrorCode.Value);

    const heightArg = args[3]
      ? excelCoerceNumber(this.evaluate(args[3], ctx))
      : num(endRow - startRow + 1);
    const widthArg = args[4]
      ? excelCoerceNumber(this.evaluate(args[4], ctx))
      : num(endCol - startCol + 1);
    if (heightArg.kind !== "number" || widthArg.kind !== "number") return err(ExcelErrorCode.Value);
    if (heightArg.value === 0 || widthArg.value === 0) return err(ExcelErrorCode.Ref);

    const h = Math.trunc(heightArg.value);
    const w = Math.trunc(widthArg.value);
    const r0 = startRow + Math.trunc(rows.value);
    const c0 = startCol + Math.trunc(cols.value);
    if (r0 < 0 || c0 < 0) return err(ExcelErrorCode.Ref);

    const r1 = r0 + Math.abs(h) - 1;
    const c1 = c0 + Math.abs(w) - 1;
    const values = ctx.getRangeValues(sheet, r0, c0, r1, c1);
    if (values.length === 1) return values[0] ?? BLANK;
    return { kind: "array", width: Math.abs(w), height: Math.abs(h), values };
  }
}

export function flattenArgs(args: ExcelValue[]): ExcelValue[] {
  const out: ExcelValue[] = [];
  for (const a of args) {
    if (a.kind === "array") out.push(...a.values);
    else out.push(a);
  }
  return out;
}

export { excelCoerceBoolean, excelCoerceNumber };
