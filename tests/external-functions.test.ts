import { describe, expect, it } from "vitest";
import { createBuiltinFunctions, FormulaEvaluator, parseFormula } from "../dist/index.js";
import { BLANK, str, num, err, ExcelErrorCode } from "../dist/index.js";
import type { EvaluationContext, ExternalFunctionProvider } from "../dist/index.js";
import { NodeFetchProvider } from "../dist/providers/node-fetch-provider.js";

describe("External/API worksheet functions", () => {
  const ev = new FormulaEvaluator(createBuiltinFunctions());

  function ctx(provider: ExternalFunctionProvider): EvaluationContext {
    return {
      sheetId: 1,
      row: 0,
      column: 0,
      getCell: () => BLANK,
      getRangeValues: () => [],
      resolveName: () => undefined,
      resolveTableColumn: () => [],
      todaySerial: () => 45000,
      random: () => 0.5,
      external: provider,
    };
  }

  it("WEBSERVICE returns text from provider", () => {
    const provider: ExternalFunctionProvider = {
      webService: (url) => (url === "https://example.com/data" ? "<data>ok</data>" : undefined),
    };
    const result = ev.evaluateText('WEBSERVICE("https://example.com/data")', ctx(provider));
    expect(result).toEqual(str("<data>ok</data>"));
  });

  it("WEBSERVICE returns #N/A when provider is absent", () => {
    const result = ev.evaluateText('WEBSERVICE("https://example.com")', ctx({}));
    expect(result).toEqual(err(ExcelErrorCode.NA));
  });

  it("IMAGE returns the value from provider", () => {
    const provider: ExternalFunctionProvider = {
      image: (url) => (url === "https://example.com/logo.png" ? str("image") : undefined),
    };
    const result = ev.evaluateText('IMAGE("https://example.com/logo.png")', ctx(provider));
    expect(result).toEqual(str("image"));
  });

  it("TRANSLATE returns translated text from provider", () => {
    const provider: ExternalFunctionProvider = {
      translate: (text, source, target) => `${text}:${source}:${target}`,
    };
    const result = ev.evaluateText('TRANSLATE("hello","en","ja")', ctx(provider));
    expect(result).toEqual(str("hello:en:ja"));
  });

  it("STOCKHISTORY returns array from provider", () => {
    const provider: ExternalFunctionProvider = {
      stockHistory: (ticker) =>
        ticker === "AAPL"
          ? { kind: "array", width: 2, height: 1, values: [num(150), num(152)] }
          : undefined,
    };
    const result = ev.evaluateText('STOCKHISTORY("AAPL")', ctx(provider));
    expect(result.kind).toBe("array");
  });

  it("CUBEVALUE uses cube provider", () => {
    const provider: ExternalFunctionProvider = {
      cube: (name, args) => str(`${name}:${args.length}`),
    };
    const result = ev.evaluateText('CUBEVALUE("connection","[Measures].[Sales]")', ctx(provider));
    expect(result).toEqual(str("CUBEVALUE:2"));
  });

  it("RTD uses rtd provider", () => {
    const provider: ExternalFunctionProvider = {
      rtd: (progID, server, topics) => str(`${progID}:${server}:${topics.length}`),
    };
    const result = ev.evaluateText('RTD("My.RTD.Server","localhost","topic1")', ctx(provider));
    expect(result).toEqual(str("My.RTD.Server:localhost:1"));
  });

  it("REGISTER.ID uses registerID provider", () => {
    const provider: ExternalFunctionProvider = {
      registerID: (module, procedure, typeText) => str(`${module}:${procedure}:${typeText ?? "none"}`),
    };
    const result = ev.evaluateText('REGISTER.ID("MyDLL","MyProc","A")', ctx(provider));
    expect(result).toEqual(str("MyDLL:MyProc:A"));
  });

  it("CALL uses call provider", () => {
    const provider: ExternalFunctionProvider = {
      call: (registerId, args) => str(`${registerId.kind}:${args.length}`),
    };
    const result = ev.evaluateText('CALL("MyProc",1,2)', ctx(provider));
    expect(result).toEqual(str("string:2"));
  });

  it("PHONETIC uses phonetic provider", () => {
    const provider: ExternalFunctionProvider = {
      phonetic: (text) => `${text}（ふりがな）`,
    };
    const result = ev.evaluateText('PHONETIC("日本語")', ctx(provider));
    expect(result).toEqual(str("日本語（ふりがな）"));
  });

  it("GETPIVOTDATA looks up values from a pivot provider", () => {
    const provider: ExternalFunctionProvider = {
      pivot: (dataField, pivotTable, filters) =>
        str(`${dataField ?? "*"}@${pivotTable}#${filters.map((f) => `${f.field}=${f.item.kind}`).join(",")}`),
    };
    const result = ev.evaluateText('GETPIVOTDATA("Sum of Sales", "Pivot1", "Region", "North")', ctx(provider));
    expect(result).toEqual(str("Sum of Sales@Pivot1#Region=string"));
  });

  it("GETPIVOTDATA supports omitting data_field", () => {
    const provider: ExternalFunctionProvider = {
      pivot: (dataField, pivotTable, filters) => str(`${dataField ?? "total"}:${pivotTable}:${filters.length}`),
    };
    const result = ev.evaluateText('GETPIVOTDATA("Pivot1", "Region", "North")', ctx(provider));
    expect(result).toEqual(str("total:Pivot1:1"));
  });

  it("GETPIVOTDATA returns #N/A without a pivot provider", () => {
    const result = ev.evaluateText('GETPIVOTDATA("Sales", "Pivot1")', ctx({}));
    expect(result).toEqual(err(ExcelErrorCode.NA));
  });

  it("NodeFetchProvider importRange parses CSV and slices range", () => {
    const provider = new NodeFetchProvider({ timeout: 1 });
    (provider as unknown as { getText(): string }).getText = () => "A,B,C\n1,2,3\n4,5,6\n";
    const result = provider.importRange("https://docs.google.com/spreadsheets/d/ABC123/edit", "Sheet1!A1:B2");
    expect(result).toEqual({
      kind: "array",
      width: 2,
      height: 2,
      values: [str("A"), str("B"), num(1), num(2)],
    });
  });
});
