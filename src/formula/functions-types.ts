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
  /** Return the formula text of a cell, if any. Used by FORMULATEXT/ISFORMULA. */
  getFormulaText?(sheet: number | string | undefined, row: number, column: number): string | undefined;
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
  private fallback: ((name: string) => ExcelFunction | undefined) | undefined;

  register(fn: ExcelFunction): void {
    this.map.set(fn.name.toUpperCase(), fn);
  }

  alias(name: string, targetName: string): void {
    const target = this.map.get(targetName.toUpperCase());
    if (!target) return;
    this.map.set(name.toUpperCase(), { ...target, name });
  }

  setFallback(handler: (name: string) => ExcelFunction | undefined): void {
    this.fallback = handler;
  }

  get(name: string): ExcelFunction | undefined {
    const upper = name.toUpperCase();
    const direct = this.map.get(upper);
    if (direct) return direct;
    if (this.fallback) return this.fallback(name);
    return undefined;
  }

  list(): string[] {
    return [...this.map.keys()].sort();
  }
}
