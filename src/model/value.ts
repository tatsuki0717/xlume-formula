export enum ExcelErrorCode {
  Null = "#NULL!",
  Div0 = "#DIV/0!",
  Value = "#VALUE!",
  Ref = "#REF!",
  Name = "#NAME?",
  Num = "#NUM!",
  NA = "#N/A",
  GettingData = "#GETTING_DATA",
  Spill = "#SPILL!",
  Calc = "#CALC!",
  Field = "#FIELD!",
  Blocked = "#BLOCKED!",
  Unknown = "#UNKNOWN!",
}

export interface BlankValue {
  kind: "blank";
}

export interface NumberValue {
  kind: "number";
  value: number;
}

export interface StringValue {
  kind: "string";
  value: string;
}

export interface BooleanValue {
  kind: "boolean";
  value: boolean;
}

export interface ErrorValue {
  kind: "error";
  code: ExcelErrorCode;
}

export interface ArrayValue {
  kind: "array";
  width: number;
  height: number;
  values: ExcelValue[];
}

export interface LambdaValue {
  kind: "lambda";
  params: string[];
  body: import("../formula/ast.js").FormulaNode;
}

/** Sentinel for an omitted LAMBDA argument (used by ISOMITTED). */
export interface OmittedValue {
  kind: "omitted";
}

export interface SparklineValue {
  kind: "sparkline";
  data: number[];
  options: Record<string, unknown>;
}

export type ExcelValue =
  | BlankValue
  | NumberValue
  | StringValue
  | BooleanValue
  | ErrorValue
  | ArrayValue
  | LambdaValue
  | OmittedValue
  | SparklineValue;

export const BLANK: BlankValue = { kind: "blank" };

export function num(value: number): NumberValue {
  return { kind: "number", value };
}

export function str(value: string): StringValue {
  return { kind: "string", value };
}

export function bool(value: boolean): BooleanValue {
  return { kind: "boolean", value };
}

export function err(code: ExcelErrorCode): ErrorValue {
  return { kind: "error", code };
}

export function lambda(params: string[], body: import("../formula/ast.js").FormulaNode): LambdaValue {
  return { kind: "lambda", params, body };
}

export function omitted(): OmittedValue {
  return { kind: "omitted" };
}

export function sparkline(data: number[], options: Record<string, unknown>): SparklineValue {
  return { kind: "sparkline", data, options };
}

export interface ExcelDateSerial {
  serial: number;
  dateSystem: "1900" | "1904";
}

/** Presentation-boundary conversion only — never store Date in the model. */
export function serialToUtcDate(serial: ExcelDateSerial): Date {
  const epoch = serial.dateSystem === "1904"
    ? Date.UTC(1904, 0, 1)
    : Date.UTC(1899, 11, 30);
  // Excel's 1900 leap-year bug: serials >= 60 are off by one vs real calendar
  let s = serial.serial;
  if (serial.dateSystem === "1900" && s >= 60) {
    // Keep Excel semantics: do not "fix" the bug in conversion from serial
  }
  return new Date(epoch + s * 86400000);
}
