/**
 * Minimal workbook model with dynamic-array spill support.
 *
 * Maintains a static dependency graph for formula cells and recalculates
 * cells in topological order. Volatile functions (RAND, NOW, INDIRECT, ...)
 * are recalculated on every change. Dynamic-array spills trigger a full
 * recalc pass when their shape changes.
 */
import { parseFormula, type FormulaNode } from "../formula/ast.js";
import { FormulaEvaluator } from "../formula/evaluator.js";
import type { EvaluationContext } from "../formula/functions-types.js";
import { createBuiltinFunctions } from "../functions/builtins.js";
import { BLANK, err, ExcelErrorCode, type ArrayValue, type ExcelValue } from "./value.js";

interface WorkbookCellAddress {
  sheetId: number;
  row: number;
  column: number;
}

interface Sheet {
  id: number;
  name: string;
}

interface Cell {
  formula?: string;
  value?: ExcelValue;
}

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function isEmptyValue(value: ExcelValue | undefined): boolean {
  if (value === undefined) return true;
  return value.kind === "blank" || value.kind === "omitted";
}

function valuesEqual(a: ExcelValue | undefined, b: ExcelValue | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "blank":
    case "omitted":
      return true;
    case "number":
      return (b as { value: number }).value === a.value;
    case "boolean":
      return (b as { value: boolean }).value === a.value;
    case "string":
      return (b as { value: string }).value === a.value;
    case "error":
      return (b as { code: ExcelErrorCode }).code === a.code;
    case "array":
      return (
        (b as { width: number; height: number; values: ExcelValue[] }).width === a.width &&
        (b as { width: number; height: number; values: ExcelValue[] }).height === a.height &&
        (b as { values: ExcelValue[] }).values.every((v, i) => valuesEqual(v, a.values[i]))
      );
    case "lambda":
      return false;
    case "sparkline":
      return JSON.stringify((b as { data: number[]; options: Record<string, unknown> }).data) === JSON.stringify(a.data);
    default:
      return false;
  }
}

export class Workbook {
  private functions = createBuiltinFunctions();
  private evaluator = new FormulaEvaluator(this.functions);

  private sheets = new Map<number, Sheet>();
  private cells = new Map<number, Map<string, Cell>>();
  private formulaCells = new Set<string>();

  // Map from "sheetId:row:col" to "sheetId:row:col" of the formula that spilled here.
  private spills = new Map<string, string>();
  // Named values/ranges. Names stored upper-case.
  private names = new Map<string, ExcelValue | FormulaNode>();

  /** Static dependency graph: key -> set of keys it depends on. */
  private deps = new Map<string, Set<string>>();
  /** Reverse dependency graph: key -> set of keys that depend on it. */
  private dependents = new Map<string, Set<string>>();
  /** Formula cells that contain volatile functions. */
  private volatileCells = new Set<string>();
  /** True if a spill changed shape during the current recalc pass. */
  private spillChanged = false;
  /** Cells that are currently blocking a dynamic-array spill: blocker key -> origins. */
  private spillBlockers = new Map<string, Set<string>>();

  private volatileFunctions = new Set<string>([
    "RAND", "RANDBETWEEN", "RANDARRAY", "NOW", "TODAY",
    "INFO", "CELL", "INDIRECT", "OFFSET", "INDEX",
  ]);

  private nextSheetId = 1;

  addSheet(name?: string): number {
    const id = this.nextSheetId++;
    this.sheets.set(id, { id, name: name ?? `Sheet${id}` });
    this.cells.set(id, new Map());
    return id;
  }

  sheetId(name: string): number | undefined {
    for (const sheet of this.sheets.values()) {
      if (sheet.name.toLowerCase() === name.toLowerCase()) return sheet.id;
    }
    return undefined;
  }

  defineName(name: string, value: ExcelValue | FormulaNode): void {
    this.names.set(name.toUpperCase(), value);
  }

  setFormula(sheetId: number, row: number, col: number, formula: string): void {
    const cell = this.ensureCell(sheetId, row, col);
    cell.formula = formula;
    cell.value = undefined;
    const key = this.globalKey(sheetId, row, col);
    this.formulaCells.add(key);
    this.clearSpill(sheetId, row, col);
    this.rebuildDeps(key);
    const dirty = [key, ...this.blockerOrigins(key)];
    this.recalcDirty(dirty);
  }

