import type { ExcelValue, ArrayValue } from "../model/value.js";
import type { FormulaNode } from "./ast.js";

export type FormulaArgument = ExcelValue | FormulaNode;

export interface ExternalFunctionProvider {
  /** Synchronously return the text at `url`, or undefined if not available. */
  webService?(url: string): string | undefined;
  /** Synchronously return an image value for `url`, or undefined. */
  image?(url: string): ExcelValue | undefined;
  /** Synchronously translate `text` from `source` to `target`, or undefined. */
  translate?(text: string, source: string, target: string): string | undefined;
  /** Synchronously return stock history data, or undefined. */
  stockHistory?(ticker: string, ...args: (string | number)[]): ArrayValue | undefined;
  /** Synchronously handle CUBE* worksheet functions by name. */
  cube?(name: string, args: ExcelValue[]): ExcelValue | undefined;
  /** Synchronously handle RTD(progID, server, ...topics). */
  rtd?(progID: string, server: string | undefined, topics: ExcelValue[]): ExcelValue | undefined;
  /** Synchronously handle REGISTER.ID(module, procedure, typeText). */
  registerID?(module: string, procedure: string, typeText?: string): ExcelValue | undefined;
  /** Synchronously handle CALL(registerId, ...args). */
  call?(registerId: ExcelValue, args: ExcelValue[]): ExcelValue | undefined;
  /** Synchronously return phonetic text (e.g. furigana) for a string, or undefined. */
  phonetic?(text: string): string | undefined;

  // Google Sheets network functions
  /** Synchronously translate text for GOOGLETRANSLATE. */
  googleTranslate?(text: string, source: string, target: string): string | undefined;
  /** Synchronously return finance info for GOOGLEFINANCE. */
  googleFinance?(ticker: string, attribute?: string): ExcelValue | undefined;
  /** Synchronously return raw data for IMPORTDATA. */
  importData?(url: string): string | undefined;
  /** Synchronously return parsed XML query results for IMPORTXML. */
  importXml?(url: string, xpath: string): ExcelValue | undefined;
  /** Synchronously return parsed HTML table/list results for IMPORTHTML. */
  importHtml?(url: string, query: string, index: number): ExcelValue | undefined;
  /** Synchronously return feed data for IMPORTFEED. */
  importFeed?(url: string, query?: string, headers?: boolean, numItems?: number): ExcelValue | undefined;
  /** Synchronously return cells from another spreadsheet for IMPORTRANGE. */
  importRange?(spreadsheetUrl: string, rangeString: string): ExcelValue | undefined;

  /** Synchronously look up a value from a pivot table for GETPIVOTDATA. */
  pivot?(dataField: string | undefined, pivotTable: string, filters: { field: string; item: ExcelValue }[]): ExcelValue | undefined;
}

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
  /** Optional provider for external/API-dependent worksheet functions. */
  external?: ExternalFunctionProvider;
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
