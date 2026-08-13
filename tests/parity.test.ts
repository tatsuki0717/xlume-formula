import { describe, expect, it } from "vitest";
import { FormulaEvaluator } from "../src/formula/evaluator.js";
import { createBuiltinFunctions } from "../src/functions/builtins.js";
import { BLANK, bool, num, str } from "../src/model/value.js";
import type { EvaluationContext } from "../src/formula/functions-types.js";

function ctx(): EvaluationContext {
  return {
    sheetId: 1,
    row: 0,
    column: 0,
    getCell: () => BLANK,
    getRangeValues: () => [],
    getFormulaText: () => undefined,
    resolveName: () => undefined,
    resolveTableColumn: () => [],
    todaySerial: () => 45292, // 2024-01-01
    random: () => 0.5,
  };
}

function ev() {
  return new FormulaEvaluator(createBuiltinFunctions());
}

describe("Date/time function parity", () => {
  const e = ev();

  it("DATE and date component functions round-trip", () => {
    const serial = e.evaluateText("DATE(2024,1,1)", ctx());
    expect(serial).toEqual(num(45292));
    expect(e.evaluateText("YEAR(45292)", ctx())).toEqual(num(2024));
    expect(e.evaluateText("MONTH(45292)", ctx())).toEqual(num(1));
    expect(e.evaluateText("DAY(45292)", ctx())).toEqual(num(1));
  });

  it("DATE handles month/day overflow", () => {
    expect(e.evaluateText("DATE(2024,13,1)", ctx())).toEqual(num(45658)); // 2025-01-01
    expect(e.evaluateText("DATE(2024,0,1)", ctx())).toEqual(num(45261)); // 2023-12-01
    expect(e.evaluateText("DATE(2024,1,32)", ctx())).toEqual(num(45323)); // 2024-02-01
  });

  it("TIME and time component functions work", () => {
    expect(e.evaluateText("TIME(12,0,0)", ctx())).toEqual(num(0.5));
    expect(e.evaluateText("HOUR(0.5)", ctx())).toEqual(num(12));
    expect(e.evaluateText("MINUTE(0.5)", ctx())).toEqual(num(0));
    expect(e.evaluateText("SECOND(0.5)", ctx())).toEqual(num(0));
    expect(e.evaluateText("TIME(25,0,0)", ctx())).toEqual(num(1 / 24));
  });

  it("EDATE and EOMONTH", () => {
    expect(e.evaluateText("EDATE(45292,1)", ctx())).toEqual(num(45323)); // 2024-02-01
    expect(e.evaluateText("EOMONTH(45292,0)", ctx())).toEqual(num(45322)); // 2024-01-31
    expect(e.evaluateText("EOMONTH(45292,1)", ctx())).toEqual(num(45351)); // 2024-02-29
  });

  it("WORKDAY and NETWORKDAYS", () => {
    expect(e.evaluateText("WORKDAY(45292,1)", ctx())).toEqual(num(45293)); // 2024-01-02
    expect(e.evaluateText("NETWORKDAYS(45292,45292)", ctx())).toEqual(num(1));
    expect(e.evaluateText("NETWORKDAYS(45292,45293)", ctx())).toEqual(num(2));
  });

  it("WEEKDAY supports all return types for Monday 2024-01-01", () => {
    expect(e.evaluateText("WEEKDAY(45292,1)", ctx())).toEqual(num(2)); // Mon in Sun=1 system
    expect(e.evaluateText("WEEKDAY(45292,2)", ctx())).toEqual(num(1)); // Mon=1
    expect(e.evaluateText("WEEKDAY(45292,3)", ctx())).toEqual(num(0)); // Mon=0
    expect(e.evaluateText("WEEKDAY(45292,11)", ctx())).toEqual(num(1));
    expect(e.evaluateText("WEEKDAY(45292,12)", ctx())).toEqual(num(7)); // Mon is day 7 when Tue=1
    expect(e.evaluateText("WEEKDAY(45292,16)", ctx())).toEqual(num(3)); // Mon is day 3 when Sat=1
  });

  it("DATEDIF and DAYS differences", () => {
    expect(e.evaluateText("DAYS(45322,45292)", ctx())).toEqual(num(30));
    expect(e.evaluateText("DATEDIF(45292,45322,\"D\")", ctx())).toEqual(num(30));
    expect(e.evaluateText("DATEDIF(45292,45323,\"M\")", ctx())).toEqual(num(1));
    expect(e.evaluateText("DATEDIF(45292,45322,\"M\")", ctx())).toEqual(num(0));
    expect(e.evaluateText("DATEDIF(45292,45658,\"Y\")", ctx())).toEqual(num(1));
  });

  it("YEARFRAC with common bases", () => {
    const v0 = e.evaluateText("YEARFRAC(45292,45322,0)", ctx());
    const v1 = e.evaluateText("YEARFRAC(45292,45322,1)", ctx());
    const v3 = e.evaluateText("YEARFRAC(45292,45322,3)", ctx());
    expect(v0.kind).toBe("number");
    expect(v1.kind).toBe("number");
    expect(v3.kind).toBe("number");
    if (v0.kind === "number") expect(v0.value).toBeCloseTo(30 / 360, 10);
    if (v1.kind === "number") expect(v1.value).toBeCloseTo(30 / 366, 10);
    if (v3.kind === "number") expect(v3.value).toBeCloseTo(30 / 365, 10);
  });

  it("DATEVALUE and TIMEVALUE parse strings", () => {
    expect(e.evaluateText('DATEVALUE("2024-01-01")', ctx())).toEqual(num(45292));
    expect(e.evaluateText('TIMEVALUE("12:00:00")', ctx())).toEqual(num(0.5));
  });
});