  setValue(sheetId: number, row: number, col: number, value: ExcelValue): void {
    const cell = this.ensureCell(sheetId, row, col);
    const key = this.globalKey(sheetId, row, col);
    cell.formula = undefined;
    cell.value = value;
    this.formulaCells.delete(key);
    this.clearSpill(sheetId, row, col);
    this.rebuildDeps(key);
    const dirty = [key, ...this.blockerOrigins(key)];
    this.recalcDirty(dirty);
  }

  private blockerOrigins(key: string): string[] {
    return [...(this.spillBlockers.get(key) ?? [])];
  }

  getValue(sheetId: number, row: number, col: number): ExcelValue {
    return this.getCell(sheetId, row, col);
  }

  getFormulaText(sheetId: number, row: number, col: number): string | undefined {
    const cell = this.cells.get(sheetId)?.get(cellKey(row, col));
    return cell?.formula;
  }

  /** Recalculate all formula cells (useful for explicit full recalc). */
  recalc(): void {
    this.recalcAll();
  }

  private recalcAll(): void {
    this.recalcDirty([...this.formulaCells]);
  }

  private recalcDirty(changedKeys: string[]): void {
    const dirty = new Set<string>();
    for (const key of changedKeys) {
      this.addWithDependents(key, dirty);
    }
    for (const key of this.volatileCells) dirty.add(key);

    const maxPasses = Math.max(1, this.formulaCells.size + 1);
    for (let pass = 0; pass < maxPasses; pass++) {
      this.spillChanged = false;
      const order = this.topologicalOrder(dirty);
      let changed = false;
      for (const key of order) {
        if (!this.formulaCells.has(key)) continue;
        const { sheetId, row, column } = this.parseGlobalKey(key);
        const cell = this.cells.get(sheetId)?.get(cellKey(row, column));
        if (!cell) continue;
        const oldValue = cell.value;
        const newValue = this.evaluateCell(sheetId, row, column);
        if (!valuesEqual(oldValue, newValue)) {
          cell.value = newValue;
          changed = true;
          for (const dep of this.dependents.get(key) ?? []) dirty.add(dep);
        }
      }
      if (!changed && !this.spillChanged) break;
      // A spill shape changed or a volatile/dynamic value changed:
      // recompute all formula cells that might be affected by spills.
      if (this.spillChanged) {
        for (const key of this.formulaCells) dirty.add(key);
      }
    }
  }

  private addWithDependents(key: string, set: Set<string>): void {
    const stack = [key];
    while (stack.length > 0) {
      const k = stack.pop()!;
      if (set.has(k)) continue;
      set.add(k);
      for (const dep of this.dependents.get(k) ?? []) {
        if (!set.has(dep)) stack.push(dep);
      }
    }
  }

  private topologicalOrder(keys: Set<string>): string[] {
    const result: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (k: string) => {
      if (visited.has(k)) return;
      if (visiting.has(k)) return; // cycle — skip
      visiting.add(k);
      for (const dep of this.deps.get(k) ?? []) {
        if (keys.has(dep)) visit(dep);
      }
      visiting.delete(k);
      visited.add(k);
      result.push(k);
    };

    for (const k of keys) visit(k);
    return result;
  }

  private rebuildDeps(key: string): void {
    this.removeDeps(key);
    const { sheetId, row, column } = this.parseGlobalKey(key);
    const cell = this.cells.get(sheetId)?.get(cellKey(row, column));
    if (!cell?.formula) return;
    try {
      const node = parseFormula(cell.formula);
      const flags = { volatile: false };
      const deps = this.collectDeps(node, sheetId, row, column, new Set<string>(), flags);
      for (const dep of deps) this.addDep(key, dep);
      if (flags.volatile) this.volatileCells.add(key);
      else this.volatileCells.delete(key);
    } catch {
      // Invalid formula will fail during evaluateCell; leave graph empty.
    }
  }

