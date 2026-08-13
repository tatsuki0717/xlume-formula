import { describe, expect, it } from "vitest";
import { createBuiltinFunctions, FormulaEvaluator, parseFormula } from "../dist/index.js";
import { BLANK, str, num, err, ExcelErrorCode } from "../dist/index.js";
import type { EvaluationContext, ExternalFunctionProvider } from "../dist/index.js";

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

  it("CUBEVALUE remains #N/A", () => {
    const result = ev.evaluateText('CUBEVALUE("connection","[Measures].[Sales]")', ctx({}));
    expect(result).toEqual(err(ExcelErrorCode.NA));
  });
});
