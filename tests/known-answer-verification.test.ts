import { describe, expect, it } from "vitest";
import { Workbook } from "../src/model/workbook.js";

/**
 * Known-answer verification against Excel semantics.
 * Each case is a formula whose Excel result is documented behaviour,
 * verified independently of the implementation (not a snapshot).
 * Direct literal arguments of aggregate functions are coerced the way
 * Excel does (SUM("3",1) = 4): the evaluator propagates AST literal-ness
 * so a string/logical literal is converted, while the same values in
 * cells or expression results are ignored (see literal-coercion.test.ts).
 */
const cases: Array<[string, number | string | boolean, number?]> = [
  // math
  ["=SUM({1,2,3,4})", 10], ["=PRODUCT({2,3,4})", 24], ["=MOD(3,2)", 1], ["=MOD(-3,2)", 1], ["=MOD(3,-2)", -1],
  ["=POWER(2,10)", 1024], ["=SQRT(144)", 12], ["=ABS(-7)", 7], ["=SIGN(-3)", -1],
  ["=ROUND(2.5,0)", 3], ["=ROUND(-2.5,0)", -3], ["=ROUND(3.14159,2)", 3.14], ["=ROUND(2.675,2)", 2.68, 1e-9],
  ["=ROUND(1.005,2)", 1.01, 1e-9], ["=ROUND(-1.005,2)", -1.01, 1e-9],
  ["=ROUNDDOWN(3.99,0)", 3], ["=ROUNDUP(3.01,0)", 4], ["=ROUNDUP(-3.01,0)", -4], ["=INT(-1.5)", -2], ["=TRUNC(-1.5)", -1],
  ["=CEILING(2.5,1)", 3], ["=FLOOR(2.5,1)", 2], ["=CEILING.MATH(-2.5)", -2], ["=FLOOR.MATH(-2.5)", -3],
  ["=MROUND(10,3)", 9], ["=QUOTIENT(5,2)", 2], ["=QUOTIENT(-5,2)", -2],
  ["=FACT(5)", 120], ["=COMBIN(5,2)", 10], ["=PERMUT(5,2)", 20], ["=GCD(12,18)", 6], ["=LCM(4,6)", 12],
  ["=SUMSQ({1,2,3})", 14], ["=SUMPRODUCT({1,2,3},{4,5,6})", 32], ["=EVEN(1.5)", 2], ["=ODD(1.5)", 3], ["=ODD(2)", 3],
  ["=LOG10(1000)", 3], ["=SUMIF({1,2,3,4},\">2\")", 7], ["=COUNTIF({1,2,2,3},\"2\")", 2], ["=AVERAGEIF({1,2,3,4},\">2\")", 3.5],
  ["=SUBTOTAL(9,{1,2,3})", 6], ["=SUBTOTAL(1,{1,2,3})", 2],
  // precedence / operators / coercion
  ["=-2^2", 4], ["=2^3^2", 64], ["=50%", 0.5], ["=\"1\"+1", 2], ["=TRUE+1", 2], ["=--\"3\"", 3],
  ["=COUNT({1,\"a\",TRUE})", 1],
  // direct literal coercion in aggregate functions (Excel converts values
  // typed into the argument list; references/expressions are not converted)
  ["=SUM(\"3\",1)", 4], ["=SUM(TRUE,1)", 2], ["=SUM(\"abc\")", "#VALUE!"], ["=SUM(\"50%\")", 0.5],
  ["=AVERAGE(\"4\",2)", 3], ["=AVERAGE(TRUE,3)", 2],
  ["=COUNT(\"3\",1)", 2], ["=COUNT(TRUE)", 1], ["=COUNT(\"abc\")", 0],
  ["=MIN(\"5\",3)", 3], ["=MAX(\"5\",3)", 5], ["=COUNTA(\"abc\")", 1],
  // statistics
  ["=AVERAGE({1,2,3,4})", 2.5], ["=MEDIAN({1,2,3,4})", 2.5], ["=MODE.SNGL({1,1,2,3})", 1],
  ["=ROUND(STDEV.S({2,4,4,4,5,5,7,9}),4)", 2.1381, 1e-4], ["=ROUND(STDEV.P({2,4,4,4,5,5,7,9}),4)", 2],
  ["=ROUND(VAR.S({2,4,4,4,5,5,7,9}),4)", 4.5714, 1e-4], ["=VAR.P({2,4,4,4,5,5,7,9})", 4],
  ["=LARGE({1,2,3,4,5},2)", 4], ["=SMALL({1,2,3,4,5},2)", 2], ["=RANK.EQ(3,{1,2,3,4})", 2],
  ["=PERCENTILE.INC({1,2,3,4},0.5)", 2.5], ["=QUARTILE.INC({1,2,3,4},2)", 2.5],
  ["=CORREL({1,2,3},{2,4,6})", 1], ["=SLOPE({1,2,3},{1,2,3})", 1], ["=INTERCEPT({1,2,3},{1,2,3})", 0],
  ["=ROUND(NORM.DIST(1,0,1,TRUE),4)", 0.8413], ["=ROUND(NORM.S.INV(0.9),4)", 1.2816],
  ["=ROUND(T.DIST.2T(2,10),4)", 0.0734], ["=ROUND(CHISQ.DIST.RT(4,2),4)", 0.1353],
  ["=BINOM.DIST(2,5,0.5,FALSE)", 0.3125], ["=BINOM.INV(10,0.5,0.9)", 7],
  ["=ROUND(POISSON.DIST(2,3,TRUE),4)", 0.4232], ["=ROUND(EXPON.DIST(1,1,TRUE),4)", 0.6321],
  ["=ROUND(HYPGEOM.DIST(1,2,3,10,FALSE),4)", 0.4667], ["=ROUND(NEGBINOM.DIST(2,3,0.5,FALSE),4)", 0.1875],
  ["=Z.TEST({1,2,3},2)", 0.5], ["=ROUND(CONFIDENCE.NORM(0.05,1,10),4)", 0.6198],
  ["=MAXIFS({1,2,3},{\"a\",\"b\",\"a\"},\"a\")", 3], ["=MINIFS({1,2,3},{\"a\",\"b\",\"a\"},\"a\")", 1],
  // lookup
  ["=VLOOKUP(2,{1,\"a\";2,\"b\";3,\"c\"},2,FALSE)", "b"], ["=VLOOKUP(2.5,{1,\"a\";2,\"b\";3,\"c\"},2,TRUE)", "b"],
  ["=VLOOKUP(2.5,{1,\"a\";2,\"b\";3,\"c\"},2,0)", "#N/A"],
  ["=HLOOKUP(2,{1,2;\"a\",\"b\"},2,FALSE)", "b"], ["=HLOOKUP(2.5,{1,2,3;\"a\",\"b\",\"c\"},2,TRUE)", "b"],
  ["=INDEX({10,20,30},2)", 20], ["=INDEX({10;20;30},3)", 30], ["=INDEX({1,2;3,4},2,1)", 3],
  ["=SUM(INDEX({1,2;3,4},2))", 7], ["=SUM(INDEX({1,2;3,4},0,2))", 6],
  ["=MATCH(20,{10,20,30},0)", 2], ["=MATCH(25,{10,20,30},1)", 2], ["=MATCH(25,{30,20,10},-1)", 1], ["=MATCH(15,{30,20,10},-1)", 2],
  ["=XLOOKUP(2,{1,2,3},{10,20,30})", 20], ["=XLOOKUP(9,{1,2,3},{10,20,30},\"none\")", "none"],
  ["=XMATCH(30,{10,20,30})", 3], ["=CHOOSE(2,\"a\",\"b\",\"c\")", "b"], ["=ROWS({1,2;3,4})", 2], ["=COLUMNS({1,2;3,4})", 2],
  ["=SUM(TRANSPOSE({1,2;3,4}))", 10],
  // financial
  ["=ROUND(PMT(0.08,10,10000),2)", -1490.29, 0.01], ["=ROUND(FV(0.1,10,-100,-1000),2)", 4187.48, 0.5],
  ["=ROUND(NPV(0.1,100,200,300),2)", 481.59, 0.05], ["=SLN(1000,100,5)", 180], ["=SYD(1000,100,5,1)", 300],
  ["=ROUND(IRR({-1000,300,400,500}),3)", 0.089, 0.003],
  // text / date / info / engineering (verification wave 2)
  ["=TEXTBEFORE(\"a,b,c\",\",\",-1)", "a,b"], ["=TEXTAFTER(\"a,b,c\",\",\",-1)", "c"],
  ["=TEXTBEFORE(\"a,b,c\",\",\",2)", "a,b"], ["=TEXTAFTER(\"a-b-c\",\"-\",-2)", "b-c"],
  ["=TEXTBEFORE(\"abc\",\",\",,,,\"x\")", "x"], ["=TEXTBEFORE(\"abc\",\",\",1,0,1)", "abc"],
  ["=TEXTAFTER(\"abc\",\",\",1,0,1)", "abc"], ["=TEXTBEFORE(\"a/b,c\",{\",\",\"/\"})", "a"],
  ["=NUMBERVALUE(\"1.234,5\",\",\",\".\")", 1234.5], ["=NUMBERVALUE(\"2,500\")", 2500],
  ["=NUMBERVALUE(\"50%\")", 0.5], ["=NUMBERVALUE(\"50%%\")", 0.005], ["=NUMBERVALUE(\"\")", 0],
  ["=TEXT(1234.567,\"0.00\")", "1234.57"], ["=TEXT(0.5,\"0%\")", "50%"], ["=TEXT(0.25,\"0.0%\")", "25.0%"],
  ["=TEXT(DATE(2024,1,15),\"yyyy-mm-dd\")", "2024-01-15"], ["=TEXT(DATE(2024,1,15),\"yyyy/mm/dd\")", "2024/01/15"],
  ["=TEXT(1234.567,\"#,##0.00\")", "1,234.57"], ["=TEXT(1234.5,\"#,##0\")", "1,235"],
  ["=TEXT(-1234.567,\"0.00\")", "-1234.57"], ["=TEXT(42,\"00000\")", "00042"],
  ["=TEXT(12345,\"0.00E+00\")", "1.23E+04"], ["=TEXT(DATE(2024,2,29),\"d mmm yy\")", "29 Feb 24"],
  ["=TEXT(DATE(2024,1,15)+TIME(13,5,9),\"hh:mm:ss\")", "13:05:09"],
  ["=TEXT(DATE(2024,1,15)+TIME(13,5,9),\"h:mm AM/PM\")", "1:05 PM"], ["=TEXT(\"abc\",\"0\")", "abc"],
  ["=JIS(\"ABC123\")", "ＡＢＣ１２３"],
  ["=WEEKNUM(DATE(2024,1,7))", 2], ["=WEEKNUM(DATE(2024,1,1))", 1], ["=WEEKNUM(DATE(2024,1,6))", 1],
  ["=WEEKNUM(DATE(2024,1,8))", 2], ["=WEEKNUM(DATE(2024,1,7),2)", 1], ["=WEEKNUM(DATE(2024,1,8),2)", 2],
  ["=WEEKNUM(DATE(2023,1,8))", 2], ["=WEEKNUM(DATE(2024,12,31))", 53],
  ["=N(\"a\")", 0], ["=N(\"5\")", 0], ["=N(TRUE)", 1], ["=N(5)", 5], ["=N(FALSE)", 0],
  ["=ERF(1)", 0.8427007929497149, 1e-12], ["=ERFC(1)", 0.1572992070502851, 1e-12],
  ["=ERF(0.5)", 0.5204998778130465, 1e-12], ["=ERFC(3)", 2.209049699858544e-05, 1e-15],
  // errors
  ["=IFERROR(1/0,\"e\")", "e"], ["=ERROR.TYPE(1/0)", 2],
];

describe("known-answer verification (Excel semantics)", () => {
  for (const [formula, expected, tol] of cases) {
    it(`${formula} = ${JSON.stringify(expected)}`, () => {
      const wb = new Workbook();
      const sheet = wb.addSheet();
      wb.setFormula(sheet, 0, 0, formula);
      const v = wb.getValue(sheet, 0, 0);
      const got =
        v.kind === "number" || v.kind === "string" || v.kind === "boolean" ? v.value : v.kind === "error" ? v.code : v.kind;
      if (typeof expected === "number" && typeof got === "number") {
        expect(Math.abs(got - expected)).toBeLessThanOrEqual(tol ?? 1e-6);
      } else {
        expect(got).toBe(expected);
      }
    });
  }
});
