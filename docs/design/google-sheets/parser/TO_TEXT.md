# TO_TEXT

## Metadata
- **Category:** Parser
- **Priority tags:** T2
- **Scope:** implement
- **Volatile:** No
- **Dynamic array:** No (scalar)

## Description
Converts a provided numeric value to a text value.

## Google Sheets Syntax
```excel
=TO_TEXT(value)
```

## Arguments
| # | Name | Type | Required? | Description |
|---|---|---|---|---|
| 1 | value | any | Yes | The argument or reference to a cell to be converted to text. |

## Returns
string

## Behavior / Algorithm
1. Coerce value to text.
2. Numbers use plain decimal string, booleans as TRUE/FALSE, errors as their code, dates as date serial string.

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
- `=TO_TEXT(123)`
- `=TO_TEXT(TRUE)`

## Test Cases
| Input | Expected | Purpose |
|---|---|---|
| `=TO_TEXT(123)` | `"123"` | Golden path |
| `=TO_TEXT(TRUE)` | `"TRUE"` | Golden path |
| Normal inputs | Correct result | Golden path |
| Boundary values (0, 1, negatives, very large/small) | Correct or `#NUM!` | Domain edges |
| Blank/empty cells | Coerced `0` or `""` as appropriate | Blank handling |
| Text that cannot be coerced | `#VALUE!` | Error propagation |
| Too few/too many arguments | `#VALUE!` | Arity validation |

## Implementation Notes
Implement natively in the appropriate builtins module (e.g. `src/functions/builtins-google-sheets.ts`). Add inline KAT tests and, if the behavior depends on cell layout, a workbook fixture. Ensure parity with Google Sheets semantics. Reference URL: https://support.google.com/docs/answer/3094285?hl=en

## References
- [Google Sheets function list](https://support.google.com/docs/table/25273)
- [Google Docs Editors Help - TO_TEXT](https://support.google.com/docs/answer/3094285?hl=en)


## Google Sheets Documentation Excerpts

### Sample Usage
TO_TEXT(24) 
 TO_TEXT(A2)

### Notes
- TO_TEXT is equivalent to prefixing a number with an apostrophe (')

### See Also
TO_PERCENT : Converts a provided number to a percentage.
 TO_DOLLARS : Converts a provided number to a dollar value.
 TO_DATE : Converts a provided number to a date.
 N : Returns the argument provided as a number.

### Examples
## Need more help?
 
### Try these next steps:
 
 
 Post to the help community Get answers from community members true 
## Parser 
- 1 of 7 
 
 Google Sheets function list 
- 2 of 7 
 
 CONVERT 
- 3 of 7 
 
 TO_DATE 
- 4 of 7 
 
 TO_DOLLARS 
- 5 of 7 
 
 TO_PERCENT 
- 6 of 7 
 
 TO_PURE_NUMBER 
- 7 of 7 
 
 TO_TEXT 
 Visit the Learning Center 
Using Google products, like Google Docs, at work or school? Try powerful tips, tutorials, and templates. Learn to work on Office files without installing Office, create dynamic project plans and team calendars, auto-organize your inbox, and more.
 ©2026 Google 
- Privacy Policy 
- Terms of Service 
 Language català‎ dansk‎ Deutsch‎ English (United Kingdom)‎ español‎ español (Latinoamérica)‎ français‎ Indonesia‎ italiano‎ magyar‎ Melayu‎ Nederlands‎ norsk‎ polski‎ português‎ português (Brasil)‎ română‎ suomi‎ svenska‎ Tiếng Việt‎ Türkçe‎ čeština‎ Ελληνικά‎ русский‎ українська‎ ‏ עברית ‏ العربية मराठी‎ हिन्दी‎ தமிழ்‎ తెలుగు‎ ไทย‎ 中文（简体）‎ 中文（繁體）‎ 日本語‎ 한국어‎ English‎ 
 
 Enable Dark Mode Send feedback on... This help content & information General Help Center experience Search Clear search Close search Google apps Main menu 12631887620784426981 true Search Help Center false true true true true true 35 false false false false false
