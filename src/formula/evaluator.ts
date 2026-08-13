import {
  BLANK,
  bool,
  err,
  ExcelErrorCode,
  num,
  omitted,
  str,
  type ArrayValue,
  type ExcelValue,
  type LambdaValue,
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

function isExcelValue(x: unknown): x is ExcelValue {
  return (
    x !== null &&
    typeof x === "object" &&
    "kind" in x &&
    ["blank", "number", "string", "boolean", "error", "array", "lambda", "omitted", "sparkline"].includes((x as { kind: string }).kind)
  );
}

interface GroupByAggregator {
  aggregate: (groupValues: ExcelValue[], allValues: ExcelValue[]) => ExcelValue;
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
        if (upper === "ISREF") {
          return this.evalIsRef(node.args, ctx);
        }
        if (upper === "LAMBDA") {
          return this.evalLambda(node.args, ctx);
        }
        if (upper === "LET") {
          return this.evalLet(node.args, ctx);
        }
        if (upper === "MAP") {
          return this.evalMap(node.args, ctx);
        }
        if (upper === "MAKEARRAY") {
          return this.evalMakeArray(node.args, ctx);
        }
        if (upper === "REDUCE") {
          return this.evalReduce(node.args, ctx);
        }
        if (upper === "SCAN") {
          return this.evalScan(node.args, ctx);
        }
        if (upper === "BYCOL") {
          return this.evalByCol(node.args, ctx);
        }
        if (upper === "BYROW") {
          return this.evalByRow(node.args, ctx);
        }
        if (upper === "ISOMITTED") {
          return this.evalIsOmitted(node.args, ctx);
        }
        if (upper === "ARRAYFORMULA") {
          return this.evalArrayFormula(node.args, ctx);
        }
        if (upper === "GROUPBY") {
          return this.evalGroupBy(node.args, ctx);
        }
        if (upper === "PIVOTBY") {
          return this.evalPivotBy(node.args, ctx);
        }
        // Named lambda call (LET-bound or otherwise) takes precedence over function fallback
        const named = ctx.resolveName(node.name);
        if (named && isExcelValue(named) && named.kind === "lambda") {
          return this.callLambda(named, node.args, ctx);
        }
        const fn = this.functions.get(node.name);
        if (fn) {
          const args = node.args.map((a) => this.evaluate(a, ctx));
          return fn.evaluate(args, ctx);
        }
        return err(ExcelErrorCode.Name);
      }
      case "name": {
        const resolved = ctx.resolveName(node.name);
        if (!resolved) return err(ExcelErrorCode.Name);
        if (isExcelValue(resolved)) return resolved;
        return this.evaluate(resolved as FormulaNode, ctx);
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

  private evalIsRef(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length === 0) return err(ExcelErrorCode.Value);
    const arg = args[0]!;
    if (arg.kind === "reference" || arg.kind === "range") return bool(true);
    if (arg.kind === "name") {
      const resolved = ctx.resolveName(arg.name);
      if (resolved && typeof resolved === "object" && "kind" in resolved) {
        const n = resolved as FormulaNode;
        if (n.kind === "reference" || n.kind === "range") return bool(true);
      }
      return bool(false);
    }
    if (arg.kind === "function") {
      const upper = arg.name.toUpperCase();
      // INDIRECT and OFFSET return references when they succeed (i.e., do not error).
      if (upper === "INDIRECT" || upper === "OFFSET") {
        try {
          const result = this.evaluate(arg, ctx);
          return bool(result.kind !== "error");
        } catch {
          return bool(false);
        }
      }
    }
    return bool(false);
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

  private evalLambda(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length === 0) return err(ExcelErrorCode.Value);
    const params: string[] = [];
    for (let i = 0; i < args.length - 1; i++) {
      const p = args[i];
      if (!p || p.kind !== "name") return err(ExcelErrorCode.Value);
      params.push(p.name);
    }
    return { kind: "lambda", params, body: args[args.length - 1]! };
  }

  private callLambdaValues(lambda: LambdaValue, argValues: ExcelValue[], ctx: EvaluationContext): ExcelValue {
    if (argValues.length !== lambda.params.length) return err(ExcelErrorCode.Value);
    const locals = new Map<string, import("./functions-types.js").FormulaArgument>();
    for (let i = 0; i < lambda.params.length; i++) {
      locals.set(lambda.params[i]!.toUpperCase(), argValues[i]!);
    }
    const localCtx: EvaluationContext = {
      ...ctx,
      resolveName: (name: string) => locals.get(name.toUpperCase()) ?? ctx.resolveName(name),
    };
    return this.evaluate(lambda.body, localCtx);
  }

  private callLambda(lambda: LambdaValue, args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    const values: ExcelValue[] = [];
    for (let i = 0; i < lambda.params.length; i++) {
      const a = args[i];
      if (a === undefined || a.kind === "missing") values.push(omitted());
      else values.push(this.evaluate(a, ctx));
    }
    return this.callLambdaValues(lambda, values, ctx);
  }

  private evalIsOmitted(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length !== 1) return err(ExcelErrorCode.Value);
    const arg = args[0];
    if (!arg || arg.kind !== "name") return err(ExcelErrorCode.Value);
    const resolved = ctx.resolveName(arg.name);
    return bool(resolved !== undefined && isExcelValue(resolved) && resolved.kind === "omitted");
  }

  private evalLet(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length < 2 || (args.length - 1) % 2 !== 0) return err(ExcelErrorCode.Value);
    const locals = new Map<string, import("./functions-types.js").FormulaArgument>();
    const localCtx = (): EvaluationContext => ({
      ...ctx,
      resolveName: (name: string) => locals.get(name.toUpperCase()) ?? ctx.resolveName(name),
    });
    for (let i = 0; i < args.length - 1; i += 2) {
      const nameNode = args[i];
      if (!nameNode || nameNode.kind !== "name") return err(ExcelErrorCode.Value);
      const value = this.evaluate(args[i + 1]!, localCtx());
      locals.set(nameNode.name.toUpperCase(), value);
    }
    return this.evaluate(args[args.length - 1]!, localCtx());
  }

  private evalMap(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length < 2) return err(ExcelErrorCode.Value);
    const arrays: ArrayValue[] = [];
    for (let i = 0; i < args.length - 1; i++) {
      const v = this.evaluate(args[i]!, ctx);
      if (v.kind !== "array") return err(ExcelErrorCode.Value);
      arrays.push(v);
    }
    const lambdaVal = this.evaluate(args[args.length - 1]!, ctx);
    if (lambdaVal.kind !== "lambda") return err(ExcelErrorCode.Value);
    if (arrays.length === 0) return err(ExcelErrorCode.Value);
    const first = arrays[0]!;
    const height = first.height;
    const width = first.width;
    for (const a of arrays) {
      if (a.kind !== "array" || a.height !== height || a.width !== width) return err(ExcelErrorCode.Value);
    }
    const out: ExcelValue[] = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const idx = r * width + c;
        const callArgs: ExcelValue[] = [];
        for (const a of arrays) {
          const v = a.values[idx] ?? BLANK;
          callArgs.push(v.kind === "blank" ? num(0) : v);
        }
        out.push(this.callLambdaValues(lambdaVal, callArgs, ctx));
      }
    }
    return { kind: "array", width, height, values: out };
  }

  private evalMakeArray(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length !== 3) return err(ExcelErrorCode.Value);
    const rows = this.evaluate(args[0]!, ctx);
    const cols = this.evaluate(args[1]!, ctx);
    const lambdaVal = this.evaluate(args[2]!, ctx);
    if (rows.kind !== "number" || cols.kind !== "number" || lambdaVal.kind !== "lambda") {
      return err(ExcelErrorCode.Value);
    }
    const height = Math.max(0, Math.trunc(rows.value));
    const width = Math.max(0, Math.trunc(cols.value));
    const out: ExcelValue[] = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        out.push(this.callLambdaValues(lambdaVal, [num(r + 1), num(c + 1)], ctx));
      }
    }
    return { kind: "array", width, height, values: out };
  }

  private evalReduce(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length !== 3) return err(ExcelErrorCode.Value);
    let acc = this.evaluate(args[0]!, ctx);
    const arr = this.evaluate(args[1]!, ctx);
    const lambdaVal = this.evaluate(args[2]!, ctx);
    if (arr.kind !== "array" || lambdaVal.kind !== "lambda") return err(ExcelErrorCode.Value);
    for (let i = 0; i < arr.values.length; i++) {
      const v = arr.values[i] ?? BLANK;
      const callArg = v.kind === "blank" ? num(0) : v;
      acc = this.callLambdaValues(lambdaVal, [acc, callArg], ctx);
    }
    return acc;
  }

  private evalScan(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length !== 3) return err(ExcelErrorCode.Value);
    let acc = this.evaluate(args[0]!, ctx);
    const arr = this.evaluate(args[1]!, ctx);
    const lambdaVal = this.evaluate(args[2]!, ctx);
    if (arr.kind !== "array" || lambdaVal.kind !== "lambda") return err(ExcelErrorCode.Value);
    const out: ExcelValue[] = [];
    for (let i = 0; i < arr.values.length; i++) {
      const v = arr.values[i] ?? BLANK;
      const callArg = v.kind === "blank" ? num(0) : v;
      acc = this.callLambdaValues(lambdaVal, [acc, callArg], ctx);
      out.push(acc);
    }
    return { kind: "array", width: arr.width, height: arr.height, values: out };
  }

  private evalByCol(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length !== 2) return err(ExcelErrorCode.Value);
    const arr = this.evaluate(args[0]!, ctx);
    const lambdaVal = this.evaluate(args[1]!, ctx);
    if (arr.kind !== "array" || lambdaVal.kind !== "lambda") return err(ExcelErrorCode.Value);
    const out: ExcelValue[] = [];
    for (let c = 0; c < arr.width; c++) {
      const col: ExcelValue[] = [];
      for (let r = 0; r < arr.height; r++) {
        col.push(arr.values[r * arr.width + c] ?? BLANK);
      }
      out.push(this.callLambdaValues(lambdaVal, [{ kind: "array", width: 1, height: arr.height, values: col }], ctx));
    }
    return { kind: "array", width: out.length, height: 1, values: out };
  }

  private evalByRow(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length !== 2) return err(ExcelErrorCode.Value);
    const arr = this.evaluate(args[0]!, ctx);
    const lambdaVal = this.evaluate(args[1]!, ctx);
    if (arr.kind !== "array" || lambdaVal.kind !== "lambda") return err(ExcelErrorCode.Value);
    const out: ExcelValue[] = [];
    for (let r = 0; r < arr.height; r++) {
      const row: ExcelValue[] = [];
      for (let c = 0; c < arr.width; c++) {
        row.push(arr.values[r * arr.width + c] ?? BLANK);
      }
      out.push(this.callLambdaValues(lambdaVal, [{ kind: "array", width: arr.width, height: 1, values: row }], ctx));
    }
    return { kind: "array", width: 1, height: out.length, values: out };
  }

  private evalArrayFormula(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length !== 1) return err(ExcelErrorCode.Value);
    const expr = args[0]!;
    const shape = this.arrayShape(expr, ctx);
    if (shape.w <= 0 || shape.h <= 0) return err(ExcelErrorCode.Value);
    const values: ExcelValue[] = [];
    for (let r = 0; r < shape.h; r++) {
      for (let c = 0; c < shape.w; c++) {
        values.push(this.evalArrayExpr(expr, ctx, r, c));
      }
    }
    return { kind: "array", width: shape.w, height: shape.h, values };
  }

  private arrayShape(node: FormulaNode, ctx: EvaluationContext): { w: number; h: number } {
    switch (node.kind) {
      case "literal":
      case "reference":
      case "missing":
        return { w: 1, h: 1 };
      case "range": {
        const w = node.range.endColumn - node.range.startColumn + 1;
        const h = node.range.endRow - node.range.startRow + 1;
        return { w, h };
      }
      case "name": {
        const named = ctx.resolveName(node.name);
        if (named && isExcelValue(named) && named.kind === "array") {
          return { w: named.width, h: named.height };
        }
        return { w: 1, h: 1 };
      }
      case "array": {
        const h = node.rows.length;
        let w = 0;
        for (const row of node.rows) w = Math.max(w, row.length);
        return { w, h };
      }
      case "unary":
      case "spill":
      case "implicitIntersection":
        return this.arrayShape(node.expr, ctx);
      case "binary": {
        const left = this.arrayShape(node.left, ctx);
        const right = this.arrayShape(node.right, ctx);
        return { w: Math.max(left.w, right.w), h: Math.max(left.h, right.h) };
      }
      case "function": {
        let w = 1;
        let h = 1;
        for (const a of node.args) {
          const s = this.arrayShape(a, ctx);
          w = Math.max(w, s.w);
          h = Math.max(h, s.h);
        }
        return { w, h };
      }
      case "union": {
        let count = 0;
        for (const item of node.items) {
          const s = this.arrayShape(item, ctx);
          count += s.w * s.h;
        }
        return { w: 1, h: count };
      }
      case "intersection":
      case "structured":
      case "external":
      default:
        return { w: 1, h: 1 };
    }
  }

  private evalArrayExpr(node: FormulaNode, ctx: EvaluationContext, r: number, c: number): ExcelValue {
    switch (node.kind) {
      case "literal": {
        const v = node.value;
        if (typeof v === "number") return num(v);
        if (typeof v === "string") return str(v);
        if (typeof v === "boolean") return bool(v);
        if (Object.values(ExcelErrorCode).includes(v as ExcelErrorCode)) return err(v as ExcelErrorCode);
        return err(ExcelErrorCode.Value);
      }
      case "reference":
        return ctx.getCell(node.sheet ?? ctx.sheetId, node.address.row, node.address.column);
      case "range": {
        const w = node.range.endColumn - node.range.startColumn + 1;
        const h = node.range.endRow - node.range.startRow + 1;
        const sr = h === 1 ? 0 : r;
        const sc = w === 1 ? 0 : c;
        if (sr < 0 || sr >= h || sc < 0 || sc >= w) return BLANK;
        return ctx.getCell(node.sheet ?? ctx.sheetId, node.range.startRow + sr, node.range.startColumn + sc);
      }
      case "name": {
        const named = ctx.resolveName(node.name);
        if (!named) return err(ExcelErrorCode.Name);
        if (isExcelValue(named)) {
          if (named.kind === "array") {
            const sr = named.height === 1 ? 0 : r;
            const sc = named.width === 1 ? 0 : c;
            if (sr < 0 || sr >= named.height || sc < 0 || sc >= named.width) return BLANK;
            return named.values[sr * named.width + sc] ?? BLANK;
          }
          return named;
        }
        return this.evalArrayExpr(named as FormulaNode, ctx, r, c);
      }
      case "array": {
        const row = node.rows[r];
        if (!row) return BLANK;
        const cell = row[c];
        if (!cell) return BLANK;
        return this.evalArrayExpr(cell, ctx, 0, 0);
      }
      case "unary": {
        const v = this.evalArrayExpr(node.expr, ctx, r, c);
        if (v.kind === "error") return v;
        if (node.op === "+") return excelCoerceNumber(v);
        if (node.op === "-") {
          const n = excelCoerceNumber(v);
          return n.kind === "number" ? num(-n.value) : n;
        }
        if (node.op === "%") return excelDivide(excelCoerceNumber(v), num(100));
        return err(ExcelErrorCode.Value);
      }
      case "binary": {
        const l = this.evalArrayExpr(node.left, ctx, r, c);
        const right = this.evalArrayExpr(node.right, ctx, r, c);
        switch (node.op) {
          case "+":
            return excelAdd(l, right);
          case "-":
            return excelSubtract(l, right);
          case "*":
            return excelMultiply(l, right);
          case "/":
            return excelDivide(l, right);
          case "^":
            return excelPower(l, right);
          case "&":
            return excelConcat(l, right);
          case "=":
          case "<>":
          case "<":
          case ">":
          case "<=":
          case ">=":
            return excelCompare(l, right, node.op);
          default:
            return err(ExcelErrorCode.Value);
        }
      }
      case "function": {
        const upper = node.name.toUpperCase();
        if (upper === "ARRAYFORMULA") return this.evalArrayFormula(node.args, ctx);
        const args: ExcelValue[] = [];
        for (const a of node.args) args.push(this.evalArrayExpr(a, ctx, r, c));
        const fn = this.functions.get(node.name);
        if (fn) return fn.evaluate(args, ctx);
        return err(ExcelErrorCode.Name);
      }
      case "spill":
      case "implicitIntersection":
        return this.evalArrayExpr(node.expr, ctx, r, c);
      default:
        return err(ExcelErrorCode.Value);
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

  private evalGroupBy(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length < 3) return err(ExcelErrorCode.Value);

    const rowArrRaw = this.toArray(this.evaluate(args[0]!, ctx));
    const valArrRaw = this.toArray(this.evaluate(args[1]!, ctx));
    if (rowArrRaw.kind === "error") return rowArrRaw;
    if (valArrRaw.kind === "error") return valArrRaw;
    if (rowArrRaw.kind !== "array" || valArrRaw.kind !== "array") return err(ExcelErrorCode.Value);
    const rowArr = rowArrRaw;
    const valArr = valArrRaw;
    if (rowArr.height !== valArr.height) return err(ExcelErrorCode.Value);
    const H = rowArr.height;

    const aggregator = this.groupByAggregator(args[2]!, ctx);
    if (aggregator === null) return err(ExcelErrorCode.Value);

    let startRow = 0;
    let headerRow: ExcelValue[] | undefined;
    let fieldHeaders = 0;
    if (args.length >= 4) {
      const h = excelCoerceNumber(this.evaluate(args[3]!, ctx));
      if (h.kind !== "number") return h;
      fieldHeaders = Math.trunc(h.value);
    }
    if (fieldHeaders === 1 || fieldHeaders === 3) {
      if (H === 0) return err(ExcelErrorCode.Value);
      startRow = 1;
    }
    if (fieldHeaders === 2 || fieldHeaders === 3) {
      if (fieldHeaders === 3 && H > 0) {
        const keys: ExcelValue[] = [];
        for (let c = 0; c < rowArr.width; c++) keys.push(rowArr.values[c] ?? BLANK);
        const vals: ExcelValue[] = [];
        for (let c = 0; c < valArr.width; c++) vals.push(valArr.values[c] ?? BLANK);
        headerRow = [...keys, ...vals];
      } else {
        const keys: ExcelValue[] = [];
        for (let c = 0; c < rowArr.width; c++) keys.push(str(`Row ${c + 1}`));
        const vals: ExcelValue[] = [];
        for (let c = 0; c < valArr.width; c++) vals.push(str(`Value ${c + 1}`));
        headerRow = [...keys, ...vals];
      }
    }

    let totalDepth = 0;
    if (args.length >= 5) {
      const t = excelCoerceNumber(this.evaluate(args[4]!, ctx));
      if (t.kind !== "number") return t;
      totalDepth = Math.trunc(t.value);
    }

    let sortOrder: number | undefined;
    if (args.length >= 6) {
      const s = this.evaluate(args[5]!, ctx);
      if (s.kind === "array") {
        if (s.values.length === 0) return err(ExcelErrorCode.Value);
        const first = excelCoerceNumber(s.values[0]!);
        if (first.kind !== "number") return first;
        sortOrder = Math.trunc(first.value);
      } else {
        const n = excelCoerceNumber(s);
        if (n.kind !== "number") return n;
        sortOrder = Math.trunc(n.value);
      }
    }

    let filter: boolean[] | undefined;
    if (args.length >= 7) {
      const f = this.evaluate(args[6]!, ctx);
      if (f.kind === "array") {
        if (f.values.length !== H) return err(ExcelErrorCode.Value);
        filter = f.values.map((v) => {
          const b = excelCoerceBoolean(v);
          return b.kind === "boolean" ? b.value : false;
        });
      } else {
        const b = excelCoerceBoolean(f);
        if (b.kind !== "boolean") return b;
        filter = Array(H).fill(b.value);
      }
    }

    const groups = new Map<string, { keys: ExcelValue[]; valueRows: ExcelValue[][] }>();
    for (let r = startRow; r < H; r++) {
      if (filter && !filter[r]) continue;
      const keys: ExcelValue[] = [];
      for (let c = 0; c < rowArr.width; c++) keys.push(rowArr.values[r * rowArr.width + c] ?? BLANK);
      const vals: ExcelValue[] = [];
      for (let c = 0; c < valArr.width; c++) vals.push(valArr.values[r * valArr.width + c] ?? BLANK);
      const key = JSON.stringify(keys.map(valueToKey));
      let g = groups.get(key);
      if (!g) {
        g = { keys, valueRows: [] };
        groups.set(key, g);
      }
      g.valueRows.push(vals);
    }

    const allValues: ExcelValue[][] = [];
    for (let c = 0; c < valArr.width; c++) {
      const col: ExcelValue[] = [];
      for (let r = startRow; r < H; r++) {
        if (filter && !filter[r]) continue;
        col.push(valArr.values[r * valArr.width + c] ?? BLANK);
      }
      allValues.push(col);
    }

    const outRows: ExcelValue[][] = [];
    for (const g of groups.values()) {
      const agg: ExcelValue[] = [];
      for (let c = 0; c < valArr.width; c++) {
        const groupCol: ExcelValue[] = [];
        for (const row of g.valueRows) groupCol.push(row[c]!);
        const result = aggregator.aggregate(groupCol, allValues[c]!);
        if (result.kind === "error") return result;
        agg.push(result);
      }
      outRows.push([...g.keys, ...agg]);
    }

    const sortCol = sortOrder === undefined ? 0 : Math.abs(sortOrder) - 1;
    const sortDir = sortOrder === undefined || sortOrder >= 0 ? 1 : -1;
    const outWidth = rowArr.width + valArr.width;
    if (sortCol < 0 || sortCol >= outWidth) return err(ExcelErrorCode.Value);
    outRows.sort((a, b) => sortDir * compareExcelValues(a[sortCol]!, b[sortCol]!));

    const addTotal = Math.abs(totalDepth) >= 1;
    if (addTotal) {
      const totalKeys: ExcelValue[] = Array(rowArr.width).fill(BLANK);
      totalKeys[0] = str("Total");
      const totalAgg: ExcelValue[] = [];
      for (let c = 0; c < valArr.width; c++) {
        const allAgg: ExcelValue[] = [];
        for (const row of outRows) allAgg.push(row[rowArr.width + c]!);
        const result = aggregator.aggregate(allAgg, allValues[c]!);
        if (result.kind === "error") return result;
        totalAgg.push(result);
      }
      const totalRow = [...totalKeys, ...totalAgg];
      if (totalDepth > 0) outRows.push(totalRow);
      else outRows.unshift(totalRow);
    }

    if (headerRow) outRows.unshift(headerRow);

    const height = outRows.length;
    const flat: ExcelValue[] = [];
    for (const row of outRows) {
      if (row.length !== outWidth) return err(ExcelErrorCode.Value);
      flat.push(...row);
    }
    return { kind: "array", width: outWidth, height, values: flat };
  }

  private evalPivotBy(args: FormulaNode[], ctx: EvaluationContext): ExcelValue {
    if (args.length < 4) return err(ExcelErrorCode.Value);

    const rowArrRaw = this.toArray(this.evaluate(args[0]!, ctx));
    const colArrRaw = this.toArray(this.evaluate(args[1]!, ctx));
    const valArrRaw = this.toArray(this.evaluate(args[2]!, ctx));
    if (rowArrRaw.kind === "error") return rowArrRaw;
    if (colArrRaw.kind === "error") return colArrRaw;
    if (valArrRaw.kind === "error") return valArrRaw;
    if (rowArrRaw.kind !== "array" || colArrRaw.kind !== "array" || valArrRaw.kind !== "array") {
      return err(ExcelErrorCode.Value);
    }
    const rowArr = rowArrRaw;
    const colArr = colArrRaw;
    const valArr = valArrRaw;
    if (rowArr.height !== colArr.height || rowArr.height !== valArr.height) return err(ExcelErrorCode.Value);
    const H = rowArr.height;

    const aggregator = this.groupByAggregator(args[3]!, ctx);
    if (aggregator === null) return err(ExcelErrorCode.Value);

    let startRow = 0;
    let includeHeader = true;
    if (args.length >= 5) {
      const h = excelCoerceNumber(this.evaluate(args[4]!, ctx));
      if (h.kind !== "number") return h;
      const fieldHeaders = Math.trunc(h.value);
      if (fieldHeaders === 0) includeHeader = false;
      if (fieldHeaders === 1 || fieldHeaders === 3) startRow = 1;
    }

    let filter: boolean[] | undefined;
    if (args.length >= 11) {
      const f = this.evaluate(args[10]!, ctx);
      if (f.kind === "array") {
        if (f.values.length !== H) return err(ExcelErrorCode.Value);
        filter = f.values.map((v) => {
          const b = excelCoerceBoolean(v);
          return b.kind === "boolean" ? b.value : false;
        });
      } else {
        const b = excelCoerceBoolean(f);
        if (b.kind !== "boolean") return b;
        filter = Array(H).fill(b.value);
      }
    }

    const rows = new Map<string, { key: ExcelValue; cols: Map<string, { key: ExcelValue; values: ExcelValue[] }> }>();
    const allColKeys: ExcelValue[] = [];
    const allRowKeys: ExcelValue[] = [];

    for (let r = startRow; r < H; r++) {
      if (filter && !filter[r]) continue;
      const rowKeyVal = rowArr.values[r * rowArr.width] ?? BLANK;
      const colKeyVal = colArr.values[r * colArr.width] ?? BLANK;
      const rowKeyStr = valueToKey(rowKeyVal);
      const colKeyStr = valueToKey(colKeyVal);

      if (!rows.has(rowKeyStr)) {
        rows.set(rowKeyStr, { key: rowKeyVal, cols: new Map() });
        allRowKeys.push(rowKeyVal);
      }
      const rowGroup = rows.get(rowKeyStr)!;

      if (!rowGroup.cols.has(colKeyStr)) {
        rowGroup.cols.set(colKeyStr, { key: colKeyVal, values: [] });
        allColKeys.push(colKeyVal);
      }
      const colGroup = rowGroup.cols.get(colKeyStr)!;
      for (let c = 0; c < valArr.width; c++) {
        colGroup.values.push(valArr.values[r * valArr.width + c] ?? BLANK);
      }
    }

    // Unique sorted keys
    const uniqueColKeys = Array.from(new Map(allColKeys.map((k) => [valueToKey(k), k])).values()).sort(compareExcelValues);
    const uniqueRowKeys = Array.from(new Map(allRowKeys.map((k) => [valueToKey(k), k])).values()).sort(compareExcelValues);

    const outRows: ExcelValue[][] = [];
    if (includeHeader) {
      const header: ExcelValue[] = [BLANK];
      for (const colKey of uniqueColKeys) header.push(colKey);
      outRows.push(header);
    }

    for (const rowKey of uniqueRowKeys) {
      const rowGroup = rows.get(valueToKey(rowKey))!;
      const row: ExcelValue[] = [rowKey];
      for (const colKey of uniqueColKeys) {
        const colKeyStr = valueToKey(colKey);
        const colGroup = rowGroup.cols.get(colKeyStr);
        const groupValues = colGroup?.values ?? [];
        const result = aggregator.aggregate(groupValues, []);
        if (result.kind === "error") return result;
        row.push(result);
      }
      outRows.push(row);
    }

    const outWidth = uniqueColKeys.length + 1;
    const height = outRows.length;
    const flat: ExcelValue[] = [];
    for (const row of outRows) {
      if (row.length !== outWidth) return err(ExcelErrorCode.Value);
      flat.push(...row);
    }
    return { kind: "array", width: outWidth, height, values: flat };
  }

  private toArray(value: ExcelValue): ExcelValue {
    if (value.kind === "error") return value;
    if (value.kind === "array") return value;
    return { kind: "array", width: 1, height: 1, values: [value] };
  }

  private makeArray(values: ExcelValue[]): ArrayValue {
    return { kind: "array", width: 1, height: values.length, values };
  }

  private groupByAggregator(fnArg: FormulaNode, ctx: EvaluationContext): GroupByAggregator | null {
    const makeArr = (vals: ExcelValue[]) => this.makeArray(vals);
    if (fnArg.kind === "function") {
      const upper = fnArg.name.toUpperCase();
      if (upper === "LAMBDA") {
        const lambdaVal = this.evalLambda(fnArg.args, ctx);
        if (lambdaVal.kind !== "lambda") return null;
        return {
          aggregate: (group, all) => {
            if (lambdaVal.params.length === 0) return err(ExcelErrorCode.Value);
            const callArgs: ExcelValue[] = [makeArr(group)];
            if (lambdaVal.params.length >= 2) callArgs.push(makeArr(all));
            return this.callLambdaValues(lambdaVal, callArgs, ctx);
          },
        };
      }
      const fn = this.functions.get(upper);
      if (!fn) return null;
      return {
        aggregate: (group, all) => {
          if (upper === "PERCENTOF") {
            return fn.evaluate([makeArr(group), makeArr(all)], ctx);
          }
          return fn.evaluate([makeArr(group)], ctx);
        },
      };
    }
    if (fnArg.kind === "name") {
      const resolved = ctx.resolveName(fnArg.name);
      if (resolved && isExcelValue(resolved) && resolved.kind === "lambda") {
        return {
          aggregate: (group, all) => {
            if (resolved.params.length === 0) return err(ExcelErrorCode.Value);
            const callArgs: ExcelValue[] = [makeArr(group)];
            if (resolved.params.length >= 2) callArgs.push(makeArr(all));
            return this.callLambdaValues(resolved, callArgs, ctx);
          },
        };
      }
      const fn = this.functions.get(fnArg.name.toUpperCase());
      if (fn) {
        const upper = fnArg.name.toUpperCase();
        return {
          aggregate: (group, all) => {
            if (upper === "PERCENTOF") {
              return fn.evaluate([makeArr(group), makeArr(all)], ctx);
            }
            return fn.evaluate([makeArr(group)], ctx);
          },
        };
      }
      return null;
    }
    return null;
  }
}

