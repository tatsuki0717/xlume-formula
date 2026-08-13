# MARGINOFERROR

## Metadata
- **Category:** Statistical
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Calculates the amount of random sampling error given a range of values and a confidence level.

## Google Sheets Syntax
```excel
=MARGINOFERROR(range, confidence)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | range | range/array | Yes | The range of values used to calculate the margin of error. |
| 2 | confidence | number | Yes | The desired confidence level between (0, 1). |

## Returns
number

## Behavior / Algorithm
1. Compute the standard deviation of the sample range.
2. Let n be the number of values.
3. Use the provided confidence level (default 0.95) to find the critical value (z for large n, t for small n).
4. Return critical * (stddev / sqrt(n)).
5. If standard deviation is 0, return 0.

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
- `=MARGINOFERROR(A1:A10, 0.95)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/12487850?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - MARGINOFERROR](https://support.google.com/docs/answer/12487850?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
MARGINOFERROR(A1:A7, 0.95) 
 MARGINOFERROR(A1:C3, 0.99)

### Notes
- The margin of error is a statistical measurement used to determine the amount of error due to chance in a random sample of a population. 
- A large margin of error indicates that the estimate of the parameter of a given sample may not represent the parameter of the entire population. 
- The margin of error decreases when the sample size is greater. 
- Surveys with less differences in responses between participants also have smaller margins of error.
- The confidence level is the likelihood that the true mean of the population lies in the margin of error above or below the sample mean.
- MARGINOFERROR(range, confidence) is equal to CONFIDENCE.T(1 - confidence, STDEV(range), COUNT(range)) .
- The margin of error calculation is appropriate for:
- Continuous data normally distributed.
- Surveys with large sample sizes.

### Examples
A 
 
 
 1 
 8 
 
 
 2 
 4 
 
 
 3 
 3 
 
 
 4 
 6 
 
 
 Mean 
 5.25 
 
 
 Formula 
 =MARGINOFERROR(A1:A4, 0.95) 
 
 
 Result of MARGINOFERROR 
 3.528 
 
 
 Confidence Interval 
 [5.25 - 3.528, 5.25 + 3.528] 
 
 
 
 
 Lower Bound  
 
 (Mean - MARGINOFERROR) 
 
 1.722 
 
 
 
 
 Upper Bound  
 
 (Mean + MARGINOFERROR) 
 
 
 
8.778
 
 
 
 
 
 
## Related resources
- CONFIDENCE.T 
- CONFIDENCE.NORM 
 
 
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
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 8673836227824614571 true Search Help Center false true true true true true 35 false false false false false