describe("Text function parity", () => {
  const e = ev();

  it("LEFT, RIGHT, MID extract substrings", () => {
    expect(e.evaluateText('LEFT("hello",2)', ctx())).toEqual(str("he"));
    expect(e.evaluateText('RIGHT("hello",2)', ctx())).toEqual(str("lo"));
    expect(e.evaluateText('MID("hello",2,2)', ctx())).toEqual(str("el"));
    expect(e.evaluateText('LEN("hello")', ctx())).toEqual(num(5));
  });

  it("UPPER, LOWER, PROPER, TRIM, CLEAN", () => {
    expect(e.evaluateText('UPPER("hello")', ctx())).toEqual(str("HELLO"));
    expect(e.evaluateText('LOWER("HELLO")', ctx())).toEqual(str("hello"));
    expect(e.evaluateText('PROPER("hello world")', ctx())).toEqual(str("Hello World"));
    expect(e.evaluateText('TRIM("  a   b  ")', ctx())).toEqual(str("a b"));
    expect(e.evaluateText('CLEAN("a\x00b\x01c")', ctx())).toEqual(str("abc"));
  });

  it("FIND and SEARCH", () => {
    expect(e.evaluateText('FIND("a","banana")', ctx())).toEqual(num(2));
    expect(e.evaluateText('SEARCH("A","banana")', ctx())).toEqual(num(2));
    expect(e.evaluateText('FIND("na","banana",3)', ctx())).toEqual(num(3));
  });

  it("SUBSTITUTE and REPLACE", () => {
    expect(e.evaluateText('SUBSTITUTE("a-b-c","-"," ")', ctx())).toEqual(str("a b c"));
    expect(e.evaluateText('SUBSTITUTE("a-b-c","-","",2)', ctx())).toEqual(str("a-bc"));
    expect(e.evaluateText('REPLACE("123456",2,3,"xx")', ctx())).toEqual(str("1xx56"));
    expect(e.evaluateText('REPT("ab",3)', ctx())).toEqual(str("ababab"));
  });

  it("CONCAT and CONCATENATE", () => {
    expect(e.evaluateText('CONCAT("a","b","c")', ctx())).toEqual(str("abc"));
    expect(e.evaluateText('CONCATENATE("a","b","c")', ctx())).toEqual(str("abc"));
    expect(e.evaluateText('CONCAT({"a","b";"c","d"})', ctx())).toEqual(str("abcd"));
  });

  it("CHAR, CODE, UNICHAR, UNICODE", () => {
    expect(e.evaluateText("CHAR(65)", ctx())).toEqual(str("A"));
    expect(e.evaluateText('CODE("A")', ctx())).toEqual(num(65));
    expect(e.evaluateText("UNICHAR(8364)", ctx())).toEqual(str("€"));
    expect(e.evaluateText('UNICODE("€")', ctx())).toEqual(num(8364));
  });

  it("VALUE converts text to number", () => {
    expect(e.evaluateText('VALUE("123")', ctx())).toEqual(num(123));
    expect(e.evaluateText('VALUE("  3.14  ")', ctx())).toEqual(num(3.14));
    expect(e.evaluateText('NUMBERVALUE("123.45")', ctx())).toEqual(num(123.45));
  });

  it("DOLLAR and FIXED format numbers", () => {
    expect(e.evaluateText("DOLLAR(1234.5)", ctx())).toEqual(str("$1,234.50"));
    expect(e.evaluateText("FIXED(1234.5)", ctx())).toEqual(str("1,234.50"));
    expect(e.evaluateText("FIXED(1234.5,2,TRUE)", ctx())).toEqual(str("1234.50"));
  });

  it("EXACT compares strings", () => {
    expect(e.evaluateText('EXACT("a","A")', ctx())).toEqual(bool(false));
    expect(e.evaluateText('EXACT("A","A")', ctx())).toEqual(bool(true));
  });
});

