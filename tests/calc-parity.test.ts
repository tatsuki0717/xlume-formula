import { describe, expect, it } from "vitest";
import { Workbook } from "../src/model/workbook.js";
import { num } from "../src/model/value.js";

/**
 * Calculation-parity cases for the gap-tracker items C-005 (@ implicit
 * intersection), C-006 (R1C1 via INDIRECT) and C-007 (iterative
 * calculation over circular references), verified against Excel
 * semantics independently of the implementation.
 */
describe("C-005 implicit intersection (@)", () => {
  it("vertical range picks the element on the formula's row", () => {
    const wb = new Workbook();
    const s = wb.addSheet();
    for (let r = 0; r < 5; r++) wb.setValue(s, r, 0, num((r + 1) * 10));
    wb.setFormula(s, 2, 2, "=@A1:A5");
    expect(wb.getValue(s, 2, 2)).toEqual(num(30));
  });

  it("horizontal range picks the element on the formula's column", () => {
    const wb = new Workbook();
    const s = wb.addSheet();
    for (let c = 0; c < 5; c++) wb.setValue(s, 0, c, num(100 + c));
    wb.setFormula(s, 1, 4, "=@A1:E1");
    expect(wb.getValue(s, 1, 4)).toEqual(num(104));
  });

  it("outside the range span is #VALUE!", () => {
    const wb = new Workbook();
    const s = wb.addSheet();
    for (let r = 0; r < 3; r++) wb.setValue(s, r, 0, num(r + 1));
    wb.setFormula(s, 4, 2, "=@A1:A3");
    const v = wb.getValue(s, 4, 2);
    expect(v.kind).toBe("error");
    if (v.kind === "error") expect(v.code).toBe("#VALUE!");
  });
});

describe("C-006 R1C1 references through INDIRECT", () => {
  function setup() {
    const wb = new Workbook();
    const s = wb.addSheet();
    wb.setValue(s, 0, 0, num(42));
    wb.setValue(s, 1, 1, num(7));
    return { wb, s };
  }

  it("absolute R1C1", () => {
    const { wb, s } = setup();
    wb.setFormula(s, 3, 3, '=INDIRECT("R1C1",FALSE)');
    expect(wb.getValue(s, 3, 3)).toEqual(num(42));
  });

  it("relative R[-2]C[-2] resolves against the formula cell", () => {
    const { wb, s } = setup();
    wb.setFormula(s, 3, 3, '=INDIRECT("R[-2]C[-2]",FALSE)');
    expect(wb.getValue(s, 3, 3)).toEqual(num(7));
  });

  it("R1C1 range can feed SUM", () => {
    const { wb, s } = setup();
    wb.setFormula(s, 3, 3, '=SUM(INDIRECT("R1C1:R2C2",FALSE))');
    expect(wb.getValue(s, 3, 3)).toEqual(num(49));
  });

  it("A1 notation still works and is the default", () => {
    const { wb, s } = setup();
    wb.setFormula(s, 3, 3, '=INDIRECT("A1")');
    expect(wb.getValue(s, 3, 3)).toEqual(num(42));
  });
});

describe("C-007 iterative calculation", () => {
  it("circular reference is 0 while iteration is off, and is reported", () => {
    const wb = new Workbook();
    const s = wb.addSheet();
    wb.setFormula(s, 0, 0, "=A1*0.5+1");
    expect(wb.getValue(s, 0, 0)).toEqual(num(0));
    expect(wb.circularReferences()).toEqual([{ sheetId: s, row: 0, column: 0 }]);
  });

  it("iteration converges to the fixed point within iterateDelta", () => {
    const wb = new Workbook();
    const s = wb.addSheet();
    wb.setFormula(s, 0, 0, "=A1*0.5+1");
    wb.setCalculationOptions({ iterateEnabled: true, iterateCount: 100, iterateDelta: 0.001 });
    wb.recalc();
    const v = wb.getValue(s, 0, 0);
    expect(v.kind).toBe("number");
    if (v.kind === "number") expect(Math.abs(v.value - 2)).toBeLessThan(0.01);
  });

  it("two-cell cycle converges with iteration on", () => {
    const wb = new Workbook();
    const s = wb.addSheet();
    wb.setFormula(s, 0, 0, "=B1*0.5+1");
    wb.setFormula(s, 0, 1, "=A1*0.5");
    wb.setCalculationOptions({ iterateEnabled: true, iterateCount: 100, iterateDelta: 0.0001 });
    wb.recalc();
    const a = wb.getValue(s, 0, 0);
    const b = wb.getValue(s, 0, 1);
    // Fixed point: A = 0.5B + 1, B = 0.5A  =>  A = 4/3, B = 2/3
    expect(a.kind === "number" && Math.abs(a.value - 4 / 3)).toBeTruthy();
    expect(b.kind === "number" && Math.abs(b.value - 2 / 3)).toBeTruthy();
  });
});
