# ARRAY_CONSTRAIN

## Metadata
- **Category:** Array
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Constrains an array result to a specified size.

## Google Sheets Syntax
```excel
=ARRAY_CONSTRAIN(input_range, num_rows, num_cols)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | input_range | range/array | Yes | The range to constrain. |
| 2 | num_rows | number | Yes | The number of rows the result should contain. |
| 3 | num_cols | number | Yes | The number of columns the result should contain |

## Returns
array

## Behavior / Algorithm
1. Evaluate input_range as an array.
2. Truncate or pad to num_rows rows and num_cols columns. Padded cells are blank.
3. Return the constrained array.

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
- `=ARRAY_CONSTRAIN(A1:C5, 3, 2)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3267036?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - ARRAY_CONSTRAIN](https://support.google.com/docs/answer/3267036?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
ARRAY_CONSTRAIN(A1:C10, 2, 3) 
 ARRAY_CONSTRAIN(SORT(A1:F100, 1, TRUE), 10, 6)

### Notes
- Generally used in combination with other functions that return an array result when a fewer number of rows or columns are desired.

### See Also
ARRAYFORMULA : Enables the display of values returned from an array formula into multiple rows and/or columns and the use of non-array functions with arrays.
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Array 
- 1 of 16 
 
 Google Sheets function list 
- 2 of 16 
 
 ARRAY_CONSTRAIN 
- 3 of 16 
 
 FREQUENCY 
- 4 of 16 
 
 GROWTH 
- 5 of 16 
 
 LINEST 
- 6 of 16 
 
 LOGEST 
- 7 of 16 
 
 MDETERM 
- 8 of 16 
 
 MINVERSE 
- 9 of 16 
 
 MMULT 
- 10 of 16 
 
 SUMPRODUCT 
- 11 of 16 
 
 SUMX2MY2 
- 12 of 16 
 
 SUMX2PY2 
- 13 of 16 
 
 SUMXMY2 
- 14 of 16 
 
 TRANSPOSE 
- 15 of 16 
 
 TREND 
- 16 of 16 
 
 FLATTEN 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 15176464360382584808 true Search Help Center false true true true true true 35 false false false false false