describe("Lookup function parity", () => {
  const e = ev();

  it("INDEX returns the correct array element", () => {
    expect(e.evaluateText("INDEX({1,2;3,4},2,1)", ctx())).toEqual(num(3));
    expect(e.evaluateText("INDEX({\"a\",\"b\";\"c\",\"d\"},1,2)", ctx())).toEqual(str("b"));
  });

  it("MATCH finds exact positions", () => {
    expect(e.evaluateText("MATCH(3,{1,2,3,4})", ctx())).toEqual(num(3));
  });

  it("VLOOKUP and HLOOKUP", () => {
    expect(e.evaluateText('VLOOKUP(2,{1,"a";2,"b";3,"c"},2)', ctx())).toEqual(str("b"));
    expect(e.evaluateText('HLOOKUP("b",{"a","b","c";1,2,3},2)', ctx())).toEqual(num(2));
  });

  it("CHOOSE selects by index", () => {
    expect(e.evaluateText('CHOOSE(2,"a","b","c")', ctx())).toEqual(str("b"));
  });

  it("XLOOKUP matches and returns", () => {
    expect(e.evaluateText('XLOOKUP(2,{1,2,3},{"a","b","c"})', ctx())).toEqual(str("b"));
    expect(e.evaluateText('XLOOKUP(5,{1,2,3},{"a","b","c"},"missing")', ctx())).toEqual(str("missing"));
  });
});

