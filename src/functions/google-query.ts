/**
 * Google Visualization Query Language (QUERY) implementation for Google Sheets.
 *
 * Supports the offline subset: SELECT, WHERE, ORDER BY, LIMIT, OFFSET, LABEL,
 * GROUP BY, PIVOT, and common aggregates/scalar functions.
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
import {
  excelCoerceBoolean,
  excelCoerceNumber,
  excelCoerceString,
  excelCompare,
} from "../formula/coercion.js";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Expr =
  | { kind: "literal"; value: ExcelValue }
  | { kind: "col"; index: number; label: string }
  | { kind: "call"; name: string; args: Expr[] }
  | { kind: "binary"; op: string; left: Expr; right: Expr }
  | { kind: "unary"; op: string; expr: Expr }
  | { kind: "in"; expr: Expr; list: Expr[] }
  | { kind: "isNull"; expr: Expr; not: boolean };

interface SelectItem {
  expr: Expr;
}

interface OrderItem {
  expr: Expr;
  desc: boolean;
}

interface LabelItem {
  col: string;
  label: string;
}

interface QueryAST {
  select: SelectItem[];
  where?: Expr;
  groupBy: Expr[];
  pivot: Expr[];
  orderBy: OrderItem[];
  limit: number;
  offset: number;
  labels: LabelItem[];
  format: LabelItem[];
}

interface QueryContext {
  values: ExcelValue[];
  labels: string[];
}

// ------------------------------------------------------------------
// Tokenizer
// ------------------------------------------------------------------

const KEYWORDS = new Set([
  "SELECT", "WHERE", "GROUP", "BY", "ORDER", "LIMIT", "OFFSET", "LABEL", "FORMAT", "OPTIONS",
  "AND", "OR", "NOT", "ASC", "DESC", "CONTAINS", "STARTS", "ENDS", "WITH", "IS", "NULL",
  "LIKE", "MATCHES", "IN", "TRUE", "FALSE",
]);

interface Token {
  kind: "keyword" | "ident" | "string" | "number" | "op" | "comma" | "lparen" | "rparen" | "eof";
  value: string;
  raw: string | number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c!)) {
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ kind: "comma", value: ",", raw: "," });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen", value: "(", raw: "(" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen", value: ")", raw: ")" });
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      let s = "";
      i++;
      while (i < input.length) {
        const ch = input[i]!;
        if (ch === quote) {
          if (input[i + 1] === quote) {
            s += quote;
            i += 2;
            continue;
          }
          i++;
          break;
        }
        s += ch;
        i++;
      }
      tokens.push({ kind: "string", value: s, raw: s });
      continue;
    }
    if (/\d/.test(c!) || (c === "." && /\d/.test(input[i + 1] ?? ""))) {
      let s = "";
      while (i < input.length && (/\d/.test(input[i]!) || input[i] === ".")) {
        s += input[i]!;
        i++;
      }
      tokens.push({ kind: "number", value: s, raw: Number(s) });
      continue;
    }
    if (/[A-Za-z_]/.test(c!)) {
      let s = "";
      while (i < input.length && /[A-Za-z0-9_.]/.test(input[i]!)) {
        s += input[i]!;
        i++;
      }
      const upper = s.toUpperCase();
      const kind = KEYWORDS.has(upper) ? "keyword" : "ident";
      tokens.push({ kind, value: upper, raw: s });
      continue;
    }
    if (c === ">" || c === "<" || c === "=" || c === "!" || c === "+" || c === "-" || c === "*" || c === "/") {
      let s = c;
      i++;
      if (i < input.length && (input[i] === "=" || (s === "<" && input[i] === ">") || (s === "!" && input[i] === "="))) {
        s += input[i]!;
        i++;
      }
      tokens.push({ kind: "op", value: s, raw: s });
      continue;
    }
    // Unknown character, skip
    i++;
  }
  tokens.push({ kind: "eof", value: "", raw: "" });
  return tokens;
}

// ------------------------------------------------------------------
// Parser
// ------------------------------------------------------------------

class Parser {
  private i = 0;
  constructor(private tokens: Token[]) {}

  parse(): QueryAST {
    const q: QueryAST = {
      select: this.parseSelect(),
      groupBy: [],
      pivot: [],
      orderBy: [],
      limit: Infinity,
      offset: 0,
      labels: [],
      format: [],
    };
    while (this.peek().kind !== "eof") {
      const t = this.peek();
      if (t.kind === "keyword") {
        switch (t.value) {
          case "WHERE":
            this.take();
            q.where = this.parseExpr();
            break;
          case "GROUP":
            this.take();
            this.expect("BY");
            q.groupBy = this.parseExprList();
            break;
          case "PIVOT":
            this.take();
            q.pivot = this.parseExprList();
            break;
          case "ORDER":
            this.take();
            this.expect("BY");
            q.orderBy = this.parseOrderBy();
            break;
          case "LIMIT":
            this.take();
            q.limit = this.parseNumber();
            break;
          case "OFFSET":
            this.take();
            q.offset = this.parseNumber();
            break;
          case "LABEL":
            this.take();
            q.labels = this.parseLabelList();
            break;
          case "FORMAT":
            this.take();
            q.format = this.parseLabelList();
            break;
          case "OPTIONS":
            this.take();
            // consume the rest of options as a single string/identifier
            while (this.peek().kind !== "eof") this.take();
            break;
          default:
            throw new Error(`Unexpected keyword ${t.value}`);
        }
      } else {
        throw new Error(`Unexpected token ${t.value}`);
      }
    }
    return q;
  }

  private parseSelect(): SelectItem[] {
    this.expect("SELECT");
    if (this.peek().kind === "op" && this.peek().value === "*") {
      this.take();
      return [{ expr: { kind: "col", index: -1, label: "*" } }];
    }
    const items: SelectItem[] = [];
    items.push({ expr: this.parseExpr() });
    while (this.peek().kind === "comma") {
      this.take();
      items.push({ expr: this.parseExpr() });
    }
    return items;
  }

  private parseExprList(): Expr[] {
    const list: Expr[] = [this.parseExpr()];
    while (this.peek().kind === "comma") {
      this.take();
      list.push(this.parseExpr());
    }
    return list;
  }

  private parseOrderBy(): OrderItem[] {
    const items: OrderItem[] = [];
    let expr = this.parseExpr();
    let desc = false;
    if (this.peek().kind === "keyword" && (this.peek().value === "ASC" || this.peek().value === "DESC")) {
      desc = this.take().value === "DESC";
    }
    items.push({ expr, desc });
    while (this.peek().kind === "comma") {
      this.take();
      expr = this.parseExpr();
      desc = false;
      if (this.peek().kind === "keyword" && (this.peek().value === "ASC" || this.peek().value === "DESC")) {
        desc = this.take().value === "DESC";
      }
      items.push({ expr, desc });
    }
    return items;
  }

  private parseLabelList(): LabelItem[] {
    const list: LabelItem[] = [];
    do {
      const col = this.parseColRefForLabel();
      const labelTok = this.peek();
      if (labelTok.kind !== "string" && labelTok.kind !== "ident") throw new Error("Expected label string");
      const label = labelTok.value === labelTok.raw ? labelTok.value : (labelTok.raw as string);
      this.take();
      list.push({ col, label });
    } while (this.peek().kind === "comma" && this.take());
    return list;
  }

  private parseColRefForLabel(): string {
    const t = this.peek();
    if (t.kind === "ident" || t.kind === "string") {
      return this.take().raw as string;
    }
    throw new Error("Expected column reference in LABEL");
  }

  private parseNumber(): number {
    const t = this.peek();
    if (t.kind === "number") return Number(this.take().raw);
    throw new Error("Expected number");
  }

  private parseExpr(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.peek().kind === "keyword" && this.peek().value === "OR") {
      this.take();
      const right = this.parseAnd();
      left = { kind: "binary", op: "or", left, right };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.peek().kind === "keyword" && this.peek().value === "AND") {
      this.take();
      const right = this.parseNot();
      left = { kind: "binary", op: "and", left, right };
    }
    return left;
  }

  private parseNot(): Expr {
    if (this.peek().kind === "keyword" && this.peek().value === "NOT") {
      this.take();
      return { kind: "unary", op: "not", expr: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expr {
    let left = this.parseAdditive();
    const t = this.peek();
    if (t.kind === "keyword" && t.value === "IS") {
      this.take();
      let not = false;
      if (this.peek().kind === "keyword" && this.peek().value === "NOT") {
        not = true;
        this.take();
      }
      this.expect("NULL");
      return { kind: "isNull", expr: left, not };
    }
    const op = this.readComparisonOp();
    if (op) {
      if (op === "in") {
        this.consume("lparen");
        const list = this.parseExprList();
        this.consume("rparen");
        return { kind: "in", expr: left, list };
      }
      const right = this.parseAdditive();
      return { kind: "binary", op, left, right };
    }
    return left;
  }

  private readComparisonOp(): string | null {
    const t = this.peek();
    if (t.kind === "op" && ["=", "<>", "!=", "<", ">", "<=", ">="].includes(t.value)) {
      return this.take().value;
    }
    if (t.kind === "keyword") {
      if (["CONTAINS", "LIKE", "MATCHES", "IN"].includes(t.value)) {
        return this.take().value.toLowerCase();
      }
      if (t.value === "STARTS") {
        this.take();
        this.expect("WITH");
        return "starts with";
      }
      if (t.value === "ENDS") {
        this.take();
        this.expect("WITH");
        return "ends with";
      }
    }
    return null;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();
    while (this.peek().kind === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.take().value;
      const right = this.parseMultiplicative();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();
    while (this.peek().kind === "op" && (this.peek().value === "*" || this.peek().value === "/")) {
      const op = this.take().value;
      const right = this.parseUnary();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.peek().kind === "op" && (this.peek().value === "-" || this.peek().value === "+")) {
      const op = this.take().value;
      return { kind: "unary", op, expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.kind === "number") {
      this.take();
      return { kind: "literal", value: num(Number(t.raw)) };
    }
    if (t.kind === "string") {
      this.take();
      return { kind: "literal", value: str(t.value) };
    }
    if (t.kind === "keyword" && (t.value === "TRUE" || t.value === "FALSE")) {
      this.take();
      return { kind: "literal", value: bool(t.value === "TRUE") };
    }
    if (t.kind === "lparen") {
      this.take();
      const expr = this.parseExpr();
      this.consume("rparen");
      return expr;
    }
    if (t.kind === "ident" || (t.kind === "keyword" && !KEYWORDS.has(t.value))) {
      const name = this.take().value;
      if (this.peek().kind === "lparen") {
        this.consume("lparen");
        const args: Expr[] = [];
        if (this.peek().kind !== "rparen") {
          args.push(this.parseExpr());
          while (this.peek().kind === "comma") {
            this.take();
            args.push(this.parseExpr());
          }
        }
        this.consume("rparen");
        return { kind: "call", name, args };
      }
      // column reference
      return { kind: "col", index: -1, label: name };
    }
    throw new Error(`Unexpected token ${t.value} ${t.kind}`);
  }

  private peek(): Token {
    return this.tokens[this.i] ?? this.tokens[this.tokens.length - 1]!;
  }

  private take(): Token {
    return this.tokens[this.i++] ?? this.tokens[this.tokens.length - 1]!;
  }

  private consume(kind: Token["kind"], value?: string): Token {
    const t = this.peek();
    if (t.kind !== kind || (value !== undefined && t.value !== value)) throw new Error(`Expected ${kind} ${value ?? ""}`);
    return this.take();
  }

  private expect(value: string): Token {
    return this.consume("keyword", value);
  }
}

// ------------------------------------------------------------------
// Execution
// ------------------------------------------------------------------

function resolveColumn(name: string, ctx: QueryContext): number {
  const upper = name.toUpperCase().trim();
  // ColN
  const colMatch = /^COL(\d+)$/.exec(upper);
  if (colMatch) {
    const idx = Number(colMatch[1]) - 1;
    if (idx >= 0 && idx < ctx.values.length) return idx;
    return -1;
  }
  // A-Z, AA, AB...
  if (/^[A-Z]+$/.test(upper)) {
    let idx = 0;
    for (const ch of upper) {
      idx = idx * 26 + (ch.charCodeAt(0) - 64);
    }
    idx--;
    if (idx >= 0 && idx < ctx.values.length) return idx;
    return -1;
  }
  // header label match
  const lower = upper.toLowerCase();
  for (let i = 0; i < ctx.labels.length; i++) {
    if (ctx.labels[i]!.toLowerCase() === lower) return i;
  }
  return -1;
}

function bindExpr(expr: Expr, ctx: QueryContext): Expr {
  switch (expr.kind) {
    case "col":
      return { ...expr, index: resolveColumn(expr.label, ctx) };
    case "call":
      return { ...expr, args: expr.args.map((a) => bindExpr(a, ctx)) };
    case "binary":
      return { ...expr, left: bindExpr(expr.left, ctx), right: bindExpr(expr.right, ctx) };
    case "unary":
      return { ...expr, expr: bindExpr(expr.expr, ctx) };
    case "in":
      return { ...expr, expr: bindExpr(expr.expr, ctx), list: expr.list.map((a) => bindExpr(a, ctx)) };
    case "isNull":
      return { ...expr, expr: bindExpr(expr.expr, ctx) };
    default:
      return expr;
  }
}

function isAggregate(expr: Expr): boolean {
  if (expr.kind === "call") {
    const name = expr.name.toUpperCase();
    if (["SUM", "AVG", "AVERAGE", "COUNT", "COUNTA", "MAX", "MIN", "PRODUCT"].includes(name)) return true;
  }
  if (expr.kind === "binary") return isAggregate(expr.left) || isAggregate(expr.right);
  if (expr.kind === "unary") return isAggregate(expr.expr);
  if (expr.kind === "in") return isAggregate(expr.expr) || expr.list.some(isAggregate);
  if (expr.kind === "isNull") return isAggregate(expr.expr);
  return false;
}

function evalExpr(expr: Expr, ctx: QueryContext, rows?: ExcelValue[][]): ExcelValue {
  switch (expr.kind) {
    case "literal":
      return expr.value;
    case "col": {
      if (expr.index < 0 || expr.index >= ctx.values.length) return err(ExcelErrorCode.Value);
      return ctx.values[expr.index] ?? BLANK;
    }
    case "unary": {
      const v = evalExpr(expr.expr, ctx, rows);
      if (v.kind === "error") return v;
      if (expr.op === "+") return excelCoerceNumber(v);
      if (expr.op === "-") {
        const n = excelCoerceNumber(v);
        return n.kind === "number" ? num(-n.value) : n;
      }
      if (expr.op === "not") {
        const b = excelCoerceBoolean(v);
        return b.kind === "boolean" ? bool(!b.value) : b;
      }
      return err(ExcelErrorCode.Value);
    }
    case "binary": {
      const left = evalExpr(expr.left, ctx, rows);
      if (left.kind === "error") return left;
      if (expr.op === "and") {
        const l = excelCoerceBoolean(left);
        if (l.kind !== "boolean") return l;
        if (!l.value) return bool(false);
        const right = evalExpr(expr.right, ctx, rows);
        const r = excelCoerceBoolean(right);
        return r.kind === "boolean" ? bool(l.value && r.value) : r;
      }
      if (expr.op === "or") {
        const l = excelCoerceBoolean(left);
        if (l.kind !== "boolean") return l;
        if (l.value) return bool(true);
        const right = evalExpr(expr.right, ctx, rows);
        const r = excelCoerceBoolean(right);
        return r.kind === "boolean" ? bool(l.value || r.value) : r;
      }
      const right = evalExpr(expr.right, ctx, rows);
      if (right.kind === "error") return right;
      switch (expr.op) {
        case "+": {
          const a = excelCoerceNumber(left);
          const b = excelCoerceNumber(right);
          if (a.kind !== "number") return a;
          if (b.kind !== "number") return b;
          return num(a.value + b.value);
        }
        case "-": {
          const a = excelCoerceNumber(left);
          const b = excelCoerceNumber(right);
          if (a.kind !== "number") return a;
          if (b.kind !== "number") return b;
          return num(a.value - b.value);
        }
        case "*": {
          const a = excelCoerceNumber(left);
          const b = excelCoerceNumber(right);
          if (a.kind !== "number") return a;
          if (b.kind !== "number") return b;
          return num(a.value * b.value);
        }
        case "/": {
          const a = excelCoerceNumber(left);
          const b = excelCoerceNumber(right);
          if (a.kind !== "number") return a;
          if (b.kind !== "number") return b;
          if (b.value === 0) return err(ExcelErrorCode.Div0);
          return num(a.value / b.value);
        }
        case "=":
        case "<>":
        case "<":
        case ">":
        case "<=":
        case ">=":
          return excelCompare(left, right, expr.op);
        case "contains":
        case "starts with":
        case "ends with":
        case "like":
        case "matches":
          return compareText(left, right, expr.op);
        default:
          return err(ExcelErrorCode.Value);
      }
    }
    case "in": {
      const v = evalExpr(expr.expr, ctx, rows);
      for (const item of expr.list) {
        const candidate = evalExpr(item, ctx, rows);
        const cmp = excelCompare(v, candidate, "=");
        if (cmp.kind === "boolean" && cmp.value) return bool(true);
      }
      return bool(false);
    }
    case "isNull": {
      const v = evalExpr(expr.expr, ctx, rows);
      const isNull = v.kind === "blank" || v.kind === "omitted" || (v.kind === "string" && v.value === "") || (v.kind === "number" && v.value === 0);
      return bool(expr.not ? !isNull : isNull);
    }
    case "call": {
      const name = expr.name.toUpperCase();
      if (isAggregate(expr) && rows) {
        return aggregate(name, expr.args, rows, ctx);
      }
      const args = expr.args.map((a) => evalExpr(a, ctx, rows));
      return callFunction(name, args);
    }
  }
}

function compareText(left: ExcelValue, right: ExcelValue, op: string): ExcelValue {
  const a = excelCoerceString(left);
  const b = excelCoerceString(right);
  if (a.kind !== "string") return a;
  if (b.kind !== "string") return b;
  const av = a.value;
  const bv = b.value;
  switch (op) {
    case "contains":
      return bool(av.toLowerCase().includes(bv.toLowerCase()));
    case "starts with":
      return bool(av.toLowerCase().startsWith(bv.toLowerCase()));
    case "ends with":
      return bool(av.toLowerCase().endsWith(bv.toLowerCase()));
    case "matches": {
      try {
        return bool(new RegExp(bv, "i").test(av));
      } catch {
        return err(ExcelErrorCode.Value);
      }
    }
    case "like": {
      const pattern = "^" + bv.replace(/%/g, ".*").replace(/_/g, ".") + "$";
      try {
        return bool(new RegExp(pattern, "i").test(av));
      } catch {
        return err(ExcelErrorCode.Value);
      }
    }
    default:
      return err(ExcelErrorCode.Value);
  }
}

function aggregate(name: string, args: Expr[], rows: ExcelValue[][], ctx: QueryContext): ExcelValue {
  const arg = args[0];
  const vals: number[] = [];
  let count = 0;
  let strCount = 0;
  for (const row of rows) {
    const rctx: QueryContext = { values: row, labels: ctx.labels };
    const v = arg ? evalExpr(arg, rctx, undefined) : BLANK;
    if (v.kind === "number") {
      vals.push(v.value);
      count++;
    } else if (v.kind === "string" && v.value !== "") {
      strCount++;
    } else if (v.kind === "boolean") {
      vals.push(v.value ? 1 : 0);
      count++;
    }
  }
  switch (name) {
    case "SUM":
      return num(vals.reduce((s, x) => s + x, 0));
    case "AVG":
    case "AVERAGE":
      return vals.length ? num(vals.reduce((s, x) => s + x, 0) / vals.length) : err(ExcelErrorCode.Div0);
    case "COUNT":
      return num(count + strCount); // count numeric+text
    case "COUNTA":
      return num(vals.length + strCount);
    case "MAX":
      return vals.length ? num(Math.max(...vals)) : err(ExcelErrorCode.Num);
    case "MIN":
      return vals.length ? num(Math.min(...vals)) : err(ExcelErrorCode.Num);
    case "PRODUCT":
      return num(vals.reduce((p, x) => p * x, 1));
    default:
      return err(ExcelErrorCode.Value);
  }
}

function callFunction(name: string, args: ExcelValue[]): ExcelValue {
  const first = args[0];
  switch (name.toUpperCase()) {
    case "YEAR":
    case "MONTH":
    case "DAY":
    case "HOUR":
    case "MINUTE":
    case "SECOND": {
      const n = excelCoerceNumber(first ?? BLANK);
      if (n.kind !== "number") return n;
      const d = new Date(Date.UTC(1899, 11, 30) + n.value * 86400000);
      switch (name.toUpperCase()) {
        case "YEAR":
          return num(d.getUTCFullYear());
        case "MONTH":
          return num(d.getUTCMonth() + 1);
        case "DAY":
          return num(d.getUTCDate());
        case "HOUR":
          return num(d.getUTCHours());
        case "MINUTE":
          return num(d.getUTCMinutes());
        case "SECOND":
          return num(d.getUTCSeconds());
      }
      return err(ExcelErrorCode.Value);
    }
    case "UPPER": {
      const s = excelCoerceString(first ?? BLANK);
      return s.kind === "string" ? str(s.value.toUpperCase()) : s;
    }
    case "LOWER": {
      const s = excelCoerceString(first ?? BLANK);
      return s.kind === "string" ? str(s.value.toLowerCase()) : s;
    }
    case "LEN":
    case "LENGTH": {
      const s = excelCoerceString(first ?? BLANK);
      return s.kind === "string" ? num(s.value.length) : s;
    }
    case "ABS": {
      const n = excelCoerceNumber(first ?? BLANK);
      return n.kind === "number" ? num(Math.abs(n.value)) : n;
    }
    case "SQRT": {
      const n = excelCoerceNumber(first ?? BLANK);
      if (n.kind !== "number") return n;
      if (n.value < 0) return err(ExcelErrorCode.Num);
      return num(Math.sqrt(n.value));
    }
    case "ROUND": {
      const n = excelCoerceNumber(first ?? BLANK);
      const digits = excelCoerceNumber(args[1] ?? num(0));
      if (n.kind !== "number" || digits.kind !== "number") return n.kind !== "number" ? n : digits;
      const f = 10 ** digits.value;
      return num(Math.round(n.value * f) / f);
    }
    default:
      return err(ExcelErrorCode.Value);
  }
}

// ------------------------------------------------------------------
// Query runner
// ------------------------------------------------------------------

function rowContext(row: ExcelValue[], labels: string[]): QueryContext {
  return { values: row, labels };
}

function keyFor(row: ExcelValue[], exprs: Expr[], labels: string[]): string {
  const parts: string[] = [];
  const rctx = rowContext(row, labels);
  for (const e of exprs) {
    const v = evalExpr(e, rctx, undefined);
    parts.push(valueKey(v));
  }
  return parts.join("\x00");
}

function valueKey(v: ExcelValue): string {
  if (v.kind === "number") return `n:${v.value}`;
  if (v.kind === "string") return `s:${v.value}`;
  if (v.kind === "boolean") return `b:${v.value}`;
  if (v.kind === "blank" || v.kind === "omitted") return "_";
  if (v.kind === "error") return `e:${v.code}`;
  return "?";
}

function projectRow(row: ExcelValue[], items: SelectItem[], labels: string[]): ExcelValue[] {
  const rctx = rowContext(row, labels);
  return items.map((it) => evalExpr(it.expr, rctx, undefined));
}

export function evaluateQuery(data: ArrayValue, queryText: string, headersArg: number): ExcelValue {
  // Determine header rows
  let headerRows = headersArg;
  if (headerRows === -1) {
    // guess: if first row is all non-blank strings and rest aren't all strings
    headerRows = 0;
    if (data.height > 0) {
      const firstRow = data.values.slice(0, data.width);
      const allStrings = firstRow.every((v) => v.kind === "string" && v.value.trim() !== "");
      if (allStrings) headerRows = 1;
    }
  }
  if (headerRows < 0) headerRows = 0;

  const labels: string[] = [];
  for (let c = 0; c < data.width; c++) {
    const v = data.values[c + (headerRows > 0 ? 0 : -1)] ?? BLANK; // no, header row is first row
  }
  // Correctly extract labels from header row(s)
  for (let c = 0; c < data.width; c++) {
    const cell = headerRows > 0 ? data.values[c] ?? BLANK : BLANK;
    const s = excelCoerceString(cell);
    labels.push(s.kind === "string" && s.value ? s.value : String.fromCharCode(65 + c));
  }

  const rows: ExcelValue[][] = [];
  for (let r = headerRows; r < data.height; r++) {
    const row: ExcelValue[] = [];
    for (let c = 0; c < data.width; c++) row.push(data.values[r * data.width + c] ?? BLANK);
    rows.push(row);
  }

  let ast: QueryAST;
  try {
    ast = new Parser(tokenize(queryText)).parse();
  } catch {
    return err(ExcelErrorCode.Value);
  }

  // bind select, where, groupby, pivot, orderby
  const inputCtx: QueryContext = { values: Array(data.width).fill(BLANK), labels };
  ast.select = ast.select.map((it) => ({ expr: bindExpr(it.expr, inputCtx) }));
  if (ast.where) ast.where = bindExpr(ast.where, inputCtx);
  ast.groupBy = ast.groupBy.map((e) => bindExpr(e, inputCtx));
  ast.pivot = ast.pivot.map((e) => bindExpr(e, inputCtx));
  ast.orderBy = ast.orderBy.map((o) => ({ ...o, expr: bindExpr(o.expr, inputCtx) }));

  // filter
  let filtered = rows;
  if (ast.where) {
    filtered = rows.filter((row) => {
      const v = evalExpr(ast.where!, rowContext(row, labels), undefined);
      const b = excelCoerceBoolean(v);
      return b.kind === "boolean" && b.value;
    });
  }

  // pivot keys
  const pivotKeysSet = new Set<string>();
  const pivotKeyFor = (row: ExcelValue[]) => keyFor(row, ast.pivot, labels);
  if (ast.pivot.length > 0) {
    for (const row of filtered) pivotKeysSet.add(pivotKeyFor(row));
  }
  const pivotKeys = Array.from(pivotKeysSet).sort();

  // grouping
  const groups = new Map<string, ExcelValue[][]>();
  const groupKeys: string[] = [];
  if (ast.groupBy.length > 0) {
    for (const row of filtered) {
      const k = keyFor(row, ast.groupBy, labels);
      if (!groups.has(k)) {
        groups.set(k, []);
        groupKeys.push(k);
      }
      groups.get(k)!.push(row);
    }
  } else {
    groups.set("__all__", filtered);
    groupKeys.push("__all__");
  }

  // produce output rows
  const outRows: ExcelValue[][] = [];
  // track output column labels
  const outLabels: string[] = [];

  // If SELECT * and no aggregation/grouping/pivot, simple projection
  const isStar = ast.select.length === 1 && ast.select[0]!.expr.kind === "col" && ast.select[0]!.expr.label === "*";

  if (isStar && ast.groupBy.length === 0 && ast.pivot.length === 0) {
    for (let c = 0; c < data.width; c++) outLabels.push(labels[c] ?? String.fromCharCode(65 + c));
    for (const row of filtered) outRows.push([...row]);
  } else if (ast.pivot.length > 0) {
    // For each group produce one row: group-by keys then one value per pivot key per aggregate select item
    const nonAggItems = ast.select.filter((it) => !isAggregate(it.expr));
    const aggItems = ast.select.filter((it) => isAggregate(it.expr));
    for (const it of nonAggItems) {
      outLabels.push(colLabel(it.expr, labels));
    }
    for (const pk of pivotKeys) {
      for (const it of aggItems) {
        outLabels.push(`${colLabel(it.expr, labels)} ${pk}`);
      }
    }
    for (const k of groupKeys) {
      const groupRows = groups.get(k)!;
      const firstRow = groupRows[0] ?? Array(data.width).fill(BLANK);
      const row: ExcelValue[] = [];
      for (const it of nonAggItems) row.push(evalExpr(it.expr, rowContext(firstRow, labels), undefined));
      for (const pk of pivotKeys) {
        const pRows = groupRows.filter((r) => pivotKeyFor(r) === pk);
        for (const it of aggItems) row.push(evalExpr(it.expr, rowContext(firstRow, labels), pRows));
      }
      outRows.push(row);
    }
  } else if (ast.groupBy.length > 0 || ast.select.some((it) => isAggregate(it.expr))) {
    const hasAgg = ast.select.some((it) => isAggregate(it.expr));
    for (const k of groupKeys) {
      const groupRows = groups.get(k)!;
      const firstRow = groupRows[0] ?? Array(data.width).fill(BLANK);
      const row: ExcelValue[] = [];
      for (const it of ast.select) {
        if (isAggregate(it.expr)) {
          row.push(evalExpr(it.expr, rowContext(firstRow, labels), groupRows));
        } else {
          row.push(evalExpr(it.expr, rowContext(firstRow, labels), undefined));
        }
      }
      outRows.push(row);
    }
    for (const it of ast.select) outLabels.push(colLabel(it.expr, labels));
  } else {
    for (const it of ast.select) outLabels.push(colLabel(it.expr, labels));
    for (const row of filtered) outRows.push(projectRow(row, ast.select, labels));
  }

  // order by - evaluate against output context
  if (ast.orderBy.length > 0) {
    const outCtx = (row: ExcelValue[]): QueryContext => ({ values: row, labels: outLabels });
    outRows.sort((a, b) => {
      for (const o of ast.orderBy) {
        const av = evalExpr(o.expr, outCtx(a), undefined);
        const bv = evalExpr(o.expr, outCtx(b), undefined);
        const cmp = compareValues(av, bv);
        if (cmp !== 0) return o.desc ? -cmp : cmp;
      }
      return 0;
    });
  }

  // limit/offset
  const start = Math.max(0, ast.offset);
  const end = ast.limit === Infinity ? outRows.length : Math.min(outRows.length, start + ast.limit);
  const sliced = outRows.slice(start, end);

  // apply labels
  const headerRow = [...outLabels];
  for (const item of ast.labels) {
    const idx = resolveOutputColumn(item.col, outLabels, labels);
    if (idx >= 0 && idx < headerRow.length) headerRow[idx] = item.label;
  }

  const values: ExcelValue[] = headerRow.map((h) => str(h));
  for (const row of sliced) values.push(...row);
  return { kind: "array", width: headerRow.length, height: sliced.length + 1, values } as ArrayValue;
}

function colLabel(expr: Expr, labels: string[]): string {
  if (expr.kind === "col") {
    if (expr.index >= 0 && expr.index < labels.length) return labels[expr.index] ?? expr.label;
    return expr.label;
  }
  if (expr.kind === "call") {
    const args = expr.args.map((a) => colLabel(a, labels)).join(", ");
    return `${expr.name}(${args})`;
  }
  if (expr.kind === "literal") {
    if (expr.value.kind === "string") return expr.value.value;
    if (expr.value.kind === "number") return String(expr.value.value);
    return "?";
  }
  return "expr";
}

function resolveOutputColumn(spec: string, outLabels: string[], inputLabels: string[]): number {
  const upper = spec.toUpperCase().trim();
  // try output label
  for (let i = 0; i < outLabels.length; i++) if (outLabels[i]!.toUpperCase() === upper) return i;
  // input column
  const ctx = { values: [], labels: inputLabels };
  const idx = resolveColumn(spec, ctx);
  if (idx >= 0) return idx;
  return -1;
}

function compareValues(a: ExcelValue, b: ExcelValue): number {
  if (a.kind === "number" && b.kind === "number") return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
  if (a.kind === "string" && b.kind === "string") return a.value.toLowerCase() < b.value.toLowerCase() ? -1 : a.value.toLowerCase() > b.value.toLowerCase() ? 1 : 0;
  if (a.kind === "boolean" && b.kind === "boolean") return a.value === b.value ? 0 : a.value ? 1 : -1;
  const an = excelCoerceNumber(a);
  const bn = excelCoerceNumber(b);
  if (an.kind === "number" && bn.kind === "number") return an.value < bn.value ? -1 : an.value > bn.value ? 1 : 0;
  const as = excelCoerceString(a);
  const bs = excelCoerceString(b);
  if (as.kind === "string" && bs.kind === "string") return as.value.toLowerCase() < bs.value.toLowerCase() ? -1 : as.value.toLowerCase() > bs.value.toLowerCase() ? 1 : 0;
  return 0;
}