function compareExcelValues(a: ExcelValue, b: ExcelValue): number {
  const order = (x: ExcelValue): number => {
    if (x.kind === "error") return 5;
    if (x.kind === "boolean") return 4;
    if (x.kind === "string") return 3;
    if (x.kind === "number") return 2;
    return 1; // blank / omitted
  };
  if (a.kind === "error" || b.kind === "error") return 0;
  const oa = order(a);
  const ob = order(b);
  if (oa !== ob) return oa - ob;
  if (a.kind === "number" && b.kind === "number") return a.value - b.value || 0;
  if (a.kind === "string" && b.kind === "string") return a.value.localeCompare(b.value, undefined, { sensitivity: "accent" });
  if (a.kind === "boolean" && b.kind === "boolean") return Number(a.value) - Number(b.value);
  return 0;
}

function valueToKey(v: ExcelValue): string {
  if (v.kind === "error") return `err:${v.code}`;
  if (v.kind === "blank" || v.kind === "omitted") return "blank";
  if (v.kind === "number") return `n:${v.value}`;
  if (v.kind === "string") return `s:${v.value}`;
  if (v.kind === "boolean") return `b:${v.value}`;
  if (v.kind === "array") return `a:${v.values.map(valueToKey).join(",")}`;
  if (v.kind === "lambda") return "lambda";
  if (v.kind === "sparkline") return "sparkline";
  return "unknown";
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