describe("Math and aggregate parity", () => {
  const e = ev();

  it("basic arithmetic functions", () => {
    expect(e.evaluateText("ABS(-5)", ctx())).toEqual(num(5));
    expect(e.evaluateText("SQRT(16)", ctx())).toEqual(num(4));
    expect(e.evaluateText("POWER(2,3)", ctx())).toEqual(num(8));
    expect(e.evaluateText("MOD(10,3)", ctx())).toEqual(num(1));
    expect(e.evaluateText("SIGN(-7)", ctx())).toEqual(num(-1));
    expect(e.evaluateText("INT(3.9)", ctx())).toEqual(num(3));
    expect(e.evaluateText("TRUNC(-3.9)", ctx())).toEqual(num(-3));
  });

  it("rounding functions", () => {
    expect(e.evaluateText("ROUND(3.14159,2)", ctx())).toEqual(num(3.14));
    expect(e.evaluateText("ROUNDUP(3.1,0)", ctx())).toEqual(num(4));
    expect(e.evaluateText("ROUNDDOWN(3.9,0)", ctx())).toEqual(num(3));
    expect(e.evaluateText("MROUND(17,5)", ctx())).toEqual(num(15));
    expect(e.evaluateText("CEILING(7.2,1)", ctx())).toEqual(num(8));
    expect(e.evaluateText("FLOOR(7.9,1)", ctx())).toEqual(num(7));
  });

  it("aggregate functions", () => {
    expect(e.evaluateText("SUM(1,2,3,4)", ctx())).toEqual(num(10));
    expect(e.evaluateText("AVERAGE(2,4,6)", ctx())).toEqual(num(4));
    expect(e.evaluateText("MAX(2,7,3)", ctx())).toEqual(num(7));
    expect(e.evaluateText("MIN(2,7,3)", ctx())).toEqual(num(2));
    expect(e.evaluateText("PRODUCT(2,3,4)", ctx())).toEqual(num(24));
    expect(e.evaluateText("COUNT(1,\"x\",3)", ctx())).toEqual(num(2));
    expect(e.evaluateText("COUNTA(1,\"x\")", ctx())).toEqual(num(2));
    expect(e.evaluateText("COUNTA(1,2,3)", ctx())).toEqual(num(3));
  });

  it("factorial and combinatorial", () => {
    expect(e.evaluateText("FACT(5)", ctx())).toEqual(num(120));
    expect(e.evaluateText("COMBIN(5,2)", ctx())).toEqual(num(10));
    expect(e.evaluateText("PERMUT(5,2)", ctx())).toEqual(num(20));
    expect(e.evaluateText("GCD(24,36)", ctx())).toEqual(num(12));
    expect(e.evaluateText("LCM(4,6)", ctx())).toEqual(num(12));
  });

  it("SUMPRODUCT and SUMSQ", () => {
    expect(e.evaluateText("SUMPRODUCT({1,2,3},{4,5,6})", ctx())).toEqual(num(32));
    expect(e.evaluateText("SUMSQ(3,4)", ctx())).toEqual(num(25));
  });
});

describe("Logical and information parity", () => {
  const e = ev();

  it("logical operators", () => {
    expect(e.evaluateText("IF(TRUE,1,2)", ctx())).toEqual(num(1));
    expect(e.evaluateText("IF(FALSE,1,2)", ctx())).toEqual(num(2));
    expect(e.evaluateText("AND(TRUE,TRUE,FALSE)", ctx())).toEqual(bool(false));
    expect(e.evaluateText("OR(FALSE,TRUE,FALSE)", ctx())).toEqual(bool(true));
    expect(e.evaluateText("NOT(TRUE)", ctx())).toEqual(bool(false));
    expect(e.evaluateText("XOR(TRUE,TRUE)", ctx())).toEqual(bool(false));
    expect(e.evaluateText("IFERROR(1/0,\"err\")", ctx())).toEqual(str("err"));
    expect(e.evaluateText("IFNA(NA(),\"missing\")", ctx())).toEqual(str("missing"));
    expect(e.evaluateText('IFS(1<0,"a",2=2,"b")', ctx())).toEqual(str("b"));
    expect(e.evaluateText('SWITCH(2,1,"a",2,"b")', ctx())).toEqual(str("b"));
  });

  it("IS* functions", () => {
    expect(e.evaluateText("ISNUMBER(123)", ctx())).toEqual(bool(true));
    expect(e.evaluateText("ISTEXT(\"abc\")", ctx())).toEqual(bool(true));
    expect(e.evaluateText("ISBLANK(1)", ctx())).toEqual(bool(false));
    expect(e.evaluateText("ISERROR(1/0)", ctx())).toEqual(bool(true));
    expect(e.evaluateText('ISERR(NA())', ctx())).toEqual(bool(false));
    expect(e.evaluateText('ISNA(NA())', ctx())).toEqual(bool(true));
    expect(e.evaluateText("ISLOGICAL(TRUE)", ctx())).toEqual(bool(true));
    expect(e.evaluateText("ISNONTEXT(123)", ctx())).toEqual(bool(true));
    expect(e.evaluateText("ISREF(123)", ctx())).toEqual(bool(false));
  });

  it("N, T, TYPE and ERROR.TYPE", () => {
    expect(e.evaluateText("N(\"123\")", ctx())).toEqual(num(123));
    expect(e.evaluateText("T(123)", ctx())).toEqual(str(""));
    expect(e.evaluateText("T(\"x\")", ctx())).toEqual(str("x"));
    expect(e.evaluateText("TYPE(123)", ctx())).toEqual(num(1));
    expect(e.evaluateText("TYPE(\"x\")", ctx())).toEqual(num(2));
    expect(e.evaluateText("ERROR.TYPE(1/0)", ctx())).toEqual(num(2));
    expect(e.evaluateText('ERROR.TYPE(NA())', ctx())).toEqual(num(7));
  });
});

