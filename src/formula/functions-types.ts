import type { ExcelValue } from "../model/value.js";
import type { FormulaNode } from "./ast.js";

export type FormulaArgument = ExcelValue | FormulaNode;

export interface EvaluationContext {
  /** Resolve sheet by numeric id or name (undefined / current => active sheet). */
  getCell(sheet: number | string | undefined, row: number, column: number): ExcelValue;
  getRangeValues(
    sheet: number | string | undefined,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): ExcelValue[];
  resolveName(name: string): FormulaNode | ExcelValue | undefined;
  resolveTableColumn(table: string, column?: string): ExcelValue[];
  todaySerial(): number;
  random(): number;
  sheetId: number;
  sheetName?: string;
  row: number;
  column: number;
}

export interface ExcelFunction {
  name: string;
  volatility: "none" | "volatile" | "semi-volatile";
  evaluate(args: ExcelValue[], context: EvaluationContext): ExcelValue;
}

export class FunctionRegistry {
  private map = new Map<string, ExcelFunction>();

  register(fn: ExcelFunction): void {
    this.map.set(fn.name.toUpperCase(), fn);
  }

  get(name: string): ExcelFunction | undefined {
    return this.map.get(name.toUpperCase());
  }

  list(): string[] {
    return [...this.map.keys()].sort();
  }
}
