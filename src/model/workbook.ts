/**
 * Minimal workbook model with dynamic-array spill support.
 *
 * This is intentionally simple: it recalculates all formulas in repeated passes
 * until values stabilize, which is correct for small acyclic workbooks.
 */
import { parseFormula, type FormulaNode } from "../formula/ast.js";
import { FormulaEvaluator } from "../formula/evaluator.js";
import type { EvaluationContext, ExternalFunctionProvider } from "../formula/functions-types.js";
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

  constructor(private external?: ExternalFunctionProvider) {}

  private sheets = new Map<number, Sheet>();
  private cells = new Map<number, Map<string, Cell>>();
  private formulaCells = new Set<string>();

  // Map from "sheetId:row:col" to "sheetId:row:col" of the formula that spilled here.
  private spills = new Map<string, string>();
  // Named values/ranges. Names stored upper-case.
  private names = new Map<string, ExcelValue | FormulaNode>();

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
    this.formulaCells.add(this.globalKey(sheetId, row, col));
    this.clearSpill(sheetId, row, col);
    this.recalc();
  }

  setValue(sheetId: number, row: number, col: number, value: ExcelValue): void {
    const cell = this.ensureCell(sheetId, row, col);
    cell.formula = undefined;
    cell.value = value;
    this.formulaCells.delete(this.globalKey(sheetId, row, col));
    this.clearSpill(sheetId, row, col);
    this.recalc();
  }

  getValue(sheetId: number, row: number, col: number): ExcelValue {
    return this.getCell(sheetId, row, col);
  }

  getFormulaText(sheetId: number, row: number, col: number): string | undefined {
    const cell = this.cells.get(sheetId)?.get(cellKey(row, col));
    return cell?.formula;
  }

  recalc(): void {
    const maxPasses = Math.max(1, this.formulaCells.size + 1);
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false;
      for (const key of this.formulaCells) {
        const { sheetId, row, column } = this.parseGlobalKey(key);
        const newValue = this.evaluateCell(sheetId, row, column);
        const cell = this.cells.get(sheetId)?.get(cellKey(row, column));
        if (!cell) continue;
        if (!valuesEqual(cell.value, newValue)) {
          cell.value = newValue;
          changed = true;
        }
      }
      if (!changed) break;
    }
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
      external: this.external,
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

    // Check for blockers, ignoring cells already owned by this spill.
    for (let r = row; r <= endRow; r++) {
      for (let c = col; c <= endCol; c++) {
        if (r === row && c === col) continue;
        const key = this.globalKey(sheetId, r, c);
        const existing = sheet?.get(cellKey(r, c));
        if (existing && (existing.formula !== undefined || !isEmptyValue(existing.value))) {
          // Blocked by an existing formula or non-empty value.
          this.clearSpill(sheetId, row, col);
          return err(ExcelErrorCode.Spill);
        }
        const otherSpillOwner = this.spills.get(key);
        if (otherSpillOwner && otherSpillOwner !== originKey) {
          this.clearSpill(sheetId, row, col);
          return err(ExcelErrorCode.Spill);
        }
      }
    }

    // Clear previous spill for this origin, then set new one.
    this.clearSpill(sheetId, row, col);
    for (let r = row; r <= endRow; r++) {
      for (let c = col; c <= endCol; c++) {
        if (r === row && c === col) continue;
        this.spills.set(this.globalKey(sheetId, r, c), originKey);
      }
    }

    return arr;
  }

  private clearSpill(sheetId: number, row: number, col: number): void {
    const originKey = this.globalKey(sheetId, row, col);
    for (const [key, owner] of this.spills.entries()) {
      if (owner === originKey) this.spills.delete(key);
    }
  }
}
