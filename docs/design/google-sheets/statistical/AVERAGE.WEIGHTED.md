# AVERAGE.WEIGHTED

## Metadata
- **Category:** Statistical
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Finds the weighted average of a set of values, given the values and the corresponding weights. .

## Google Sheets Syntax
```excel
=AVERAGE.WEIGHTED(values, weights, [additional values], [additional weights])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | values | range/array | Yes |  |
| 2 | weights | range/array | Yes |  |
| 3 | additional_values | number | No |  |
| 4 | additional_weights | number | No |  |

## Returns
number

## Behavior / Algorithm
1. Collect values and weights as arrays/values. Weights must be same shape as values.
2. Compute sum(values_i * weights_i).
3. Divide by sum(weights).
4. Return the weighted average.

## Type Coercion & Edge Cases
- Numbers provided as text are coerced to numeric values when the function expects a number.
- Logical `TRUE`/`FALSE` coerce to `1`/`0` in numeric contexts and to `"TRUE"`/`"FALSE"` in text contexts.
- Blank cells are treated as `0` in numeric contexts and as `""` in text contexts, unless the function explicitly ignores blanks.
- Errors in any argument propagate to the result, except where the function is explicitly designed to trap them (e.g., IFERROR, IFNA).
- Range/array arguments are evaluated element-wise or consumed as a whole depending on the function semantics.


## Error Handling
| Error | When |
|---|---|
| `#VALUE!` | Argument type or count is invalid, or an argument cannot be coerced. |
| `#NUM!` | A numeric argument is outside the allowed domain. |
| `#DIV/0!` | Division by zero or an empty denominator. |
| `#N/A` | Lookup/match not found or optional fallback triggered. |
| `#REF!` | Invalid cell/range reference or out-of-bounds index. |
| `#NAME?` | Function name not recognized. |
| `#SPILL!` | Dynamic-array result cannot fit in the target range. |


