# GT

## Metadata
- **Category:** Operator
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Returns `TRUE` if the first argument is strictly greater than the second, and `FALSE` otherwise. Equivalent to the `>` operator.

## Google Sheets Syntax
```excel
=GT(value1, value2)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | value1 | number | Yes | The value to test as being greater than value2 . |
| 2 | value2 | number | Yes | The second value. |

## Returns
boolean

## Behavior / Algorithm
1. Coerce both arguments to comparable values.
2. Return TRUE if value1 > value2, FALSE otherwise.
3. Equivalent to `>`.

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
- `=GT(5, 3)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=GT(5,3)` | `TRUE` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3098240?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - GT](https://support.google.com/docs/answer/3098240?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
GT(A2,A3) 
 GT(2,3)

### See Also
NE : Returns "TRUE" if two specified values are not equal and "FALSE" otherwise. Equivalent to the "<>" operator.
 LTE : Returns `TRUE` if the first argument is less than or equal to the second, and `FALSE` otherwise. Equivalent to the `<=` operator.
 LT : Returns `TRUE` if the first argument is strictly less than the second, and `FALSE` otherwise. Equivalent to the `<` operator.
 GTE : Returns `TRUE` if the first argument is greater than or equal to the second, and `FALSE` otherwise. Equivalent to the `>=` operator.
 EQ : Returns "TRUE" if two specified values are equal and "FALSE" otherwise. Equivalent to the "=" operator.

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
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 7438587360969504444 true Search Help Center false true true true true true 35 false false false false false