  private collectDeps(
    node: FormulaNode,
    sheetId: number,
    row: number,
    col: number,
    deps: Set<string>,
    flags: { volatile: boolean },
  ): Set<string> {
    switch (node.kind) {
      case "reference":
        this.addReferenceDep(node, sheetId, row, col, deps);
        break;
      case "range":
        this.addRangeDep(node, sheetId, deps);
        break;
      case "name": {
        const resolved = this.names.get(node.name.toUpperCase());
        if (resolved && typeof resolved === "object" && "kind" in resolved) {
          this.collectDeps(resolved as FormulaNode, sheetId, row, col, deps, flags);
        }
        break;
      }
      case "function": {
        if (this.volatileFunctions.has(node.name.toUpperCase())) flags.volatile = true;
        for (const arg of node.args) this.collectDeps(arg, sheetId, row, col, deps, flags);
        break;
      }
      case "binary":
        this.collectDeps(node.left, sheetId, row, col, deps, flags);
        this.collectDeps(node.right, sheetId, row, col, deps, flags);
        break;
      case "union":
        for (const item of node.items) this.collectDeps(item, sheetId, row, col, deps, flags);
        break;
      case "intersection":
        this.collectDeps(node.left, sheetId, row, col, deps, flags);
        this.collectDeps(node.right, sheetId, row, col, deps, flags);
        break;
      case "unary":
        this.collectDeps(node.expr, sheetId, row, col, deps, flags);
        break;
      case "array":
        for (const r of node.rows) for (const item of r) this.collectDeps(item, sheetId, row, col, deps, flags);
        break;
      case "spill":
      case "implicitIntersection":
        this.collectDeps(node.expr, sheetId, row, col, deps, flags);
        break;
      case "structured":
      case "external":
      case "literal":
      case "missing":
        break;
    }
    return deps;
  }

  private addReferenceDep(
    node: Extract<FormulaNode, { kind: "reference" }>,
    sheetId: number,
    _row: number,
    _col: number,
    deps: Set<string>,
  ): void {
    let id = sheetId;
    if (node.sheet) {
      const resolved = this.sheetId(node.sheet);
      if (resolved !== undefined) id = resolved;
      else return;
    }
    const key = this.globalKey(id, node.address.row, node.address.column);
    deps.add(key);
  }

