# COUNTUNIQUE

## Metadata
- **Category:** Math
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Counts the number of unique values in a list of specified values and ranges.

## Google Sheets Syntax
```excel
=COUNTUNIQUE(value1, [value2, ...])
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | value1 | any | Yes |  |
| 2 | value2_... | number | No |  |

## Returns
number

## Behavior / Algorithm
1. Flatten all value/range arguments into a single list.
2. Compare values: numbers and booleans by value; text case-insensitively.
3. Count the number of distinct values.
4. Blank cells are ignored unless no non-blank values exist? Document exact behavior.

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
- `=COUNTUNIQUE(1, 2, 2, 3)`
- `=COUNTUNIQUE(A1:A10)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=COUNTUNIQUE(1,2,2,3)` | `3` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3093405?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - COUNTUNIQUE](https://support.google.com/docs/answer/3093405?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
COUNTUNIQUE(table_name!fruits)

### Notes
- Although COUNTUNIQUE is specified as taking a maximum of 30 arguments, Google Sheets supports an arbitrary number of arguments for this function.

### See Also
DCOUNTA : Counts values, including text, selected from a database table-like array or range using a SQL-like query.
 DCOUNT : Counts numeric values selected from a database table-like array or range using a SQL-like query.
 COUNTIF : Returns a conditional count across a range.
 COUNTA :
 
Returns the number of values in a dataset.
 
 
 COUNTBLANK : Returns the number of empty cells in a given range.
 COUNT :
 
Returns the number of numeric values in a dataset.

### Examples
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Math 
- 1 of 82 
 
 Google Sheets function list 
- 2 of 82 
 
 ABS 
- 3 of 82 
 
 ACOS 
- 4 of 82 
 
 ACOSH 
- 5 of 82 
 
 ACOT function 
- 6 of 82 
 
 ACOTH function 
- 7 of 82 
 
 ASIN 
- 8 of 82 
 
 ASINH 
- 9 of 82 
 
 ATAN 
- 10 of 82 
 
 ATAN2 
- 11 of 82 
 
 ATANH 
- 12 of 82 
 
 BASE function 
- 13 of 82 
 
 CEILING 
- 14 of 82 
 
 CEILING.MATH function 
- 15 of 82 
 
 CEILING.PRECISE function 
- 16 of 82 
 
 COMBIN 
- 17 of 82 
 
 COMBINA function 
- 18 of 82 
 
 COS 
- 19 of 82 
 
 COSH 
- 20 of 82 
 
 COT function 
- 21 of 82 
 
 COTH function 
- 22 of 82 
 
 COUNTBLANK 
- 23 of 82 
 
 COUNTIF 
- 24 of 82 
 
 COUNTIFS 
- 25 of 82 
 
 COUNTUNIQUE 
- 26 of 82 
 
 CSC function 
- 27 of 82 
 
 CSCH function 
- 28 of 82 
 
 DECIMAL function 
- 29 of 82 
 
 DEGREES 
- 30 of 82 
 
 ERFC 
- 31 of 82 
 
 EVEN 
- 32 of 82 
 
 EXP 
- 33 of 82 
 
 FACT 
- 34 of 82 
 
 FACTDOUBLE 
- 35 of 82 
 
 FLOOR 
- 36 of 82 
 
 FLOOR.MATH function 
- 37 of 82 
 
 FLOOR.PRECISE function 
- 38 of 82 
 
 GAMMALN 
- 39 of 82 
 
 GCD 
- 40 of 82 
 
 IMLN function 
- 41 of 82 
 
 IMPOWER function 
- 42 of 82 
 
 IMSQRT function 
- 43 of 82 
 
 INT 
- 44 of 82 
 
 ISEVEN 
- 45 of 82 
 
 ISODD 
- 46 of 82 
 
 LCM 
- 47 of 82 
 
 LN 
- 48 of 82 
 
 LOG 
- 49 of 82 
 
 LOG10 
- 50 of 82 
 
 MOD 
- 51 of 82 
 
 MROUND 
- 52 of 82 
 
 MULTINOMIAL 
- 53 of 82 
 
 MUNIT function 
- 54 of 82 
 
 ODD 
- 55 of 82 
 
 PI 
- 56 of 82 
 
 POWER function 
- 57 of 82 
 
 PRODUCT 
- 58 of 82 
 
 QUOTIENT function 
- 59 of 82 
 
 RADIANS 
- 60 of 82 
 
 RAND 
- 61 of 82 
 
 RANDBETWEEN 
- 62 of 82 
 
 ROUND function 
- 63 of 82 
 
 ROUNDDOWN 
- 64 of 82 
 
 ROUNDUP 
- 65 of 82 
 
 SEC function 
- 66 of 82 
 
 SECH function 
- 67 of 82 
 
 SEQUENCE function 
- 68 of 82 
 
 SERIESSUM 
- 69 of 82 
 
 SIGN 
- 70 of 82 
 
 SIN 
- 71 of 82 
 
 SINH 
- 72 of 82 
 
 SQRT 
- 73 of 82 
 
 SQRTPI 
- 74 of 82 
 
 SUBTOTAL function 
- 75 of 82 
 
 SUM 
- 76 of 82 
 
 SUMIF 
- 77 of 82 
 
 SUMIFS function 
- 78 of 82 
 
 SUMSQ 
- 79 of 82 
 
 TAN 
- 80 of 82 
 
 TANH 
- 81 of 82 
 
 TRUNC 
- 82 of 82 
 
 RANDARRAY function 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 14317453922762288800 true Search Help Center false true true true true true 35 false false false false false
