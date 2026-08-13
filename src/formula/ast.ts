import { lexFormula, type FormulaToken } from "./lexer.js";
import { parseA1, parseA1Range, type CellAddress, type CellRange } from "../model/address.js";
import { ExcelErrorCode } from "../model/value.js";

export type FormulaNode =
  | { kind: "literal"; value: number | string | boolean | ExcelErrorCode }
  | { kind: "binary"; op: string; left: FormulaNode; right: FormulaNode }
  | { kind: "unary"; op: string; expr: FormulaNode }
  | { kind: "function"; name: string; args: FormulaNode[] }
  | { kind: "reference"; sheet?: string; address: CellAddress; absRow?: boolean; absCol?: boolean }
  | { kind: "range"; sheet?: string; range: CellRange }
  | { kind: "union"; items: FormulaNode[] }
  | { kind: "intersection"; left: FormulaNode; right: FormulaNode }
  | { kind: "name"; name: string }
  | { kind: "array"; rows: FormulaNode[][] }
  | { kind: "structured"; table: string; column?: string; spec?: string }
  | { kind: "external"; workbook: string; sheet?: string; ref: string }
  | { kind: "spill"; expr: FormulaNode }
  | { kind: "implicitIntersection"; expr: FormulaNode }
  | { kind: "missing" };

class Parser {
  private i = 0;
  constructor(private tokens: FormulaToken[]) {}