  private addRangeDep(
    node: Extract<FormulaNode, { kind: "range" }>,
    sheetId: number,
    deps: Set<string>,
  ): void {
    let id = sheetId;
    if (node.sheet) {
      const resolved = this.sheetId(node.sheet);
      if (resolved !== undefined) id = resolved;
      else return;
    }
    const range = node.range;
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startColumn; c <= range.endColumn; c++) {
        deps.add(this.globalKey(id, r, c));
      }
    }
  }

  private addDep(from: string, to: string): void {
    if (from === to) return;
    let set = this.deps.get(from);
    if (!set) {
      set = new Set<string>();
      this.deps.set(from, set);
    }
    set.add(to);

    let rev = this.dependents.get(to);
    if (!rev) {
      rev = new Set<string>();
      this.dependents.set(to, rev);
    }
    rev.add(from);
  }

  private removeDeps(key: string): void {
    const deps = this.deps.get(key);
    if (deps) {
      for (const dep of deps) this.dependents.get(dep)?.delete(key);
      this.deps.delete(key);
    }
    this.volatileCells.delete(key);
  }

  private ensureCell(sheetId: number, row: number, col: number): Cell {
    let sheet = this.cells.get(sheetId);
    if (!sheet) {
      sheet = new Map();
      this.cells.set(sheetId, sheet);
    }
    const key = cellKey(row, col);
    let cell = sheet.get(key);
    if (!cell) {
      cell = {};
      sheet.set(key, cell);
    }
    return cell;
  }

  private globalKey(sheetId: number, row: number, col: number): string {
    return `${sheetId}:${row}:${col}`;
  }

  private parseGlobalKey(key: string): WorkbookCellAddress {
    const parts = key.split(":").map(Number);
    return { sheetId: parts[0]!, row: parts[1]!, column: parts[2]! };
  }

  private resolveSheet(sheet: number | string | undefined): number | undefined {
    if (sheet === undefined) return undefined;
    if (typeof sheet === "number") return sheet;
    return this.sheetId(sheet);
  }

  private getCell(sheet: number | string | undefined, row: number, col: number): ExcelValue {
    const sheetId = this.resolveSheet(sheet);
    if (sheetId === undefined) return err(ExcelErrorCode.Ref);

    const sheetCells = this.cells.get(sheetId);
    if (!sheetCells) return BLANK;

    const key = cellKey(row, col);
    const cell = sheetCells.get(key);
    if (cell && (cell.formula !== undefined || !isEmptyValue(cell.value))) {
      const v = cell.value ?? BLANK;
      if (v.kind === "array") return v.values[0] ?? BLANK;
      return v;
    }

    const spillOrigin = this.spills.get(this.globalKey(sheetId, row, col));
    if (spillOrigin) {
      const origin = this.parseGlobalKey(spillOrigin);
      const originCell = this.cells.get(origin.sheetId)?.get(cellKey(origin.row, origin.column));
      if (originCell?.value?.kind === "array") {
        const arr = originCell.value;
        const r = row - origin.row;
        const c = col - origin.column;
        if (r >= 0 && r < arr.height && c >= 0 && c < arr.width) {
          return arr.values[r * arr.width + c] ?? BLANK;
        }
      }
    }

    return BLANK;
  }

  private getRangeValues(
    sheet: number | string | undefined,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): ExcelValue[] {
    const out: ExcelValue[] = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        out.push(this.getCell(sheet, r, c));
      }
    }
    return out;
  }

  private contextFor(sheetId: number, row: number, col: number): EvaluationContext {
    const sheetName = this.sheets.get(sheetId)?.name;
    return {
      sheetId,
      sheetName,
      row,
      column: col,
      getCell: (s, r, c) => this.getCell(s, r, c),
      getRangeValues: (s, sr, sc, er, ec) => this.getRangeValues(s, sr, sc, er, ec),
      getFormulaText: (s, r, c) => {
        const id = this.resolveSheet(s);
        return id === undefined ? undefined : this.getFormulaText(id, r, c);
      },
      resolveName: (name) => this.names.get(name.toUpperCase()),
      resolveTableColumn: () => [],
      todaySerial: () => {
        const now = new Date();
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.floor((now.getTime() - epoch) / 86400000);
        return serial >= 60 ? serial + 1 : serial;
      },
      random: () => Math.random(),
    };
  }

  private evaluateCell(sheetId: number, row: number, col: number): ExcelValue {
    const cell = this.cells.get(sheetId)?.get(cellKey(row, col));
    if (!cell || !cell.formula) return cell?.value ?? BLANK;
    try {
      const node = parseFormula(cell.formula);
      const ctx = this.contextFor(sheetId, row, col);
      const value = this.evaluator.evaluate(node, ctx);
      if (value.kind === "array") {
        return this.applySpill(sheetId, row, col, value);
      }
      this.clearSpill(sheetId, row, col);
      return value;
    } catch {
      return err(ExcelErrorCode.Value);
    }
  }

  private applySpill(sheetId: number, row: number, col: number, arr: ArrayValue): ExcelValue {
    const endRow = row + arr.height - 1;
    const endCol = col + arr.width - 1;
    const originKey = this.globalKey(sheetId, row, col);
    const sheet = this.cells.get(sheetId);

    // Desired spill area (excluding the origin cell).
    const desired = new Set<string>();
    for (let r = row; r <= endRow; r++) {
      for (let c = col; c <= endCol; c++) {
        if (r === row && c === col) continue;
        desired.add(this.globalKey(sheetId, r, c));
      }
    }

    // Check for blockers.
    for (const key of desired) {
      const parts = this.parseGlobalKey(key);
      const existing = sheet?.get(cellKey(parts.row, parts.column));
      if (existing && (existing.formula !== undefined || !isEmptyValue(existing.value))) {
        this.addSpillBlocker(key, originKey);
        this.clearSpill(sheetId, row, col);
        return err(ExcelErrorCode.Spill);
      }
      const otherSpillOwner = this.spills.get(key);
      if (otherSpillOwner && otherSpillOwner !== originKey) {
        this.addSpillBlocker(key, originKey);
        this.clearSpill(sheetId, row, col);
        return err(ExcelErrorCode.Spill);
      }
    }

    const oldKeys = new Set<string>();
    for (const [key, owner] of this.spills.entries()) {
      if (owner === originKey) oldKeys.add(key);
    }

    const changed = oldKeys.size !== desired.size || ![...desired].every((k) => oldKeys.has(k));
    if (!changed) return arr;

    this.clearSpill(sheetId, row, col);
    for (const key of desired) this.spills.set(key, originKey);
    this.spillChanged = true;
    return arr;
  }

  private addSpillBlocker(blockerKey: string, originKey: string): void {
    let set = this.spillBlockers.get(blockerKey);
    if (!set) {
      set = new Set<string>();
      this.spillBlockers.set(blockerKey, set);
    }
    set.add(originKey);
  }

  private clearSpill(sheetId: number, row: number, col: number): void {
    const originKey = this.globalKey(sheetId, row, col);
    const removed: string[] = [];
    for (const [key, owner] of this.spills.entries()) {
      if (owner === originKey) {
        removed.push(key);
      }
    }
    if (removed.length === 0) return;
    for (const key of removed) this.spills.delete(key);
    this.spillChanged = true;
    // Blockers for this origin are no longer blocked by this origin.
    for (const [key, set] of this.spillBlockers.entries()) {
      set.delete(originKey);
      if (set.size === 0) this.spillBlockers.delete(key);
    }
  }
}
