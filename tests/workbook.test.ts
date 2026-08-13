import { describe, expect, it } from "vitest";
import { Workbook } from "../src/model/workbook.js";
import { BLANK, bool, ExcelErrorCode, num, str } from "../src/model/value.js";

describe("Workbook", () => {
  it("stores and calculates a scalar formula", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setValue(sheet, 0, 0, num(2));
    wb.setValue(sheet, 0, 1, num(3));
    wb.setFormula(sheet, 1, 0, "=A1+B1");
    const v = wb.getValue(sheet, 1, 0);
    expect(v.kind).toBe("number");
    if (v.kind !== "number") return;
    expect(v.value).toBe(5);
  });

  it("spills a dynamic array result into adjacent cells", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setFormula(sheet, 0, 0, "=SEQUENCE(2,3)");
    expect(wb.getValue(sheet, 0, 0)).toEqual(num(1));
    expect(wb.getValue(sheet, 0, 1)).toEqual(num(2));
    expect(wb.getValue(sheet, 0, 2)).toEqual(num(3));
    expect(wb.getValue(sheet, 1, 0)).toEqual(num(4));
    expect(wb.getValue(sheet, 1, 2)).toEqual(num(6));
    expect(wb.getValue(sheet, 2, 0)).toBe(BLANK);
  });

  it("returns #SPILL! when a spilled range is blocked", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setValue(sheet, 0, 1, num(99));
    wb.setFormula(sheet, 0, 0, "=SEQUENCE(1,2)");
    const v = wb.getValue(sheet, 0, 0);
    expect(v.kind).toBe("error");
    if (v.kind !== "error") return;
    expect(v.code).toBe(ExcelErrorCode.Spill);
  });

  it("recalculates dependents across multiple passes", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setFormula(sheet, 0, 0, "=B1");
    wb.setFormula(sheet, 0, 1, "=10");
    const v = wb.getValue(sheet, 0, 1);
    expect(v.kind).toBe("number");
    if (v.kind !== "number") return;
    expect(v.value).toBe(10);
  });

  it("propagates errors in dependents", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setFormula(sheet, 0, 0, "=1/0");
    wb.setFormula(sheet, 0, 1, "=A1+1");
    const v = wb.getValue(sheet, 0, 1);
    expect(v.kind).toBe("error");
  });

  it("supports INDIRECT through the workbook context", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setValue(sheet, 0, 0, num(42));
    wb.setFormula(sheet, 1, 0, '=INDIRECT("A1")');
    const v = wb.getValue(sheet, 1, 0);
    expect(v.kind).toBe("number");
    if (v.kind !== "number") return;
    expect(v.value).toBe(42);
  });

  it("supports FORMULATEXT through the workbook context", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setFormula(sheet, 0, 0, "=1+2");
    wb.setFormula(sheet, 1, 0, "=FORMULATEXT(A1)");
    const v = wb.getValue(sheet, 1, 0);
    expect(v).toEqual(str("=1+2"));
  });

  it("recovers a spill after a blocker is set to BLANK", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setValue(sheet, 0, 1, num(99));
    wb.setFormula(sheet, 0, 0, "=SEQUENCE(1,2)");
    expect(wb.getValue(sheet, 0, 0).kind).toBe("error");
    wb.setValue(sheet, 0, 1, BLANK);
    expect(wb.getValue(sheet, 0, 0)).toEqual(num(1));
    expect(wb.getValue(sheet, 0, 1)).toEqual(num(2));
  });

  it("returns ISREF FALSE for an invalid INDIRECT", () => {
    const wb = new Workbook();
    const sheet = wb.addSheet();
    wb.setFormula(sheet, 0, 0, '=ISREF(INDIRECT("ZZZ"))');
    const v = wb.getValue(sheet, 0, 0);
    expect(v).toEqual(bool(false));
  });
});