  parse(): FormulaNode {
    if (this.tokens.length === 0) return { kind: "missing" };
    const n = this.parseUnion();
    return n;
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.i];
  }

  private take(): FormulaToken {
    return this.tokens[this.i++]!;
  }

  private parseUnion(): FormulaNode {
    let left = this.parseIntersection();
    while (this.peek()?.kind === "comma" && this.looksLikeUnion()) {
      this.take();
      const right = this.parseIntersection();
      if (left.kind === "union") left.items.push(right);
      else left = { kind: "union", items: [left, right] };
    }
    return left;
  }

  private looksLikeUnion(): boolean {
    // Heuristic: top-level commas in non-function context — simplified treat as union
    return true;
  }

  private parseIntersection(): FormulaNode {
    let left = this.parseCompare();
    // space intersection is hard with lexer skipping spaces — skip for now
    return left;
  }

  private parseCompare(): FormulaNode {
    let left = this.parseConcat();
    while (this.peek()?.kind === "op" && ["=", "<>", "<", ">", "<=", ">="].includes((this.peek() as { value: string }).value)) {
      const op = (this.take() as { value: string }).value;
      const right = this.parseConcat();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseConcat(): FormulaNode {
    let left = this.parseAdd();
    while (this.peek()?.kind === "op" && (this.peek() as { value: string }).value === "&") {
      this.take();
      const right = this.parseAdd();
      left = { kind: "binary", op: "&", left, right };
    }
    return left;
  }

  private parseAdd(): FormulaNode {
    let left = this.parseMul();
    while (this.peek()?.kind === "op" && ["+", "-"].includes((this.peek() as { value: string }).value)) {
      const op = (this.take() as { value: string }).value;
      const right = this.parseMul();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseMul(): FormulaNode {
    let left = this.parsePow();
    while (this.peek()?.kind === "op" && ["*", "/"].includes((this.peek() as { value: string }).value)) {
      const op = (this.take() as { value: string }).value;
      const right = this.parsePow();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parsePow(): FormulaNode {
    let left = this.parseUnary();
    while (this.peek()?.kind === "op" && (this.peek() as { value: string }).value === "^") {
      this.take();
      const right = this.parseUnary();
      left = { kind: "binary", op: "^", left, right };
    }
    return left;
  }

  private parseUnary(): FormulaNode {
    if (this.peek()?.kind === "op" && (this.peek() as { value: string }).value === "+") {
      this.take();
      return { kind: "unary", op: "+", expr: this.parseUnary() };
    }
    if (this.peek()?.kind === "op" && (this.peek() as { value: string }).value === "-") {
      this.take();
      return { kind: "unary", op: "-", expr: this.parseUnary() };
    }
    if (this.peek()?.kind === "at") {
      this.take();
      return { kind: "implicitIntersection", expr: this.parseUnary() };
    }
    let primary = this.parsePrimary();
    if (this.peek()?.kind === "op" && (this.peek() as { value: string }).value === "%") {
      this.take();
      primary = { kind: "unary", op: "%", expr: primary };
    }
    if (this.peek()?.kind === "hash") {
      this.take();
      primary = { kind: "spill", expr: primary };
    }
    return primary;
  }

  private parsePrimary(): FormulaNode {
    const t = this.peek();
    if (!t) return { kind: "missing" };

    if (t.kind === "number") {
      this.take();
      return { kind: "literal", value: t.value };
    }
    if (t.kind === "string") {
      this.take();
      return { kind: "literal", value: t.value };
    }
    if (t.kind === "boolean") {
      this.take();
      return { kind: "literal", value: t.value };
    }
    if (t.kind === "error") {
      this.take();
      return { kind: "literal", value: t.value as ExcelErrorCode };
    }
    if (t.kind === "function") {
      this.take();
      this.expect("lparen");
      const args: FormulaNode[] = [];
      if (this.peek()?.kind !== "rparen") {
        if (this.peek()?.kind === "comma" || this.peek()?.kind === "semicolon") {
          args.push({ kind: "missing" });
        } else {
          args.push(this.parseCompare());
        }
        while (this.peek()?.kind === "comma" || this.peek()?.kind === "semicolon") {
          this.take();
          if (this.peek()?.kind === "rparen") {
            args.push({ kind: "missing" });
            break;
          }
          if (this.peek()?.kind === "comma" || this.peek()?.kind === "semicolon") {
            args.push({ kind: "missing" });
            continue;
          }
          args.push(this.parseCompare());
        }
      }
      this.expect("rparen");
      return { kind: "function", name: t.value, args };
    }
    if (t.kind === "ref") {
      this.take();
      return this.parseRefToken(t.value);
    }
    if (t.kind === "identifier") {
      this.take();
      return { kind: "name", name: t.value };
    }
    if (t.kind === "lparen") {
      this.take();
      const inner = this.parseUnion();
      this.expect("rparen");
      return inner;
    }
    if (t.kind === "lbrace") {
      this.take();
      const rows: FormulaNode[][] = [];
      let row: FormulaNode[] = [];
      if (this.peek()?.kind !== "rbrace") {
        row.push(this.parseCompare());
        while (this.peek() && this.peek()!.kind !== "rbrace") {
          if (this.peek()!.kind === "semicolon") {
            this.take();
            rows.push(row);
            row = [];
            if (this.peek()?.kind === "rbrace") break;
            row.push(this.parseCompare());
          } else if (this.peek()!.kind === "comma") {
            this.take();
            row.push(this.parseCompare());
          } else break;
        }
        rows.push(row);
      }
      this.expect("rbrace");
      return { kind: "array", rows };
    }

    this.take();
    return { kind: "missing" };
  }

  private parseRefToken(value: string): FormulaNode {
    // Structured Table[Col]
    const structured = /^([A-Za-z_][\w.]*)\[(.*)\]$/.exec(value);
    if (structured) {
      return { kind: "structured", table: structured[1]!, column: structured[2] };
    }
    let sheet: string | undefined;
    let ref = value;
    const bang = value.lastIndexOf("!");
    if (bang >= 0) {
      sheet = value.slice(0, bang).replace(/^'|'$/g, "");
      ref = value.slice(bang + 1);
    }
    if (ref.includes(":")) {
      return { kind: "range", sheet, range: parseA1Range(ref) };
    }
    // range like A:A or 1:1 — parseA1Range may fail; handle
    try {
      if (/^[A-Za-z]+$/.test(ref)) {
        // incomplete — treat as name
        return { kind: "name", name: value };
      }
      const addr = parseA1(ref);
      return { kind: "reference", sheet, address: addr };
    } catch {
      return { kind: "name", name: value };
    }
  }

  private expect(kind: FormulaToken["kind"]): void {
    const t = this.take();
    if (!t || t.kind !== kind) throw new Error(`Expected ${kind}, got ${t?.kind}`);
  }
}

export function parseFormula(text: string): FormulaNode {
  const tokens = lexFormula(text);
  return new Parser(tokens).parse();
}

/** Rewrite references after structural insert/delete — operates on AST, never string replace. */
export function transformReference(
  node: FormulaNode,
  change: {
    type: "insertRows" | "deleteRows" | "insertCols" | "deleteCols";
    index: number;
    count: number;
    sheet?: string;
  },
): FormulaNode {
  const shift = (addr: CellAddress): CellAddress => {
    let { row, column } = addr;
    if (change.type === "insertRows" && row >= change.index) row += change.count;
    if (change.type === "deleteRows") {
      if (row >= change.index && row < change.index + change.count) {
        return { ...addr, row: -1, column: -1 }; // becomes #REF!
      }
      if (row >= change.index + change.count) row -= change.count;
    }
    if (change.type === "insertCols" && column >= change.index) column += change.count;
    if (change.type === "deleteCols") {
      if (column >= change.index && column < change.index + change.count) {
        return { ...addr, row: -1, column: -1 };
      }
      if (column >= change.index + change.count) column -= change.count;
    }
    return { ...addr, row, column };
  };

  const walk = (n: FormulaNode): FormulaNode => {
    switch (n.kind) {
      case "reference": {
        const address = shift(n.address);
        if (address.row < 0) return { kind: "literal", value: ExcelErrorCode.Ref };
        return { ...n, address };
      }
      case "range": {
        const a = shift({ row: n.range.startRow, column: n.range.startColumn });
        const b = shift({ row: n.range.endRow, column: n.range.endColumn });
        if (a.row < 0 || b.row < 0) return { kind: "literal", value: ExcelErrorCode.Ref };
        return {
          ...n,
          range: {
            startRow: a.row,
            startColumn: a.column,
            endRow: b.row,
            endColumn: b.column,
          },
        };
      }
      case "binary":
        return { ...n, left: walk(n.left), right: walk(n.right) };
      case "unary":
        return { ...n, expr: walk(n.expr) };
      case "function":
        return { ...n, args: n.args.map(walk) };
      case "union":
        return { ...n, items: n.items.map(walk) };
      case "intersection":
        return { ...n, left: walk(n.left), right: walk(n.right) };
      case "array":
        return { ...n, rows: n.rows.map((r) => r.map(walk)) };
      case "spill":
      case "implicitIntersection":
        return { ...n, expr: walk(n.expr) };
      default:
        return n;
    }
  };
  return walk(node);
}
