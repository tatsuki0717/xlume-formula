# xls — Excel Function Catalog & Tracker

Exhaustive checklist of **every** Microsoft Excel worksheet function (~480), grouped by
Microsoft's own categories. This is the source of truth for formula coverage; the 3-tier
prioritization (`[T1]`/`[T2]`/`[T3]` tags) is just the *order* we tackle this list in.

Source: [Excel functions by category](https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f26a86c0eb) (verified 2026-06-06).

## Per-function workflow (definition of done)

Each function is implemented **one at a time**. A function is only checked off `[x]` when **all** of:

1. **Implement** — the function in `src/core/formula/functions/<category>.rs`, registered in the dispatch table by name (case-insensitive), with correct arg-count/arity validation and `#VALUE!`/`#NUM!`/`#N/A` error semantics.
2. **Coercion & errors** — argument type coercion (bool↔number, text↔number, empty→0/"") and error propagation match Excel exactly.
3. **Fixture** — a known-answer fixture exists. Two fixture forms:
   - **Inline KAT** (default): `(formula, expected)` pairs in the function's `#[cfg(test)]` module — fast, covers normal + edge + error cases.
   - **Workbook fixture** (when behavior depends on cell layout/ranges/cross-sheet): a small `.xlsx` under `tests/fixtures/formulas/<FUNC>.xlsx` authored in real Excel, with expected results captured as JSON ground truth. This also proves our reader feeds the evaluator correctly.
4. **Test** — KAT test passes; each fixture asserts ≥3 cases: a normal value, an edge case (empty/zero/boundary), and an error path.
5. **Excel parity note** — any intentional deviation (precision, locale, volatility) recorded in a `// PARITY:` comment.

**Volatile functions** (RAND, RANDBETWEEN, RANDARRAY, NOW, TODAY, OFFSET, INDIRECT, INFO, CELL with some args) must be registered in the volatile set so recalc always re-evaluates them.

## Legend

