# ARRAYFORMULA

## Metadata
- **Category:** Google
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** Yes

## Description
Enables the display of values returned from an array formula into multiple rows and/or columns and the use of non-array functions with arrays.

## Google Sheets Syntax
```excel
=ARRAYFORMULA(array_formula)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | array_formula | formula/expression | Yes | A range, mathematical expression using one cell range or multiple ranges of the same size, or a function that returns a result greater than one cell. |

## Returns
array

## Behavior / Algorithm
1. Treat the inner formula as an array formula.
2. For each non-array argument, broadcast it across the dimensions of array arguments.
3. Evaluate the inner expression for each corresponding set of values.
4. Return the spilled array result.
5. If the inner function is already array-capable, apply it directly.

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
- `=ARRAYFORMULA(B2:B4 * C2:C4)`
- `=ARRAYFORMULA(IF(B2:B4>0, B2:B4, "")`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3093275?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - ARRAYFORMULA](https://support.google.com/docs/answer/3093275?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
ARRAYFORMULA(SUM(IF(A1:A10>5, A1:A10, 0))) 
 ARRAYFORMULA(A1:C1+A2:C2)

### Notes
- 
 
Many array formulas will be automatically expanded into neighboring cells, obviating the explicit use of ARRAYFORMULA .
- Pressing Ctrl+Shift+Enter while editing a formula will automatically add ARRAYFORMULA( to the beginning of the formula.
- Note that array formulas cannot be exported.

### See Also
ARRAY_CONSTRAIN : Constrains an array result to a specified size.
 
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Google 
- 1 of 10 
 
 Google Sheets function list 
- 2 of 10 
 
 ARRAYFORMULA 
- 3 of 10 
 
 DETECTLANGUAGE 
- 4 of 10 
 
 GOOGLEFINANCE 
- 5 of 10 
 
 GOOGLETRANSLATE 
- 6 of 10 
 
 IMAGE 
- 7 of 10 
 
 QUERY function 
- 8 of 10 
 
 SPARKLINE 
- 9 of 10 
 
 Create & use named functions 
- 10 of 10 
 
 LAMBDA function 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 7457551664573915686 true Search Help Center false true true true true true 35 false false false false false
