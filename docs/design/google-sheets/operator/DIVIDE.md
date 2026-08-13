# DIVIDE

## Metadata
- **Category:** Operator
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Returns one number divided by another. Equivalent to the `/` operator.

## Google Sheets Syntax
```excel
=DIVIDE(dividend, divisor)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | dividend | number | Yes | The number to be divided. |
| 2 | divisor | number | Yes | The number to divide by. |

## Returns
number

## Behavior / Algorithm
1. Coerce dividend and divisor to numbers.
2. If divisor is 0, return `#DIV/0!`.
3. Return dividend / divisor.
4. Equivalent to the `/` operator.

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
- `=DIVIDE(10, 2)`
- `=DIVIDE(10, 0)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=DIVIDE(10,2)` | `5` | Golden path |
| `=DIVIDE(1,0)` | `#DIV/0!` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3093973?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - DIVIDE](https://support.google.com/docs/answer/3093973?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
DIVIDE(4,2) 
 DIVIDE(A2,B2)

### Notes
- DIVIDE is equivalent to QUOTIENT .

### See Also
SUM : Returns the sum of a series of numbers and/or cells.
 PRODUCT : Returns the result of multiplying a series of numbers together.
 QUOTIENT : Returns one number divided by another, without the remainder.
 MULTIPLY : Returns the product of two numbers. Equivalent to the `*` operator.
 MINUS : Returns the difference of two numbers. Equivalent to the `-` operator.
 ADD : Returns the sum of two numbers. Equivalent to the `+` operator.

### Examples
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Operator 
- 1 of 18 
 
 Google Sheets function list 
- 2 of 18 
 
 ADD 
- 3 of 18 
 
 CONCAT 
- 4 of 18 
 
 DIVIDE 
- 5 of 18 
 
 EQ 
- 6 of 18 
 
 GT 
- 7 of 18 
 
 GTE 
- 8 of 18 
 
 LT 
- 9 of 18 
 
 LTE 
- 10 of 18 
 
 MINUS function 
- 11 of 18 
 
 MULTIPLY 
- 12 of 18 
 
 NE 
- 13 of 18 
 
 POW 
- 14 of 18 
 
 UMINUS 
- 15 of 18 
 
 UNARY_PERCENT 
- 16 of 18 
 
 UPLUS 
- 17 of 18 
 
 UNIQUE function 
- 18 of 18 
 
 ISBETWEEN 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 17893373075264963833 true Search Help Center false true true true true true 35 false false false false false