describe("Statistical function parity", () => {
  const e = ev();

  it("standard deviation and variance", () => {
    const data = "{2,4,6,8}";
    const s = e.evaluateText(`STDEV.S(${data})`, ctx());
    const p = e.evaluateText(`STDEV.P(${data})`, ctx());
    const vs = e.evaluateText(`VAR.S(${data})`, ctx());
    const vp = e.evaluateText(`VAR.P(${data})`, ctx());
    expect(s.kind).toBe("number");
    expect(p.kind).toBe("number");
    expect(vs.kind).toBe("number");
    expect(vp.kind).toBe("number");
    if (s.kind === "number") expect(s.value).toBeCloseTo(Math.sqrt(20 / 3), 10);
    if (p.kind === "number") expect(p.value).toBeCloseTo(Math.sqrt(5), 10);
    if (vs.kind === "number") expect(vs.value).toBeCloseTo(20 / 3, 10);
    if (vp.kind === "number") expect(vp.value).toBeCloseTo(5, 10);
  });

  it("MEDIAN, LARGE, SMALL, RANK", () => {
    expect(e.evaluateText("MEDIAN({1,3,2})", ctx())).toEqual(num(2));
    expect(e.evaluateText("MEDIAN({1,2,3,4})", ctx())).toEqual(num(2.5));
    expect(e.evaluateText("LARGE({10,20,30,40},2)", ctx())).toEqual(num(30));
    expect(e.evaluateText("SMALL({10,20,30,40},2)", ctx())).toEqual(num(20));
    expect(e.evaluateText("RANK(30,{10,20,30,40})", ctx())).toEqual(num(2));
    expect(e.evaluateText("RANK(30,{10,20,30,40},1)", ctx())).toEqual(num(3));
  });

  it("MODE functions", () => {
    expect(e.evaluateText("MODE.SNGL({1,2,2,3,3})", ctx())).toEqual(num(2));
    const multi = e.evaluateText("MODE.MULT({1,2,2,3,3})", ctx());
    expect(multi.kind).toBe("array");
    if (multi.kind === "array") {
      expect(multi.width).toBe(1);
      expect(multi.height).toBe(2);
    }
  });

  it("PERCENTILE and PERCENTRANK", () => {
    const p50 = e.evaluateText("PERCENTILE.INC({1,2,3,4},0.5)", ctx());
    expect(p50.kind).toBe("number");
    if (p50.kind === "number") expect(p50.value).toBeCloseTo(2.5, 10);
    const pr = e.evaluateText("PERCENTRANK.INC({1,2,3,4},2.5)", ctx());
    expect(pr.kind).toBe("number");
    if (pr.kind === "number") expect(pr.value).toBeCloseTo(0.5, 10);
  });

  it("COUNTIF, SUMIF, AVERAGEIF", () => {
    expect(e.evaluateText('COUNTIF({1,2,3,4},">2")', ctx())).toEqual(num(2));
    expect(e.evaluateText('SUMIF({1,2,3,4},">2")', ctx())).toEqual(num(7));
    expect(e.evaluateText('SUMIF({1,2,3,4},">2",{10,20,30,40})', ctx())).toEqual(num(70));
    expect(e.evaluateText('AVERAGEIF({1,2,3,4},">2")', ctx())).toEqual(num(3.5));
  });
});