## Examples
- `=AVERAGE.WEIGHTED({10,20,30}, {1,2,3})`
- `=AVERAGE.WEIGHTED(A1:A3, B1:B3)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=AVERAGE.WEIGHTED({10,20,30},{1,2,3})` | `23.333333333333332` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/9084098?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - AVERAGE.WEIGHTED](https://support.google.com/docs/answer/9084098?hl=en)


## Google Sheets Documentation Excerpts

### Notes
values 
 The values to be averaged. 
- May refer to a range of cells, or may contain the values themselves.
 
 
 
 
 weights 
 The corresponding list of weights to apply. 
- May refer to a range of cells, or may contain the weights themselves.
- Weights cannot be negative, though they can be zero.
- At least one of the weights must be positive.
- If using a range of cells, that range must have the same number of rows and columns as the range of values.
 
 
 
 
 [additional_values] 
 Additional values to average. 
- Additional values are optional.
 
 
 
 
 [additional_weights] 
 Additional weights to apply. 
- Additional weights are optional, but each  additional_value must be followed by exactly one additional_weight .
 
 
 
 
 
 
 
## Sample formulas
 AVERAGE.WEIGHTED(10, 1, 20, 3) 
 AVERAGE.WEIGHTED(A1:A2, B1:B2) 
 AVERAGE.WEIGHTED(A1:A2, B1:B2, C1, C2)

### Examples
This example shows the weighted averages of different numbers and weights:
 
 
 
   
 A 
 B 
 C 
 D 
 
 
 1 
 2 
 1 
 Formula 
 Result 
 
 
 2 
 4 
 3 
 =AVERAGE.WEIGHTED(A1:A2, B1:B2) 
 3.5 
 
 
 3 
 8 
 6 
 =AVERAGE.WEIGHTED(2, 10, 4, 15) 
 3.2 
 
 
 4 
   
   
 =AVERAGE.WEIGHTED(A1:A2, B1:B2, C1, C2) 
 6.2 
 
 
 
 
This example of weighted average calculates someone's grade in a school course:
 
 
 
   
 A 
 B 
 C 
 
 
 1 
 Item 
 Grade 
 Percentage of final grade 
 
 
 2 
 Homework 
 95 
 25% 
 
 
 3 
 Participation 
 90 
 10% 
 
 
 4 
 Midterm exam 
 85 
 15% 
 
 
 5 
 Projects 
 88 
 20% 
 
 
 6 
 Final exam 
 82 
 30% 
 
 
 7 
   
 Formula 
 Result 
 
 
 8 
 Final grade 
 =AVERAGE.WEIGHTED(B2:B6, C2:C6) 
 87.7 
 
 
 
## Related functions
- SUMPRODUCT : The SUMPRODUCT function calculates the sum of the products of corresponding entries in 2 equally sized arrays or ranges.
- AVERAGE : The AVERAGE function returns the numerical average value in a dataset, ignoring text.
 
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Statistical 
- 1 of 102 
 
 Google Sheets function list 
- 2 of 102 
 
 AVEDEV 
- 3 of 102 
 
 AVERAGE 
- 4 of 102 
 
 AVERAGE.WEIGHTED function 
- 5 of 102 
 
 AVERAGEA 
- 6 of 102 
 
 AVERAGEIF 
- 7 of 102 
 
 AVERAGEIFS 
- 8 of 102 
 
 BETA.DIST function 
- 9 of 102 
 
 BETA.INV function 
- 10 of 102 
 
 BINOMDIST 
- 11 of 102 
 
 CHIDIST 
- 12 of 102 
 
 CHIINV 
- 13 of 102 
 
 CHISQ.DIST 
- 14 of 102 
 
 CHISQ.DIST.RT 
- 15 of 102 
 
 CHISQ.INV 
- 16 of 102 
 
 CHITEST 
- 17 of 102 
 
 CONFIDENCE.NORM 
- 18 of 102 
 
 CONFIDENCE.T function 
- 19 of 102 
 
 CORREL 
- 20 of 102 
 
 COUNT 
- 21 of 102 
 
 COUNTA 
- 22 of 102 
 
 COVAR 
- 23 of 102 
 
 COVARIANCE.S function 
- 24 of 102 
 
 CRITBINOM 
- 25 of 102 
 
 DEVSQ 
- 26 of 102 
 
 EXPON.DIST 
- 27 of 102 
 
 F.DIST 
- 28 of 102 
 
 F.INV 
- 29 of 102 
 
 F.INV.RT 
- 30 of 102 
 
 FISHER 
- 31 of 102 
 
 FISHERINV 
- 32 of 102 
 
 FORECAST 
- 33 of 102 
 
 FTEST 
- 34 of 102 
 
 GAMMA function 
- 35 of 102 
 
 GAMMA.INV function 
- 36 of 102 
 
 GAMMA.DIST 
- 37 of 102 
 
 GAUSS function 
- 38 of 102 
 
 GEOMEAN 
- 39 of 102 
 
 HARMEAN 
- 40 of 102 
 
 HYPGEOMDIST 
- 41 of 102 
 
 INTERCEPT 
- 42 of 102 
 
 KURT 
- 43 of 102 
 
 LARGE 
- 44 of 102 
 
 LOGINV 
- 45 of 102 
 
 LOGNORMDIST 
- 46 of 102 
 
 MAX 
- 47 of 102 
 
 MAXA 
- 48 of 102 
 
 MAXIFS 
- 49 of 102 
 
 MEDIAN 
- 50 of 102 
 
 MIN 
- 51 of 102 
 
 MINA 
- 52 of 102 
 
 MINIFS 
- 53 of 102 
 
 MODE 
- 54 of 102 
 
 MODE.MULT function 
- 55 of 102 
 
 NEGBINOMDIST 
- 56 of 102 
 
 NORMDIST 
- 57 of 102 
 
 NORMINV 
- 58 of 102 
 
 NORMSDIST 
- 59 of 102 
 
 NORMSINV 
- 60 of 102 
 
 PEARSON 
- 61 of 102 
 
 PERCENTILE function 
- 62 of 102 
 
 PERCENTILE.EXC function 
- 63 of 102 
 
 PERCENTRANK 
- 64 of 102 
 
 PERCENTRANK.EXC 
- 65 of 102 
 
 PERCENTRANK.INC 
- 66 of 102 
 
 PERMUT 
- 67 of 102 
 
 PERMUTATIONA function 
- 68 of 102 
 
 PHI function 
- 69 of 102 
 
 POISSON.DIST 
- 70 of 102 
 
 PROB 
- 71 of 102 
 
 QUARTILE function 
- 72 of 102 
 
 QUARTILE.EXC function 
- 73 of 102 
 
 RANK 
- 74 of 102 
 
 RANK.AVG 
- 75 of 102 
 
 RANK.EQ 
- 76 of 102 
 
 RSQ 
- 77 of 102 
 
 SKEW 
- 78 of 102 
 
 SKEW.P function 
- 79 of 102 
 
 SLOPE 
- 80 of 102 
 
 SMALL 
- 81 of 102 
 
 STANDARDIZE 
- 82 of 102 
 
 STDEV 
- 83 of 102 
 
 STDEVA 
- 84 of 102 
 
 STDEVP 
- 85 of 102 
 
 STDEVPA 
- 86 of 102 
 
 STEYX 
- 87 of 102 
 
 T.DIST function 
- 88 of 102 
 
 T.DIST.2T function 
- 89 of 102 
 
 T.DIST.RT function 
- 90 of 102 
 
 T.INV 
- 91 of 102 
 
 TDIST 
- 92 of 102 
 
 TRIMMEAN 
- 93 of 102 
 
 T.TEST 
- 94 of 102 
 
 VAR 
- 95 of 102 
 
 VARA 
- 96 of 102 
 
 VARP 
- 97 of 102 
 
 VARPA 
- 98 of 102 
 
 WEIBULL 
- 99 of 102 
 
 Z.TEST 
- 100 of 102 
 
 BINOM.DIST.RANGE 
- 101 of 102 
 
 PERCENTIF 
- 102 of 102 
 
 MARGINOFERROR function 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 13768758114410422326 true Search Help Center false true true true true true 35 false false false false false
