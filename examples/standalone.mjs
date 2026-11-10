// Standalone usage of xlume-formula as a formula engine (no xlume UI involved).
// Run: pnpm build && node examples/standalone.mjs
import { Workbook, XlumeFormulaEngine, num } from "../dist/index.js";

// 1) Workbook API: values, formulas, recalculation, spill
const wb = new Workbook();
const sheet = wb.addSheet();
wb.setValue(sheet, 0, 0, num(2));
wb.setValue(sheet, 0, 1, num(3));
wb.setFormula(sheet, 1, 0, "=SUM(A1:B1)");
console.log("A2 =", wb.getValue(sheet, 1, 0)); // { kind: "number", value: 5 }

wb.setFormula(sheet, 3, 0, "=SORT({3;1;2})");
console.log("spill A4 =", wb.getValue(sheet, 3, 0), "A5 =", wb.getValue(sheet, 4, 0), "A6 =", wb.getValue(sheet, 5, 0));

// 2) Evaluator-only API: one-off formulas, LAMBDA, custom functions
const engine = new XlumeFormulaEngine();
console.log("functions registered:", engine.listFunctions().length);
console.log("LAMBDA(x,x+1)(5) =", engine.evaluate("=LAMBDA(x,x+1)(5)"));

engine.add("DOUBLE", (args) => {
  const v = args[0];
  return v && v.kind === "number" ? num(v.value * 2) : v;
});
console.log("DOUBLE(21) =", engine.evaluate("=DOUBLE(21)"));
