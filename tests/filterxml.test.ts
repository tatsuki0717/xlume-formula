import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formula/evaluator.js";
import { createBuiltinFunctions } from "../src/functions/builtins.js";
import { num, str } from "../src/model/value.js";
import type { EvaluationContext } from "../src/formula/functions-types.js";

function ctx(): EvaluationContext {
  return {
    sheetId: 1,
    row: 0,
    column: 0,
    getCell: () => ({ kind: "blank" }),
    getRangeValues: () => [],
    getFormulaText: () => undefined,
    resolveName: () => undefined,
    resolveTableColumn: () => [],
    todaySerial: () => 45000,
    random: () => 0.5,
  };
}

describe("FILTERXML", () => {
  const functions = createBuiltinFunctions();
  const ev = new FormulaEvaluator(functions);

  it("extracts text from nodes", () => {
    const xml = '<r><a>1</a><a>2</a></r>';
    const result = ev.evaluateText(`FILTERXML("${xml}", "//a")`, ctx());
    expect(result.kind).toBe("array");
    if (result.kind !== "array") return;
    expect(result.values).toEqual([str("1"), str("2")]);
  });

  it("filters by attribute", () => {
    const xml = "<r><a k='x'>one</a><a k='y'>two</a></r>";
    const result = ev.evaluateText(`FILTERXML("${xml}", "//a[@k=y]")`, ctx());
    expect(result).toEqual(str("two"));
  });

  it("selects by position and attributes", () => {
    const xml = "<r><a k='1'>one</a><a k='2'>two</a></r>";
    const result = ev.evaluateText(`FILTERXML("${xml}", "/r/a[2]")`, ctx());
    expect(result).toEqual(str("two"));
    const attr = ev.evaluateText(`FILTERXML("${xml}", "//a/@k")`, ctx());
    expect(attr.kind).toBe("array");
    if (attr.kind !== "array") return;
    expect(attr.values).toEqual([num(1), num(2)]);
  });

  it("handles nested elements, declarations, comments, entities and CDATA", () => {
    const nested = "<r><b><c>3</c></b><b><c>4</c></b></r>";
    const nestedResult = ev.evaluateText(`FILTERXML("${nested}", "//c")`, ctx());
    expect(nestedResult.kind).toBe("array");
    if (nestedResult.kind !== "array") return;
    expect(nestedResult.values).toEqual([str("3"), str("4")]);

    const declared = "<?xml version='1.0'?><!-- comment --><r><a>ok</a></r>";
    expect(ev.evaluateText(`FILTERXML("${declared}", "/r/a")`, ctx())).toEqual(str("ok"));

    const empty = "<r><a/></r>";
    expect(ev.evaluateText(`FILTERXML("${empty}", "/r/a")`, ctx())).toEqual(str(""));

    const entities = "<r a='&amp;b'>&lt;x&gt;</r>";
    expect(ev.evaluateText(`FILTERXML("${entities}", "/r/@a")`, ctx())).toEqual(str("&b"));
    expect(ev.evaluateText(`FILTERXML("${entities}", "/r")`, ctx())).toEqual(str("<x>"));

    const cdata = "<r><![CDATA[<x>]]></r>";
    expect(ev.evaluateText(`FILTERXML("${cdata}", "/r")`, ctx())).toEqual(str("<x>"));
  });
});