- `[T1]` MVP core — first 30, ship in v0.1
- `[T2]` Essential — common business/text/lookup/date/math
- `[T3]` Extended — full standard coverage
- `[DA]` Dynamic-array / spill — **deferred to post-v1** (PLAN Decision #5). CSE array form may still work.
- `[LAMBDA]` LAMBDA & helpers — deferred to post-v1 (needs closure/iteration machinery)
- `[COMPAT]` Legacy compatibility name — implement as a thin alias to its modern `X.Y` replacement
- `[EXT]` Needs external data/service, pivot cache, or macro/XLL infra — **deferred / stub to `#N/A` or error**, document as unsupported

Count target per tier: T1 = 30 · T2 ≈ 90 · T3 = remainder of standard functions.

---

## Logical (19)

- [x] `IF` — conditional branch [T1]
- [x] `AND` — all conditions true [T1]
- [x] `OR` — any condition true [T1]
- [x] `NOT` — logical negation [T1]
- [x] `TRUE` — boolean true [T1]
- [x] `FALSE` — boolean false [T1]
- [x] `IFERROR` — value or fallback on error [T1]
- [x] `IFNA` — value or fallback on #N/A [T2]
- [x] `IFS` — multiple condition branches [T2]
- [x] `SWITCH` — match value against cases [T2]
- [x] `XOR` — exclusive or [T3]
- [ ] `LAMBDA` — define reusable function [LAMBDA]
- [ ] `LET` — bind names in a formula [LAMBDA]
- [ ] `MAP` — map array via lambda [LAMBDA]
- [ ] `REDUCE` — fold array via lambda [LAMBDA]
- [ ] `SCAN` — running fold via lambda [LAMBDA]
- [ ] `BYROW` — apply lambda per row [LAMBDA]
- [ ] `BYCOL` — apply lambda per column [LAMBDA]
- [ ] `MAKEARRAY` — build array via lambda [LAMBDA]

## Math & Trigonometry (~80)

- [x] `SUM` — add numbers [T1]
- [x] `SUMIF` — conditional sum [T2]
- [x] `SUMIFS` — multi-condition sum [T2]
- [x] `SUMPRODUCT` — sum of products [T2]
- [x] `ROUND` — round to digits [T1]
- [x] `ROUNDUP` — round away from zero [T2]
- [x] `ROUNDDOWN` — round toward zero [T2]
- [x] `ABS` — absolute value [T1]
- [x] `MOD` — remainder [T1]
- [x] `INT` — floor to integer [T1]
- [x] `TRUNC` — truncate decimals [T2]
- [x] `POWER` — exponentiation [T2]
- [x] `SQRT` — square root [T2]
- [x] `EXP` — e^x [T2]
- [x] `LN` — natural log [T2]
- [x] `LOG` — log to base [T2]
- [x] `LOG10` — log base 10 [T2]
- [x] `SIGN` — sign of number [T2]
- [x] `PRODUCT` — multiply numbers [T2]
- [x] `QUOTIENT` — integer division [T3]
- [x] `MROUND` — round to multiple [T2]
- [x] `CEILING.MATH` — round up to multiple [T2]
- [x] `FLOOR.MATH` — round down to multiple [T2]
- [x] `CEILING` — round up to multiple (legacy) [T3]
- [x] `FLOOR` — round down to multiple (legacy) [T3]
- [x] `CEILING.PRECISE` — round up, sign-agnostic [T3]
- [x] `FLOOR.PRECISE` — round down, sign-agnostic [T3]
- [x] `ISO.CEILING` — ISO round up [T3]
- [x] `EVEN` — round up to even [T3]
- [x] `ODD` — round up to odd [T3]
- [x] `PI` — π constant [T3]
- [x] `SQRTPI` — sqrt of n·π [T3]
- [x] `RAND` — random 0–1 [T3] (volatile)
- [x] `RANDBETWEEN` — random integer in range [T3] (volatile)
- [ ] `RANDARRAY` — random array [DA] (volatile)
- [x] `SIN` — sine [T3]
- [x] `COS` — cosine [T3]
- [x] `TAN` — tangent [T3]
- [x] `ASIN` — arcsine [T3]
- [x] `ACOS` — arccosine [T3]
- [x] `ATAN` — arctangent [T3]
- [x] `ATAN2` — arctangent of x,y [T3]
- [x] `SINH` — hyperbolic sine [T3]
- [x] `COSH` — hyperbolic cosine [T3]
- [x] `TANH` — hyperbolic tangent [T3]
- [x] `ASINH` — inverse hyperbolic sine [T3]
- [x] `ACOSH` — inverse hyperbolic cosine [T3]
- [x] `ATANH` — inverse hyperbolic tangent [T3]
- [x] `SEC` — secant [T3]
- [x] `CSC` — cosecant [T3]
- [x] `COT` — cotangent [T3]
- [x] `SECH` — hyperbolic secant [T3]
- [x] `CSCH` — hyperbolic cosecant [T3]
- [x] `COTH` — hyperbolic cotangent [T3]
- [x] `ACOT` — arccotangent [T3]
- [x] `ACOTH` — inverse hyperbolic cotangent [T3]
- [x] `DEGREES` — radians→degrees [T3]
- [x] `RADIANS` — degrees→radians [T3]
- [x] `FACT` — factorial [T3]
- [x] `FACTDOUBLE` — double factorial [T3]
- [x] `COMBIN` — combinations [T3]
- [x] `COMBINA` — combinations with repetition [T3]
- [x] `MULTINOMIAL` — multinomial coefficient [T3]
- [x] `GCD` — greatest common divisor [T3]
- [x] `LCM` — least common multiple [T3]
- [x] `BASE` — convert to text in base [T3]
- [x] `DECIMAL` — parse text in base [T3]
- [x] `ARABIC` — Roman→arabic [T3]
- [x] `ROMAN` — arabic→Roman [T3]
- [x] `SUMSQ` — sum of squares [T3]
- [x] `SUMX2MY2` — Σ(x²−y²) [T3]
- [x] `SUMX2PY2` — Σ(x²+y²) [T3]
- [x] `SUMXMY2` — Σ(x−y)² [T3]
- [x] `SERIESSUM` — power series sum [T3]
- [x] `SUBTOTAL` — aggregate ignoring filtered/nested [T2]
- [x] `AGGREGATE` — aggregate with error/hidden options [T3]
- [x] `MDETERM` — matrix determinant [T3]
- [x] `MINVERSE` — matrix inverse [T3]
- [x] `MMULT` — matrix multiply [T3]
- [x] `MUNIT` — identity matrix [T3]
- [ ] `SEQUENCE` — generate sequence array [DA]
- [ ] `PERCENTOF` — percent of total [T3]

## Statistical (~110)

- [x] `AVERAGE` — mean [T1]
- [x] `MIN` — minimum [T1]
- [x] `MAX` — maximum [T1]
- [x] `COUNT` — count numbers [T1]
- [x] `COUNTA` — count non-empty [T1]
- [x] `COUNTBLANK` — count blanks [T2]
- [x] `COUNTIF` — conditional count [T2]
- [x] `COUNTIFS` — multi-condition count [T2]
- [x] `AVERAGEIF` — conditional mean [T2]
- [x] `AVERAGEIFS` — multi-condition mean [T2]
- [x] `AVERAGEA` — mean incl. text/bool [T3]
- [x] `MAXA` — max incl. text/bool [T3]
- [x] `MINA` — min incl. text/bool [T3]
- [x] `MAXIFS` — conditional max [T2]
- [x] `MINIFS` — conditional min [T2]
- [x] `MEDIAN` — median [T2]
- [x] `MODE.SNGL` — most frequent [T3]
- [ ] `MODE.MULT` — multiple modes [DA]
- [x] `LARGE` — k-th largest [T2]
- [x] `SMALL` — k-th smallest [T2]
- [x] `RANK.EQ` — rank (ties equal) [T2]
- [x] `RANK.AVG` — rank (ties averaged) [T3]
- [x] `STDEV.S` — sample std dev [T2]
- [x] `STDEV.P` — population std dev [T2]
- [x] `STDEVA` — sample std dev incl. text/bool [T3]
- [x] `STDEVPA` — population std dev incl. text/bool [T3]
- [x] `VAR.S` — sample variance [T2]
- [x] `VAR.P` — population variance [T2]
- [x] `VARA` — sample variance incl. text/bool [T3]
- [x] `VARPA` — population variance incl. text/bool [T3]
- [x] `AVEDEV` — mean absolute deviation [T3]
- [x] `DEVSQ` — sum of squared deviations [T3]
- [x] `GEOMEAN` — geometric mean [T3]
- [x] `HARMEAN` — harmonic mean [T3]
- [x] `TRIMMEAN` — trimmed mean [T3]
- [x] `KURT` — kurtosis [T3]
- [x] `SKEW` — skewness [T3]
- [x] `SKEW.P` — population skewness [T3]
- [x] `STANDARDIZE` — normalized z-value [T3]
- [x] `CORREL` — correlation coefficient [T3]
- [x] `PEARSON` — Pearson correlation [T3]
- [x] `RSQ` — r² [T3]
- [x] `COVARIANCE.P` — population covariance [T3]
- [x] `COVARIANCE.S` — sample covariance [T3]
- [x] `SLOPE` — regression slope [T3]
- [x] `INTERCEPT` — regression intercept [T3]
- [x] `STEYX` — std error of regression [T3]
- [x] `FORECAST.LINEAR` — linear forecast [T3]
- [x] `TREND` — linear trend array [DA]
- [x] `GROWTH` — exponential trend array [DA]
- [x] `LINEST` — linear regression stats array [DA]
- [x] `LOGEST` — exponential regression stats array [DA]
- [x] `FORECAST.ETS` — exponential smoothing forecast [T3]
- [x] `FORECAST.ETS.CONFINT` — ETS confidence interval [T3]
- [x] `FORECAST.ETS.SEASONALITY` — ETS seasonality [T3]
- [x] `FORECAST.ETS.STAT` — ETS statistics [T3]
- [x] `FREQUENCY` — histogram bin counts [DA]
- [x] `PROB` — probability in range [T3]
- [x] `PERCENTILE.INC` — percentile inclusive [T3]
- [x] `PERCENTILE.EXC` — percentile exclusive [T3]
- [x] `PERCENTRANK.INC` — percent rank inclusive [T3]
- [x] `PERCENTRANK.EXC` — percent rank exclusive [T3]
- [x] `QUARTILE.INC` — quartile inclusive [T3]
- [x] `QUARTILE.EXC` — quartile exclusive [T3]
- [x] `PERMUT` — permutations [T3]
- [x] `PERMUTATIONA` — permutations with repetition [T3]
- [x] `BINOM.DIST` — binomial distribution [T3]
- [x] `BINOM.DIST.RANGE` — binomial range probability [T3]
- [x] `BINOM.INV` — binomial inverse [T3]
- [x] `NEGBINOM.DIST` — negative binomial [T3]
- [x] `HYPGEOM.DIST` — hypergeometric [T3]
- [x] `POISSON.DIST` — Poisson [T3]
- [x] `EXPON.DIST` — exponential [T3]
- [x] `NORM.DIST` — normal distribution [T3]
- [x] `NORM.INV` — normal inverse [T3]
- [x] `NORM.S.DIST` — standard normal [T3]
- [x] `NORM.S.INV` — standard normal inverse [T3]
- [x] `LOGNORM.DIST` — lognormal [T3]
- [x] `LOGNORM.INV` — lognormal inverse [T3]
- [x] `GAMMA` — gamma function [T3]
- [x] `GAMMA.DIST` — gamma distribution [T3]
- [x] `GAMMA.INV` — gamma inverse [T3]
- [x] `GAMMALN` — ln gamma [T3]
- [x] `GAMMALN.PRECISE` — ln gamma precise [T3]
- [x] `BETA.DIST` — beta distribution [T3]
- [x] `BETA.INV` — beta inverse [T3]
- [x] `CHISQ.DIST` — chi-squared [T3]
- [x] `CHISQ.DIST.RT` — chi-squared right tail [T3]
- [x] `CHISQ.INV` — chi-squared inverse [T3]
- [x] `CHISQ.INV.RT` — chi-squared inverse right [T3]
- [x] `CHISQ.TEST` — chi-squared test [T3]
- [x] `F.DIST` — F distribution [T3]
- [x] `F.DIST.RT` — F right tail [T3]
- [x] `F.INV` — F inverse [T3]
- [x] `F.INV.RT` — F inverse right [T3]
- [x] `F.TEST` — F test [T3]
- [x] `T.DIST` — t distribution [T3]
- [x] `T.DIST.2T` — t two-tailed [T3]
- [x] `T.DIST.RT` — t right tail [T3]
- [x] `T.INV` — t inverse [T3]
- [x] `T.INV.2T` — t inverse two-tailed [T3]
- [x] `T.TEST` — t test [T3]
- [x] `Z.TEST` — z test [T3]
- [x] `CONFIDENCE.NORM` — normal confidence interval [T3]
- [x] `CONFIDENCE.T` — t confidence interval [T3]
- [x] `WEIBULL.DIST` — Weibull [T3]
- [x] `FISHER` — Fisher transform [T3]
- [x] `FISHERINV` — inverse Fisher [T3]
- [x] `GAUSS` — std normal minus 0.5 [T3]
- [x] `PHI` — std normal density [T3]

## Text (~50)

- [x] `CONCAT` — join text [T1]
- [x] `CONCATENATE` — join text (legacy) [T1] [COMPAT]
- [x] `TEXTJOIN` — join with delimiter [T2]
- [x] `LEN` — string length [T1]
- [x] `LEFT` — leftmost chars [T1]
- [x] `RIGHT` — rightmost chars [T1]
- [x] `MID` — substring [T1]
- [x] `TRIM` — collapse spaces [T1]
- [x] `UPPER` — uppercase [T1]
- [x] `LOWER` — lowercase [T1]
- [x] `PROPER` — title case [T2]
- [x] `FIND` — case-sensitive locate [T2]
- [x] `SEARCH` — case-insensitive locate [T2]
- [x] `SUBSTITUTE` — replace text by match [T2]
- [x] `REPLACE` — replace text by position [T2]
- [x] `REPT` — repeat text [T2]
- [x] `TEXT` — format number as text [T2]
- [x] `VALUE` — text→number [T2]
- [x] `NUMBERVALUE` — locale-aware text→number [T3]
- [x] `FIXED` — number→fixed-decimal text [T3]
- [x] `DOLLAR` — number→currency text [T3]
- [x] `EXACT` — case-sensitive compare [T3]
- [x] `CHAR` — code→character [T3]
- [x] `CODE` — character→code [T3]
- [x] `UNICHAR` — Unicode code→char [T3]
- [x] `UNICODE` — char→Unicode code [T3]
- [x] `CLEAN` — strip non-printables [T3]
- [x] `T` — return text or "" [T3]
- [x] `TEXTBEFORE` — text before delimiter [T2]
- [x] `TEXTAFTER` — text after delimiter [T2]
- [ ] `TEXTSPLIT` — split to array [DA]
- [x] `ARRAYTOTEXT` — array→text [T3]
- [x] `VALUETOTEXT` — value→text [T3]
- [x] `REGEXTEST` — regex match test [T3]
- [x] `REGEXEXTRACT` — regex extract [T3]
- [x] `REGEXREPLACE` — regex replace [T3]
- [x] `LEFTB` — leftmost bytes (DBCS) [T3]
- [x] `RIGHTB` — rightmost bytes (DBCS) [T3]
- [x] `MIDB` — substring by bytes (DBCS) [T3]
- [x] `LENB` — byte length (DBCS) [T3]
- [x] `FINDB` — locate by bytes (DBCS) [T3]
- [x] `SEARCHB` — locate by bytes (DBCS) [T3]
- [x] `REPLACEB` — replace by bytes (DBCS) [T3]
- [x] `ASC` — full-width→half-width [EXT]
- [x] `DBCS` — half-width→full-width [EXT]
- [x] `PHONETIC` — extract furigana [EXT]
- [x] `BAHTTEXT` — number→Thai baht text [EXT]
- [x] `DETECTLANGUAGE` — detect language [EXT]
- [x] `TRANSLATE` — machine translate [EXT]

## Lookup & Reference (~40)

- [x] `VLOOKUP` — vertical lookup [T2]
- [x] `HLOOKUP` — horizontal lookup [T2]
- [x] `XLOOKUP` — modern lookup [T2]
- [x] `LOOKUP` — vector/array lookup [T3]
- [x] `INDEX` — value at row/col [T2]
- [x] `MATCH` — position of value [T2]
- [x] `XMATCH` — modern position lookup [T3]
- [x] `CHOOSE` — pick by index [T2]
- [x] `OFFSET` — shifted reference [T2] (volatile)
- [x] `INDIRECT` — reference from text [T2] (volatile)
- [x] `ADDRESS` — build address text [T2]
- [x] `ROW` — row number [T1]
- [x] `COLUMN` — column number [T2]
- [x] `ROWS` — count rows [T2]
- [x] `COLUMNS` — count columns [T2]
- [x] `AREAS` — count areas in ref [T3]
- [x] `TRANSPOSE` — flip rows/cols [DA]
- [x] `HYPERLINK` — clickable link [T3]
- [x] `FORMULATEXT` — formula as text [T3]
- [ ] `SORT` — sort array [DA]
- [ ] `SORTBY` — sort by keys [DA]
- [ ] `UNIQUE` — distinct values [DA]
- [ ] `FILTER` — filter array [DA]
- [ ] `VSTACK` — stack vertically [DA]
- [ ] `HSTACK` — stack horizontally [DA]
- [ ] `TOROW` — array→single row [DA]
- [ ] `TOCOL` — array→single column [DA]
- [ ] `WRAPROWS` — wrap into rows [DA]
- [ ] `WRAPCOLS` — wrap into columns [DA]
- [ ] `TAKE` — take rows/cols [DA]
- [ ] `DROP` — drop rows/cols [DA]
- [ ] `EXPAND` — pad array to size [DA]
- [ ] `CHOOSEROWS` — pick rows [DA]
- [ ] `CHOOSECOLS` — pick columns [DA]
- [ ] `TRIMRANGE` — trim blank edges [DA]
- [x] `GETPIVOTDATA` — read pivot table [EXT]
- [x] `GROUPBY` — group/aggregate array [DA] [EXT]
- [x] `PIVOTBY` — pivot array [DA] [EXT]
- [x] `IMAGE` — image from URL [EXT]
- [x] `RTD` — real-time data [EXT]

## Date & Time (25)

- [x] `TODAY` — current date [T1] (volatile)
- [x] `NOW` — current date-time [T1] (volatile)
- [x] `DATE` — build date [T2]
- [x] `TIME` — build time [T2]
- [x] `YEAR` — extract year [T2]
- [x] `MONTH` — extract month [T2]
- [x] `DAY` — extract day [T2]
- [x] `HOUR` — extract hour [T2]
- [x] `MINUTE` — extract minute [T2]
- [x] `SECOND` — extract second [T2]
- [x] `WEEKDAY` — day of week [T2]
- [x] `WEEKNUM` — week of year [T3]
- [x] `ISOWEEKNUM` — ISO week number [T3]
- [x] `DATEVALUE` — text→date serial [T2]
- [x] `TIMEVALUE` — text→time serial [T2]
- [x] `DATEDIF` — date difference [T2]
- [x] `DAYS` — days between dates [T2]
- [x] `DAYS360` — 360-day difference [T3]
- [x] `EDATE` — months offset [T2]
- [x] `EOMONTH` — end of month [T2]
- [x] `YEARFRAC` — fraction of year [T3]
- [x] `WORKDAY` — add working days [T3]
- [x] `WORKDAY.INTL` — add working days, custom weekend [T3]
- [x] `NETWORKDAYS` — count working days [T3]
- [x] `NETWORKDAYS.INTL` — count working days, custom weekend [T3]

## Financial (~55)

- [x] `PMT` — loan payment [T3]
- [x] `IPMT` — interest portion [T3]
- [x] `PPMT` — principal portion [T3]
- [x] `FV` — future value [T3]
- [x] `PV` — present value [T3]
- [x] `NPV` — net present value [T3]
- [x] `XNPV` — NPV with dates [T3]
- [x] `IRR` — internal rate of return [T3]
- [x] `XIRR` — IRR with dates [T3]
- [x] `MIRR` — modified IRR [T3]
- [x] `RATE` — interest rate [T3]
- [x] `NPER` — number of periods [T3]
- [x] `ISPMT` — interest of straight-line loan [T3]
- [x] `RRI` — equivalent interest rate [T3]
- [x] `PDURATION` — periods to reach value [T3]
- [x] `FVSCHEDULE` — FV with varying rates [T3]
- [x] `SLN` — straight-line depreciation [T3]
- [x] `SYD` — sum-of-years depreciation [T3]
- [x] `DB` — fixed-declining depreciation [T3]
- [x] `DDB` — double-declining depreciation [T3]
- [x] `VDB` — variable declining depreciation [T3]
- [x] `AMORDEGRC` — French depreciation (coeff) [T3]
- [x] `AMORLINC` — French depreciation (linear) [T3]
- [x] `EFFECT` — effective annual rate [T3]
- [x] `NOMINAL` — nominal annual rate [T3]
- [x] `DOLLARDE` — fractional→decimal dollar [T3]
- [x] `DOLLARFR` — decimal→fractional dollar [T3]
- [x] `ACCRINT` — accrued interest (periodic) [T3]
- [x] `ACCRINTM` — accrued interest (maturity) [T3]
- [x] `COUPDAYBS` — coupon days before settlement [T3]
- [x] `COUPDAYS` — coupon period days [T3]
- [x] `COUPDAYSNC` — coupon days to next [T3]
- [x] `COUPNCD` — next coupon date [T3]
- [x] `COUPNUM` — number of coupons [T3]
- [x] `COUPPCD` — previous coupon date [T3]
- [x] `CUMIPMT` — cumulative interest [T3]
- [x] `CUMPRINC` — cumulative principal [T3]
- [x] `DISC` — bond discount rate [T3]
- [x] `DURATION` — Macaulay duration [T3]
- [x] `MDURATION` — modified duration [T3]
- [x] `INTRATE` — security interest rate [T3]
- [x] `PRICE` — bond price [T3]
- [x] `PRICEDISC` — discounted security price [T3]
- [x] `PRICEMAT` — price, interest at maturity [T3]
- [x] `RECEIVED` — amount received at maturity [T3]
- [x] `YIELD` — bond yield [T3]
- [x] `YIELDDISC` — discounted security yield [T3]
- [x] `YIELDMAT` — yield, interest at maturity [T3]
- [x] `ODDFPRICE` — odd first period price [T3]
- [x] `ODDFYIELD` — odd first period yield [T3]
- [x] `ODDLPRICE` — odd last period price [T3]
- [x] `ODDLYIELD` — odd last period yield [T3]
- [x] `TBILLEQ` — T-bill bond-equivalent yield [T3]
- [x] `TBILLPRICE` — T-bill price [T3]
- [x] `TBILLYIELD` — T-bill yield [T3]

## Information (22)

- [x] `ISBLANK` — is empty [T1]
- [x] `ISERROR` — is any error [T1]
- [x] `ISERR` — is error except #N/A [T2]
- [x] `ISNA` — is #N/A [T2]
- [x] `ISNUMBER` — is number [T1]
- [x] `ISTEXT` — is text [T1]
- [x] `ISNONTEXT` — is not text [T3]
- [x] `ISLOGICAL` — is boolean [T3]
- [x] `ISREF` — is reference [T3]
- [x] `ISFORMULA` — cell has formula [T3]
- [x] `ISEVEN` — is even [T3]
- [x] `ISODD` — is odd [T3]
- [ ] `ISOMITTED` — lambda arg omitted [LAMBDA]
- [x] `N` — coerce to number [T3]
- [x] `NA` — return #N/A [T2]
- [x] `TYPE` — type code of value [T3]
- [x] `ERROR.TYPE` — error code [T3]
- [x] `CELL` — cell info [T3] (volatile w/ some args)
- [x] `INFO` — environment info [T3] (volatile)
- [x] `SHEET` — sheet number [T3]
- [x] `SHEETS` — count sheets [T3]
- [x] `STOCKHISTORY` — historical stock data [EXT]

## Engineering (~54)

- [x] `CONVERT` — unit conversion [T3]
- [x] `DELTA` — Kronecker delta [T3]
- [x] `GESTEP` — step threshold [T3]
- [x] `BIN2DEC` — binary→decimal [T3]
- [x] `BIN2HEX` — binary→hex [T3]
- [x] `BIN2OCT` — binary→octal [T3]
- [x] `DEC2BIN` — decimal→binary [T3]
- [x] `DEC2HEX` — decimal→hex [T3]
- [x] `DEC2OCT` — decimal→octal [T3]
- [x] `HEX2BIN` — hex→binary [T3]
- [x] `HEX2DEC` — hex→decimal [T3]
- [x] `HEX2OCT` — hex→octal [T3]
- [x] `OCT2BIN` — octal→binary [T3]
- [x] `OCT2DEC` — octal→decimal [T3]
- [x] `OCT2HEX` — octal→hex [T3]
- [x] `BITAND` — bitwise and [T3]
- [x] `BITOR` — bitwise or [T3]
- [x] `BITXOR` — bitwise xor [T3]
- [x] `BITLSHIFT` — bit shift left [T3]
- [x] `BITRSHIFT` — bit shift right [T3]
- [x] `COMPLEX` — build complex number [T3]
- [x] `IMABS` — complex modulus [T3]
- [x] `IMAGINARY` — imaginary part [T3]
- [x] `IMREAL` — real part [T3]
- [x] `IMARGUMENT` — complex argument [T3]
- [x] `IMCONJUGATE` — complex conjugate [T3]
- [x] `IMSUM` — add complex [T3]
- [x] `IMSUB` — subtract complex [T3]
- [x] `IMPRODUCT` — multiply complex [T3]
- [x] `IMDIV` — divide complex [T3]
- [x] `IMPOWER` — complex power [T3]
- [x] `IMSQRT` — complex sqrt [T3]
- [x] `IMEXP` — complex exp [T3]
- [x] `IMLN` — complex ln [T3]
- [x] `IMLOG10` — complex log10 [T3]
- [x] `IMLOG2` — complex log2 [T3]
- [x] `IMSIN` — complex sine [T3]
- [x] `IMCOS` — complex cosine [T3]
- [x] `IMTAN` — complex tangent [T3]
- [x] `IMSINH` — complex sinh [T3]
- [x] `IMCOSH` — complex cosh [T3]
- [x] `IMSEC` — complex secant [T3]
- [x] `IMCSC` — complex cosecant [T3]
- [x] `IMCOT` — complex cotangent [T3]
- [x] `IMSECH` — complex hyperbolic secant [T3]
- [x] `IMCSCH` — complex hyperbolic cosecant [T3]
- [x] `ERF` — error function [T3]
- [x] `ERF.PRECISE` — error function (precise) [T3]
- [x] `ERFC` — complementary error function [T3]
- [x] `ERFC.PRECISE` — complementary erf (precise) [T3]
- [x] `BESSELI` — modified Bessel I [T3]
- [x] `BESSELJ` — Bessel J [T3]
- [x] `BESSELK` — modified Bessel K [T3]
- [x] `BESSELY` — Bessel Y [T3]

## Database (12)

- [x] `DSUM` — sum matching records [T3]
- [x] `DAVERAGE` — average matching records [T3]
- [x] `DCOUNT` — count numeric matching [T3]
- [x] `DCOUNTA` — count non-blank matching [T3]
- [x] `DMAX` — max matching [T3]
- [x] `DMIN` — min matching [T3]
- [x] `DGET` — single matching value [T3]
- [x] `DPRODUCT` — product matching [T3]
- [x] `DSTDEV` — sample std dev matching [T3]
- [x] `DSTDEVP` — population std dev matching [T3]
- [x] `DVAR` — sample variance matching [T3]
- [x] `DVARP` — population variance matching [T3]

## Compatibility — legacy aliases (~41) [COMPAT]

Implement each as a thin alias delegating to its modern replacement (parity-tested against the legacy name).

- [x] `RANK` → `RANK.EQ`
- [ ] `MODE` → `MODE.SNGL`
- [x] `STDEV` → `STDEV.S`
- [x] `STDEVP` → `STDEV.P`
- [x] `VAR` → `VAR.S`
- [x] `VARP` → `VAR.P`
- [x] `PERCENTILE` → `PERCENTILE.INC`
- [x] `QUARTILE` → `QUARTILE.INC`
- [x] `PERCENTRANK` → `PERCENTRANK.INC`
- [ ] `COVAR` → `COVARIANCE.P`
- [x] `FORECAST` → `FORECAST.LINEAR`
- [ ] `NORMDIST` → `NORM.DIST`
- [ ] `NORMINV` → `NORM.INV`
- [ ] `NORMSDIST` → `NORM.S.DIST`
- [ ] `NORMSINV` → `NORM.S.INV`
- [ ] `LOGNORMDIST` → `LOGNORM.DIST`
- [ ] `LOGINV` → `LOGNORM.INV`
- [ ] `BETADIST` → `BETA.DIST`
- [ ] `BETAINV` → `BETA.INV`
- [ ] `GAMMADIST` → `GAMMA.DIST`
- [ ] `GAMMAINV` → `GAMMA.INV`
- [ ] `BINOMDIST` → `BINOM.DIST`
- [ ] `NEGBINOMDIST` → `NEGBINOM.DIST`
- [ ] `HYPGEOMDIST` → `HYPGEOM.DIST`
- [ ] `POISSON` → `POISSON.DIST`
- [ ] `EXPONDIST` → `EXPON.DIST`
- [ ] `WEIBULL` → `WEIBULL.DIST`
- [ ] `CHIDIST` → `CHISQ.DIST.RT`
- [ ] `CHIINV` → `CHISQ.INV.RT`
- [x] `CHITEST` → `CHISQ.TEST`
- [ ] `FDIST` → `F.DIST.RT`
- [ ] `FINV` → `F.INV.RT`
- [x] `FTEST` → `F.TEST`
- [ ] `TDIST` → `T.DIST.2T` / `T.DIST.RT` (tails arg)
- [ ] `TINV` → `T.INV.2T`
- [x] `TTEST` → `T.TEST`
- [ ] `ZTEST` → `Z.TEST`
- [ ] `CONFIDENCE` → `CONFIDENCE.NORM`
- [ ] `CRITBINOM` → `BINOM.INV`
- [x] `CEILING` (legacy semantics) → `CEILING` (kept distinct, listed in Math)
- [x] `FLOOR` (legacy semantics) → `FLOOR` (kept distinct, listed in Math)

## Cube (7) [EXT]

Require an OLAP/Power Pivot data model — **not supported**; stub to `#N/A` and document.

- [x] `CUBEVALUE` [EXT]
- [x] `CUBEMEMBER` [EXT]
- [x] `CUBESET` [EXT]
- [x] `CUBESETCOUNT` [EXT]
- [x] `CUBERANKEDMEMBER` [EXT]
- [x] `CUBEMEMBERPROPERTY` [EXT]
- [x] `CUBEKPIMEMBER` [EXT]

## Web (3) [EXT]

Require network access — gate behind a feature/flag; default to `#VALUE!`/unsupported.

- [x] `WEBSERVICE` — HTTP GET [EXT]
- [x] `FILTERXML` — XPath over XML [EXT] (implementable offline; pair with WEBSERVICE)
- [x] `ENCODEURL` — URL-encode text [T3] (pure, implement normally)

## User-defined / Add-in (3) — out of scope

- [x] `CALL` — call DLL/code resource [EXT] (XLL infra — not supported)
- [x] `REGISTER.ID` — registered function ID [EXT] (XLL infra — not supported)
- [x] `EUROCONVERT` — euro currency conversion [T3] (fixed legacy rates — implementable)

---

## Coverage summary

| Category | Count | Notes |
|----------|-------|-------|
| Logical | 19 | 7 deferred ([LAMBDA]) |
| Math & trig | ~80 | 3 deferred ([DA]) |
| Statistical | ~110 | several [DA] array forms |
| Text | ~50 | 6 [EXT] (locale/CJK/translate) |
| Lookup & reference | ~40 | many [DA] spill functions |
| Date & time | 25 | full coverage planned |
| Financial | ~55 | all T3 |
| Information | 22 | 1 [EXT] |
| Engineering | ~54 | all T3 |
| Database | 12 | all T3 |
| Compatibility | ~41 | aliases to modern names |
| Cube | 7 | [EXT] not supported |
| Web | 3 | mostly [EXT] |
| UDF/Add-in | 3 | mostly out of scope |

**Standard implementable target:** ~440 functions. **Deferred ([DA]/[LAMBDA]):** ~45 (post-v1). **Unsupported ([EXT] cube/web/XLL/pivot/stock):** ~20.
